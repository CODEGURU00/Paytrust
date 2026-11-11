import { fail, failAi, getAuthContext, json, parseJsonBody } from '@/lib/api';
import {
  generateMediatorSummary,
  type MediationEvidence,
  type MediationStatement,
} from '@/lib/ai';
import { logAuditEvent } from '@/lib/server/audit';
import { requireTransactionAccess } from '@/lib/server/transactions';
import { createAdminClient } from '@/lib/supabase/server';
import type { MediationResult } from '@/lib/types';
import { mediatorRequestSchema } from '@/lib/validations';

// NVIDIA reasoning-model calls measured at 70-250s.
export const maxDuration = 300;

const MEDIATION_DISCLAIMER =
  'This is an informational summary of the recorded dispute statements. It is not a finding of fault, a legal opinion, or a decision about the outcome.';

interface StatementRow {
  statement: string;
  created_at: string;
  author_id: string;
  author: { display_name: string } | null;
}

interface EvidenceRow {
  file_name: string;
  kind: string | null;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  uploader: { display_name: string } | null;
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const parsed = await parseJsonBody(request, mediatorRequestSchema);
  if ('response' in parsed) return parsed.response;

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id, transaction_id, status, reason')
    .eq('id', parsed.data.dispute_id)
    .maybeSingle();

  if (disputeError) return fail(disputeError.message, 500);
  if (!dispute) return fail('Dispute not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    dispute.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  const [statementsResult, evidenceResult] = await Promise.all([
    supabase
      .from('dispute_statements')
      .select(
        `
        statement,
        created_at,
        author_id,
        author:profiles!dispute_statements_author_id_fkey(display_name)
      `
      )
      .eq('dispute_id', dispute.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('attachments')
      .select(
        `
        file_name,
        kind,
        description,
        uploaded_by,
        created_at,
        uploader:profiles!attachments_uploaded_by_fkey(display_name)
      `
      )
      .eq('transaction_id', dispute.transaction_id)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  if (statementsResult.error) return fail(statementsResult.error.message, 500);
  if (evidenceResult.error) return fail(evidenceResult.error.message, 500);

  const transaction = access.data.transaction;
  const roleFor = (authorId: string) => {
    if (authorId === transaction.buyer_id) return 'buyer';
    if (authorId === transaction.seller_id) return 'seller';
    return 'witness';
  };

  const statements: MediationStatement[] = ((statementsResult.data ||
    []) as unknown as StatementRow[]).map((row) => ({
    author: row.author?.display_name || 'Participant',
    author_role: roleFor(row.author_id),
    statement: row.statement,
    created_at: row.created_at,
  }));

  const evidence: MediationEvidence[] = ((evidenceResult.data ||
    []) as unknown as EvidenceRow[]).map((row) => ({
    file_name: row.file_name,
    kind: row.kind,
    description: row.description,
    uploaded_by: row.uploader?.display_name || 'Participant',
    created_at: row.created_at,
  }));

  let summary: string;
  try {
    summary = await generateMediatorSummary({
      transaction,
      dispute: { reason: dispute.reason, status: dispute.status },
      statements,
      evidence,
    });
  } catch (error) {
    return failAi(error);
  }

  const generatedAt = new Date().toISOString();
  const admin = await createAdminClient();

  const { error: updateError } = await admin
    .from('disputes')
    .update({ ai_summary: summary })
    .eq('id', dispute.id);

  if (updateError) return fail(updateError.message, 500);

  const sourceVersion = `dispute:${dispute.id}:statements:${statements.length}:evidence:${evidence.length}`;

  const { error: summaryError } = await admin.from('ai_summaries').insert({
    transaction_id: dispute.transaction_id,
    summary_type: 'dispute_mediation',
    summary,
    source_version: sourceVersion,
  });

  if (summaryError) {
    console.error(
      'Could not archive AI mediation summary:',
      summaryError.message
    );
  }

  await logAuditEvent({
    transactionId: dispute.transaction_id,
    actorId: user.id,
    eventType: 'ai.mediator_summary_generated',
    metadata: {
      dispute_id: dispute.id,
      statement_count: statements.length,
      evidence_count: evidence.length,
    },
  });

  const result: MediationResult = {
    dispute_id: dispute.id,
    summary,
    disclaimer: MEDIATION_DISCLAIMER,
    generated_at: generatedAt,
    source: {
      statements: statements.length,
      evidence: evidence.length,
    },
  };

  return json({ data: result });
}
