'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  validateAttachment,
  sanitizeFileName,
} from '@/lib/attachments';
import { getErrorMessage } from '@/lib/errors';
import type { Attachment } from '@/lib/types';

async function assertParticipant(
  transactionId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createClient();
  const { data: transaction } = await supabase
    .from('transactions')
    .select('buyer_id, seller_id')
    .eq('id', transactionId)
    .single();

  if (!transaction) return 'Transaction not found';
  if (
    transaction.buyer_id !== userId &&
    transaction.seller_id !== userId
  ) {
    return 'Not a participant of this transaction';
  }
  return null;
}

export async function uploadAttachment(
  transactionId: string,
  fileName: string,
  fileBytes: Uint8Array,
  mimeType: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const validationError = validateAttachment({
    name: fileName,
    type: mimeType,
    size: fileBytes.length,
  });
  if (validationError) {
    return { error: validationError };
  }

  const participantError = await assertParticipant(transactionId, user.id);
  if (participantError) {
    return { error: participantError };
  }

  const safeName = sanitizeFileName(fileName);
  const filePath = `${transactionId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('attachments')
    .upload(filePath, fileBytes, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data, error } = await supabase
    .from('attachments')
    .insert({
      transaction_id: transactionId,
      uploaded_by: user.id,
      file_name: safeName,
      storage_path: filePath,
      mime_type: mimeType,
      size_bytes: fileBytes.length,
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from('attachments').remove([filePath]);
    return { error: error.message };
  }

  revalidatePath(`/transactions/${transactionId}`);
  return { data: data as Attachment };
}

export async function getAttachments(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('attachments')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as Attachment[] };
}

export async function getAttachmentUrl(storagePath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase.storage
      .from('attachments')
      .createSignedUrl(storagePath, 3600);

    if (error) {
      return { error: error.message };
    }

    return { data };
  } catch (error) {
    return { error: getErrorMessage(error, 'Could not create signed URL') };
  }
}
