import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Commitment } from '@/lib/types';
import { updateCommitmentSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string; commitmentId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, commitmentId } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (
    !uuidSchema.safeParse(id).success ||
    !uuidSchema.safeParse(commitmentId).success
  ) {
    return fail('Invalid ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id, {
    minPermission: 'full',
  });
  if ('error' in access) return fail(access.error, access.status);

  const { data: existing, error: existingError } = await supabase
    .from('commitments')
    .select('id, transaction_id, owner_id, created_by, status')
    .eq('id', commitmentId)
    .eq('transaction_id', id)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail('Commitment not found', 404);

  const parsed = await parseJsonBody(request, updateCommitmentSchema);
  if ('response' in parsed) return parsed.response;

  if (parsed.data.owner_id) {
    const { data: ownerIsMember, error: memberError } = await supabase.rpc(
      'is_transaction_member',
      { check_transaction_id: id, check_user_id: parsed.data.owner_id }
    );

    if (memberError) return fail(memberError.message, 500);
    if (!ownerIsMember) {
      return fail('Commitment owner must be a transaction participant', 400);
    }
  }

  if (
    parsed.data.status === 'completed' &&
    existing.status === 'cancelled'
  ) {
    return fail('A cancelled commitment cannot be completed', 409);
  }

  const { data, error } = await supabase
    .from('commitments')
    .update(parsed.data)
    .eq('id', commitmentId)
    .eq('transaction_id', id)
    .select(
      `
      *,
      owner:profiles!commitments_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      creator:profiles!commitments_created_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as Commitment });
}
