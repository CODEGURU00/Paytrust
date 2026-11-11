import type { DemoNotification, DemoTransaction } from '@/lib/demo/types';

/*
 * Identity helpers for records created in the browser.
 *
 * A record is created optimistically with a client-side placeholder id so the
 * UI can render it immediately. The database assigns the real id when the
 * server action resolves. Every place the placeholder was published - the
 * record itself, the notification link, the browser URL - has to be swapped
 * for the persisted id, otherwise the link points at a row that does not
 * exist and the workspace answers with "Record not found".
 */

/**
 * Replace the placeholder id with the id the database assigned and clear the
 * local-only marker, because the record is now stored on the server.
 */
export function reconcileTransactionId(
  transactions: DemoTransaction[],
  placeholderId: string,
  persistedId: string
): DemoTransaction[] {
  if (placeholderId === persistedId) return transactions;

  return transactions.map((transaction) =>
    transaction.id === placeholderId
      ? { ...transaction, id: persistedId, localOnly: false }
      : transaction
  );
}

/**
 * Repoint notifications that link to the placeholder record at the persisted
 * record instead. Links to other records are left alone.
 */
export function reconcileNotificationHref(
  notifications: DemoNotification[],
  placeholderId: string,
  persistedId: string
): DemoNotification[] {
  if (placeholderId === persistedId) return notifications;

  const replacements: Array<[string, string]> = [
    [`/transactions/${placeholderId}`, `/transactions/${persistedId}`],
    [`/deals/${placeholderId}`, `/deals/${persistedId}`],
  ];

  return notifications.map((notification) => {
    const match = replacements.find(([from]) => notification.href === from);
    return match ? { ...notification, href: match[1] } : notification;
  });
}

/**
 * Live records replace the seeded sample records, but a record that was
 * created in this browser and never persisted has no server-side row. It is
 * kept so the URL that points at it keeps resolving.
 */
export function mergeLiveTransactions(
  live: DemoTransaction[],
  existing: DemoTransaction[]
): DemoTransaction[] {
  const liveIds = new Set(live.map((transaction) => transaction.id));
  const localOnly = existing.filter(
    (transaction) => transaction.localOnly && !liveIds.has(transaction.id)
  );

  return localOnly.length > 0 ? [...live, ...localOnly] : live;
}
