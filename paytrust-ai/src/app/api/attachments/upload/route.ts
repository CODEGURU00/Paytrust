import { fail, getAuthContext, json } from '@/lib/api';
import {
  sanitizeFileName,
  validateAttachment,
  validateAttachmentContent,
} from '@/lib/attachments';
import { requireTransactionAccess } from '@/lib/server/transactions';
import {
  evidenceMetadataSchema,
  type EvidenceMetadataInput,
} from '@/lib/validations';

function inferEvidenceKind(mimeType: string): EvidenceMetadataInput['kind'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType === 'application/pdf' ||
    mimeType === 'application/msword' ||
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'document';
  }
  return 'file';
}

function readOptionalString(
  formData: FormData,
  name: string
): string | null {
  const value = formData.get(name);
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const formData = await request.formData().catch(() => null);
  if (!formData) return fail('Invalid form data', 400);

  const file = formData.get('file');
  const transactionId = formData.get('transaction_id');

  if (!(file instanceof File) || typeof transactionId !== 'string') {
    return fail('Missing file or transaction_id', 400);
  }

  if (!/^[0-9a-f-]{36}$/i.test(transactionId)) {
    return fail('Invalid transaction ID', 400);
  }

  const validationError = validateAttachment({
    name: file.name,
    type: file.type,
    size: file.size,
  });
  if (validationError) return fail(validationError, 400);

  const access = await requireTransactionAccess(
    supabase,
    transactionId,
    user.id,
    { minPermission: 'comment' }
  );
  if ('error' in access) return fail(access.error, access.status);

  const rawMetadata = {
    ...(readOptionalString(formData, 'kind')
      ? { kind: readOptionalString(formData, 'kind') }
      : {}),
    ...(readOptionalString(formData, 'description')
      ? { description: readOptionalString(formData, 'description') }
      : {}),
    ...(readOptionalString(formData, 'visibility')
      ? { visibility: readOptionalString(formData, 'visibility') }
      : {}),
    ...(readOptionalString(formData, 'commitment_id')
      ? { commitment_id: readOptionalString(formData, 'commitment_id') }
      : {}),
    ...(readOptionalString(formData, 'milestone_id')
      ? { milestone_id: readOptionalString(formData, 'milestone_id') }
      : {}),
    ...(readOptionalString(formData, 'supersedes_id')
      ? { supersedes_id: readOptionalString(formData, 'supersedes_id') }
      : {}),
  };

  const parsedMetadata = evidenceMetadataSchema.safeParse(rawMetadata);
  if (!parsedMetadata.success) {
    return fail(
      parsedMetadata.error.issues[0]?.message || 'Invalid evidence metadata',
      400
    );
  }

  let version = 1;
  if (parsedMetadata.data.supersedes_id) {
    const { data: superseded, error: supersededError } = await supabase
      .from('attachments')
      .select('id, transaction_id, version')
      .eq('id', parsedMetadata.data.supersedes_id)
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (supersededError) return fail(supersededError.message, 500);
    if (!superseded) {
      return fail('Superseded evidence not found for this transaction', 404);
    }

    version = (superseded.version || 1) + 1;
  }

  const safeName = sanitizeFileName(file.name);
  const filePath = `${transactionId}/${crypto.randomUUID()}-${safeName}`;
  const bytes = await file.arrayBuffer();
  const contentError = validateAttachmentContent(
    new Uint8Array(bytes),
    file.type
  );
  if (contentError) return fail(contentError, 400);
  const checksum = await sha256Hex(bytes);

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return fail(uploadError.message, 500);

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      transaction_id: transactionId,
      uploaded_by: user.id,
      file_name: safeName,
      storage_path: filePath,
      mime_type: file.type,
      size_bytes: bytes.byteLength,
      kind: parsedMetadata.data.kind || inferEvidenceKind(file.type),
      description: parsedMetadata.data.description || null,
      visibility: parsedMetadata.data.visibility || 'participants',
      commitment_id: parsedMetadata.data.commitment_id || null,
      milestone_id: parsedMetadata.data.milestone_id || null,
      supersedes_id: parsedMetadata.data.supersedes_id || null,
      version,
      checksum,
    })
    .select('*')
    .single();

  if (error) {
    // Do not leave an orphaned object in storage when the DB insert fails.
    await supabase.storage.from('attachments').remove([filePath]);
    return fail(error.message, 500);
  }

  const { error: accessLogError } = await supabase
    .from('evidence_access_log')
    .insert({
      attachment_id: data.id,
      transaction_id: transactionId,
      user_id: user.id,
      action: 'uploaded',
    });

  if (accessLogError) {
    console.error('Could not record evidence access:', accessLogError.message);
  }

  return json({ data }, 201);
}
