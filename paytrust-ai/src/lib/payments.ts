import { createAdminClient } from '@/lib/supabase/server';
import {
  capturePayPalOrder,
  getCaptureFromOrder,
  getOrderIdFromCapture,
  getPayPalOrder,
  PayPalError,
  type PayPalCapture,
  type PayPalOrder,
  type PayPalWebhookEvent,
} from '@/lib/paypal';
import type { Transaction, TransactionStatus } from '@/lib/types';

interface TransactionRecord extends Transaction {
  paypal_order_id?: string | null;
}

const AMOUNT_TOLERANCE = 0.01;

/**
 * Compare the amount PayPal reports with the amount on the transaction.
 *
 * This fails CLOSED. A missing amount used to return early, which silently
 * skipped the check entirely - and the simulated capture path produced a
 * capture with no amount at all, so any amount in any currency was accepted.
 */
export function assertAmountMatches(
  expected: Pick<Transaction, 'amount' | 'currency'>,
  amount: { value?: string; currency_code?: string } | undefined,
  context: string
): void {
  if (!amount?.value || !amount.currency_code) {
    throw new PayPalError(`Missing ${context} amount`, 400);
  }

  const value = Number(amount.value);
  if (!Number.isFinite(value)) {
    throw new PayPalError(`Invalid ${context} amount`, 400);
  }

  if (amount.currency_code !== expected.currency) {
    throw new PayPalError(
      `${context} currency ${amount.currency_code} does not match transaction currency ${expected.currency}`,
      400
    );
  }

  if (Math.abs(value - Number(expected.amount)) > AMOUNT_TOLERANCE) {
    throw new PayPalError(
      `${context} amount ${value} does not match transaction amount ${expected.amount}`,
      400
    );
  }
}

/**
 * Bind a PayPal order to the transaction it is supposed to fund.
 *
 * Both bindings are mandatory. They used to be conditional, so an order with
 * no `paypal_order_id` on the transaction and no `reference_id` on the
 * purchase unit passed every check - which let a seller capture their own
 * order against a victim's transaction and mark the escrow as funded.
 */
export function verifyOrderMatchesTransaction(
  order: PayPalOrder,
  transaction: TransactionRecord,
  expectedOrderId: string
): void {
  if (order.id !== expectedOrderId) {
    throw new PayPalError('PayPal order mismatch', 400);
  }

  if (transaction.paypal_order_id !== expectedOrderId) {
    throw new PayPalError(
      'This PayPal order does not belong to the transaction',
      400
    );
  }

  const unit = order.purchase_units?.[0];
  if (!unit || unit.reference_id !== transaction.id) {
    throw new PayPalError(
      'PayPal order is not bound to this transaction',
      400
    );
  }

  assertAmountMatches(transaction, unit.amount, 'PayPal order');
}

async function findTransactionByOrderId(
  orderId: string
): Promise<TransactionRecord | null> {
  const admin = await createAdminClient();

  const { data: direct } = await admin
    .from('transactions')
    .select('*')
    .eq('paypal_order_id', orderId)
    .maybeSingle();

  if (direct) return direct as TransactionRecord;

  const { data: event } = await admin
    .from('payment_events')
    .select('transaction_id')
    .eq('provider', 'paypal')
    .eq('provider_event_id', orderId)
    .eq('event_type', 'order_created')
    .maybeSingle();

  if (!event?.transaction_id) return null;

  const { data: transaction } = await admin
    .from('transactions')
    .select('*')
    .eq('id', event.transaction_id)
    .maybeSingle();

  return (transaction as TransactionRecord | null) ?? null;
}

async function recordPaymentEvent(input: {
  transactionId: string;
  providerEventId: string;
  eventType: string;
  payloadSummary: Record<string, unknown>;
  amount?: number | null;
  currency?: string | null;
}): Promise<void> {
  const admin = await createAdminClient();
  const { error } = await admin.from('payment_events').insert({
    transaction_id: input.transactionId,
    provider: 'paypal',
    provider_event_id: input.providerEventId,
    event_type: input.eventType,
    payload_summary: input.payloadSummary,
    amount: input.amount ?? null,
    currency: input.currency ?? null,
  });

  // 23505 = unique violation. Webhooks and capture routes may both record
  // the same provider event; that is safe and should stay idempotent.
  if (error && error.code !== '23505') {
    throw new Error(`Could not record payment event: ${error.message}`);
  }
}

