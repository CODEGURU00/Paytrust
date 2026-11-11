import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Attachment, EvidenceAccessAction } from '@/lib/types';
import { uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const SIGNED_URL_EXPIRY_SECONDS = 600;

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid evidence ID', 400);
  }

  const url = new URL(request.url);
  const actionParam = url.searchParams.get('action') || 'view';
  if (actionParam !== 'view' && actionParam !== 'download') {
    return fail('Invalid access action', 400);
  }
  const action: EvidenceAccessAction =
    actionParam === 'download' ? 'downloaded' : 'viewed';

  const { data, error } = await supabase
    .from('attachments')
    .select(
      `
      *,
      uploader:profiles!attachments_uploaded_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!data) return fail('Evidence not found', 404);

  const attachment = data as unknown as Attachment;

  const access = await requireTransactionAccess(
    supabase,
    attachment.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  // RLS enforces this too, but make the rule explicit in application code.
  if (
    attachment.visibility === 'private' &&
    attachment.uploaded_by !== user.id
  ) {
    return fail('This evidence is private', 403);
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('attachments')
    .createSignedUrl(
      attachment.storage_path,
      SIGNED_URL_EXPIRY_SECONDS,
      actionParam === 'download'
        ? { download: attachment.file_name }
        : undefined
    );

  if (signedError || !signed?.signedUrl) {
    return fail(signedError?.message || 'Could not create signed URL', 500);
  }

  const { error: accessLogError } = await supabase
    .from('evidence_access_log')
    .insert({
      attachment_id: attachment.id,
      transaction_id: attachment.transaction_id,
      user_id: user.id,
      action,
    });

  if (accessLogError) {
    console.error('Could not record evidence access:', accessLogError.message);
  }

  return json({
    data: {
      attachment,
      signed_url: signed.signedUrl,
      expires_in: SIGNED_URL_EXPIRY_SECONDS,
      action: actionParam,
    },
  });
}
