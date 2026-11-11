'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import {
  sendMessageSchema,
  type SendMessageInput,
} from '@/lib/validations';
import type { Message } from '@/lib/types';

async function assertParticipant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  transactionId: string,
  userId: string
) {
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

export async function sendMessage(input: SendMessageInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = sendMessageSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const participantError = await assertParticipant(
    supabase,
    parsed.data.transaction_id,
    user.id
  );
  if (participantError) {
    return { error: participantError };
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .insert({
      ...parsed.data,
      sender_id: user.id,
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/transactions/${parsed.data.transaction_id}`);
  return { data: data as Message };
}

export async function getMessages(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .select(`
      *,
      sender:profiles(${PUBLIC_PROFILE_COLUMNS})
    `)
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as unknown as Message[] };
}
