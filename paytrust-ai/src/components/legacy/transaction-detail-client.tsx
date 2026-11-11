'use client';

/* Legacy Supabase-backed transaction screen. Loosely typed adapter fields are
   kept intentionally while the demo workspace is the primary experience. */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  formatCurrency,
  formatRelativeTime,
  getInitials,
} from '@/lib/utils';
import type {
  AISummary,
  Attachment,
  Message,
  TransactionStatus,
  TransactionWithDetails,
} from '@/lib/types';
import { useDemo, deriveAgreementLabel } from '@/components/demo/demo-provider';
import type { DemoPerson } from '@/lib/demo/types';

interface DemoTx extends TransactionWithDetails {
  counterpartyId?: string;
  direction?: 'in' | 'out';
  agreementStatus?: string;
  released?: number;
  held?: number;
  created?: string;
  method?: string;
  agreement?: any;
  aiInsight?: {
    headline: string;
    body: string;
    conflicts: string;
    dispute: string;
  };
  promises?: Array<{
    id: string;
    label: string;
    ownerId: string;
    ownerLabel: string;
    dueLabel?: string;
    status: string;
  }>;
  evidence?: { receipts: number; images: number; files: number };
  timeline?: Array<{
    id: string;
    label: string;
    date: string;
    state: string;
    detail?: string;
  }>;
}
import { Panel, PanelHeader, PageHeader } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import {
  transactionStatusMeta,
  StatusPill,
  AgreementStatusPill,
} from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { FieldLabel, TextInput } from '@/components/ui/form';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  CheckCircle,
  Clock,
  Copy,
  CreditCard,
  FileText,
  Image,
  Link as LinkIcon,
  Loader2,
  MessageCircle,
  Receipt,
  Send,
  Shield,
  Sparkles,
  Upload,
  User,
  Menu,
} from 'lucide-react';

const TERMINAL_STATUSES: TransactionStatus[] = [
  'COMPLETED',
  'REFUNDED',
  'CANCELLED',
];

function getStatusVariant(status: TransactionStatus) {
  switch (status) {
    case 'COMPLETED':
      return 'success' as const;
    case 'PENDING':
    case 'APPROVED':
      return 'warning' as const;
    case 'FAILED':
      return 'destructive' as const;
    case 'CANCELLED':
    case 'REFUNDED':
      return 'secondary' as const;
    default:
      return 'default' as const;
  }
}

function getPaymentBanner(status?: string) {
  switch (status) {
    case 'success':
      return {
        className: 'border-green/20 bg-green/[0.08] text-green-soft',
        text: 'Payment completed. The transaction record has been updated.',
      };
    case 'failed':
      return {
        className: 'border-red/20 bg-red/[0.08] text-red-soft',
        text: 'Payment could not be completed. You can try again below.',
      };
    case 'cancelled':
      return {
        className: 'border-line bg-white/[0.03] text-muted-dim',
        text: 'Payment was cancelled. No money was taken.',
      };
    case 'forbidden':
      return {
        className: 'border-red/20 bg-red/[0.08] text-red-soft',
        text: 'You are not a participant of this transaction.',
      };
    default:
      return null;
  }
}

