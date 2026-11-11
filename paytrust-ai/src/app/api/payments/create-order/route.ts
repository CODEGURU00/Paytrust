import { getAuthContext, fail, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/env';
import { getErrorMessage } from '@/lib/errors';
import { createPaymentSchema } from '@/lib/validations';
import {
  createPayPalOrder,
  findApprovalUrl,
  getPayPalOrder,
  PayPalError,
} from '@/lib/paypal';
import { recordOrderCreated } from '@/lib/payments';
import type { Transaction } from '@/lib/types';

const TERMINAL_STATUSES = ['COMPLETED', 'REFUNDED', 'CANCELLED'];

export async function POST(request: Request) {
  const { user } = await getAuthContext(request);
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = createPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const admin = await createAdminClient();
  const { data: transaction, error } = await admin
    .from('transactions')
    .select('*')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (error || !transaction) return fail('Transaction not found', 404);

  const tx = transaction as Transaction & { paypal_order_id?: string | null };

  if (tx.buyer_id !== user.id) {
    return fail('Only the buyer can pay for this transaction', 403);
  }

  if (TERMINAL_STATUSES.includes(tx.status)) {
    return fail(`This transaction is already ${tx.status.toLowerCase()}`, 409);
  }

  try {
    // Reuse an existing, still-payable order instead of creating a new one.
    if (tx.paypal_order_id) {
      try {
        const existingOrder = await getPayPalOrder(tx.paypal_order_id);
        const approvalUrl = findApprovalUrl(existingOrder);

        if (
          approvalUrl &&
          ['CREATED', 'APPROVED', 'PAYER_ACTION_REQUIRED'].includes(
            existingOrder.status
          )
        ) {
          return json({
            data: {
              orderId: existingOrder.id,
              approvalUrl,
              status: existingOrder.status,
            },
          });
        }
      } catch {
        // The previous order is unusable. Create a fresh one below.
      }
    }

    const appUrl = getAppUrl(request.url);
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
      return fail('PayPal did not return an approval link', 502);
    }

    await recordOrderCreated(tx, order);

    return json({
      data: {
        orderId: order.id,
        approvalUrl,
        status: order.status,
      },
    });
  } catch (error) {
    const status = error instanceof PayPalError ? error.status : 502;
    return fail(getErrorMessage(error, 'PayPal payment creation failed'), status);
  }
}
