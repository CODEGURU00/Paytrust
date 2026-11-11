import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { DisputeStatement } from '@/lib/types';
import {
  createDisputeStatementSchema,
  uuidSchema,
} from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid dispute ID', 400);
  }

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id, transaction_id')
    .eq('id', id)
    .maybeSingle();

  if (disputeError) return fail(disputeError.message, 500);
  if (!dispute) return fail('Dispute not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    dispute.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('dispute_statements')
    .select(
      `
      *,
      author:profiles!dispute_statements_author_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('dispute_id', id)
    .order('created_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as DisputeStatement[] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid dispute ID', 400);
  }

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id, transaction_id, status')
    .eq('id', id)
    .maybeSingle();

  if (disputeError) return fail(disputeError.message, 500);
  if (!dispute) return fail('Dispute not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    dispute.transaction_id,
    user.id,
    { partyOnly: true }
  );
  if ('error' in access) return fail(access.error, access.status);

  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    return fail('Cannot add statements to a closed dispute', 409);
  }

  const parsed = await parseJsonBody(request, createDisputeStatementSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase
    .from('dispute_statements')
    .insert({
      dispute_id: id,
      transaction_id: dispute.transaction_id,
      author_id: user.id,
      statement: parsed.data.statement,
      evidence_ids: parsed.data.evidence_ids,
    })
    .select(
      `
      *,
      author:profiles!dispute_statements_author_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as DisputeStatement }, 201);
}
