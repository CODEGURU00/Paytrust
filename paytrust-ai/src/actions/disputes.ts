'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import {
  createDisputeSchema,
  disputeStatusSchema,
  type CreateDisputeInput,
} from '@/lib/validations';
import type { Dispute, DisputeStatus, DisputeWithRelations } from '@/lib/types';

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  draft: ['open', 'closed'],
  open: ['under_review', 'resolved', 'closed'],
  under_review: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

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

export async function createDispute(input: CreateDisputeInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = createDisputeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const participantError = await assertParticipant(
    parsed.data.transaction_id,
    user.id
  );
  if (participantError) {
    return { error: participantError };
  }

  const { data, error } = await supabase
    .from('disputes')
    .insert({
      transaction_id: parsed.data.transaction_id,
      opened_by: user.id,
      status: 'draft',
      reason: parsed.data.reason,
      report: parsed.data.report || null,
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/disputes');
  revalidatePath(`/transactions/${parsed.data.transaction_id}`);
  return { data: data as Dispute };
}

export async function getDisputes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('disputes')
    .select(`
      *,
      transaction:transactions(*),
      opener:profiles(${PUBLIC_PROFILE_COLUMNS})
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as unknown as DisputeWithRelations[] };
}

export async function updateDisputeStatus(
  disputeId: string,
  status: DisputeStatus
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsedStatus = disputeStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { error: 'Invalid dispute status' };
  }

  const { data: dispute, error: disputeError } = await supabase
    .from('disputes')
    .select('id, transaction_id, status, report, reason')
    .eq('id', disputeId)
    .single();

  if (disputeError || !dispute) {
    return { error: 'Dispute not found' };
  }

  const participantError = await assertParticipant(
    dispute.transaction_id,
    user.id
  );
  if (participantError) {
    return { error: participantError };
  }

  const currentStatus = dispute.status as DisputeStatus;
  if (!ALLOWED_TRANSITIONS[currentStatus].includes(parsedStatus.data)) {
    return {
      error: `Cannot move a dispute from ${currentStatus} to ${parsedStatus.data}`,
    };
  }

  const { data, error } = await supabase
    .from('disputes')
    .update({ status: parsedStatus.data })
    .eq('id', disputeId)
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/disputes');
  revalidatePath(`/disputes/${disputeId}`);
  revalidatePath(`/transactions/${dispute.transaction_id}`);
  return { data: data as Dispute };
}
