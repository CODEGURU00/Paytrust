'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEMO_USER_ID,
  demoPeople,
  initialAlerts,
  initialEvidence,
  initialNotifications,
  initialPrivacy,
  initialProject,
  initialTransactions,
  trustProfiles,
} from '@/lib/demo/data';
import type { DemoProfileStats } from '@/lib/demo/types';
import type {
  ChatAttachment,
  ChatMessage,
  DemoAlert,
  DemoEvidence,
  DemoNotification,
  DemoPerson,
  DemoPrivacy,
  DemoProject,
  DemoTransaction,
  PromiseStatus,
} from '@/lib/demo/types';
import {
  getTransactions,
  createTransaction as createTransactionAction,
  releaseEscrowPayment as releaseEscrowPaymentAction,
  sendTransactionMessage as sendTransactionMessageAction,
  raiseTransactionDispute as raiseTransactionDisputeAction,
} from '@/actions/transactions';
import { mapSupabaseToDemoTransaction } from '@/lib/transactions/mapper';
import {
  mergeLiveTransactions,
  reconcileNotificationHref,
  reconcileTransactionId,
} from '@/lib/demo/transaction-identity';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';

const STORAGE_KEY = 'paytrust-demo-state-v1';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface DemoState {
  transactions: DemoTransaction[];
  evidence: DemoEvidence[];
  alerts: DemoAlert[];
  notifications: DemoNotification[];
  project: DemoProject;
  privacy: DemoPrivacy;
}

interface CreateTransactionInput {
  title: string;
  counterpartyId: string;
  counterpartyEmail?: string;
  amount: number;
  purpose: string;
  currency?: string;
  direction?: 'in' | 'out';
  mode?: 'payment' | 'request' | 'deal';
  note?: string;
}

