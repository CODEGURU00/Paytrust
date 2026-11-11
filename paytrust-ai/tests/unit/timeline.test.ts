import { describe, expect, it } from 'vitest';
import { buildTransactionTimeline, type TimelineInput } from '@/lib/server/timeline';

function fixture(overrides: Partial<TimelineInput> = {}): TimelineInput {
  return {
    transaction: {
      id: 'tx-1',
      buyer_id: 'buyer-1',
      created_at: '2026-01-01T09:00:00.000Z',
    },
    messages: [
      {
        id: 'message-1',
        sender_id: 'buyer-1',
        content: 'Please deliver the homepage by Friday.',
        created_at: '2026-01-02T10:00:00.000Z',
      },
    ],
    payments: [
      {
        id: 'payment-1',
        event_type: 'simulated_release',
        amount: 100,
        currency: 'USD',
        payload_summary: { simulated: true },
        created_at: '2026-01-03T10:00:00.000Z',
      },
    ],
    audits: [
      {
        id: 'audit-1',
        actor_id: 'buyer-1',
        event_type: 'transaction.updated',
        metadata: { field: 'title' },
        created_at: '2026-01-04T10:00:00.000Z',
      },
      {
        id: 'audit-2',
        actor_id: 'buyer-1',
        event_type: 'payment.simulated',
        metadata: {},
        created_at: '2026-01-03T10:00:00.000Z',
      },
      {
        id: 'audit-3',
        actor_id: 'seller-1',
        event_type: 'agreement.created',
        metadata: {},
        created_at: '2026-01-05T10:00:00.000Z',
      },
    ],
    agreements: [
      {
        id: 'agreement-1',
        version: 1,
        status: 'approved',
        source: 'ai',
        created_at: '2026-01-05T09:00:00.000Z',
        approved_at: '2026-01-06T09:00:00.000Z',
      },
    ],
    approvals: [
      {
        id: 'approval-1',
        agreement_id: 'agreement-1',
        user_id: 'buyer-1',
        decision: 'approved',
        decided_at: '2026-01-06T08:00:00.000Z',
      },
    ],
    changeRequests: [
      {
        id: 'change-1',
        agreement_id: 'agreement-1',
        description: 'Add a contact page',
        status: 'incorporated',
        created_at: '2026-01-07T08:00:00.000Z',
        resolved_at: '2026-01-08T08:00:00.000Z',
      },
    ],
    commitments: [
      {
        id: 'commitment-1',
        owner_id: 'seller-1',
        description: 'Deliver homepage',
        status: 'completed',
        created_at: '2026-01-02T08:00:00.000Z',
        completed_at: '2026-01-09T08:00:00.000Z',
      },
    ],
    milestones: [
      {
        id: 'milestone-1',
        title: 'Design',
        amount: 50,
        currency: 'USD',
        status: 'paid',
        created_at: '2026-01-02T09:00:00.000Z',
        paid_at: '2026-01-10T08:00:00.000Z',
      },
    ],
    evidence: [
      {
        id: 'evidence-1',
        file_name: 'proof.png',
        kind: 'image',
        uploaded_by: 'seller-1',
        created_at: '2026-01-09T09:00:00.000Z',
      },
    ],
    disputes: [
      {
        id: 'dispute-1',
        status: 'resolved',
        reason: 'Scope disagreement',
        created_at: '2026-01-11T08:00:00.000Z',
        resolved_at: '2026-01-12T08:00:00.000Z',
      },
    ],
    statements: [
      {
        id: 'statement-1',
        author_id: 'buyer-1',
        created_at: '2026-01-11T09:00:00.000Z',
      },
    ],
    participants: [
      {
        user_id: 'buyer-1',
        role: 'buyer',
        joined_at: null,
      },
      {
        user_id: 'witness-1',
        role: 'witness',
        joined_at: '2026-01-02T08:30:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('buildTransactionTimeline', () => {
  it('builds a chronological timeline from every source', () => {
    const entries = buildTransactionTimeline(fixture());

    expect(entries[0]).toMatchObject({
      id: 'transaction:tx-1:created',
      type: 'transaction',
      title: 'Transaction created',
    });

    const titles = entries.map((entry) => entry.title);
    expect(titles).toContain('Message added');
    expect(titles).toContain('Payment event: simulated release');
    expect(titles).toContain('Deal DNA v1 created');
    expect(titles).toContain('Deal DNA v1 approved');
    expect(titles).toContain('Deal DNA v1: approved');
    expect(titles).toContain('Change requested on Deal DNA v1');
    expect(titles).toContain('Change request incorporated');
    expect(titles).toContain('Commitment created');
    expect(titles).toContain('Commitment completed');
    expect(titles).toContain('Milestone added: Design');
    expect(titles).toContain('Milestone paid: Design');
    expect(titles).toContain('Evidence uploaded: proof.png');
    expect(titles).toContain('Dispute opened');
    expect(titles).toContain('Dispute resolved');
    expect(titles).toContain('Party statement submitted');
    expect(titles).toContain('buyer joined the transaction');
    expect(titles).toContain('witness joined the transaction');
    expect(titles).toContain('transaction updated');

    for (let index = 1; index < entries.length; index += 1) {
      expect(
        Date.parse(entries[index - 1].occurred_at)
      ).toBeLessThanOrEqual(Date.parse(entries[index].occurred_at));
    }
  });

  it('suppresses duplicate audit rows for domain events', () => {
    const entries = buildTransactionTimeline(fixture());
    const auditIds = entries
      .filter((entry) => entry.type === 'audit')
      .map((entry) => entry.id);

    expect(auditIds).toContain('audit:audit-1');
    expect(auditIds).not.toContain('audit:audit-2');
    expect(auditIds).not.toContain('audit:audit-3');
  });

  it('truncates long messages to 500 characters', () => {
    const entries = buildTransactionTimeline(
      fixture({
        messages: [
          {
            id: 'message-long',
            sender_id: 'buyer-1',
            content: 'x'.repeat(900),
            created_at: '2026-01-02T10:00:00.000Z',
          },
        ],
      })
    );
    const message = entries.find((entry) => entry.id === 'message:message-long');
    expect(message?.description).toHaveLength(500);
  });

  it('uses the transaction creation time when a participant has no join time', () => {
    const entries = buildTransactionTimeline(fixture());
    const buyer = entries.find(
      (entry) => entry.id === 'participant:buyer-1:joined'
    );
    expect(buyer?.occurred_at).toBe('2026-01-01T09:00:00.000Z');
  });

  it('sorts entries with equal timestamps by stable id', () => {
    const entries = buildTransactionTimeline(
      fixture({
        payments: [],
        audits: [],
        agreements: [],
        approvals: [],
        changeRequests: [],
        commitments: [],
        milestones: [],
        evidence: [],
        disputes: [],
        statements: [],
        participants: [],
        messages: [
          {
            id: 'b-message',
            sender_id: 'buyer-1',
            content: 'B',
            created_at: '2026-01-02T00:00:00.000Z',
          },
          {
            id: 'a-message',
            sender_id: 'buyer-1',
            content: 'A',
            created_at: '2026-01-02T00:00:00.000Z',
          },
        ],
      })
    );
    const sameTime = entries.filter(
      (entry) => entry.occurred_at === '2026-01-02T00:00:00.000Z'
    );
    expect(sameTime.map((entry) => entry.id)).toEqual([
      'message:a-message',
      'message:b-message',
    ]);
  });

  it('keeps transaction creation first when participants share its timestamp', () => {
    const entries = buildTransactionTimeline(
      fixture({
        payments: [],
        audits: [],
        agreements: [],
        approvals: [],
        changeRequests: [],
        commitments: [],
        milestones: [],
        evidence: [],
        disputes: [],
        statements: [],
        messages: [],
        participants: [
          { user_id: 'buyer-1', role: 'buyer', joined_at: null },
          { user_id: 'seller-1', role: 'seller', joined_at: null },
        ],
      })
    );
    expect(entries.map((entry) => entry.id)).toEqual([
      'transaction:tx-1:created',
      'participant:buyer-1:joined',
      'participant:seller-1:joined',
    ]);
  });

  it('labels AI-created drafts as requiring review', () => {
    const entries = buildTransactionTimeline(fixture());
    const draft = entries.find((entry) => entry.id === 'agreement:agreement-1:created');
    expect(draft?.description).toBe(
      'AI-assisted draft — requires review and mutual approval'
    );
  });
});