async function setTransactionStatus(
  transactionId: string,
  status: TransactionStatus,
  extra: Record<string, unknown> = {}
): Promise<void> {
  const admin = await createAdminClient();

  // Never downgrade a completed transaction. Refunds are the only transition
  // allowed to leave the COMPLETED state.
  const allowedFrom =
    status === 'REFUNDED'
      ? ['CREATED', 'PENDING', 'APPROVED', 'FAILED', 'COMPLETED']
      : ['CREATED', 'PENDING', 'APPROVED', 'FAILED'];

  const { error } = await admin
    .from('transactions')
    .update({ status, ...extra })
    .eq('id', transactionId)
    .in('status', allowedFrom);

  if (error) {
    throw new Error(`Could not update transaction status: ${error.message}`);
  }
}

export async function recordOrderCreated(
  transaction: TransactionRecord,
  order: PayPalOrder
): Promise<void> {
  await recordPaymentEvent({
    transactionId: transaction.id,
    providerEventId: order.id,
    eventType: 'order_created',
    payloadSummary: {
      status: order.status,
      amount: Number(transaction.amount),
      currency: transaction.currency,
    },
    amount: Number(transaction.amount),
    currency: transaction.currency,
  });

  await setTransactionStatus(transaction.id, 'PENDING', {
    paypal_order_id: order.id,
  });
}

export async function captureAndRecord(input: {
  orderId: string;
  transactionId: string;
}): Promise<{
  status: TransactionStatus;
  orderId: string;
  captureId: string;
}> {
  const admin = await createAdminClient();
  const { data: transaction, error } = await admin
    .from('transactions')
    .select('*')
    .eq('id', input.transactionId)
    .single();

  if (error || !transaction) {
    throw new PayPalError('Transaction not found', 404);
  }

  const tx = transaction as TransactionRecord;
  const order = await getPayPalOrder(input.orderId);
  verifyOrderMatchesTransaction(order, tx, input.orderId);

  let capture: PayPalCapture | null = getCaptureFromOrder(order);

  if (order.status !== 'COMPLETED' || !capture) {
    const capturedOrder = await capturePayPalOrder(input.orderId);
    capture = getCaptureFromOrder(capturedOrder);
  }

  if (!capture) {
    throw new PayPalError('PayPal did not return a capture', 502);
  }

  assertAmountMatches(tx, capture.amount, 'PayPal capture');

  const status: TransactionStatus =
    capture.status === 'COMPLETED' ? 'APPROVED' : 'FAILED';

  await recordPaymentEvent({
    transactionId: tx.id,
    providerEventId: capture.id,
    eventType: 'payment_captured',
    payloadSummary: {
      status: capture.status,
      order_id: input.orderId,
      capture_id: capture.id,
      amount: capture.amount?.value,
      currency: capture.amount?.currency_code,
    },
    amount: capture.amount?.value ? Number(capture.amount.value) : null,
    currency: capture.amount?.currency_code ?? null,
  });

  await setTransactionStatus(tx.id, status);

  try {
    await admin.from('transaction_messages').insert({
      transaction_id: tx.id,
      sender_id: tx.buyer_id,
      content: `🔒 Escrow funded via PayPal Sandbox (${tx.currency} ${tx.amount}). Funds are held safely in PayTrust Escrow. Capture ID: ${capture.id}`,
    });
  } catch {
    // Non-blocking for notification insertion
  }

  return { status, orderId: input.orderId, captureId: capture.id };
}

/**
 * Releasing escrow means paying the seller out. That is only legitimate once
 * the funds have actually been captured, which is what APPROVED records.
 */
export function assertEscrowReleasable(status: TransactionStatus): void {
  if (status !== 'APPROVED') {
    throw new PayPalError(
      'Escrow funds have not been captured for this transaction',
      409
    );
  }
}

