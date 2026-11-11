import { fail, failAi, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { generateDealDna, getConfiguredAiModel } from '@/lib/ai';
import { logAuditEvent } from '@/lib/server/audit';
import { firstRpcRow } from '@/lib/server/rpc';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { AgreementVersion, DealDnaExtraction } from '@/lib/types';
import { dealDnaRequestSchema } from '@/lib/validations';

// A single Deal DNA extraction measured at ~218s on Mistral Large 4.
export const maxDuration = 300;

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const parsed = await parseJsonBody(request, dealDnaRequestSchema);
  if ('response' in parsed) return parsed.response;

  const access = await requireTransactionAccess(
    supabase,
    parsed.data.transaction_id,
    user.id,
    { minPermission: 'full' }
  );
  if ('error' in access) return fail(access.error, access.status);

  const { data: messages, error: messagesError } = await supabase
    .from('transaction_messages')
    .select('content, created_at, sender_id')
    .eq('transaction_id', parsed.data.transaction_id)
    .order('created_at', { ascending: true })
    .limit(200);

  if (messagesError) return fail(messagesError.message, 500);

  let result;
  try {
    result = await generateDealDna(
      access.data.transaction,
      messages || [],
      parsed.data.source_text
    );
  } catch (error) {
    return failAi(error);
  }

  const extraction: DealDnaExtraction = result.extraction;
  const model = result.model || getConfiguredAiModel();

  const { data, error } = await supabase.rpc('create_agreement_version', {
    p_transaction_id: parsed.data.transaction_id,
    p_terms: extraction.terms,
    p_source: 'ai',
    p_source_context: {
      summary: extraction.summary,
      missing_terms: extraction.missing_terms,
      uncertainties: extraction.uncertainties,
      message_count: messages?.length || 0,
      source_text_supplied: Boolean(parsed.data.source_text?.trim()),
      generated_at: new Date().toISOString(),
    },
    p_ai_model: model,
    p_ai_confidence: extraction.confidence,
  });

  if (error) {
    const status = /already awaiting approval/i.test(error.message) ? 409 : 400;
    return fail(error.message, status);
  }

  const agreement = firstRpcRow(data as AgreementVersion | AgreementVersion[]);
  if (!agreement) return fail('AI draft could not be created', 500);

  await logAuditEvent({
    transactionId: parsed.data.transaction_id,
    actorId: user.id,
    eventType: 'ai.deal_dna_generated',
    metadata: {
      agreement_id: agreement.id,
      version: agreement.version,
      model,
      confidence: extraction.confidence,
      missing_terms: extraction.missing_terms.length,
      uncertainties: extraction.uncertainties.length,
    },
  });

  return json(
    {
      data: {
        agreement,
        extraction,
        model,
      },
    },
    201
  );
}
