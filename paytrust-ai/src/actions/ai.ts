'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { generateSummary, type SummaryType } from '@/lib/ai';
import { getErrorMessage } from '@/lib/errors';
import {
  aiSummarizeSchema,
  type AISummarizeInput,
} from '@/lib/validations';
import type { AISummary } from '@/lib/types';

interface TransactionForSummary {
  id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
}

interface MessageForSummary {
  content: string;
  created_at: string;
  sender_id: string;
}

async function loadAuthorizedTransaction(
  transactionId: string,
  userId: string
): Promise<
  | { transaction: TransactionForSummary; messages: MessageForSummary[] }
  | { error: string }
> {
  const supabase = await createClient();

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('id, buyer_id, seller_id, title, description, amount, currency, status')
    .eq('id', transactionId)
    .single();

  if (transactionError || !transaction) {
    return { error: 'Transaction not found' };
  }

  if (
    transaction.buyer_id !== userId &&
    transaction.seller_id !== userId
  ) {
    return { error: 'Not a participant of this transaction' };
  }

  const { data: messages, error: messagesError } = await supabase
    .from('transaction_messages')
    .select('content, created_at, sender_id')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: true });

  if (messagesError) {
    return { error: messagesError.message };
  }

  return {
    transaction: transaction as TransactionForSummary,
    messages: (messages || []) as MessageForSummary[],
  };
}

export async function generateAISummary(input: AISummarizeInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = aiSummarizeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const loaded = await loadAuthorizedTransaction(
    parsed.data.transaction_id,
    user.id
  );
  if ('error' in loaded) {
    return { error: loaded.error };
  }

  try {
    const summary = await generateSummary(
      parsed.data.type as SummaryType,
      loaded.transaction,
      loaded.messages
    );

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('ai_summaries')
      .insert({
        transaction_id: parsed.data.transaction_id,
        summary_type: parsed.data.type,
        summary,
        source_version: `${loaded.messages.length} messages`,
      })
      .select('*')
      .single();

    if (error) {
      return { error: error.message };
    }

    revalidatePath(`/transactions/${parsed.data.transaction_id}`);
    return { data: data as AISummary };
  } catch (error) {
    return { error: getErrorMessage(error, 'AI summary generation failed') };
  }
}

export async function getAISummaries(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('ai_summaries')
    .select('*')
    .eq('transaction_id', transactionId)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as AISummary[] };
}
