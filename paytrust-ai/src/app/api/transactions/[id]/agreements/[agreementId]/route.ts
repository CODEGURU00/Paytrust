import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { firstRpcRow } from '@/lib/server/rpc';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { AgreementVersion } from '@/lib/types';
import { updateAgreementSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string; agreementId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id, agreementId } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (
    !uuidSchema.safeParse(id).success ||
    !uuidSchema.safeParse(agreementId).success
  ) {
    return fail('Invalid ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id);
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('agreement_versions')
    .select(
      `
      *,
      creator:profiles!agreement_versions_created_by_fkey(${PUBLIC_PROFILE_COLUMNS}),
      approvals:agreement_approvals(
        *,
        user:profiles!agreement_approvals_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
      ),
      change_requests:agreement_change_requests(
        *,
        requester:profiles!agreement_change_requests_requested_by_fkey(${PUBLIC_PROFILE_COLUMNS})
      )
    `
    )
    .eq('id', agreementId)
    .eq('transaction_id', id)
    .single();

  if (error || !data) return fail('Agreement not found', 404);

  return json({ data: data as unknown as AgreementVersion });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, agreementId } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (
    !uuidSchema.safeParse(id).success ||
    !uuidSchema.safeParse(agreementId).success
  ) {
    return fail('Invalid ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id, {
    minPermission: 'full',
  });
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, updateAgreementSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase.rpc('update_agreement_draft', {
    p_agreement_id: agreementId,
    p_terms: parsed.data.terms,
  });

  if (error) return fail(error.message, 400);

  const agreement = firstRpcRow(data as AgreementVersion | AgreementVersion[]);
  if (!agreement) return fail('Agreement could not be updated', 500);

  if (agreement.transaction_id !== id) {
    return fail('Agreement not found', 404);
  }

  return json({ data: agreement });
}
