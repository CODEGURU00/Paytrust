import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Commitment } from '@/lib/types';
import { createCommitmentSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id);
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('commitments')
    .select(
      `
      *,
      owner:profiles!commitments_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      creator:profiles!commitments_created_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('transaction_id', id)
    .order('created_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as Commitment[] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id, {
    minPermission: 'full',
  });
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, createCommitmentSchema);
  if ('response' in parsed) return parsed.response;

  const ownerId = parsed.data.owner_id || user.id;

  const { data: ownerIsMember, error: memberError } = await supabase.rpc(
    'is_transaction_member',
    { check_transaction_id: id, check_user_id: ownerId }
  );

  if (memberError) return fail(memberError.message, 500);
  if (!ownerIsMember) {
    return fail('Commitment owner must be a transaction participant', 400);
  }

  if (parsed.data.agreement_id) {
    const { data: agreement } = await supabase
      .from('agreement_versions')
      .select('id')
      .eq('id', parsed.data.agreement_id)
      .eq('transaction_id', id)
      .maybeSingle();

    if (!agreement) return fail('Agreement not found for this transaction', 404);
  }

  const { data, error } = await supabase
    .from('commitments')
    .insert({
      transaction_id: id,
      agreement_id: parsed.data.agreement_id || null,
      owner_id: ownerId,
      created_by: user.id,
      description: parsed.data.description,
      due_at: parsed.data.due_at || null,
    })
    .select(
      `
      *,
      owner:profiles!commitments_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      creator:profiles!commitments_created_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as Commitment }, 201);
}
