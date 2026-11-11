import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { logAuditEvent } from '@/lib/server/audit';
import { requireTransactionAccess } from '@/lib/server/transactions';
import { createAdminClient } from '@/lib/supabase/server';
import type { Milestone, Transaction } from '@/lib/types';
import { simulatePaymentSchema } from '@/lib/validations';

const SIMULATED_NOTE =
  'Simulated sandbox payment. No real funds were moved and no card or bank credentials were used.';

type MilestoneRow = Milestone;

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const parsed = await parseJsonBody(request, simulatePaymentSchema);
  if ('response' in parsed) return parsed.response;

  const access = await requireTransactionAccess(
    supabase,
    parsed.data.transaction_id,
    user.id,
    { partyOnly: true }
  );
  if ('error' in access) return fail(access.error, access.status);

  const transaction = access.data.transaction;

  if (transaction.status === 'CANCELLED') {
    return fail('This transaction is cancelled', 409);
  }

  if (transaction.status === 'REFUNDED') {
    return fail('This transaction has already been refunded', 409);
  }

  if (parsed.data.type === 'release' && transaction.status === 'COMPLETED') {
    return fail('This transaction has already been completed', 409);
  }

  if (
    parsed.data.type === 'milestone_payment' &&
    transaction.status === 'COMPLETED'
  ) {
    return fail('This transaction has already been completed', 409);
  }

  if (parsed.data.type === 'release' && access.data.role !== 'buyer') {
    return fail('Only the buyer can release the simulated payment', 403);
  }

  const admin = await createAdminClient();
  const now = new Date().toISOString();

  let milestone: MilestoneRow | null = null;

  if (parsed.data.type === 'milestone_payment') {
    if (access.data.role !== 'buyer') {
      return fail('Only the buyer can pay a milestone', 403);
    }

    const { data: found, error: milestoneError } = await admin
      .from('milestones')
      .select('*')
      .eq('id', parsed.data.milestone_id as string)
      .eq('transaction_id', transaction.id)
      .maybeSingle();

    if (milestoneError) return fail(milestoneError.message, 500);
    if (!found) return fail('Milestone not found', 404);

    milestone = found as MilestoneRow;

    if (milestone.status !== 'approved') {
      return fail(
        'A milestone must be approved before a simulated payment can be made',
        409
      );
    }

    const { data: updatedMilestone, error: updateMilestoneError } = await admin
      .from('milestones')
      .update({ status: 'paid', paid_at: now })
      .eq('id', milestone.id)
      .eq('transaction_id', transaction.id)
      .select('*')
      .single();

    if (updateMilestoneError) {
      return fail(updateMilestoneError.message, 500);
    }

    milestone = updatedMilestone as MilestoneRow;
  }

  const nextStatus =
    parsed.data.type === 'refund' ? 'REFUNDED' : 'COMPLETED';

  // Release and milestone payments complete the transaction once every
  // non-cancelled milestone is paid. Refunds always close it as REFUNDED.
  let shouldCompleteTransaction = parsed.data.type !== 'milestone_payment';

  if (parsed.data.type === 'milestone_payment') {
    const { data: siblings, error: siblingsError } = await admin
      .from('milestones')
      .select('id, status')
      .eq('transaction_id', transaction.id)
      .neq('status', 'cancelled');

    if (siblingsError) return fail(siblingsError.message, 500);

    shouldCompleteTransaction = (siblings || []).every(
      (row) => row.status === 'paid'
    );
  }

  let updatedTransaction: Transaction | null = null;

  if (shouldCompleteTransaction) {
    const { data, error } = await admin
      .from('transactions')
      .update({ status: nextStatus })
      .eq('id', transaction.id)
      .select('*')
      .single();

    if (error) return fail(error.message, 500);
    updatedTransaction = data as Transaction;
  } else {
    const { data, error } = await admin
      .from('transactions')
      .select('*')
      .eq('id', transaction.id)
      .single();

    if (error) return fail(error.message, 500);
    updatedTransaction = data as Transaction;
  }

  const eventType =
    parsed.data.type === 'refund'
      ? 'simulated_refund'
      : parsed.data.type === 'milestone_payment'
        ? 'simulated_milestone_payment'
        : 'simulated_release';

  const amount =
    parsed.data.type === 'milestone_payment' && milestone
      ? milestone.amount
      : transaction.amount;

  const { data: paymentEvent, error: paymentError } = await admin
    .from('payment_events')
    .insert({
      transaction_id: transaction.id,
      provider: 'paytrust',
      provider_event_id: `simulated:${crypto.randomUUID()}`,
      event_type: eventType,
      payload_summary: {
        simulated: true,
        type: parsed.data.type,
        initiated_by: user.id,
        milestone_id: milestone?.id || null,
        note: SIMULATED_NOTE,
      },
      amount,
      currency: transaction.currency,
    })
    .select('*')
    .single();

  if (paymentError) return fail(paymentError.message, 500);

  await logAuditEvent({
    transactionId: transaction.id,
    actorId: user.id,
    eventType: 'payment.simulated',
    metadata: {
      simulated: true,
      type: parsed.data.type,
      amount,
      currency: transaction.currency,
      milestone_id: milestone?.id || null,
      payment_event_id: paymentEvent.id,
    },
  });

  return json(
    {
      data: {
        simulated: true,
        note: SIMULATED_NOTE,
        type: parsed.data.type,
        transaction: updatedTransaction,
        milestone,
        payment_event: paymentEvent,
      },
    },
    201
  );
}
