'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';
import { getErrorMessage } from '@/lib/errors';
import { createPayPalOrder, findApprovalUrl } from '@/lib/paypal';
import { captureAndRecord, recordOrderCreated } from '@/lib/payments';
import {
  capturePaymentSchema,
  createPaymentSchema,
} from '@/lib/validations';
import type { PaymentEvent, Transaction } from '@/lib/types';

const TERMINAL_STATUSES = ['COMPLETED', 'REFUNDED', 'CANCELLED'];

export async function createPayPalPayment(input: { transaction_id: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (error || !transaction) {
    return { error: 'Transaction not found' };
  }

  const tx = transaction as Transaction & { paypal_order_id?: string | null };

  if (tx.buyer_id !== user.id) {
    return { error: 'Only the buyer can pay for this transaction' };
  }

  if (TERMINAL_STATUSES.includes(tx.status)) {
    return { error: `This transaction is already ${tx.status.toLowerCase()}` };
  }

  try {
    const appUrl = getAppUrl();
    const order = await createPayPalOrder({
      transactionId: tx.id,
      amount: Number(tx.amount),
      currency: tx.currency,
      description: tx.title,
      returnUrl: `${appUrl}/api/payments/return`,
      cancelUrl: `${appUrl}/api/payments/cancel`,
    });

    const approvalUrl = findApprovalUrl(order);
    if (!approvalUrl) {
      return { error: 'PayPal did not return an approval link' };
    }

    await recordOrderCreated(tx, order);
    revalidatePath(`/transactions/${tx.id}`);

    return {
      data: {
        orderId: order.id,
        approvalUrl,
        status: order.status,
      },
    };
  } catch (error) {
    return { error: getErrorMessage(error, 'PayPal payment creation failed') };
  }
}

export async function capturePayPalPayment(input: {
  order_id: string;
  transaction_id: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = capturePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { data: transaction } = await supabase
    .from('transactions')
    .select('buyer_id, seller_id')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (!transaction) {
    return { error: 'Transaction not found' };
  }

  if (
    transaction.buyer_id !== user.id &&
    transaction.seller_id !== user.id
  ) {
    return { error: 'Not a participant of this transaction' };
  }

  try {
    const result = await captureAndRecord({
      orderId: parsed.data.order_id,
      transactionId: parsed.data.transaction_id,
    });

    revalidatePath(`/transactions/${parsed.data.transaction_id}`);
    return { data: result };
  } catch (error) {
    return { error: getErrorMessage(error, 'PayPal capture failed') };
  }
}

export async function getPaymentEvents(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('payment_events')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as PaymentEvent[] };
}
