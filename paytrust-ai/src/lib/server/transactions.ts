import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserRole } from '@/lib/types';

export type DbClient = SupabaseClient;

export type PermissionLevel = 'full' | 'comment' | 'view';

const PERMISSION_RANK: Record<PermissionLevel, number> = {
  view: 1,
  comment: 2,
  full: 3,
};

export interface TransactionRecord {
  id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ParticipantRow {
  user_id: string;
  role: UserRole;
  permission_level: PermissionLevel;
}

interface TransactionAccessRow extends TransactionRecord {
  participants: ParticipantRow[] | null;
}

export interface TransactionAccess {
  transaction: TransactionRecord;
  role: UserRole;
  permission_level: PermissionLevel;
  is_party: boolean;
  participant: ParticipantRow | null;
}

export type TransactionAccessResult =
  | { data: TransactionAccess }
  | { error: string; status: number };

export interface TransactionAccessOptions {
  minPermission?: PermissionLevel;
  partyOnly?: boolean;
}

function normalizePermission(value: unknown): PermissionLevel {
  if (value === 'full' || value === 'comment' || value === 'view') {
    return value;
  }
  return 'view';
}

/**
 * Load a transaction and verify that the user is an explicit participant.
 *
 * This is intentionally performed in application code as well as RLS: the
 * service-role client bypasses RLS, so every privileged write must call this
 * helper before touching a transaction resource.
 */
export async function requireTransactionAccess(
  client: DbClient,
  transactionId: string,
  userId: string,
  options: TransactionAccessOptions = {}
): Promise<TransactionAccessResult> {
  const { data, error } = await client
    .from('transactions')
    .select(
      `
      id,
      buyer_id,
      seller_id,
      title,
      description,
      amount,
      currency,
      status,
      created_at,
      updated_at,
      participants:transaction_participants(user_id, role, permission_level)
    `
    )
    .eq('id', transactionId)
    .maybeSingle();

  if (error) {
    return { error: error.message, status: 500 };
  }

  if (!data) {
    return { error: 'Transaction not found', status: 404 };
  }

  const transaction = data as TransactionAccessRow;
  const participant =
    (transaction.participants || []).find((row) => row.user_id === userId) ||
    null;

  const isParty =
    transaction.buyer_id === userId || transaction.seller_id === userId;

  if (!isParty && !participant) {
    return { error: 'Not a participant of this transaction', status: 403 };
  }

  const role: UserRole = isParty
    ? transaction.buyer_id === userId
      ? 'buyer'
      : 'seller'
    : participant?.role || 'witness';

  const permissionLevel: PermissionLevel = isParty
    ? 'full'
    : normalizePermission(participant?.permission_level);

  if (options.partyOnly && !isParty) {
    return {
      error: 'Only the buyer or seller may perform this action',
      status: 403,
    };
  }

  const minimum = options.minPermission || 'view';
  if (PERMISSION_RANK[permissionLevel] < PERMISSION_RANK[minimum]) {
    return {
      error: `This action requires ${minimum} participant permission`,
      status: 403,
    };
  }

  return {
    data: {
      transaction: {
        id: transaction.id,
        buyer_id: transaction.buyer_id,
        seller_id: transaction.seller_id,
        title: transaction.title,
        description: transaction.description,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
      },
      role,
      permission_level: permissionLevel,
      is_party: isParty,
      participant,
    },
  };
}

export function isTransactionAccessError(
  result: TransactionAccessResult
): result is { error: string; status: number } {
  return 'error' in result;
}