export default function TransactionDetailClient({
  initialTransaction,
  currentUserId,
  paymentStatus,
}: {
  initialTransaction: TransactionWithDetails;
  currentUserId: string;
  paymentStatus?: string;
}) {
  const router = useRouter();
  const {
    addMessage,
    approveAgreement,
    approveAsCounterparty,
    requestChanges,
    updateAgreement,
    resolveMissingCondition,
    togglePromise,
    addEvidence,
    releasePayment,
    raiseDispute,
    pushToast,
    people,
    demoPeople,
    routerPush,
  } = useDemo();

  const [transaction, setTransaction] = useState<TransactionWithDetails>(
    initialTransaction
  );
  const [messageContent, setMessageContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSummarising, setIsSummarising] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiType, setAiType] = useState<'conversation' | 'commitments' | 'evidence_report' | 'missing_evidence'>('conversation');
  const [openClauses, setOpenClauses] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBuyer = transaction.buyer_id === currentUserId;
  const isTerminal = TERMINAL_STATUSES.includes(transaction.status);
  const banner = getPaymentBanner(paymentStatus);
  const tx = transaction as DemoTx;
  const selfProfile = isBuyer ? transaction.buyer : transaction.seller;
  const counterpartyProfile = isBuyer ? transaction.seller : transaction.buyer;
  const demoCounterparty =
    people[tx.counterpartyId || ''] || demoPeople[tx.counterpartyId || ''];
  // Database transactions do not carry the demo adapter's counterpartyId, so
  // fall back to the joined profile rather than rendering undefined.
  const counterparty: Pick<
    DemoPerson,
    'name' | 'avatar' | 'verified'
  > = demoCounterparty || {
    name: counterpartyProfile?.display_name || 'Counterparty',
    avatar: isBuyer ? 'priya' : 'rahul',
    verified: counterpartyProfile?.verification_status === 'verified',
  };
  const selfName = selfProfile?.display_name || demoPeople.arjun.name;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`transaction-chat-${transaction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transaction_messages',
          filter: `transaction_id=eq.${transaction.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setTransaction((previous) => {
            const messages = previous.messages || [];
            if (messages.some((message) => message.id === newMessage.id)) {
              return previous;
            }
            return {
              ...previous,
              messages: [...messages, newMessage],
            };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [transaction.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transaction.messages]);

  const handleSendMessage = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const content = messageContent.trim();
    if (!content || isSending) return;

    setError(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          content,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not send message');
        return;
      }

      const message = result.data as Message;
      setTransaction((previous) => {
        const messages = previous.messages || [];
        if (messages.some((existing) => existing.id === message.id)) {
          return previous;
        }
        return { ...previous, messages: [...messages, message] };
      });
      setMessageContent('');
    } catch {
      setError('Could not send message');
    } finally {
      setIsSending(false);
    }
  }, [transaction, messageContent, isSending]);

  const handleGenerateSummary = useCallback(async () => {
    if (isSummarising) return;

    setError(null);
    setIsSummarising(true);

    try {
      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          type: aiType,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not generate summary');
        return;
      }

      const summary = result.data as { id: string; summary: string; source_version: string; created_at: string };
      setTransaction((previous) => ({
        ...previous,
        ai_summaries: [
          { ...summary, summary_type: aiType, transaction_id: transaction.id } as AISummary,
          ...(previous.ai_summaries || []),
        ],
      }));
    } catch {
      setError('Could not generate summary');
    } finally {
      setIsSummarising(false);
    }
  }, [transaction, aiType, isSummarising]);

  const handleCreatePayment = useCallback(async () => {
    if (!isBuyer || isPaying || isTerminal) return;

    setError(null);
    setIsPaying(true);

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: transaction.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not start PayPal payment');
        return;
      }

      if (result.data?.approvalUrl) {
        window.location.href = result.data.approvalUrl as string;
        return;
      }

      setError('PayPal did not return an approval link');
    } catch {
      setError('Could not start PayPal payment');
    } finally {
      setIsPaying(false);
    }
  }, [isBuyer, isPaying, isTerminal, transaction]);

  const handleSubmitFile = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || isUploading) return;

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('transaction_id', transaction.id);

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Could not upload file');
        return;
      }

      const attachment = result.data as Attachment;
      setTransaction((previous) => ({
        ...previous,
        attachments: [attachment, ...(previous.attachments || [])],
      }));
      setFile(null);
      const input = document.getElementById(
        'attachment-file'
      ) as HTMLInputElement | null;
      if (input) input.value = '';
    } catch {
      setError('Could not upload file');
    } finally {
      setIsUploading(false);
    }
  }, [file, isUploading, transaction]);

  const toggleClause = (id: string) => {
    setOpenClauses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isOpen = (id: string) => openClauses.has(id);

  const progressPct =
    transaction.amount > 0
      ? Math.round(((tx.released || 0) / transaction.amount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-canvas">
      <PageHeader
        eyebrow={`Transaction · ${transaction.id}`}
        title={transaction.title}
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="flex h-9 items-center gap-1 rounded-lg border border-line bg-white/[0.03] px-2.5 text-sm font-medium text-muted-dim transition-colors hover:bg-white/[0.05] hover:text-ink"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
            </Link>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/[0.05] hover:text-ink"
              aria-label="More actions"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {banner && (
        <div
          className={cn(
            'mb-4 rounded-xl border px-4 py-3 text-sm',
            banner.className
          )}
        >
          {banner.text}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red/20 bg-red/[0.04] px-4 py-3 text-sm text-red-soft">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        {/* LEFT PANEL — transaction overview */}
        <div className="lg:col-span-4 space-y-6">
          <Panel className="sticky top-[78px]">
            <PanelHeader
              title="Overview"
              description={`${formatCurrency(transaction.amount, transaction.currency)} · ${deriveAgreementLabel(tx.agreementStatus as any)}`}
              action={
                <div className="flex items-center gap-2">
                  <StatusPill
                    tone={transactionStatusMeta(transaction.status as any).tone}
                    dot
                    pulse={(transaction.status as any) === 'in_progress'}
                  >
                    {transactionStatusMeta(transaction.status as any).label}
                  </StatusPill>
                </div>
              }
            />
            <div className="pt-4 space-y-6">
              <div className="rounded-xl border border-line bg-[#0a1424] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-dim">
                    Amount
                  </span>
                  <span className="text-[20px] font-semibold text-ink">
                    {formatCurrency(transaction.amount, transaction.currency)}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="text-[10px] uppercase tracking-[0.1em] text-muted-dim block mb-1">
                    Released
                  </span>
                  <div className="h-3 w-full rounded-full border border-line bg-[#0a1424] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan to-brand"
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-muted-dim">
                    <span>
                      {formatCurrency(tx.released || 0, transaction.currency)} released
                    </span>
                    <span>
                      {formatCurrency(tx.held ?? transaction.amount, transaction.currency)} held
                    </span>
                  </div>
                </div>
                <span className="text-[11px] text-muted-dim">
                  Simulated funds · demo only
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-[#0a1424] p-3">
                  <PersonAvatar
                    person={{ name: selfName, avatar: demoPeople.arjun.avatar }}
                    size="sm"
                  />
                  <div>
                    <span className="text-[11.5px] font-medium text-ink">
                      {selfName} (you)
                    </span>
                    <span className="text-[10px] text-muted-dim">
                      {isBuyer ? 'Sender' : 'Receiver'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-line bg-[#0a1424] p-3">
                  <PersonAvatar person={counterparty} size="sm" />
                  <div>
                    <span className="text-[11.5px] font-medium text-ink">{counterparty.name}</span>
                    <div className="flex items-center gap-1">
                      {counterparty.verified && (
                        <>
                          <span className="h-1.5 w-1.5 rounded-full bg-green" />
                          <span className="text-[10px] text-green-soft">ID verified</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-dim">
                      {isBuyer ? 'Receiver' : 'Sender'}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-line bg-[#0a1424] p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-dim">Agreement summary</span>
                    <AgreementStatusPill status={(tx.agreementStatus || 'none') as any} />

                  </div>
                  <ul className="space-y-2 text-sm">
                    {[
                      { label: '3 logo concepts + final files', icon: <Image className="h-3 w-3" /> },
                      { label: 'Deadline 14 May, 6:00 PM', icon: <Clock className="h-3 w-3" /> },
                      { label: '2 revision rounds included', icon: <Copy className="h-3 w-3" /> },
                      { label: '50% released on concept approval', icon: <Receipt className="h-3 w-3" /> },
                    ].map((item) => (
                      <li key={item.label} className="flex items-center gap-2 text-[12.5px] text-ink-soft">
                        {item.icon}
                        {item.label}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => routerPush(`/deals/${transaction.id}`)}
                    className="mt-3 block text-[12px] font-medium text-cyan-soft hover:text-cyan underline-offset-2"
                  >
                    Open in Deal DNA
                  </button>
                </div>

                <div className="space-y-2 pt-3 border-t border-line-soft">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex flex-col">
                      <span className="text-muted-dim">Transaction ID</span>
                      <span className="font-medium text-ink">{transaction.id}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-dim">Created</span>
                      <span className="font-medium text-ink">{tx.created}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-dim">Method</span>
                      <span className="font-medium text-ink">{tx.method}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-muted-dim">Your role</span>
                      <span className="font-medium text-ink capitalize">
                        {isBuyer ? 'Sender' : 'Receiver'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          {/* AI Deal DNA quick view — left panel bottom */}
          {tx.agreement && (
            <Panel>
              <PanelHeader
                title="AI Deal DNA · draft"
                description="Not binding until both parties approve."
              />
              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => routerPush(`/deals/${transaction.id}`)}
                  className="w-full flex items-center justify-between rounded-xl border border-line bg-[#0a1424] px-3 py-2.5 text-left hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-medium text-ink">
                    Review draft terms
                  </span>
                  <Sparkles className="h-3.5 w-3.5 text-cyan-soft" />
                </button>
                <div className="rounded-lg border border-line bg-[#0a1424] p-2.5">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-dim mb-1">
                    Analysis quality
                  </div>
                  <div className="text-sm text-ink-soft">
                    Based on chat messages. {tx.agreement.missing.length} missing condition flagged.
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>

        {/* CENTER PANEL — conversation */}
        <div className="lg:col-span-5 flex flex-col min-h-[600px]">
          <Panel className="flex-1 flex flex-col">
            <PanelHeader
              title="Transaction-linked chat"
              description="Messages are timestamped and saved to the Evidence Vault."
              action={
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="h-8 shrink-0 rounded-lg border border-line bg-[#0a1424] px-2 text-[11px] font-medium text-muted-dim transition-colors hover:bg-white/[0.04]"
                  >
                    AI summary
                  </button>
                  <Button size="icon-sm" variant="ghost" onClick={handleGenerateSummary} isLoading={isSummarising}>
                    <Sparkles className="h-3.5 w-3.5" />
                  </Button>
                </div>
              }
            />
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 pt-4 pb-6">
              <div className="text-center">
                <span className="text-[10px] text-muted-dim">9 May</span>
              </div>
              {(transaction.messages || []).length === 0 && (
                <div className="py-12 text-center">
                  <MessageCircle className="mx-auto mb-3 h-8 w-8 text-muted-dim" />
                  <p className="text-sm text-muted">No messages yet. Start the conversation below.</p>
                </div>
              )}
              {(transaction.messages || []).map((message) => (
                <TransactionMessage
                  key={message.id}
                  message={message as Message & Record<string, unknown>}
                  isMine={message.sender_id === currentUserId}
                  people={people}
                  demoPeople={demoPeople}
                  currentUserId={currentUserId}
                  transactionId={transaction.id}
                  routerPush={routerPush}
                />
              ))}
              <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-line-soft p-4">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <div className="relative flex-1">
                    <TextInput
                      value={messageContent}
                      onChange={(event) => setMessageContent(event.target.value)}
                      placeholder="Message about this transaction…"
                      className="field h-9 py-2 pl-10 pr-3 text-sm"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-dim">
                      <LinkIcon className="h-3 w-3" />
                    </span>
                  </div>
                  <label
                    className="relative block cursor-pointer"
                    onClick={() => document.getElementById('attachment-file')?.click()}
                  >
                    <input
                      id="attachment-file"
                      type="file"
                      onChange={(event) => setFile(event.target.files?.[0] || null)}
                      accept="image/*,.pdf"
                      className="sr-only"
                    />
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-[#0a1424] text-muted-dim hover:bg-white/[0.04] hover:text-ink transition-colors"
                      disabled={isUploading}
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </label>
                  <Button
                    type="submit"
                    size="icon-sm"
                    variant="primary"
                    disabled={!messageContent.trim() && !file}
                    isLoading={isSending}
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                {file && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] font-medium text-ink truncate max-w-xs">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] text-muted-dim hover:bg-white/[0.05]"
                    >
                      <span className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </Panel>
        </div>

        {/* RIGHT PANEL — intelligence */}
        <div className="lg:col-span-3 space-y-6">
          {/* AI Transaction Intelligence */}
          <Panel>
            <PanelHeader
              title="AI Transaction Intelligence"
              description="Explainable signals, not verdicts."
            />
            <div className="pt-4 space-y-4">
              <div className="rounded-lg border border-amber/20 bg-amber/[0.05] p-3">
                <p className="text-sm text-ink">
                  {tx.aiInsight?.headline || 'Deal is on schedule.'}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {tx.aiInsight?.body || 'The delivery date is still on track.'}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-soft" />
                  <span className="text-xs text-green-soft">
                    {tx.aiInsight?.conflicts || 'No conflicts detected'}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-red/20" />
                  <span className="text-xs text-red-soft">
                    {tx.aiInsight?.dispute || 'Dispute: none'}
                  </span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Promise Tracker */}
          <Panel>
            <PanelHeader
              title="Promise Tracker"
              description="Approved commitments with due dates."
            />
            <div className="pt-4 space-y-3">
              {(tx.promises || []).map((promise) => {
                const tone = promise.status === 'done' ? 'green' : promise.status === 'overdue' ? 'red' : 'amber';
                return (
                  <div key={promise.id} className="flex items-center justify-between rounded-lg border border-line bg-[#0a1424] p-2.5 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium text-ink">{promise.label}</span>
                        {promise.status === 'overdue' && (
                          <span className="text-[10px] font-medium text-red">Overdue</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-dim">{promise.ownerLabel} · {promise.dueLabel}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePromise(transaction.id, promise.id)}
                      className={cn(
                        'h-6 w-6 shrink-0 rounded-full border transition-all',
                        promise.status === 'done'
                          ? 'border-green bg-green text-[#0a1424]'
                          : 'border-line bg-white/[0.03] text-muted-dim hover:border-line-strong hover:text-ink'
                      )}
                    >
                      {promise.status === 'done' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <Clock className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                );
              })}
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-line-strong bg-transparent px-3 py-2 text-[11px] font-medium text-muted-dim hover:bg-white/[0.03] hover:text-ink transition-colors"
              >
                + Add promise
              </button>
            </div>
          </Panel>

          {/* Evidence Vault */}
          <Panel>
            <PanelHeader
              title="Evidence Vault"
              description={`${(tx.evidence?.receipts ?? 0)} receipts · ${(tx.evidence?.images ?? 0)} images · ${(tx.evidence?.files ?? 0)} files`}
            />
            <div className="pt-4 space-y-2">
              <div className="grid gap-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-line bg-[#0a1424] flex items-center justify-center">
                    <span className="text-[10px] text-muted-dim">Item {i + 1}</span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" onClick={() => document.getElementById('attachment-file')?.click()} className="flex-1">
                  Attach
                </Button>
                <Link href="/evidence" className="h-9 shrink-0 flex items-center justify-center rounded-lg border border-line bg-[#0a1424] px-2.5 text-[11px] font-medium text-muted-dim hover:bg-white/[0.03]">
                  View all
                </Link>
              </div>
            </div>
          </Panel>

          {/* Agreement timeline */}
          <Panel>
            <PanelHeader title="Agreement timeline" />
            <div className="pt-4 space-y-4">
              {(tx.timeline || []).map((event, i) => (
                <div key={event.id} className="relative pl-8">
                  <div className="absolute left-[3px] top-1.5 h-2 w-2 rounded-full">
                    {event.state === 'done' && <span className="bg-green" />}
                    {event.state === 'current' && <span className="relative border border-cyan bg-transparent" />}
                    {event.state === 'upcoming' && <span className="bg-white/[0.06]" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11.5px] font-medium text-ink">{event.label}</span>
                    <span className="text-[10px] text-muted-dim">{event.detail ? `· ${event.detail}` : event.date}</span>
                  </div>
                  {i < (tx.timeline || []).length - 1 && (
                    <div className="absolute left-4 top-3 bottom-3 w-[1px] bg-white/[0.06]" />
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TransactionMessage({
  message,
  isMine,
  people,
  demoPeople,
  currentUserId,
  transactionId,
  routerPush,
}: {
  message: Message & Record<string, unknown>;
  isMine: boolean;
  people: Record<string, DemoPerson>;
  demoPeople: Record<string, DemoPerson>;
  currentUserId: string;
  transactionId: string;
  routerPush: (href: string) => void;
}) {
  const author =
    message.authorId === 'system'
      ? null
      : (people[(message.authorId as string) || ''] ||
          demoPeople[(message.authorId as string) || '']);

  return (
    <div className="flex">
      <div className="relative mt-1">
        <div className="absolute -right-2 mt-1 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong bg-[#0a1424]">
          {message.system ? (
            <Sparkles className="h-2.5 w-2.5 text-muted-dim" />
          ) : (
            <PersonAvatar person={author || demoPeople.arjun} size="xs" ring />
          )}
        </div>
      </div>
      <div className="max-w-[82%] rounded-xl p-3 text-sm whitespace-pre-wrap break-words">
        {message.tone === 'ai' ? (
          <>
            <div className="mb-2 rounded-lg border border-amber/20 bg-amber/[0.06] p-2.5">
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[10px] font-bold text-amber">
                  AI agreement summary · draft
                </span>
                <span className="text-[9px] text-muted-dim uppercase tracking-tighter">
                  not binding
                </span>
              </div>
              <p className="text-xs text-muted">{message.content.split('\n')[0]}</p>
              <button
                type="button"
                className="mt-2 text-[10px] font-medium text-cyan hover:text-cyan-soft underline-offset-2"
                onClick={() => routerPush(`/deals/${transactionId}`)}
              >
                Review terms
              </button>
            </div>
          </>
        ) : (
          <>
            {message.attachment && (
              <div className="mb-2 rounded-lg border border-line bg-[#0a1424] p-2.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-6 w-6 shrink-0 rounded-md border border-line bg-[#0a1424] flex items-center justify-center text-xs',
                      ((message.attachment as Attachment & { preview?: string })
                        .preview === 'pdf'
                        ? 'text-blue-soft'
                        : 'text-muted'
                      ))}
                    >
                    {((message.attachment as Attachment & { preview?: string })
                      .preview === 'pdf' ? (
                      <FileText className="h-3 w-3" />
                    ) : (
                      <Image className="h-3 w-3" />
                    ))}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[11px] font-medium text-ink truncate">
                      {(message.attachment as Attachment & { name: string }).name}
                    </span>
                    <span className="block text-[10px] text-muted-dim">
                      {(message.attachment as Attachment & { meta?: string })
                        .meta || 'attachment'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <span className="block text-ink">{message.content}</span>
          </>
        )}
        <p className="mt-1 text-[9px] opacity-60">
          {(message.time as string)} · {(message.system as boolean) ? 'System' : 'Transaction chat'}
        </p>
      </div>
      {!isMine && !message.system && (
        <div className="ml-1">
          <span className="h-5 w-5 shrink-0 rounded-full border border-line bg-[#0a1424] flex items-center justify-center text-[9px] font-medium text-muted">
            {getInitials(author?.name || 'User')}
          </span>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}
