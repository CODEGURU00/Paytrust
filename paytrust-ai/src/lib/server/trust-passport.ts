import type { DbClient } from '@/lib/server/transactions';
import type { TrustPassportSettings, TrustPassportStats } from '@/lib/types';

export interface PassportStatsOptions {
  settings: TrustPassportSettings;
  includeRecentActivity?: boolean;
}

interface TransactionRow {
  id: string;
  status: string;
  created_at: string;
}

/**
 * Compute aggregate Trust Passport statistics. The caller chooses the client:
 * the signed-in user for their own passport, or the service-role client for a
 * public passport after checking the owner's privacy settings.
 */
export async function loadTrustPassportStats(
  client: DbClient,
  userId: string,
  settings: TrustPassportSettings,
  options: {
    respectVisibility?: boolean;
    accountCreatedAt?: string | null;
  } = {}
): Promise<TrustPassportStats> {
  const respectVisibility = options.respectVisibility ?? true;
  const [transactionsResult, disputesResult, commitmentsResult, evidenceResult] =
    await Promise.all([
      client
        .from('transactions')
        .select('id, status, created_at')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      client
        .from('disputes')
        .select('status')
        .eq('opened_by', userId),
      client
        .from('commitments')
        .select('status')
        .eq('owner_id', userId),
      client
        .from('attachments')
        .select('id', { count: 'exact', head: true })
        .eq('uploaded_by', userId)
        .eq('visibility', 'participants'),
    ]);

  if (transactionsResult.error) throw new Error(transactionsResult.error.message);
  if (disputesResult.error) throw new Error(disputesResult.error.message);
  if (commitmentsResult.error) throw new Error(commitmentsResult.error.message);
  if (evidenceResult.error) throw new Error(evidenceResult.error.message);

  const transactions = (transactionsResult.data || []) as TransactionRow[];
  const transactionIds = transactions.map((transaction) => transaction.id);

  let milestoneRows: Array<{ status: string }> = [];
  if (transactionIds.length > 0) {
    const { data, error } = await client
      .from('milestones')
      .select('status')
      .in('transaction_id', transactionIds);

    if (error) throw new Error(error.message);
    milestoneRows = (data || []) as Array<{ status: string }>;
  }

  const disputes = (disputesResult.data || []) as Array<{ status: string }>;
  const commitments = (commitmentsResult.data || []) as Array<{
    status: string;
  }>;

  const completedDeals = transactions.filter(
    (transaction) => transaction.status === 'COMPLETED'
  ).length;
  const cancelledDeals = transactions.filter(
    (transaction) => transaction.status === 'CANCELLED'
  ).length;

  const disputesResolved = disputes.filter(
    (dispute) => dispute.status === 'resolved' || dispute.status === 'closed'
  ).length;

  const commitmentsCompleted = commitments.filter(
    (commitment) => commitment.status === 'completed'
  ).length;
  const commitmentsOpen = commitments.filter(
    (commitment) =>
      commitment.status === 'open' || commitment.status === 'in_progress'
  ).length;
  const commitmentsOverdue = commitments.filter(
    (commitment) => commitment.status === 'overdue'
  ).length;

  const milestonesPaid = milestoneRows.filter(
    (milestone) => milestone.status === 'paid'
  ).length;

  const accountSince =
    options.accountCreatedAt ||
    transactions.reduce<string | null>((earliest, transaction) => {
      if (!earliest) return transaction.created_at;
      return Date.parse(transaction.created_at) < Date.parse(earliest)
        ? transaction.created_at
        : earliest;
    }, null);

  const accountAgeDays = accountSince
    ? Math.max(
        0,
        Math.floor((Date.now() - Date.parse(accountSince)) / (1000 * 60 * 60 * 24))
      )
    : 0;

  return {
    total_deals: transactions.length,
    completed_deals:
      !respectVisibility || settings.show_completed_deals ? completedDeals : 0,
    cancelled_deals:
      !respectVisibility || settings.show_completed_deals ? cancelledDeals : 0,
    disputes:
      !respectVisibility || settings.show_dispute_history ? disputes.length : 0,
    disputes_resolved:
      !respectVisibility || settings.show_dispute_history
        ? disputesResolved
        : 0,
    dispute_resolution_rate:
      (!respectVisibility || settings.show_dispute_history) &&
      disputes.length > 0
        ? Number((disputesResolved / disputes.length).toFixed(2))
        : 0,
    commitments_total: commitments.length,
    commitments_completed: commitmentsCompleted,
    commitments_open: commitmentsOpen,
    commitments_overdue: commitmentsOverdue,
    milestones_total:
      !respectVisibility || settings.show_milestones ? milestoneRows.length : 0,
    milestones_paid:
      !respectVisibility || settings.show_milestones ? milestonesPaid : 0,
    evidence_shared:
      !respectVisibility || settings.share_evidence
        ? evidenceResult.count || 0
        : 0,
    account_age_days: accountAgeDays,
  };
}
