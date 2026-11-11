import { describe, expect, it } from 'vitest';
import { failZod } from '@/lib/api';
import {
  aiSummarizeSchema,
  capturePaymentSchema,
  createDisputeSchema,
  createPaymentSchema,
  createTransactionSchema,
  dealDnaRequestSchema,
  mediatorRequestSchema,
  qrGenerateSchema,
  qrPayloadSchema,
  sendMessageSchema,
  signInSchema,
  signUpSchema,
  updateEvidenceSchema,
} from '@/lib/validations';

/*
 * Regression guard for the zod v3 -> v4 migration.
 *
 * zod v4 removed `ZodError.errors` in favour of `ZodError.issues`. The 24
 * migrated call sites all read `parsed.error.errors[0]?.message`, so a missed
 * or reverted rename does not fail typecheck-only gates or the previous
 * assertions (which only checked `.success` booleans) - it throws
 * `TypeError: Cannot read properties of undefined` in every validation error
 * path, turning a 400 into a 500.
 *
 * These tests assert the *message* is reachable, which is the property the
 * application actually depends on.
 */

const INVALID_TRANSACTION = {
  title: 'Website redesign',
  amount: -5,
  currency: 'USD',
  seller_email: 'seller@example.com',
};

describe('zod v4 error shape', () => {
  it('exposes issues (not errors) on a failed parse', () => {
    const result = createTransactionSchema.safeParse(INVALID_TRANSACTION);
    if (result.success) throw new Error('expected the payload to be rejected');

    expect(Array.isArray(result.error.issues)).toBe(true);
    expect(result.error.issues.length).toBeGreaterThan(0);
    expect(result.error.issues[0]?.message).toBe('Amount must be positive');
  });

  it('never re-exposes the removed `errors` alias', () => {
    const result = createTransactionSchema.safeParse(INVALID_TRANSACTION);
    if (result.success) throw new Error('expected the payload to be rejected');

    expect('errors' in result.error).toBe(false);
  });

  it('surfaces the validation message through failZod with HTTP 400', async () => {
    const result = createTransactionSchema.safeParse(INVALID_TRANSACTION);
    if (result.success || !result.error) throw new Error('expected the payload to be rejected');

    const response = failZod(result.error);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Amount must be positive',
    });
  });

  /*
   * Every schema behind a migrated call site must produce at least one issue
   * with a non-empty message. A schema that silently produced an empty issue
   * list would render "Invalid input" and hide the real reason.
   */
  const SCHEMAS_WITH_INVALID_INPUT: Array<[string, { safeParse: (value: unknown) => { success: boolean; error?: { issues?: Array<{ message?: string }> } } }, unknown]> = [
    ['createTransactionSchema', createTransactionSchema, INVALID_TRANSACTION],
    ['sendMessageSchema', sendMessageSchema, { transaction_id: 'nope', content: '' }],
    ['createPaymentSchema', createPaymentSchema, { transaction_id: 'not-a-uuid' }],
    ['capturePaymentSchema', capturePaymentSchema, { order_id: '', transaction_id: 'not-a-uuid' }],
    ['aiSummarizeSchema', aiSummarizeSchema, { transaction_id: 'not-a-uuid', type: 'nope' }],
    ['qrPayloadSchema', qrPayloadSchema, { type: 'nope', raw: '' }],
    ['qrGenerateSchema', qrGenerateSchema, { data: '' }],
    ['createDisputeSchema', createDisputeSchema, { transaction_id: 'not-a-uuid', reason: '' }],
    ['signUpSchema', signUpSchema, { email: 'nope', password: 'x', display_name: '' }],
    ['signInSchema', signInSchema, { email: 'nope', password: '' }],
    ['dealDnaRequestSchema', dealDnaRequestSchema, { transaction_id: 'not-a-uuid' }],
    ['mediatorRequestSchema', mediatorRequestSchema, { transaction_id: 'not-a-uuid' }],
    ['updateEvidenceSchema', updateEvidenceSchema, {}],
  ];

  it.each(SCHEMAS_WITH_INVALID_INPUT)(
    '%s reports at least one issue with a message',
    (_name, schema, payload) => {
      const result = schema.safeParse(payload);

      expect(result.success).toBe(false);
      const issues = result.error?.issues ?? [];
      expect(issues.length).toBeGreaterThan(0);
      for (const issue of issues) {
        expect(typeof issue.message).toBe('string');
        expect(issue.message && issue.message.length).toBeGreaterThan(0);
      }
    }
  );
});
