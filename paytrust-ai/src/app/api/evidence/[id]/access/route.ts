import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { EvidenceAccessLog } from '@/lib/types';
import { uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid evidence ID', 400);
  }

  const { data: attachment, error: attachmentError } = await supabase
    .from('attachments')
    .select('id, transaction_id, uploaded_by, visibility')
    .eq('id', id)
    .maybeSingle();

  if (attachmentError) return fail(attachmentError.message, 500);
  if (!attachment) return fail('Evidence not found', 404);

  if (
    attachment.visibility === 'private' &&
    attachment.uploaded_by !== user.id
  ) {
    return fail('This evidence is private', 403);
  }

  const access = await requireTransactionAccess(
    supabase,
    attachment.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('evidence_access_log')
    .select(
      `
      *,
      user:profiles!evidence_access_log_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('attachment_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as unknown as EvidenceAccessLog[] });
}
