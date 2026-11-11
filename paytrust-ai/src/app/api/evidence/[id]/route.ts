import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Attachment } from '@/lib/types';
import { updateEvidenceSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid evidence ID', 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('attachments')
    .select('id, transaction_id, uploaded_by, version')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail('Evidence not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    existing.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  if (existing.uploaded_by !== user.id) {
    return fail('Only the uploader may edit this evidence', 403);
  }

  const parsed = await parseJsonBody(request, updateEvidenceSchema);
  if ('response' in parsed) return parsed.response;

  const update: Record<string, unknown> = { ...parsed.data };

  if (parsed.data.supersedes_id) {
    if (parsed.data.supersedes_id === id) {
      return fail('Evidence cannot supersede itself', 400);
    }

    const { data: superseded, error: supersededError } = await supabase
      .from('attachments')
      .select('id, transaction_id, version')
      .eq('id', parsed.data.supersedes_id)
      .eq('transaction_id', existing.transaction_id)
      .maybeSingle();

    if (supersededError) return fail(supersededError.message, 500);
    if (!superseded) {
      return fail('Superseded evidence not found for this transaction', 404);
    }

    update.version = (superseded.version || 1) + 1;
  }

  const { data, error } = await supabase
    .from('attachments')
    .update(update)
    .eq('id', id)
    .select(
      `
      *,
      uploader:profiles!attachments_uploaded_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as Attachment });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid evidence ID', 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('attachments')
    .select('id, transaction_id, uploaded_by, storage_path')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail('Evidence not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    existing.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  if (existing.uploaded_by !== user.id) {
    return fail('Only the uploader may delete this evidence', 403);
  }

  const { error: deleteError } = await supabase
    .from('attachments')
    .delete()
    .eq('id', id);

  if (deleteError) return fail(deleteError.message, 400);

  const { error: storageError } = await supabase.storage
    .from('attachments')
    .remove([existing.storage_path]);

  if (storageError) {
    // The metadata row is gone; report success but leave a server-side note.
    console.error(
      'Evidence metadata deleted but storage object removal failed:',
      storageError.message
    );
  }

  return json({ data: { id } });
}
