import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * CRIT-1 regression.
 *
 * raiseTransactionDispute used to check only "is a user signed in" and then
 * wrote with the service role, which bypasses RLS. Any signed-in user could
 * set any transaction to FAILED and inject a message into a chat they were
 * not part of.
 *
 * The action must now refuse a non-participant and must not reach the
 * service-role client at all.
 */

const adminBuilder = {
  from: vi.fn(() => adminBuilder),
  update: vi.fn(() => adminBuilder),
  eq: vi.fn(() => adminBuilder),
  insert: vi.fn(async () => ({ error: null })),
};

const rlsBuilder = {
  select: vi.fn(() => rlsBuilder),
  eq: vi.fn(() => rlsBuilder),
  maybeSingle: vi.fn(
    async (): Promise<{ data: unknown; error: null }> => ({
      data: null,
      error: null,
    })
  ),
};

const createAdminClient = vi.fn(async () => adminBuilder);
let currentUserId = 'stranger-1';
let visibleTransaction: Record<string, unknown> | null = null;

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => rlsBuilder,
    auth: {
      getUser: async () => ({ data: { user: { id: currentUserId } } }),
    },
  }),
  createAdminClient: (...args: unknown[]) => createAdminClient(...(args as [])),
}));

import { raiseTransactionDispute } from '@/actions/transactions';

const TRANSACTION_ID = '86a86553-60a3-4a19-a7dd-c8a10d0459ab';

beforeEach(() => {
  currentUserId = 'stranger-1';
  visibleTransaction = null;
  rlsBuilder.maybeSingle.mockImplementation(async () => ({
    data: visibleTransaction,
    error: null,
  }));
  adminBuilder.from.mockClear();
  adminBuilder.update.mockClear();
  adminBuilder.insert.mockClear();
  createAdminClient.mockClear();
});

describe('raiseTransactionDispute', () => {
  it('refuses a user who cannot see the transaction', async () => {
    const result = await raiseTransactionDispute(TRANSACTION_ID, 'not mine');

    expect(result.error).toBeTruthy();
    // The privileged client must never be reached.
    expect(createAdminClient).not.toHaveBeenCalled();
    expect(adminBuilder.update).not.toHaveBeenCalled();
    expect(adminBuilder.insert).not.toHaveBeenCalled();
  });

  it('allows a participant and writes through the service role', async () => {
    currentUserId = 'buyer-1';
    visibleTransaction = {
      id: TRANSACTION_ID,
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      title: 'Website redesign',
      description: null,
      amount: 500,
      currency: 'USD',
      status: 'APPROVED',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      participants: [
        { user_id: 'buyer-1', role: 'buyer', permission_level: 'full' },
        { user_id: 'seller-1', role: 'seller', permission_level: 'full' },
      ],
    };

    const result = await raiseTransactionDispute(TRANSACTION_ID, 'Delivery is late');

    expect(result.error).toBeUndefined();
    expect(createAdminClient).toHaveBeenCalled();
    expect(adminBuilder.update).toHaveBeenCalled();
    expect(adminBuilder.insert).toHaveBeenCalled();
  });

  it('caps the reason that is written into the other party chat', async () => {
    currentUserId = 'buyer-1';
    visibleTransaction = {
      id: TRANSACTION_ID,
      buyer_id: 'buyer-1',
      seller_id: 'seller-1',
      title: 'Website redesign',
      description: null,
      amount: 500,
      currency: 'USD',
      status: 'APPROVED',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      participants: [
        { user_id: 'buyer-1', role: 'buyer', permission_level: 'full' },
      ],
    };

    await raiseTransactionDispute(TRANSACTION_ID, 'x'.repeat(5000));

    const inserted = (
      adminBuilder.insert.mock.calls[0] as unknown as [
        { content: string },
      ]
    )[0];
    expect(inserted.content.length).toBeLessThan(700);
  });
});
