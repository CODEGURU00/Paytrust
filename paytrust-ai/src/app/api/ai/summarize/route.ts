import { fail, failAi, getAuthContext, json } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';
import { generateSummary, type SummaryType } from '@/lib/ai';
import { aiSummarizeSchema } from '@/lib/validations';

// NVIDIA reasoning-model calls measured at 70-250s, so allow the maximum
// serverless budget instead of the default short timeout.
export const maxDuration = 300;

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

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = aiSummarizeSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('id, buyer_id, seller_id, title, description, amount, currency, status')
    .eq('id', parsed.data.transaction_id)
    .single();

  if (transactionError || !transaction) {
    return fail('Transaction not found', 404);
  }

  if (
    transaction.buyer_id !== user.id &&
    transaction.seller_id !== user.id
  ) {
    return fail('Not a participant of this transaction', 403);
  }

  const { data: messages, error: messagesError } = await supabase
    .from('transaction_messages')
    .select('content, created_at, sender_id')
    .eq('transaction_id', parsed.data.transaction_id)
    .order('created_at', { ascending: true });

  if (messagesError) return fail(messagesError.message, 500);

  try {
    const summary = await generateSummary(
      parsed.data.type as SummaryType,
      transaction as TransactionForSummary,
      (messages || []) as MessageForSummary[]
    );

    const admin = await createAdminClient();
    const { data, error } = await admin
      .from('ai_summaries')
      .insert({
        transaction_id: parsed.data.transaction_id,
        summary_type: parsed.data.type,
        summary,
        source_version: `${(messages || []).length} messages`,
      })
      .select('*')
      .single();

    if (error) return fail(error.message, 500);

    return json({ data });
  } catch (error) {
    return failAi(error, 'AI summary generation failed');
  }
}
