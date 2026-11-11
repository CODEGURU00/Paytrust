import { describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  isTransactionAccessError,
  requireTransactionAccess,
  type TransactionRecord,
} from '@/lib/server/transactions';

const transaction: TransactionRecord & {
  participants: Array<{
    user_id: string;
    role: 'buyer' | 'seller' | 'witness';
    permission_level: 'full' | 'comment' | 'view';
  }>;
} = {
  id: '86a86553-60a3-4a19-a7dd-c8a10d0459ab',
  buyer_id: 'buyer-1',
  seller_id: 'seller-1',
  title: 'Website redesign',
  description: null,
  amount: 500,
  currency: 'USD',
  status: 'APPROVED',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-02T00:00:00.000Z',
  participants: [
    { user_id: 'buyer-1', role: 'buyer', permission_level: 'full' },
    { user_id: 'seller-1', role: 'seller', permission_level: 'full' },
    { user_id: 'witness-1', role: 'witness', permission_level: 'comment' },
    { user_id: 'viewer-1', role: 'witness', permission_level: 'view' },
  ],
};

function clientReturning(result: unknown): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    maybeSingle: async () => result,
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

const accessClient = clientReturning({ data: transaction, error: null });

describe('requireTransactionAccess', () => {
  it('grants full access to the buyer', async () => {
    const result = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'buyer-1'
    );
    expect(isTransactionAccessError(result)).toBe(false);
    if (isTransactionAccessError(result)) return;
    expect(result.data.role).toBe('buyer');
    expect(result.data.permission_level).toBe('full');
    expect(result.data.is_party).toBe(true);
  });

  it('grants full access to the seller', async () => {
    const result = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'seller-1'
    );
    expect(isTransactionAccessError(result)).toBe(false);
    if (isTransactionAccessError(result)) return;
    expect(result.data.role).toBe('seller');
    expect(result.data.is_party).toBe(true);
  });

  it('uses the explicit witness permission level', async () => {
    const result = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'witness-1'
    );
    expect(isTransactionAccessError(result)).toBe(false);
    if (isTransactionAccessError(result)) return;
    expect(result.data.role).toBe('witness');
    expect(result.data.permission_level).toBe('comment');
    expect(result.data.is_party).toBe(false);
  });

  it('denies non-participants with 403', async () => {
    const result = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'stranger-1'
    );
    expect(result).toEqual({
      error: 'Not a participant of this transaction',
      status: 403,
    });
  });

  it('enforces minimum permission for witnesses', async () => {
    const comment = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'witness-1',
      { minPermission: 'comment' }
    );
    expect(isTransactionAccessError(comment)).toBe(false);

    const full = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'witness-1',
      { minPermission: 'full' }
    );
    expect(full).toEqual({
      error: 'This action requires full participant permission',
      status: 403,
    });

    const viewer = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'viewer-1',
      { minPermission: 'comment' }
    );
    expect(viewer).toEqual({
      error: 'This action requires comment participant permission',
      status: 403,
    });
  });

  it('rejects witnesses for party-only actions', async () => {
    const result = await requireTransactionAccess(
      accessClient,
      transaction.id,
      'witness-1',
      { partyOnly: true }
    );
    expect(result).toEqual({
      error: 'Only the buyer or seller may perform this action',
      status: 403,
    });
  });

  it('defaults unknown permission levels to view', async () => {
    const client = clientReturning({
      data: {
        ...transaction,
        participants: [
          { user_id: 'weird-1', role: 'witness', permission_level: 'owner' },
        ],
      },
      error: null,
    });
    const result = await requireTransactionAccess(
      client,
      transaction.id,
      'weird-1',
      { minPermission: 'comment' }
    );
    expect(result).toEqual({
      error: 'This action requires comment participant permission',
      status: 403,
    });
  });

  it('returns 404 for a missing transaction', async () => {
    const client = clientReturning({ data: null, error: null });
    await expect(
      requireTransactionAccess(client, transaction.id, 'buyer-1')
    ).resolves.toEqual({ error: 'Transaction not found', status: 404 });
  });

  it('returns 500 when the database query fails', async () => {
    const client = clientReturning({
      data: null,
      error: { message: 'connection failed' },
    });
    await expect(
      requireTransactionAccess(client, transaction.id, 'buyer-1')
    ).resolves.toEqual({ error: 'connection failed', status: 500 });
  });
});