export async function releaseEscrowAndRecord(input: {
  transactionId: string;
  releasedByUserId: string;
}): Promise<{ status: TransactionStatus }> {
  const admin = await createAdminClient();
  const { data: transaction, error } = await admin
    .from('transactions')
    .select('*')
    .eq('id', input.transactionId)
    .single();

  if (error || !transaction) {
    throw new PayPalError('Transaction not found', 404);
  }

  const tx = transaction as TransactionRecord;

  if (tx.buyer_id !== input.releasedByUserId) {
    throw new PayPalError('Only the buyer can release escrow funds', 403);
  }

  if (tx.status === 'COMPLETED') {
    return { status: 'COMPLETED' };
  }

  /*
   * Releasing escrow means paying the seller out. That is only legitimate
   * once the funds have actually been captured, which is what APPROVED
   * records. Without this check a buyer could release escrow on a
   * transaction that was never funded, and the seller would be told they
   * had been paid.
   */
  assertEscrowReleasable(tx.status);

  const eventId = `rel-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  await recordPaymentEvent({
    transactionId: tx.id,
    providerEventId: eventId,
    eventType: 'payment_released',
    payloadSummary: {
      status: 'COMPLETED',
      released_by: input.releasedByUserId,
      amount: Number(tx.amount),
      currency: tx.currency,
    },
    amount: Number(tx.amount),
    currency: tx.currency,
  });

  await setTransactionStatus(tx.id, 'COMPLETED');

  try {
    await admin.from('transaction_messages').insert({
      transaction_id: tx.id,
      sender_id: tx.buyer_id,
      content: `🎉 Payment released from Escrow! ${tx.currency} ${tx.amount} has been paid out to the seller. Transaction complete.`,
    });
  } catch {
    // Non-blocking
  }

  return { status: 'COMPLETED' };
}

export async function handlePayPalWebhookEvent(
  event: PayPalWebhookEvent
): Promise<void> {
  const eventType = event.event_type;
  const resource = event.resource;

  if (!eventType || !resource) return;

  if (eventType === 'CHECKOUT.ORDER.APPROVED') {
    const order = resource as PayPalOrder;
    const transaction = await findTransactionByOrderId(order.id);
    if (!transaction) return;

    await recordPaymentEvent({
      transactionId: transaction.id,
      providerEventId: order.id,
      eventType: 'order_approved',
      payloadSummary: { status: order.status, order_id: order.id },
    });

    await setTransactionStatus(transaction.id, 'PENDING', {
      paypal_order_id: order.id,
    });
    return;
  }

  if (eventType.startsWith('PAYMENT.CAPTURE.')) {
    const capture = resource as PayPalCapture;
    const orderId = getOrderIdFromCapture(capture);
    if (!orderId) return;

    let transaction = await findTransactionByOrderId(orderId);

    if (!transaction) {
      const order = await getPayPalOrder(orderId);
      const referenceId = order.purchase_units?.[0]?.reference_id;
      if (!referenceId) return;

      const admin = await createAdminClient();
      const { data } = await admin
        .from('transactions')
        .select('*')
        .eq('id', referenceId)
        .maybeSingle();
      transaction = (data as TransactionRecord | null) ?? null;
    }

    if (!transaction) return;

    assertAmountMatches(transaction, capture.amount, 'PayPal capture');

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      await recordPaymentEvent({
        transactionId: transaction.id,
        providerEventId: capture.id,
        eventType: 'payment_captured',
        payloadSummary: {
          status: capture.status,
          order_id: orderId,
          amount: capture.amount?.value,
          currency: capture.amount?.currency_code,
        },
        amount: capture.amount?.value ? Number(capture.amount.value) : null,
        currency: capture.amount?.currency_code ?? null,
      });

      /*
       * A capture means the funds are held in escrow (APPROVED). It does not
       * mean the escrow was released to the seller (COMPLETED) - releasing is
       * a separate, buyer-initiated step. This handler used to set COMPLETED
       * directly, which meant the real PayPal webhook released the escrow
       * without the buyer ever asking for it.
       */
      await setTransactionStatus(transaction.id, 'APPROVED');
      return;
    }

    if (
      eventType === 'PAYMENT.CAPTURE.REFUNDED' ||
      eventType === 'PAYMENT.CAPTURE.REVERSED'
    ) {
      await recordPaymentEvent({
        transactionId: transaction.id,
        providerEventId: capture.id,
        eventType: 'payment_refunded',
        payloadSummary: {
          status: capture.status,
          order_id: orderId,
          amount: capture.amount?.value,
          currency: capture.amount?.currency_code,
        },
        amount: capture.amount?.value ? Number(capture.amount.value) : null,
        currency: capture.amount?.currency_code ?? null,
      });
      await setTransactionStatus(transaction.id, 'REFUNDED');
      return;
    }

    if (
      eventType === 'PAYMENT.CAPTURE.DENIED' ||
      eventType === 'PAYMENT.CAPTURE.DECLINED'
    ) {
      await recordPaymentEvent({
        transactionId: transaction.id,
        providerEventId: capture.id,
        eventType: 'payment_failed',
        payloadSummary: {
          status: capture.status,
          order_id: orderId,
        },
      });
      await setTransactionStatus(transaction.id, 'FAILED');
    }
  }
}
