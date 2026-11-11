import { describe, expect, it } from 'vitest';
import {
  agreementApprovalSchema,
  agreementTermsSchema,
  createAgreementSchema,
  createCommitmentSchema,
  createDisputeSchema,
  createMilestoneSchema,
  createTransactionSchema,
  dealDnaExtractionSchema,
  qrGenerateSchema,
  sendMessageSchema,
  simulatePaymentSchema,
  trustPassportUpdateSchema,
  updateDisputeSchema,
  updateTransactionSchema,
  uuidSchema,
} from '@/lib/validations';

const validTransaction = {
  title: 'Website redesign',
  description: 'Five-page site',
  amount: 125.5,
  currency: 'USD',
  seller_email: 'seller@paytrust.demo',
};

describe('createTransactionSchema', () => {
  it('accepts a valid transaction and coerces numeric strings', () => {
    const parsed = createTransactionSchema.parse({
      ...validTransaction,
      amount: '125.50',
    });
    expect(parsed.amount).toBe(125.5);
    expect(parsed.currency).toBe('USD');
  });

  it('rejects zero, negative and oversized amounts', () => {
    expect(
      createTransactionSchema.safeParse({ ...validTransaction, amount: 0 }).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({ ...validTransaction, amount: -5 }).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({
        ...validTransaction,
        amount: 1_000_000,
      }).success
    ).toBe(false);
  });

  it('rejects unsupported currency and malformed seller email', () => {
    expect(
      createTransactionSchema.safeParse({
        ...validTransaction,
        currency: 'BTC',
      }).success
    ).toBe(false);
    expect(
      createTransactionSchema.safeParse({
        ...validTransaction,
        seller_email: 'not-an-email',
      }).success
    ).toBe(false);
  });

  it('trims title and rejects blank titles', () => {
    const parsed = createTransactionSchema.parse({
      ...validTransaction,
      title: '  Redesign  ',
    });
    expect(parsed.title).toBe('Redesign');
    expect(
      createTransactionSchema.safeParse({ ...validTransaction, title: '   ' })
        .success
    ).toBe(false);
  });
});

describe('updateTransactionSchema', () => {
  it('requires at least one field and rejects unknown fields', () => {
    expect(updateTransactionSchema.safeParse({}).success).toBe(false);
    expect(
      updateTransactionSchema.safeParse({ title: 'New', is_admin: true }).success
    ).toBe(false);
    expect(updateTransactionSchema.parse({ description: null }).description).toBeNull();
  });
});

describe('sendMessageSchema', () => {
  const id = '86a86553-60a3-4a19-a7dd-c8a10d0459ab';
  it('accepts a valid message and trims whitespace', () => {
    expect(sendMessageSchema.parse({ transaction_id: id, content: ' hello ' })).toEqual({
      transaction_id: id,
      content: 'hello',
    });
  });

  it('rejects blank, oversized and non-UUID messages', () => {
    expect(
      sendMessageSchema.safeParse({ transaction_id: id, content: '   ' }).success
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({
        transaction_id: id,
        content: 'x'.repeat(5001),
      }).success
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({
        transaction_id: 'TX-1',
        content: 'hello',
      }).success
    ).toBe(false);
  });
});

describe('agreement schemas', () => {
  const terms = {
    purpose: 'Rebuild the marketing site',
    amount: 500,
    currency: 'USD',
    deliverables: ['Homepage', 'CMS handoff'],
    deadline: '2026-12-01',
    responsibilities: [{ owner: 'seller', description: 'Build the site' }],
    revision_policy: 'Two rounds',
    cancellation_policy: 'Refund before work starts',
    milestones: [{ title: 'Design', amount: 200, due_date: '2026-11-20' }],
    open_questions: [],
  };

  it('accepts a well-formed agreement', () => {
    expect(createAgreementSchema.parse({ terms }).terms.purpose).toBe(
      'Rebuild the marketing site'
    );
  });

  it('rejects unknown top-level and term fields', () => {
    expect(
      createAgreementSchema.safeParse({ terms, auto_approve: true }).success
    ).toBe(false);
    expect(
      agreementTermsSchema.safeParse({ ...terms, hidden_clause: 'x' }).success
    ).toBe(false);
  });

  it('rejects negative amounts and invalid currency', () => {
    expect(
      agreementTermsSchema.safeParse({ ...terms, amount: -1 }).success
    ).toBe(false);
    expect(
      agreementTermsSchema.safeParse({ ...terms, currency: 'XYZ' }).success
    ).toBe(false);
  });

  it('requires a comment when requesting changes or rejecting', () => {
    expect(
      agreementApprovalSchema.safeParse({ decision: 'approved' }).success
    ).toBe(true);
    expect(
      agreementApprovalSchema.safeParse({ decision: 'changes_requested' }).success
    ).toBe(false);
    expect(
      agreementApprovalSchema.safeParse({
        decision: 'rejected',
        comment: 'Scope is unclear',
      }).success
    ).toBe(true);
  });
});

