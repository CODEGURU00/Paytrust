import { fail, getAuthContext, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';
import { releaseEscrowAndRecord } from '@/lib/payments';

export async function POST(request: Request) {
  const { user } = await getAuthContext(request);
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const transactionId = body?.transaction_id;

  if (!transactionId || typeof transactionId !== 'string') {
    return fail('transaction_id is required', 400);
  }

  const admin = await createAdminClient();
  const { data: transaction, error } = await admin
    .from('transactions')
    .select('buyer_id, seller_id, status')
    .eq('id', transactionId)
    .single();

  if (error || !transaction) {
    return fail('Transaction not found', 404);
  }

  if (transaction.buyer_id !== user.id) {
    return fail('Only the buyer can release escrow funds', 403);
  }

  try {
    const result = await releaseEscrowAndRecord({
      transactionId,
      releasedByUserId: user.id,
    });

    return json({ data: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Release failed';
    return fail(message, 500);
  }
}
