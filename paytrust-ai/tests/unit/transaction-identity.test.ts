import { describe, expect, it } from 'vitest';
import {
  mergeLiveTransactions,
  reconcileNotificationHref,
  reconcileTransactionId,
} from '@/lib/demo/transaction-identity';
import type { DemoNotification, DemoTransaction } from '@/lib/demo/types';

/*
 * Regression guard for the "Record not found" dead end.
 *
 * A record created in the browser starts with a client-side placeholder id.
 * The database assigns the real id when the server action resolves. The
 * placeholder used to be published into the URL and the notification link and
 * was never swapped, so reloading the workspace asked the server for a row
 * that does not exist and rendered "Record not found".
 */

const PLACEHOLDER_ID = 'b478f2ae-f6e8-40fb-bba0-fa84c2337da9';
const PERSISTED_ID = '02e1df50-581c-4d23-8439-d1e83541d419';

function makeTransaction(overrides: Partial<DemoTransaction> = {}): DemoTransaction {
  return {
    id: PLACEHOLDER_ID,
    title: 'Website redesign',
    counterpartyId: 'rahul',
    direction: 'out',
    amount: 500,
    currency: 'INR',
    status: 'pending',
    dateLabel: 'Just now',
    dateShort: 'Just now',
    messageCount: 0,
    agreementStatus: 'none',
    verified: true,
    purpose: 'A deal',
    created: 'Just now',
    method: 'PayPal Sandbox Escrow',
    messages: [],
    timeline: [],
    promises: [],
    evidence: { receipts: 0, images: 0, files: 0 },
    ...overrides,
  };
}

function makeNotification(overrides: Partial<DemoNotification> = {}): DemoNotification {
  return {
    id: 'notif-1',
    title: 'Transaction created',
    body: 'Website redesign',
    timeLabel: 'Just now',
    href: `/transactions/${PLACEHOLDER_ID}`,
    read: false,
    tone: 'success',
    ...overrides,
  };
}

describe('reconcileTransactionId', () => {
  it('swaps the placeholder id for the id the database assigned', () => {
    const result = reconcileTransactionId(
      [makeTransaction()],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[0]?.id).toBe(PERSISTED_ID);
  });

  it('clears the local-only marker once the record is persisted', () => {
    const result = reconcileTransactionId(
      [makeTransaction({ localOnly: true })],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[0]?.localOnly).toBe(false);
  });

  it('leaves unrelated records untouched', () => {
    const other = makeTransaction({ id: 'someone-else' });
    const result = reconcileTransactionId(
      [makeTransaction(), other],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[1]).toBe(other);
    expect(result[1]?.id).toBe('someone-else');
  });

  it('does not mutate the records it is given', () => {
    const original = makeTransaction({ localOnly: true });
    reconcileTransactionId([original], PLACEHOLDER_ID, PERSISTED_ID);

    expect(original.id).toBe(PLACEHOLDER_ID);
    expect(original.localOnly).toBe(true);
  });
});

describe('reconcileNotificationHref', () => {
  it('repoints a transaction notification at the persisted record', () => {
    const result = reconcileNotificationHref(
      [makeNotification()],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[0]?.href).toBe(`/transactions/${PERSISTED_ID}`);
  });

  it('repoints a deal notification at the persisted record', () => {
    const result = reconcileNotificationHref(
      [makeNotification({ href: `/deals/${PLACEHOLDER_ID}` })],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[0]?.href).toBe(`/deals/${PERSISTED_ID}`);
  });

  it('leaves notifications for other records untouched', () => {
    const result = reconcileNotificationHref(
      [makeNotification({ href: '/transactions/someone-else' })],
      PLACEHOLDER_ID,
      PERSISTED_ID
    );

    expect(result[0]?.href).toBe('/transactions/someone-else');
  });
});

describe('mergeLiveTransactions', () => {
  it('keeps a record that only exists in this browser', () => {
    const live = [makeTransaction({ id: PERSISTED_ID })];
    const local = makeTransaction({ id: PLACEHOLDER_ID, localOnly: true });

    const result = mergeLiveTransactions(live, [local]);

    expect(result.map((t) => t.id)).toEqual([PERSISTED_ID, PLACEHOLDER_ID]);
  });

  it('replaces the seeded sample records with the live ones', () => {
    const live = [makeTransaction({ id: PERSISTED_ID })];
    const seeded = makeTransaction({ id: 'TX-48213' });

    const result = mergeLiveTransactions(live, [seeded]);

    expect(result.map((t) => t.id)).toEqual([PERSISTED_ID]);
  });

  it('does not duplicate a record that is already live', () => {
    const live = [makeTransaction({ id: PERSISTED_ID })];
    const stale = makeTransaction({ id: PERSISTED_ID, localOnly: true });

    const result = mergeLiveTransactions(live, [stale]);

    expect(result.map((t) => t.id)).toEqual([PERSISTED_ID]);
  });
});