describe('commitment and milestone schemas', () => {
  it('accepts a commitment with a valid date and rejects an invalid date', () => {
    expect(
      createCommitmentSchema.safeParse({
        description: 'Deliver homepage',
        due_at: '2026-12-01T12:00:00.000Z',
      }).success
    ).toBe(true);
    expect(
      createCommitmentSchema.safeParse({
        description: 'Deliver homepage',
        due_at: 'not-a-date',
      }).success
    ).toBe(false);
  });

  it('rejects unknown commitment fields and blank descriptions', () => {
    expect(
      createCommitmentSchema.safeParse({
        description: 'Deliver homepage',
        status: 'completed',
      }).success
    ).toBe(false);
    expect(
      createCommitmentSchema.safeParse({ description: '   ' }).success
    ).toBe(false);
  });

  it('validates milestone amounts and position', () => {
    expect(
      createMilestoneSchema.safeParse({ title: 'Design', amount: '50' }).success
    ).toBe(true);
    expect(
      createMilestoneSchema.safeParse({ title: 'Design', amount: 0 }).success
    ).toBe(false);
    expect(
      createMilestoneSchema.safeParse({
        title: 'Design',
        amount: 10,
        position: -1,
      }).success
    ).toBe(false);
  });
});

describe('dispute schemas', () => {
  const transaction_id = '86a86553-60a3-4a19-a7dd-c8a10d0459ab';

  it('requires a reason of at least three characters', () => {
    expect(
      createDisputeSchema.safeParse({ transaction_id, reason: 'no' }).success
    ).toBe(false);
    expect(
      createDisputeSchema.safeParse({ transaction_id, reason: 'scope' }).success
    ).toBe(true);
  });

  it('requires a resolution text when resolving', () => {
    expect(
      updateDisputeSchema.safeParse({ status: 'resolved' }).success
    ).toBe(false);
    expect(
      updateDisputeSchema.safeParse({
        status: 'resolved',
        resolution: 'Parties agreed to a revision.',
      }).success
    ).toBe(true);
  });

  it('rejects unknown dispute fields and statuses', () => {
    expect(
      updateDisputeSchema.safeParse({ status: 'guilty' }).success
    ).toBe(false);
    expect(
      updateDisputeSchema.safeParse({ status: 'open', verdict: 'seller' }).success
    ).toBe(false);
  });
});

describe('simulatePaymentSchema', () => {
  const transaction_id = '86a86553-60a3-4a19-a7dd-c8a10d0459ab';

  it('requires milestone_id for milestone payments', () => {
    expect(
      simulatePaymentSchema.safeParse({
        transaction_id,
        type: 'milestone_payment',
      }).success
    ).toBe(false);
    expect(
      simulatePaymentSchema.safeParse({
        transaction_id,
        type: 'milestone_payment',
        milestone_id: 'cb27dbc5-c196-42e0-8aa3-144efe8a768c',
      }).success
    ).toBe(true);
  });

  it('rejects unsupported payment types and extra fields', () => {
    expect(
      simulatePaymentSchema.safeParse({ transaction_id, type: 'withdraw' }).success
    ).toBe(false);
    expect(
      simulatePaymentSchema.safeParse({
        transaction_id,
        type: 'release',
        real_money: true,
      }).success
    ).toBe(false);
  });
});

describe('trustPassportUpdateSchema', () => {
  it('accepts privacy toggles and rejects unknown fields', () => {
    expect(
      trustPassportUpdateSchema.safeParse({ is_public: false }).success
    ).toBe(true);
    expect(
      trustPassportUpdateSchema.safeParse({ is_public: true, admin: true }).success
    ).toBe(false);
    expect(trustPassportUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe('AI extraction schema', () => {
  const extraction = {
    summary: 'A neutral summary.',
    terms: {
      purpose: 'Website rebuild',
      amount: 500,
      currency: 'USD',
      deliverables: ['Homepage'],
    },
    missing_terms: ['revision policy'],
    uncertainties: ['deadline is ambiguous'],
    confidence: 0.7,
  };

  it('accepts a complete structured extraction', () => {
    expect(dealDnaExtractionSchema.safeParse(extraction).success).toBe(true);
  });

  it('rejects confidence outside 0..1 and missing summary', () => {
    expect(
      dealDnaExtractionSchema.safeParse({ ...extraction, confidence: 1.2 }).success
    ).toBe(false);
    expect(
      dealDnaExtractionSchema.safeParse({ ...extraction, summary: '' }).success
    ).toBe(false);
  });
});

describe('misc schemas', () => {
  it('validates UUIDs', () => {
    expect(uuidSchema.safeParse('86a86553-60a3-4a19-a7dd-c8a10d0459ab').success).toBe(
      true
    );
    expect(uuidSchema.safeParse('TX-1').success).toBe(false);
  });

  it('validates QR generation input', () => {
    expect(qrGenerateSchema.safeParse({ data: 'paytrust://pay?tx=TX-1' }).success).toBe(
      true
    );
    expect(qrGenerateSchema.safeParse({ data: '   ' }).success).toBe(false);
    expect(qrGenerateSchema.safeParse({ data: 'x'.repeat(2001) }).success).toBe(
      false
    );
  });
});
