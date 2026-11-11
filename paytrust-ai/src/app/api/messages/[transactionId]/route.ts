import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  const { transactionId } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  // RLS restricts rows to participants, but checking here gives a proper 404
  // instead of an indistinguishable empty list.
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', transactionId)
    .single();

  if (!transaction) return fail('Transaction not found', 404);

  const { data, error } = await supabase
    .from('transaction_messages')
    .select(
      `
      *,
      sender:profiles(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data });
}