interface DemoContextValue extends DemoState {
  user: DemoPerson;
  people: Record<string, DemoPerson>;
  demoPeople: Record<string, DemoPerson>;
  trustProfiles: Record<string, { personId: string; stats: DemoProfileStats }>;
  routerPush: (href: string) => void;
  toasts: ToastItem[];
  hydrated: boolean;
  pushToast: (
    title: string,
    options?: { description?: string; tone?: ToastTone }
  ) => void;
  dismissToast: (id: string) => void;
  addMessage: (
    transactionId: string,
    content: string,
    attachment?: ChatAttachment
  ) => void;
  approveAgreement: (transactionId: string) => void;
  approveAsCounterparty: (transactionId: string) => void;
  requestChanges: (transactionId: string, note: string) => void;
  updateAgreement: (
    transactionId: string,
    patch: Partial<NonNullable<DemoTransaction['agreement']>>
  ) => void;
  resolveMissingCondition: (transactionId: string, conditionId: string) => void;
  togglePromise: (transactionId: string, promiseId: string) => void;
  addEvidence: (
    transactionId: string,
    input: { name: string; kind: DemoEvidence['kind']; sizeLabel?: string }
  ) => DemoEvidence;
  releasePayment: (transactionId: string) => void;
  fundEscrow: (transactionId: string) => void;
  raiseDispute: (transactionId: string, reason: string) => void;
  createTransaction: (input: CreateTransactionInput) => Promise<string | null>;
  startAgreement: (transactionId: string) => void;
  confirmMilestone: (milestoneId: string) => void;
  addMilestone: (input: { title: string; detail: string; amount: number; dueLabel: string }) => void;
  updateAlertStatus: (alertId: string, status: DemoAlert['status']) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  updatePrivacy: (patch: Partial<DemoPrivacy>) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

interface DemoRouter {
  push: (href: string) => void;
}

const defaultRouter: DemoRouter = { push: () => {} };

const clone = <T,>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : (JSON.parse(JSON.stringify(value)) as T);

const freshState = (): DemoState => ({
  transactions: clone(initialTransactions),
  evidence: clone(initialEvidence),
  alerts: clone(initialAlerts),
  notifications: clone(initialNotifications),
  project: clone(initialProject),
  privacy: clone(initialPrivacy),
});

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const nextStatus: Record<PromiseStatus, PromiseStatus> = {
  done: 'current',
  current: 'done',
  upcoming: 'done',
  'due-soon': 'done',
  overdue: 'done',
};

function deriveTxStatus(
  mode: 'payment' | 'request' | 'deal' | undefined
): DemoTransaction['status'] {
  if (mode === 'request') return 'awaiting_confirmation';
  if (mode === 'deal') return 'in_progress';
  return 'pending';
}

function deriveAgreementLabel(status: DemoTransaction['agreementStatus']) {
  switch (status) {
    case 'approved':
      return 'Approved by both';
    case 'awaiting':
      return 'Awaiting approval';
    case 'awaiting_you':
      return 'Awaiting your approval';
    case 'partial':
      return 'Partial';
    case 'changes_requested':
      return 'Changes requested';
    case 'cancelled':
      return 'Cancelled by mutual consent';
    default:
      return 'None yet';
  }
}

export function DemoProvider({
  children,
  router,
}: {
  children: React.ReactNode;
  router?: DemoRouter;
}) {
  const navigation = useMemo<DemoRouter>(() => router || defaultRouter, [
    router,
  ]);
  const [state, setState] = useState<DemoState>(freshState);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const toastTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  /* Load real transactions from Supabase on mount, purging old dummy local storage. */
  useEffect(() => {
    let isCancelled = false;

    // Purge legacy dummy mock data. A stored snapshot is staged here and
    // applied in the async flow below, so no state is synchronised during the
    // effect body itself.
    let storedSnapshot: Partial<DemoState> | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DemoState>;
        const hasLegacyDummy = parsed?.transactions?.some((t) =>
          typeof t.id === 'string' &&
          (t.id === 'TX-48213' ||
            t.id === 'TX-90412' ||
            t.id === 'TX-31908' ||
            t.id === 'TX-55102' ||
            t.id === 'TX-77301' ||
            t.id === 'TX-12093')
        );
        if (hasLegacyDummy) {
          window.localStorage.removeItem(STORAGE_KEY);
        } else if (parsed && Array.isArray(parsed.transactions) && parsed.transactions.length) {
          storedSnapshot = parsed;
        }
      }
    } catch {
      /* ignore */
    }

    // Fetch authenticated user's real transactions from Supabase
    async function fetchLiveRecords() {
      try {
        if (storedSnapshot) {
          const snapshot = storedSnapshot;
          setState((prev) => ({
            ...prev,
            transactions: snapshot.transactions!,
            evidence: Array.isArray(snapshot.evidence)
              ? snapshot.evidence
              : prev.evidence,
          }));
        }

        const res = await getTransactions();
        if (isCancelled) return;
        if (res.data && Array.isArray(res.data)) {
          const supabase = createBrowserSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          const currentUserId = user?.id;

          const mapped = res.data.map((tx) =>
            mapSupabaseToDemoTransaction(tx, currentUserId)
          );

          setState((prev) => ({
            ...prev,
            // Records that only exist in this browser have no server-side row,
            // so they are kept alongside the live ones.
            transactions: mergeLiveTransactions(mapped, prev.transactions),
          }));
        }
      } catch (err) {
        console.warn('Supabase transactions fetch:', err);
      } finally {
        if (!isCancelled) setHydrated(true);
      }
    }

    fetchLiveRecords();

    // Setup Supabase Realtime subscription
    let channel: ReturnType<ReturnType<typeof createBrowserSupabaseClient>['channel']> | null = null;
    try {
      const supabase = createBrowserSupabaseClient();
      channel = supabase
        .channel('realtime_transactions_feed')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'transactions' },
          async () => {
            const res = await getTransactions();
            if (res.data && !isCancelled) {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              const mapped = res.data.map((tx) =>
                mapSupabaseToDemoTransaction(tx, user?.id)
              );
              setState((prev) => ({
                ...prev,
                transactions: mergeLiveTransactions(mapped, prev.transactions),
              }));
            }
          }
        )
        .subscribe();
    } catch {
      /* ignore */
    }

    return () => {
      isCancelled = true;
      if (channel) {
        try {
          const supabase = createBrowserSupabaseClient();
          supabase.removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  /* Persist the demo record. */
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...state, version: 1 })
      );
    } catch {
      /* Storage can be unavailable in private mode; the demo still works. */
    }
  }, [state, hydrated]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const pushToast = useCallback<DemoContextValue['pushToast']>(
    (title, options) => {
      const id = makeId('toast');
      const item: ToastItem = {
        id,
        title,
        description: options?.description,
        tone: options?.tone || 'success',
      };
      setToasts((current) => [...current.slice(-2), item]);
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        toastTimers.current.delete(id);
      }, 4800);
      toastTimers.current.set(id, timer);
    },
    []
  );

  const updateTransaction = useCallback(
    (
      transactionId: string,
      updater: (transaction: DemoTransaction) => DemoTransaction
    ) => {
      setState((current) => ({
        ...current,
        transactions: current.transactions.map((transaction) =>
          transaction.id === transactionId ? updater(transaction) : transaction
        ),
      }));
    },
    []
  );

  /**
   * A record only reaches the server when it has a server-side row. The
   * seeded sample records and records that were never persisted stay in this
   * browser, so writing them to the database would only fail.
   */
  const canSyncToServer = useCallback(
    (transactionId: string) => {
      if (transactionId.startsWith('TX-')) return false;
      const record = state.transactions.find(
        (transaction) => transaction.id === transactionId
      );
      if (record) return !record.localOnly;
      return transactionId.length > 20;
    },
    [state.transactions]
  );

  const addSystemMessage = useCallback(
    (transaction: DemoTransaction, content: string, tone: ChatMessage['tone'] = 'ai') => {
      const message: ChatMessage = {
        id: makeId('msg'),
        authorId: 'system',
        content,
        time: 'Just now',
        system: true,
        tone,
      };
      return {
        ...transaction,
        messages: [...transaction.messages, message],
        messageCount: transaction.messageCount + 1,
      };
    },
    []
  );

  const addMessage = useCallback<DemoContextValue['addMessage']>(
    (transactionId, content, attachment) => {
      const trimmed = content.trim();
      if (!trimmed && !attachment) return;
      updateTransaction(transactionId, (transaction) => ({
        ...transaction,
        messages: [
          ...transaction.messages,
          {
            id: makeId('msg'),
            authorId: DEMO_USER_ID,
            content: trimmed,
            time: 'Just now',
            attachment,
          },
        ],
        messageCount: transaction.messageCount + 1,
      }));

      if (trimmed && canSyncToServer(transactionId)) {
        sendTransactionMessageAction(transactionId, trimmed).catch(() => {});
      }
    },
    [canSyncToServer, updateTransaction]
  );

  const approveAgreement = useCallback<DemoContextValue['approveAgreement']>(
    (transactionId) => {
      updateTransaction(transactionId, (transaction) => {
        if (!transaction.agreement) return transaction;
        const approvals = { ...transaction.agreement.approvals, you: true };
        const mutual = approvals.counterparty;
        return {
          ...transaction,
          agreementStatus: mutual ? 'approved' : 'awaiting',
          agreement: {
            ...transaction.agreement,
            approvals,
          },
          timeline: transaction.timeline.map((event) =>
            event.state === 'current'
              ? {
                  ...event,
                  state: mutual ? ('done' as const) : ('current' as const),
                  label: mutual
                    ? 'Agreement approved by both'
                    : 'Awaiting Rahul’s approval',
                  date: mutual
                    ? 'Just now · v2 approved'
                    : 'Your approval recorded · just now',
                }
              : event
          ),
        };
      });
      pushToast('Your approval is recorded', {
        description:
          'The approval is timestamped. Terms become binding only when both parties approve.',
      });
    },
    [pushToast, updateTransaction]
  );

  const approveAsCounterparty = useCallback<DemoContextValue['approveAsCounterparty']>(
    (transactionId) => {
      let mutual = false;
      updateTransaction(transactionId, (transaction) => {
        if (!transaction.agreement) return transaction;
        const approvals = { ...transaction.agreement.approvals, counterparty: true };
        mutual = approvals.you && approvals.counterparty;
        return {
          ...transaction,
          agreementStatus: mutual ? 'approved' : 'awaiting_you',
          agreement: { ...transaction.agreement, approvals },
          timeline: transaction.timeline.map((event) =>
            event.state === 'current'
              ? {
                  ...event,
                  state: mutual ? ('done' as const) : ('current' as const),
                  label: mutual
                    ? 'Agreement approved by both'
                    : 'Awaiting your approval',
                  date: mutual ? 'Just now · v2 approved' : 'Counterparty approved · just now',
                }
              : event
          ),
        };
      });
      if (mutual) {
        pushToast('Agreement approved by both', {
          description:
            'Draft v2 is now mutual. Its commitments are tracked in the Promise Tracker.',
          tone: 'success',
        });
      } else {
        pushToast('Rahul approved the draft', {
          description: 'One more approval is needed before the terms become mutual.',
          tone: 'info',
        });
      }
    },
    [pushToast, updateTransaction]
  );

  const requestChanges = useCallback<DemoContextValue['requestChanges']>(
    (transactionId, note) => {
      updateTransaction(transactionId, (transaction) => {
        if (!transaction.agreement) return transaction;
        return addSystemMessage(
          {
            ...transaction,
            agreementStatus: 'changes_requested',
            agreement: {
              ...transaction.agreement,
              approvals: { you: false, counterparty: false },
            },
          },
          `Change requested: ${note || 'Please review the terms.'} The draft will not become binding until both parties approve a new version.`
        );
      });
      pushToast('Change request sent', {
        description: 'The draft stays open and both approvals reset.',
        tone: 'info',
      });
    },
    [addSystemMessage, pushToast, updateTransaction]
  );

  const updateAgreement = useCallback<DemoContextValue['updateAgreement']>(
    (transactionId, patch) => {
      updateTransaction(transactionId, (transaction) => {
        if (!transaction.agreement) return transaction;
        return {
          ...transaction,
          agreement: { ...transaction.agreement, ...patch },
        };
      });
    },
    [updateTransaction]
  );

  const resolveMissingCondition = useCallback<DemoContextValue['resolveMissingCondition']>(
    (transactionId, conditionId) => {
      updateTransaction(transactionId, (transaction) => {
        if (!transaction.agreement) return transaction;
        const condition = transaction.agreement.missing.find(
          (item) => item.id === conditionId
        );
        if (!condition) return transaction;
        const next = {
          ...transaction.agreement,
          missing: transaction.agreement.missing.filter(
            (item) => item.id !== conditionId
          ),
        };
        if (conditionId.includes('rights')) {
          next.responsibilities = `${next.responsibilities} ${condition.suggestion}`;
        } else if (conditionId.includes('deadline')) {
          next.cancellation = condition.suggestion;
        } else {
          next.cancellation = condition.suggestion;
        }
        return {
          ...transaction,
          agreement: next,
        };
      });
      pushToast('Suggested clause added', {
        description: 'Both parties still need to approve the revised draft.',
      });
    },
    [pushToast, updateTransaction]
  );

  const togglePromise = useCallback<DemoContextValue['togglePromise']>(
    (transactionId, promiseId) => {
      updateTransaction(transactionId, (transaction) => ({
        ...transaction,
        promises: transaction.promises.map((promise) =>
          promise.id === promiseId
            ? { ...promise, status: nextStatus[promise.status] }
            : promise
        ),
      }));
    },
    [updateTransaction]
  );

  const addEvidence = useCallback<DemoContextValue['addEvidence']>(
    (transactionId, input) => {
      const evidence: DemoEvidence = {
        id: makeId('ev'),
        transactionId,
        name: input.name,
        kind: input.kind,
        sizeLabel: input.sizeLabel || 'Demo file',
        uploadedBy: 'Arjun Sharma',
        dateLabel: 'Just now',
        preview:
          input.kind === 'receipt'
            ? 'receipt'
            : input.kind === 'image'
              ? 'staging'
              : 'pdf',
      };
      setState((current) => ({
        ...current,
        evidence: [evidence, ...current.evidence],
        transactions: current.transactions.map((transaction) =>
          transaction.id === transactionId
            ? {
                ...transaction,
                evidence: {
                  receipts:
                    transaction.evidence.receipts + (input.kind === 'receipt' ? 1 : 0),
                  images:
                    transaction.evidence.images + (input.kind === 'image' ? 1 : 0),
                  files: transaction.evidence.files + (input.kind === 'file' ? 1 : 0),
                },
              }
            : transaction
        ),
      }));
      pushToast('Added to Evidence Vault', {
        description: `${input.name} is timestamped and linked to ${transactionId}.`,
      });
      return evidence;
    },
    [pushToast]
  );

  const releasePayment = useCallback<DemoContextValue['releasePayment']>(
    (transactionId) => {
      const transaction = state.transactions.find(
        (item) => item.id === transactionId
      );
      if (!transaction) return;
      const amount = transaction.held || transaction.amount;
      updateTransaction(transactionId, (current) => ({
        ...current,
        status: 'completed',
        released: (current.released || 0) + amount,
        held: 0,
        timeline: [
          ...current.timeline,
          {
            id: makeId('timeline'),
            label: 'Escrow payment released to seller',
            date: 'Just now · settled',
            state: 'done',
          },
        ],
        messages: [
          ...current.messages,
          {
            id: makeId('msg'),
            authorId: 'system',
            content: `🎉 Payment receipt · ${transaction.currency} ${amount.toLocaleString()}\nEscrow release confirmed · funds settled to counterparty`,
            time: 'Just now',
            system: true,
            tone: 'receipt',
          },
        ],
      }));
      setState((current) => ({
        ...current,
        evidence: [
          {
            id: makeId('ev'),
            transactionId,
            name: 'Escrow settlement receipt',
            kind: 'receipt',
            sizeLabel: 'PDF · 86 KB',
            uploadedBy: 'PayTrust Escrow',
            dateLabel: 'Just now',
            preview: 'receipt',
          },
          ...current.evidence,
        ],
      }));
      pushToast('Payment released from Escrow', {
        description: `${transaction.currency} ${amount.toLocaleString()} was settled to the seller. Receipt added to Evidence Vault.`,
      });

      if (canSyncToServer(transactionId)) {
        releaseEscrowPaymentAction(transactionId).catch((err) => {
          console.error('Failed to release escrow on server:', err);
        });
      }
    },
    [canSyncToServer, pushToast, state.transactions, updateTransaction]
  );

  const fundEscrow = useCallback<DemoContextValue['fundEscrow']>(
    (transactionId) => {
      const transaction = state.transactions.find(
        (item) => item.id === transactionId
      );
      if (!transaction) return;
      const amount = transaction.amount;
      updateTransaction(transactionId, (current) => ({
        ...current,
        status: 'in_progress',
        held: amount,
        timeline: [
          ...current.timeline,
          {
            id: makeId('timeline'),
            label: 'Escrow deposit funded via PayPal Sandbox',
            date: 'Just now · locked in escrow',
            state: 'done',
          },
        ],
        messages: [
          ...current.messages,
          {
            id: makeId('msg'),
            authorId: current.direction === 'in' ? current.counterpartyId : 'arjun',
            content: `🛡️ PayPal Sandbox Escrow deposit funded (${current.currency} ${amount.toLocaleString()}). Funds are safely locked in escrow until work is delivered and approved.`,
            time: 'Just now',
            system: true,
            tone: 'default',
          },
        ],
      }));
      pushToast('Escrow deposit funded via PayPal Sandbox', {
        description: `${transaction.currency} ${amount.toLocaleString()} is locked in PayTrust Escrow.`,
        tone: 'success',
      });
    },
    [pushToast, state.transactions, updateTransaction]
  );

  const raiseDispute = useCallback<DemoContextValue['raiseDispute']>(
    (transactionId, reason) => {
      updateTransaction(transactionId, (transaction) => ({
        ...transaction,
        status: 'disputed',
        agreementStatus: 'partial',
        dispute: {
          claimA: transaction.dispute?.claimA || 'The delivery did not match the agreed scope.',
          claimB: transaction.dispute?.claimB || 'The agreed work was completed as described.',
          conflict: 'Conflict: accounts differ',
          evidenceIds: transaction.dispute?.evidenceIds || [],
        },
        timeline: [
          ...transaction.timeline,
          {
            id: makeId('timeline'),
            label: 'Dispute opened',
            date: 'Just now · neutral review available',
            state: 'current',
          },
        ],
        messages: [
          ...transaction.messages,
          {
            id: makeId('msg'),
            authorId: 'system',
            content: `Dispute opened. Reason: ${reason || 'Not specified'}. Both parties can add their account and select evidence. No verdict is made automatically.`,
            time: 'Just now',
            system: true,
            tone: 'ai',
          },
        ],
      }));
      pushToast('Dispute opened', {
        description:
          'Nothing was frozen automatically. Add your account and evidence when you are ready.',
        tone: 'warning',
      });

      if (canSyncToServer(transactionId)) {
        raiseTransactionDisputeAction(transactionId, reason).catch((err) => {
          console.error('Failed to raise dispute on server:', err);
        });
      }
    },
    [canSyncToServer, pushToast, updateTransaction]
  );

  const createTransaction = useCallback<DemoContextValue['createTransaction']>(
    async (input) => {
      const placeholderId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      let counterpartyEmail = input.counterpartyEmail;
      if (!counterpartyEmail) {
        if (input.counterpartyId.includes('@')) {
          counterpartyEmail = input.counterpartyId;
        } else if (input.counterpartyId === 'rahul') {
          counterpartyEmail = 'seller@paytrust.demo';
        } else {
          counterpartyEmail = `${input.counterpartyId}@paytrust.demo`;
        }
      }

      const counterparty = demoPeople[input.counterpartyId] || demoPeople.rahul;
      const mode = input.mode || 'payment';
      const direction = input.direction || (mode === 'request' ? 'in' : 'out');
      const amount = Number(input.amount) || 0;
      const newTransaction: DemoTransaction = {
        id: placeholderId,
        // Until the server confirms the row, this record exists only here.
        localOnly: true,
        title: input.title || 'New transaction',
        counterpartyId: counterparty.id,
        direction,
        amount,
        currency: 'INR',
        status: deriveTxStatus(mode),
        dateLabel: 'Just now',
        dateShort: 'Just now',
        messageCount: 0,
        agreementStatus: mode === 'deal' ? 'awaiting' : 'none',
        verified: counterparty.verified,
        purpose: input.purpose || 'No purpose added yet',
        created: 'Just now',
        method: 'PayPal Sandbox Escrow',
        released: 0,
        held: direction === 'out' ? amount : 0,
        messages: [],
        timeline: [
          {
            id: makeId('timeline'),
            label: mode === 'deal' ? 'Draft agreement created' : 'Transaction created',
            date: 'Just now',
            state: 'done',
          },
          {
            id: makeId('timeline'),
            label:
              mode === 'deal'
                ? 'Awaiting mutual approval'
                : mode === 'request'
                  ? 'Awaiting confirmation'
                  : 'Escrow pending',
            date: 'Next step',
            state: 'current',
          },
        ],
        promises: [
          {
            id: makeId('promise'),
            label:
              mode === 'deal'
                ? 'Approve the draft agreement'
                : mode === 'request'
                  ? 'Confirm the request details'
                  : 'Confirm the payment purpose',
            ownerId: 'arjun',
            ownerLabel: 'You',
            dueLabel: 'Soon',
            status: 'current',
          },
        ],
        evidence: { receipts: 0, images: 0, files: 0 },
        agreement:
          mode === 'deal'
            ? {
                version: 'Draft v1',
                overview: `${demoPeople[input.counterpartyId]?.name || 'The counterparty'} and Arjun Sharma will work together on ${input.title}.`,
                paymentAmount: amount,
                split: `₹${Math.round(amount / 2).toLocaleString('en-IN')} + ₹${Math.round(amount / 2).toLocaleString('en-IN')}`,
                deadline: 'To be agreed',
                deadlineTime: 'Add a date',
                responsibilities: input.note || input.purpose || 'Describe the deliverables.',
                revisions: 'Not discussed yet.',
                cancellation: 'Not discussed yet.',
                approvals: { you: false, counterparty: false },
                missing: [
                  {
                    id: 'miss-deadline',
                    question: 'What happens if the deadline is missed?',
                    suggestion:
                      'If delivery is delayed by more than 3 business days, either party may propose a revised date before cancelling.',
                  },
                  {
                    id: 'miss-rights',
                    question: 'Who owns usage rights before full payment?',
                    suggestion:
                      'Usage rights transfer only after final payment is released.',
                  },
                ],
                tags: ['Payment', 'Deliverable'],
              }
            : undefined,
      };
      setState((current) => ({
        ...current,
        transactions: [newTransaction, ...current.transactions],
        notifications: [
          {
            id: makeId('notif'),
            title:
              mode === 'request'
                ? 'Payment request created'
                : mode === 'deal'
                  ? 'Deal created'
                  : 'Payment recorded (simulated)',
            body: `${input.title} · ₹${amount.toLocaleString('en-IN')} with ${counterparty.name}.`,
            timeLabel: 'Just now',
            href:
              mode === 'deal'
                ? `/deals/${placeholderId}`
                : `/transactions/${placeholderId}`,
            read: false,
            tone: 'success',
          },
          ...current.notifications,
        ],
      }));

      pushToast(
        mode === 'request'
          ? 'Request created'
          : mode === 'deal'
            ? 'Deal created'
            : 'Transaction created',
        {
          description:
            mode === 'deal'
              ? 'The deal draft is ready for terms and escrow funding.'
              : 'Escrow protected transaction ready for PayPal funding.',
        }
      );

      /*
       * The server assigns the real id. Until it answers, the placeholder is
       * only known to this browser, so every link that points at it is
       * repointed once the record is stored. Publishing the placeholder would
       * send the user to a URL that resolves to nothing.
       */
      try {
        const isRequest = mode === 'request' || direction === 'in';
        const res = await createTransactionAction({
          title: input.title || 'New transaction',
          description: input.purpose || input.note || undefined,
          amount: amount > 0 ? amount : 10,
          currency: 'USD',
          seller_email: counterpartyEmail,
          role: isRequest ? 'seller' : 'buyer',
        });

        const persistedId = res.data?.id;
        if (persistedId) {
          setState((current) => ({
            ...current,
            transactions: reconcileTransactionId(
              current.transactions,
              placeholderId,
              persistedId
            ),
            notifications: reconcileNotificationHref(
              current.notifications,
              placeholderId,
              persistedId
            ),
          }));
          return persistedId;
        }

        pushToast('Record kept in this browser only', {
          description:
            res.error ||
            'The server could not store this record, so it will be lost when the browser data is cleared.',
          tone: 'warning',
        });
      } catch (err) {
        pushToast('Record kept in this browser only', {
          description:
            err instanceof Error
              ? err.message
              : 'The server could not store this record.',
          tone: 'warning',
        });
      }

      return placeholderId;
    },
    [pushToast]
  );

  const startAgreement = useCallback<DemoContextValue['startAgreement']>(
    (transactionId) => {
      updateTransaction(transactionId, (transaction) => {
        if (transaction.agreement) return transaction;
        const counterparty = demoPeople[transaction.counterpartyId];
        return addSystemMessage(
          {
            ...transaction,
            agreementStatus: 'awaiting',
            agreement: {
              version: 'Draft v1',
              overview: `${counterparty?.name || 'The counterparty'} and Arjun Sharma will work together on ${transaction.title}. Payment is protected until both parties approve the terms.`,
              paymentAmount: transaction.amount,
              split: `₹${Math.round(transaction.amount / 2).toLocaleString('en-IN')} + ₹${Math.round(transaction.amount / 2).toLocaleString('en-IN')}`,
              deadline: 'To be agreed',
              deadlineTime: 'Add a date',
              responsibilities: transaction.purpose,
              revisions: 'Not discussed yet.',
              cancellation: 'Not discussed yet.',
              approvals: { you: false, counterparty: false },
              missing: [
                {
                  id: 'miss-deadline',
                  question: 'What happens if the deadline is missed?',
                  suggestion:
                    'If delivery is delayed by more than 3 business days, either party may propose a revised date before cancelling.',
                },
                {
                  id: 'miss-rights',
                  question: 'Who owns usage rights before full payment?',
                  suggestion:
                    'Usage rights transfer only after final payment is released.',
                },
              ],
              tags: ['Payment', 'Deliverable'],
            },
            timeline: [
              ...transaction.timeline,
              {
                id: makeId('timeline'),
                label: 'Draft agreement created',
                date: 'Just now · awaiting mutual approval',
                state: 'current',
              },
            ],
          },
          `Deal DNA draft created for ${transaction.title}. Detected ₹${transaction.amount.toLocaleString('en-IN')} · payment terms and delivery details inferred from the conversation. Missing conditions are highlighted. This draft is not binding until both parties approve.`
        );
      });
      pushToast('Draft agreement created', {
        description:
          'Review the detected terms, fill the gaps, then both parties approve.',
      });
    },
    [addSystemMessage, pushToast, updateTransaction]
  );

  const confirmMilestone = useCallback<DemoContextValue['confirmMilestone']>(
    (milestoneId) => {
      setState((current) => {
        const milestone = current.project.milestones.find(
          (item) => item.id === milestoneId
        );
        if (!milestone || milestone.status !== 'awaiting') return current;
        return {
          ...current,
          project: {
            ...current.project,
            paid: current.project.paid + milestone.amount,
            milestones: current.project.milestones.map((item) =>
              item.id === milestoneId
                ? {
                    ...item,
                    status: 'paid',
                    paidOn: 'Paid · just now',
                    completionNote: 'Completion confirmed by you',
                  }
                : item
            ),
            history: [
              {
                id: makeId('history'),
                label: `${milestone.title} milestone paid (simulated)`,
                date: 'Just now',
                tone: 'green',
              },
              ...current.project.history,
            ],
          },
        };
      });
      pushToast('Milestone confirmed and paid', {
        description:
          'The demo payment was recorded. The next milestone is still controlled by you.',
      });
    },
    [pushToast]
  );

  const addMilestone = useCallback<DemoContextValue['addMilestone']>(
    (input) => {
      setState((current) => {
        const milestone = {
          id: makeId('milestone'),
          number: current.project.milestones.length + 1,
          title: input.title,
          detail: input.detail,
          amount: Number(input.amount) || 0,
          dueLabel: input.dueLabel || 'No date',
          status: 'not_started' as const,
          evidence: [],
        };
        return {
          ...current,
          project: {
            ...current.project,
            total: current.project.total + Number(input.amount || 0),
            milestones: [...current.project.milestones, milestone],
            history: [
              {
                id: makeId('history'),
                label: `${input.title} milestone added`,
                date: 'Just now',
                tone: 'blue' as const,
              },
              ...current.project.history,
            ],
          },
        };
      });
      pushToast('Milestone added', {
        description: 'Both parties can see the new milestone and its amount.',
      });
    },
    [pushToast]
  );

  const updateAlertStatus = useCallback<DemoContextValue['updateAlertStatus']>(
    (alertId, status) => {
      setState((current) => ({
        ...current,
        alerts: current.alerts.map((alert) =>
          alert.id === alertId ? { ...alert, status } : alert
        ),
      }));
      pushToast(
        status === 'expected' ? 'Marked as expected' : 'Alert reviewed',
        {
          description:
            'Your feedback only tunes future signals. It is never shown publicly.',
          tone: 'info',
        }
      );
    },
    [pushToast]
  );

  const markNotificationRead = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    }));
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }));
  }, []);

  const updatePrivacy = useCallback((patch: Partial<DemoPrivacy>) => {
    setState((current) => ({
      ...current,
      privacy: { ...current.privacy, ...patch },
    }));
  }, []);

  const resetDemo = useCallback(() => {
    setState(freshState());
    pushToast('Demo workspace reset', {
      description: 'The sample record is back to its original state.',
      tone: 'info',
    });
  }, [pushToast]);

  const safePeople = useMemo(() => {
    return new Proxy(demoPeople, {
      get(target, prop: string | symbol) {
        if (typeof prop === 'string' && prop in target) {
          return target[prop];
        }
        if (typeof prop === 'string') {
          const cleanName = prop.includes('@') ? prop.split('@')[0] : prop;
          return {
            id: prop,
            name: cleanName.charAt(0).toUpperCase() + cleanName.slice(1),
            handle: cleanName.toLowerCase(),
            avatar: 'rahul',
            verified: true,
            role: 'Participant',
          };
        }
        return undefined;
      },
    });
  }, []);

  const value = useMemo<DemoContextValue>(
    () => ({
      ...state,
      user: safePeople[DEMO_USER_ID],
      people: safePeople,
      toasts,
      hydrated,
      pushToast,
      dismissToast,
      addMessage,
      approveAgreement,
      approveAsCounterparty,
      requestChanges,
      updateAgreement,
      resolveMissingCondition,
      togglePromise,
      addEvidence,
      releasePayment,
      fundEscrow,
      raiseDispute,
      createTransaction,
      startAgreement,
      confirmMilestone,
      addMilestone,
      updateAlertStatus,
      markNotificationRead,
      markAllNotificationsRead,
      updatePrivacy,
      resetDemo,
      routerPush: navigation.push,
      demoPeople: safePeople,
      trustProfiles,
    }),
    [
      state,
      toasts,
      hydrated,
      pushToast,
      dismissToast,
      addMessage,
      approveAgreement,
      approveAsCounterparty,
      requestChanges,
      updateAgreement,
      resolveMissingCondition,
      togglePromise,
      addEvidence,
      releasePayment,
      fundEscrow,
      raiseDispute,
      createTransaction,
      startAgreement,
      confirmMilestone,
      addMilestone,
      updateAlertStatus,
      markNotificationRead,
      markAllNotificationsRead,
      updatePrivacy,
      resetDemo,
      navigation,
      safePeople,
      trustProfiles,
    ]
  );

  return (
    <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
  );
}

export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used inside a DemoProvider');
  }
  return context;
}

export { deriveAgreementLabel };
