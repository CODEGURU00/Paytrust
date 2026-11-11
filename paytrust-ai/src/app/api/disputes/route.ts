import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Dispute } from '@/lib/types';
import { createDisputeSchema, uuidSchema } from '@/lib/validations';

export async function GET(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const url = new URL(request.url);
  const transactionId = url.searchParams.get('transaction_id');
  const status = url.searchParams.get('status');

  let query = supabase
    .from('disputes')
    .select(
      `
      *,
      transaction:transactions(*),
      opener:profiles!disputes_opened_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .order('created_at', { ascending: false });

  if (transactionId) {
    if (!uuidSchema.safeParse(transactionId).success) {
      return fail('Invalid transaction ID', 400);
    }
    query = query.eq('transaction_id', transactionId);
  }

  if (status) {
    const allowed = ['draft', 'open', 'under_review', 'resolved', 'closed'];
    if (!allowed.includes(status)) return fail('Invalid dispute status', 400);
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as Dispute[] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const parsed = await parseJsonBody(request, createDisputeSchema);
  if ('response' in parsed) return parsed.response;

  const access = await requireTransactionAccess(
    supabase,
    parsed.data.transaction_id,
    user.id,
    { partyOnly: true }
  );
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      transaction_id: parsed.data.transaction_id,
      opened_by: user.id,
      status: 'draft',
      reason: parsed.data.reason,
      report: parsed.data.report || null,
    })
    .select(
      `
      *,
      transaction:transactions(*),
      opener:profiles!disputes_opened_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as Dispute }, 201);
}
