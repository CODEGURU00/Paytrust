'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import {
  createTransactionSchema,
  type CreateTransactionInput,
} from '@/lib/validations';
import type { Transaction, TransactionWithDetails } from '@/lib/types';

const MAX_DISPUTE_REASON_LENGTH = 500;

interface SellerLookup {
  id: string;
  display_name: string;
}

export async function createTransaction(input: CreateTransactionInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { data: sellers, error: sellerError } = await supabase.rpc(
    'find_seller_by_email',
    { seller_email: parsed.data.seller_email }
  );

  if (sellerError) {
    return { error: sellerError.message };
  }

  let seller = ((sellers || []) as SellerLookup[])[0];
  if (!seller) {
    const admin = await createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id, display_name')
      .ilike('email', parsed.data.seller_email.trim())
      .maybeSingle();

    if (profile) {
      seller = profile as SellerLookup;
    } else {
      const { data: newUser, error: createErr } =
        await admin.auth.admin.createUser({
          email: parsed.data.seller_email.trim(),
          email_confirm: true,
          user_metadata: {
            display_name: parsed.data.seller_email.split('@')[0],
          },
        });
      if (newUser?.user) {
        await admin.from('profiles').upsert({
          id: newUser.user.id,
          display_name: parsed.data.seller_email.split('@')[0],
          email: parsed.data.seller_email.trim(),
          verification_status: 'unverified',
        });
        seller = {
          id: newUser.user.id,
          display_name: parsed.data.seller_email.split('@')[0],
        };
      } else {
        return {
          error:
            createErr?.message ||
            'No account found with that seller email address',
        };
      }
    }
  }

  if (seller.id === user.id) {
    return { error: 'You cannot create a transaction with yourself' };
  }

  const role = parsed.data.role || 'buyer';
  const buyerId = role === 'seller' ? seller.id : user.id;
  const sellerId = role === 'seller' ? user.id : seller.id;

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      seller_id: sellerId,
      buyer_id: buyerId,
      status: 'CREATED',
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  try {
    await supabase.from('transaction_participants').insert([
      { transaction_id: data.id, user_id: user.id, role: 'buyer' },
      { transaction_id: data.id, user_id: seller.id, role: 'seller' },
    ]);
  } catch {
    // Ignore if trigger or policy handled it
  }

  revalidatePath('/dashboard');
  return { data: data as Transaction };
}

export async function getTransactions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      buyer:profiles!transactions_buyer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      seller:profiles!transactions_seller_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: error.message };
  }

  return { data: (data || []) as unknown as Transaction[] };
}

export async function getTransactionById(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      buyer:profiles!transactions_buyer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      seller:profiles!transactions_seller_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      participants:transaction_participants(*),
      messages:transaction_messages(*),
      payment_events:payment_events(*),
      ai_summaries:ai_summaries(*),
      attachments:attachments(*),
      disputes:disputes(*)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return { error: error?.message || 'Transaction not found' };
  }

  return { data: data as unknown as TransactionWithDetails };
}

export async function releaseEscrowPayment(transactionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { releaseEscrowAndRecord } = await import('@/lib/payments');

  try {
    const result = await releaseEscrowAndRecord({
      transactionId,
      releasedByUserId: user.id,
    });
    revalidatePath(`/transactions/${transactionId}`);
    revalidatePath('/transactions');
    revalidatePath('/dashboard');
    return { data: result };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to release escrow';
    return { error: msg };
  }
}

export async function sendTransactionMessage(transactionId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: 'Message cannot be empty' };
  }

  const { data, error } = await supabase
    .from('transaction_messages')
    .insert({
      transaction_id: transactionId,
      sender_id: user.id,
      content: trimmed,
    })
    .select('*')
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/transactions/${transactionId}`);
  return { data };
}

export async function raiseTransactionDispute(transactionId: string, reason: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  /*
   * The write below uses the service role, which bypasses RLS. Without this
   * check any signed-in user could flip an arbitrary transaction to FAILED -
   * including a counterparty's completed one - and post a message into a
   * chat they are not part of. The check runs on the RLS-scoped client so a
   * non-participant sees no transaction at all.
   */
  const access = await requireTransactionAccess(
    supabase,
    transactionId,
    user.id,
    { partyOnly: true }
  );
  if ('error' in access) {
    return { error: access.error };
  }

  const trimmedReason = (reason || '').trim().slice(0, MAX_DISPUTE_REASON_LENGTH);

  const admin = await createAdminClient();
  await admin
    .from('transactions')
    .update({ status: 'FAILED' })
    .eq('id', transactionId);

  await admin.from('transaction_messages').insert({
    transaction_id: transactionId,
    sender_id: user.id,
    content: `⚠️ Dispute opened: "${trimmedReason || 'Issues with delivery/scope'}". Transaction paused for mediation.`,
  });

  revalidatePath(`/transactions/${transactionId}`);
  revalidatePath('/transactions');
  revalidatePath('/dashboard');
  return { success: true };
}
