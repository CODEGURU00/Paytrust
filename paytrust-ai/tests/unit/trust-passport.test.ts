import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrustPassportSettings } from '@/lib/types';
import { loadTrustPassportStats } from '@/lib/server/trust-passport';

const settings = (overrides: Partial<TrustPassportSettings> = {}): TrustPassportSettings => ({
  user_id: 'user-1',
  is_public: true,
  headline: null,
  location: null,
  show_completed_deals: true,
  show_milestones: true,
  show_response_time: true,
  show_in_community: true,
  show_dispute_history: true,
  share_evidence: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

function thenable(result: unknown) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'or', 'order', 'in']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function fakeClient(data: {
  transactions?: unknown[];
  disputes?: unknown[];
  commitments?: unknown[];
  evidenceCount?: number;
  milestones?: unknown[];
  errors?: Partial<Record<'transactions' | 'disputes' | 'commitments' | 'attachments' | 'milestones', string>>;
}): SupabaseClient {
  const errors = data.errors || {};
  return {
    from(table: string) {
      switch (table) {
        case 'transactions':
          return thenable({ data: data.transactions || [], error: errors.transactions ? { message: errors.transactions } : null });
        case 'disputes':
          return thenable({ data: data.disputes || [], error: errors.disputes ? { message: errors.disputes } : null });
        case 'commitments':
          return thenable({ data: data.commitments || [], error: errors.commitments ? { message: errors.commitments } : null });
        case 'attachments':
          return thenable({
            data: null,
            count: data.evidenceCount ?? 0,
            error: errors.attachments ? { message: errors.attachments } : null,
          });
        case 'milestones':
          return thenable({ data: data.milestones || [], error: errors.milestones ? { message: errors.milestones } : null });
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    },
  } as unknown as SupabaseClient;
}

const baseData = {
  transactions: [
    { id: 'tx-1', status: 'COMPLETED', created_at: '2026-01-01T00:00:00.000Z' },
    { id: 'tx-2', status: 'CANCELLED', created_at: '2026-01-02T00:00:00.000Z' },
    { id: 'tx-3', status: 'APPROVED', created_at: '2026-01-03T00:00:00.000Z' },
  ],
  disputes: [{ status: 'resolved' }, { status: 'open' }],
  commitments: [
    { status: 'completed' },
    { status: 'open' },
    { status: 'in_progress' },
    { status: 'overdue' },
    { status: 'cancelled' },
  ],
  evidenceCount: 3,
  milestones: [{ status: 'paid' }, { status: 'pending' }, { status: 'approved' }],
};

afterEach(() => {
  vi.useRealTimers();
});

describe('loadTrustPassportStats', () => {
  it('computes totals, rates and milestones', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-11T00:00:00.000Z'));

    const stats = await loadTrustPassportStats(
      fakeClient(baseData),
      'user-1',
      settings(),
      { accountCreatedAt: '2026-01-01T00:00:00.000Z' }
    );

    expect(stats).toMatchObject({
      total_deals: 3,
      completed_deals: 1,
      cancelled_deals: 1,
      disputes: 2,
      disputes_resolved: 1,
      dispute_resolution_rate: 0.5,
      commitments_total: 5,
      commitments_completed: 1,
      commitments_open: 2,
      commitments_overdue: 1,
      milestones_total: 3,
      milestones_paid: 1,
      evidence_shared: 3,
      account_age_days: 10,
    });
  });

  it('hides gated reputation details when privacy settings are off', async () => {
    const stats = await loadTrustPassportStats(
      fakeClient(baseData),
      'user-1',
      settings({
        show_completed_deals: false,
        show_milestones: false,
        show_dispute_history: false,
        share_evidence: false,
      })
    );

    expect(stats.total_deals).toBe(3);
    expect(stats.completed_deals).toBe(0);
    expect(stats.cancelled_deals).toBe(0);
    expect(stats.disputes).toBe(0);
    expect(stats.disputes_resolved).toBe(0);
    expect(stats.dispute_resolution_rate).toBe(0);
    expect(stats.milestones_total).toBe(0);
    expect(stats.milestones_paid).toBe(0);
    expect(stats.evidence_shared).toBe(0);
    // Commitments have no visibility setting in the schema.
    expect(stats.commitments_total).toBe(5);
  });

  it('ignores visibility settings for the owner view', async () => {
    const stats = await loadTrustPassportStats(
      fakeClient(baseData),
      'user-1',
      settings({
        show_completed_deals: false,
        show_milestones: false,
        show_dispute_history: false,
        share_evidence: false,
      }),
      { respectVisibility: false }
    );

    expect(stats.completed_deals).toBe(1);
    expect(stats.disputes).toBe(2);
    expect(stats.milestones_total).toBe(3);
    expect(stats.evidence_shared).toBe(3);
  });

  it('returns zero age and no milestone query for a user without deals', async () => {
    const stats = await loadTrustPassportStats(
      fakeClient({ transactions: [], disputes: [], commitments: [], milestones: [] }),
      'user-1',
      settings()
    );

    expect(stats.total_deals).toBe(0);
    expect(stats.account_age_days).toBe(0);
    expect(stats.milestones_total).toBe(0);
  });

  it('throws a readable error when any query fails', async () => {
    await expect(
      loadTrustPassportStats(
        fakeClient({ ...baseData, errors: { disputes: 'disputes offline' } }),
        'user-1',
        settings()
      )
    ).rejects.toThrow('disputes offline');
  });
});
