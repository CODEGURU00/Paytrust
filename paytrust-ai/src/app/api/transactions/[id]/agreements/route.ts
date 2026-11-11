import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { firstRpcRow } from '@/lib/server/rpc';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { AgreementVersion } from '@/lib/types';
import { createAgreementSchema, uuidSchema } from '@/lib/validations';

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
    .eq('transaction_id', id)
    .order('version', { ascending: false });

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as AgreementVersion[] });
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

  const parsed = await parseJsonBody(request, createAgreementSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase.rpc('create_agreement_version', {
    p_transaction_id: id,
    p_terms: parsed.data.terms,
    p_source: 'manual',
    p_source_context: {},
    p_ai_model: null,
    p_ai_confidence: null,
  });

  if (error) {
    const status = error.message.includes('already awaiting approval') ? 409 : 400;
    return fail(error.message, status);
  }

  const agreement = firstRpcRow(data as AgreementVersion | AgreementVersion[]);
  if (!agreement) return fail('Agreement could not be created', 500);

  return json({ data: agreement }, 201);
}
