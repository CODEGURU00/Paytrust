'use server';

import { createClient } from '@/lib/supabase/server';
import type { TrustIndicators } from '@/lib/types';

interface TrustTransaction {
  status: string;
  created_at: string;
}

interface TrustDispute {
  status: string;
}

export async function getTrustIndicators(userId: string) {
  const supabase = await createClient();

  const [profileResult, transactionResult, disputeResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, verification_status, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('transactions')
      .select('status, created_at')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    supabase
      .from('disputes')
      .select('status')
      .eq('opened_by', userId),
  ]);

  if (profileResult.error) {
    return { error: profileResult.error.message };
  }

  const transactions = (transactionResult.data || []) as TrustTransaction[];
  const disputes = (disputeResult.data || []) as TrustDispute[];

  const completedTransactions = transactions.filter(
    (transaction) => transaction.status === 'COMPLETED'
  ).length;

  const resolvedDisputes = disputes.filter(
    (dispute) => dispute.status === 'resolved' || dispute.status === 'closed'
  ).length;

  const createdAt = new Date(profileResult.data.created_at || 0);
  const accountAgeDays = Number.isFinite(createdAt.getTime())
    ? Math.max(
        0,
        Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      )
    : 0;

  const indicators: TrustIndicators = {
    user_id: userId,
    account_age_days: accountAgeDays,
    verification_status: profileResult.data.verification_status || 'unverified',
    completed_transactions: completedTransactions,
    total_transactions: transactions.length,
    dispute_count: disputes.length,
    dispute_resolution_rate:
      disputes.length > 0
        ? Math.round((resolvedDisputes / disputes.length) * 100)
        : 0,
  };

  return { data: indicators };
}
