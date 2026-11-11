'use server';

import { createClient } from '@/lib/supabase/server';
import { getErrorMessage } from '@/lib/errors';
import {
  qrPayloadSchema,
  qrGenerateSchema,
  type QRPayloadInput,
} from '@/lib/validations';
import type { QRPayload } from '@/lib/types';

export async function saveQRPayload(input: QRPayloadInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = qrPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { data, error } = await supabase
    .from('qr_payloads')
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  return { data: data as QRPayload };
}

export async function getQRPayloads() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('qr_payloads')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as QRPayload[] };
}

export async function generateQRCode(data: string) {
  const parsed = qrGenerateSchema.safeParse({ data });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  try {
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(parsed.data.data);
    return { data: qrDataUrl };
  } catch (error) {
    return { error: getErrorMessage(error, 'QR code generation failed') };
  }
}
