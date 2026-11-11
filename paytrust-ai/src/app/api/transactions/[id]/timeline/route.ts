import { fail, getAuthContext, json } from '@/lib/api';
import { requireTransactionAccess } from '@/lib/server/transactions';
import {
  buildTransactionTimeline,
  type TimelineAgreement,
  type TimelineApproval,
  type TimelineAudit,
  type TimelineChangeRequest,
  type TimelineCommitment,
  type TimelineDispute,
  type TimelineEvidence,
  type TimelineMessage,
  type TimelineMilestone,
  type TimelineParticipant,
  type TimelinePayment,
  type TimelineStatement,
} from '@/lib/server/timeline';
import { uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id);
  if ('error' in access) return fail(access.error, access.status);

  const [
    messagesResult,
    paymentsResult,
    auditsResult,
    agreementsResult,
    approvalsResult,
    changeRequestsResult,
    commitmentsResult,
    milestonesResult,
    evidenceResult,
    disputesResult,
    statementsResult,
    participantsResult,
  ] = await Promise.all([
    supabase
      .from('transaction_messages')
      .select('id, sender_id, content, created_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true })
      .limit(500),
    supabase
      .from('payment_events')
      .select('id, event_type, amount, currency, payload_summary, created_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true })
      .limit(200),
    supabase
      .from('audit_events')
      .select('id, actor_id, event_type, metadata, created_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('agreement_versions')
      .select('id, version, status, source, created_at, approved_at')
      .eq('transaction_id', id)
      .order('version', { ascending: true }),
    supabase
      .from('agreement_approvals')
      .select('id, agreement_id, user_id, decision, decided_at')
      .eq('transaction_id', id)
      .order('decided_at', { ascending: true }),
    supabase
      .from('agreement_change_requests')
      .select('id, agreement_id, description, status, created_at, resolved_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('commitments')
      .select('id, owner_id, description, status, created_at, completed_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('milestones')
      .select('id, title, amount, currency, status, created_at, paid_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('attachments')
      .select('id, file_name, kind, uploaded_by, created_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('disputes')
      .select('id, status, reason, created_at, resolved_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('dispute_statements')
      .select('id, author_id, created_at')
      .eq('transaction_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('transaction_participants')
      .select('user_id, role, joined_at')
      .eq('transaction_id', id)
      .order('joined_at', { ascending: true }),
  ]);

  const firstError =
    messagesResult.error ||
    paymentsResult.error ||
    auditsResult.error ||
    agreementsResult.error ||
    approvalsResult.error ||
    changeRequestsResult.error ||
    commitmentsResult.error ||
    milestonesResult.error ||
    evidenceResult.error ||
    disputesResult.error ||
    statementsResult.error ||
    participantsResult.error;

  if (firstError) return fail(firstError.message, 500);

  const entries = buildTransactionTimeline({
    transaction: {
      id: access.data.transaction.id,
      buyer_id: access.data.transaction.buyer_id,
      created_at: access.data.transaction.created_at,
    },
    messages: (messagesResult.data || []) as TimelineMessage[],
    payments: (paymentsResult.data || []) as TimelinePayment[],
    audits: (auditsResult.data || []) as TimelineAudit[],
    agreements: (agreementsResult.data || []) as TimelineAgreement[],
    approvals: (approvalsResult.data || []) as TimelineApproval[],
    changeRequests: (changeRequestsResult.data || []) as TimelineChangeRequest[],
    commitments: (commitmentsResult.data || []) as TimelineCommitment[],
    milestones: (milestonesResult.data || []) as TimelineMilestone[],
    evidence: (evidenceResult.data || []) as TimelineEvidence[],
    disputes: (disputesResult.data || []) as TimelineDispute[],
    statements: (statementsResult.data || []) as TimelineStatement[],
    participants: (participantsResult.data || []) as TimelineParticipant[],
  });

  return json({
    data: {
      transaction: access.data.transaction,
      entries,
    },
  });
}
