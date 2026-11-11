import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { firstRpcRow } from '@/lib/server/rpc';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { AgreementApproval } from '@/lib/types';
import { agreementApprovalSchema, uuidSchema } from '@/lib/validations';

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
    .from('agreement_approvals')
    .select(
      `
      *,
      user:profiles!agreement_approvals_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('agreement_id', agreementId)
    .eq('transaction_id', id)
    .order('decided_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as AgreementApproval[] });
}

export async function POST(request: Request, { params }: RouteParams) {
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
    partyOnly: true,
  });
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, agreementApprovalSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase.rpc('record_agreement_approval', {
    p_agreement_id: agreementId,
    p_decision: parsed.data.decision,
    p_comment: parsed.data.comment || null,
  });

  if (error) {
    const status = /not awaiting approval|already/i.test(error.message)
      ? 409
      : 400;
    return fail(error.message, status);
  }

  const approval = firstRpcRow(
    data as AgreementApproval | AgreementApproval[]
  );
  if (!approval) return fail('Approval could not be recorded', 500);

  if (approval.transaction_id !== id) {
    return fail('Agreement not found', 404);
  }

  return json({ data: approval }, 201);
}
