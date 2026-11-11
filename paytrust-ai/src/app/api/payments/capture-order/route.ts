import { getAuthContext, fail, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';
import { getErrorMessage } from '@/lib/errors';
import { PayPalError } from '@/lib/paypal';
import { captureAndRecord } from '@/lib/payments';
import { capturePaymentSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const { user } = await getAuthContext(request);
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = capturePaymentSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const admin = await createAdminClient();
  const { data: transaction } = await admin
    .from('transactions')
    .select('buyer_id, seller_id')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (!transaction) return fail('Transaction not found', 404);

  /*
   * Only the buyer captures. The seller has no reason to capture, and letting
   * them do so meant a seller could present their own PayPal order against a
   * transaction and mark the escrow as funded.
   */
  if (transaction.buyer_id !== user.id) {
    return fail('Only the buyer can capture this payment', 403);
  }

  try {
    const result = await captureAndRecord({
      orderId: parsed.data.order_id,
      transactionId: parsed.data.transaction_id,
    });

    return json({ data: result });
  } catch (error) {
    const status = error instanceof PayPalError ? error.status : 502;
    return fail(getErrorMessage(error, 'PayPal capture failed'), status);
  }
}
