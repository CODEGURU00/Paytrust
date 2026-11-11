import { describe, expect, it } from 'vitest';
import {
  assertAmountMatches,
  assertEscrowReleasable,
  verifyOrderMatchesTransaction,
} from '@/lib/payments';
import type { PayPalOrder } from '@/lib/paypal';

const TRANSACTION_ID = '11111111-1111-4111-8111-111111111111';
const ORDER_ID = 'ORDER-123';

const transaction = {
  id: TRANSACTION_ID,
  buyer_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seller_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  title: 'Website redesign',
  amount: 500,
  currency: 'USD',
  status: 'APPROVED' as const,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  paypal_order_id: ORDER_ID,
};

function order(overrides: Partial<PayPalOrder> = {}): PayPalOrder {
  return {
    id: ORDER_ID,
    status: 'APPROVED',
    links: [],
    purchase_units: [
      {
        reference_id: TRANSACTION_ID,
        amount: { currency_code: 'USD', value: '500.00' },
      },
    ],
    ...overrides,
  } as PayPalOrder;
}

describe('assertAmountMatches', () => {
  it('accepts an exact match', () => {
    expect(() =>
      assertAmountMatches(transaction, { currency_code: 'USD', value: '500.00' }, 'PayPal capture')
    ).not.toThrow();
  });

  it('accepts a difference within the tolerance', () => {
    expect(() =>
      assertAmountMatches(transaction, { currency_code: 'USD', value: '500.01' }, 'PayPal capture')
    ).not.toThrow();
  });

  it('fails CLOSED when the amount is missing', () => {
    // A missing amount used to return early, which skipped the check
    // completely: any amount in any currency was accepted.
    expect(() => assertAmountMatches(transaction, undefined, 'PayPal capture')).toThrow(
      /Missing PayPal capture amount/
    );
    expect(() =>
      assertAmountMatches(transaction, { currency_code: 'USD' }, 'PayPal capture')
    ).toThrow(/Missing PayPal capture amount/);
    expect(() =>
      assertAmountMatches(transaction, { value: '500.00' }, 'PayPal capture')
    ).toThrow(/Missing PayPal capture amount/);
  });

  it('rejects a mismatched currency and a mismatched amount', () => {
    expect(() =>
      assertAmountMatches(transaction, { currency_code: 'EUR', value: '500.00' }, 'PayPal capture')
    ).toThrow(/does not match transaction currency/);
    expect(() =>
      assertAmountMatches(transaction, { currency_code: 'USD', value: '5000.00' }, 'PayPal capture')
    ).toThrow(/does not match transaction amount/);
  });
});

describe('verifyOrderMatchesTransaction', () => {
  it('accepts an order bound to the transaction', () => {
    expect(() =>
      verifyOrderMatchesTransaction(order(), transaction, ORDER_ID)
    ).not.toThrow();
  });

  it('rejects an order that is not the expected order', () => {
    expect(() =>
      verifyOrderMatchesTransaction(order({ id: 'OTHER' }), transaction, ORDER_ID)
    ).toThrow(/PayPal order mismatch/);
  });

  it('rejects an order when the transaction has no paypal_order_id', () => {
    // The binding check used to be skipped when paypal_order_id was NULL,
    // which is exactly the state a transaction is in before the buyer starts
    // a payment.
    expect(() =>
      verifyOrderMatchesTransaction(
        order(),
        { ...transaction, paypal_order_id: null },
        ORDER_ID
      )
    ).toThrow(/does not belong to the transaction/);
  });

  it('rejects an order bound to a different transaction', () => {
    expect(() =>
      verifyOrderMatchesTransaction(
        order(),
        { ...transaction, paypal_order_id: 'ANOTHER-ORDER' },
        ORDER_ID
      )
    ).toThrow(/does not belong to the transaction/);
  });

  it('rejects an order with no purchase unit at all', () => {
    expect(() =>
      verifyOrderMatchesTransaction(
        order({ purchase_units: [] }),
        transaction,
        ORDER_ID
      )
    ).toThrow(/not bound to this transaction/);
  });

  it('rejects an order whose reference_id belongs to another transaction', () => {
    expect(() =>
      verifyOrderMatchesTransaction(
        order({
          purchase_units: [
            {
              reference_id: '22222222-2222-4222-8222-222222222222',
              amount: { currency_code: 'USD', value: '500.00' },
            },
          ],
        }),
        transaction,
        ORDER_ID
      )
    ).toThrow(/not bound to this transaction/);
  });

  it('rejects an order whose amount does not match the transaction', () => {
    expect(() =>
      verifyOrderMatchesTransaction(
        order({
          purchase_units: [
            {
              reference_id: TRANSACTION_ID,
              amount: { currency_code: 'USD', value: '1.00' },
            },
          ],
        }),
        transaction,
        ORDER_ID
      )
    ).toThrow(/does not match transaction amount/);
  });
});

describe('assertEscrowReleasable', () => {
  it('allows a release only after the funds are captured', () => {
    expect(() => assertEscrowReleasable('APPROVED')).not.toThrow();
  });

  it('refuses to release escrow that was never funded', () => {
    // Without this check a buyer could release escrow on a CREATED
    // transaction and the seller would be told they had been paid.
    for (const status of ['CREATED', 'PENDING', 'FAILED', 'CANCELLED'] as const) {
      expect(() => assertEscrowReleasable(status)).toThrow(
        /Escrow funds have not been captured/
      );
    }
  });
});
