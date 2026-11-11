import { fail, getAuthContext, json } from '@/lib/api';
import { sendMessageSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = sendMessageSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const { data: transaction } = await supabase
    .from('transactions')
    .select('buyer_id, seller_id')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (!transaction) return fail('Transaction not found', 404);

  if (
    transaction.buyer_id !== user.id &&
    transaction.seller_id !== user.id
  ) {
    return fail('Not a participant of this transaction', 403);
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .insert({ ...parsed.data, sender_id: user.id })
    .select('*')
    .single();

  if (error) return fail(error.message, 500);

  return json({ data }, 201);
}
