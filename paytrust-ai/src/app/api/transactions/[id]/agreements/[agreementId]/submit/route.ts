import { fail, getAuthContext, json } from '@/lib/api';
import { firstRpcRow } from '@/lib/server/rpc';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { AgreementVersion } from '@/lib/types';
import { uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string; agreementId: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
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

  const { data, error } = await supabase.rpc(
    'submit_agreement_for_approval',
    { p_agreement_id: agreementId }
  );

  if (error) return fail(error.message, 400);

  const agreement = firstRpcRow(data as AgreementVersion | AgreementVersion[]);
  if (!agreement) return fail('Agreement could not be submitted', 500);

  if (agreement.transaction_id !== id) {
    return fail('Agreement not found', 404);
  }

  return json({ data: agreement });
}
