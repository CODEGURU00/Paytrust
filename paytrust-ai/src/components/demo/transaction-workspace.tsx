'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Clock3,
  Copy,
  Dna,
  Download,
  FileText,
  Flag,
  Image as ImageIcon,
  Link2,
  Loader2,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Receipt,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Upload,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { WorkspaceHeader } from '@/components/demo/workspace-header';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill, TransactionStatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea } from '@/components/ui/form';
import { formatINR, formatMoney } from '@/lib/demo/format';
import type { DemoEvidence, DemoTransaction } from '@/lib/demo/types';
import { cn } from '@/lib/utils';
import { getTransactionById } from '@/actions/transactions';
import { mapSupabaseToDemoTransaction } from '@/lib/transactions/mapper';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';
import { logoTransaction } from '@/lib/demo/data';

function attachmentIcon(evidence: DemoEvidence) {
  if (evidence.kind === 'receipt') return Receipt;
  if (evidence.kind === 'image') return ImageIcon;
  return FileText;
}

export function TransactionWorkspace({ transactionId }: { transactionId: string }) {
  const {
    transactions,
    demoPeople,
    evidence,
    addMessage,
    addEvidence,
    togglePromise,
    releasePayment,
    fundEscrow,
    raiseDispute,
    approveAgreement,
    approveAsCounterparty,
    pushToast,
  } = useDemo();

  const isDemoMockId = transactionId === 'TX-48213';
  const fromContext = transactions.find((tx) => tx.id === transactionId);
  const [directTx, setDirectTx] = useState<DemoTransaction | null>(
    isDemoMockId ? logoTransaction : null
  );
  const [directLoading, setDirectLoading] = useState(!isDemoMockId && !fromContext);
  const [directError, setDirectError] = useState<string | null>(null);

  useEffect(() => {
    // The transaction is already in the demo context or is demo mock: nothing to fetch.
    if (fromContext || isDemoMockId) return;

    let isCancelled = false;
    async function fetchDirect() {
      try {
        const res = await getTransactionById(transactionId);
        if (isCancelled) return;
        if (res.data) {
          const supabase = createBrowserSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          setDirectTx(mapSupabaseToDemoTransaction(res.data, user?.id));
        } else if (transactions.length > 0) {
          setDirectTx(transactions[0]);
        } else {
          setDirectError(res.error || 'Transaction not found');
        }
      } catch (err) {
        if (!isCancelled) {
          if (transactions.length > 0) {
            setDirectTx(transactions[0]);
          } else {
            setDirectError(
              err instanceof Error ? err.message : 'Transaction not found'
            );
          }
        }
      } finally {
        if (!isCancelled) setDirectLoading(false);
      }
    }

    fetchDirect();

    return () => {
      isCancelled = true;
    };
  }, [transactionId, fromContext, isDemoMockId, transactions]);

  // Derived rather than synchronised: the transaction is ready as soon as it
  // is in the context or the direct fetch has resolved.
  const loadingDirect = !fromContext && !directTx && directLoading;

  const transaction =
    fromContext ||
    directTx ||
    (loadingDirect ? null : (transactions.find((tx) => tx.id === transactionId) || transactions[0] || logoTransaction));

  const [message, setMessage] = useState('');
  const [paying, setPaying] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [busy, setBusy] = useState<'release' | 'dispute' | null>(null);
  const [releaseAck, setReleaseAck] = useState(false);
  const [disputeAck, setDisputeAck] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [selectedKind, setSelectedKind] = useState<DemoEvidence['kind']>('file');
  const [fileName, setFileName] = useState('');
  const [copied, setCopied] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messages = transaction?.messages ?? [];
  const txEvidence = useMemo(
    () => evidence.filter((item) => item.transactionId === transactionId),
    [evidence, transactionId]
  );

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, transactionId]);

  const handlePayPalSandboxPay = async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transaction.id);
      const supportedCurrencies = ['AUD', 'BRL', 'CAD', 'CNY', 'CZK', 'DKK', 'EUR', 'HKD', 'HUF', 'ILS', 'JPY', 'MYR', 'MXN', 'TWD', 'NZD', 'NOK', 'PHP', 'PLN', 'GBP', 'RUB', 'SGD', 'SEK', 'CHF', 'THB', 'USD'];
      const isCurrencySupported = supportedCurrencies.includes(transaction.currency.toUpperCase());

      if (isUuid && isCurrencySupported) {
        try {
          const res = await fetch('/api/payments/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transaction_id: transaction.id }),
          });
          const data = await res.json();
          if (res.ok && data.data?.approvalUrl) {
            const { approvalUrl } = data.data;
            if (approvalUrl.includes('sandbox.paypal.com')) {
              pushToast('Redirecting to PayPal Sandbox...', {
                description: 'Approval checkout opening...',
                tone: 'info',
              });
              window.location.href = approvalUrl;
              return;
            }
          }
        } catch {
          // Fall through to demo escrow funding
        }
      }

      // Demo/simulated sandbox escrow funding
      await new Promise((r) => setTimeout(r, 600));
      fundEscrow(transaction.id);
      if (directTx) {
        setDirectTx((prev) =>
          prev
            ? {
                ...prev,
                status: 'in_progress',
                held: prev.amount,
                agreementStatus: 'approved',
              }
            : null
        );
      }
      pushToast('Escrow deposit funded!', {
        description: `${transaction.currency} ${transaction.amount.toLocaleString()} is securely held in PayTrust Escrow via PayPal Sandbox.`,
        tone: 'success',
      });
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PayPal payment failed';
      pushToast('Payment error', { description: msg, tone: 'error' });
    } finally {
      setPaying(false);
    }
  };

  const handlePayerDeposit = async () => {
    if (!transaction) return;
    setPaying(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      fundEscrow(transaction.id);
      if (directTx) {
        setDirectTx((prev) =>
          prev
            ? {
                ...prev,
                status: 'in_progress',
                held: prev.amount,
              }
            : null
        );
      }
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch {
      pushToast('Could not fund escrow', { tone: 'error' });
    } finally {
      setPaying(false);
    }
  };

  const handleCopyPaymentLink = useCallback(() => {
    if (typeof window !== 'undefined') {
      const url = window.location.href;
      navigator.clipboard?.writeText(url).then(() => {
        pushToast('Payment link copied', {
          description: 'Share this link with the payer so they can fund escrow.',
          tone: 'success',
        });
      }).catch(() => {
        pushToast('Payment link', {
          description: url,
        });
      });
    }
  }, [pushToast]);

  if (loadingDirect && !transaction) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan" />
        <p className="text-sm text-muted">Loading transaction workspace...</p>
      </div>
    );
  }

  if (!transaction) {
    const signedOut =
      directError === 'Not authenticated' || directError === 'Not signed in';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel text-muted">
          {signedOut ? (
            <Lock className="h-5 w-5" />
          ) : (
            <Wallet className="h-5 w-5" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">
            {signedOut
              ? 'Please sign in to view this transaction'
              : 'Record not found'}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {signedOut
              ? 'This record belongs to a signed-in workspace. Sign in to open it.'
              : `${transactionId} is not part of this workspace.`}
          </p>
        </div>
        {signedOut ? (
          <Link href="/auth/login">
            <Button size="sm">Sign in</Button>
          </Link>
        ) : (
          <Link href="/transactions">
            <Button variant="secondary" size="sm">
              Back to transactions
            </Button>
          </Link>
        )}
      </div>
    );
  }

  const person = demoPeople[transaction.counterpartyId];
  const total = transaction.released ?? 0;
  const held = transaction.held ?? 0;
  const isBuyer = transaction.direction === 'out';
  const paidPercent = Math.min(
    100,
    Math.round((total / Math.max(transaction.amount, 1)) * 100)
  );
  const donePromises = transaction.promises.filter(
    (promise) => promise.status === 'done'
  ).length;

  const sendMessage = () => {
    if (!message.trim()) return;
    addMessage(transaction.id, message.trim());
    setMessage('');
  };

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(transaction.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      pushToast('Record ID copied', { description: transaction.id, tone: 'info' });
    } catch {
      pushToast('Could not copy', { tone: 'error' });
    }
  };

  const handleRelease = async () => {
    if (!releaseAck) return;
    setBusy('release');
    try {
      releasePayment(transaction.id);
      if (directTx) {
        setDirectTx((prev) =>
          prev
            ? {
                ...prev,
                status: 'completed',
                held: 0,
                released: prev.amount,
              }
            : null
        );
      }
      setReleaseOpen(false);
      setReleaseAck(false);
      setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(null);
    }
  };

  const handleDispute = () => {
    if (!disputeAck) return;
    setBusy('dispute');
    setTimeout(() => {
      raiseDispute(transaction.id, disputeReason);
      setBusy(null);
      setDisputeOpen(false);
      setDisputeAck(false);
      setDisputeReason('');
    }, 900);
  };

  const handleUpload = (files: FileList | null) => {
    if (!files?.length) return;
    Array.from(files)
      .slice(0, 3)
      .forEach((file) => {
        addEvidence(transaction.id, {
          name: file.name,
          kind: file.type.startsWith('image/')
            ? 'image'
            : file.name.toLowerCase().includes('receipt')
              ? 'receipt'
              : 'file',
          sizeLabel: `${(file.size / 1024).toFixed(0)} KB`,
        });
      });
    setEvidenceOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        backHref="/transactions"
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/transactions" className="hover:text-ink-soft">
              Transactions
            </Link>
            <ChevronRight className="h-2.5 w-2.5" />
            {transaction.id}
          </span>
        }
        title={transaction.title}
        description={transaction.purpose}
        badge={<TransactionStatusPill status={transaction.status} />}
        nav={
          <>
            <span className="text-[12.5px] font-medium text-ink">
              Workspace
            </span>
            <Link
              href={`/deals/${transaction.id}`}
              className="text-[12.5px] font-medium text-muted hover:text-ink-soft"
            >
              Deal DNA
            </Link>
            <Link
              href="/milestones"
              className="text-[12.5px] font-medium text-muted hover:text-ink-soft"
            >
              Milestones
            </Link>
            <Link
              href="/risk"
              className="text-[12.5px] font-medium text-muted hover:text-ink-soft"
            >
              Risk Radar
            </Link>
          </>
        }
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label="More options"
              onClick={() => setMoreOpen((open) => !open)}
              className="relative"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            {transaction.status !== 'disputed' &&
              transaction.status !== 'cancelled' &&
              transaction.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDisputeOpen(true)}
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Raise dispute</span>
                </Button>
              )}
            {isBuyer &&
              (transaction.status === 'pending' ||
                (held === 0 &&
                  transaction.status !== 'completed' &&
                  transaction.status !== 'cancelled')) && (
              <Button
                size="sm"
                className="bg-[#0070BA] font-medium text-white shadow-md shadow-[#0070BA]/25 transition-all hover:bg-[#005ea6]"
                onClick={handlePayPalSandboxPay}
                disabled={paying}
                aria-label="Pay with PayPal Sandbox"
              >
                {paying ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">Connecting...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-1.5 font-bold tracking-tight text-[#FFD140]">
                      P
                    </span>
                    <span className="hidden sm:inline">Pay with PayPal Sandbox</span>
                  </>
                )}
              </Button>
            )}
            {!isBuyer &&
              (transaction.status === 'pending' ||
                (held === 0 &&
                  transaction.status !== 'completed' &&
                  transaction.status !== 'cancelled')) && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-[#0070BA] font-medium text-white shadow-sm hover:bg-[#005ea6]"
                  onClick={handlePayerDeposit}
                  disabled={paying}
                  aria-label="Simulate Payer Deposit"
                >
                  <span className="mr-1.5 font-bold tracking-tight text-[#FFD140]">P</span>
                  <span className="hidden sm:inline">Fund as Payer ({person?.name?.split(' ')[0] || 'Rahul'})</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPaymentLink}
                  aria-label="Share payment link"
                >
                  <Share2 className="mr-1.5 h-3.5 w-3.5 text-cyan" />
                  <span className="hidden sm:inline">Share payment link</span>
                </Button>
              </div>
            )}
            {isBuyer && held > 0 && transaction.status !== 'disputed' && (
              <Button size="sm" onClick={() => setReleaseOpen(true)} aria-label="Release payment">
                <Lock className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Release payment</span>
              </Button>
            )}
            {!isBuyer && held > 0 && transaction.status !== 'disputed' && (
              <StatusPill tone="cyan" dot>
                Escrow funded
              </StatusPill>
            )}
            {held === 0 && transaction.status === 'completed' && (
              <StatusPill tone="green" dot>
                Payment released
              </StatusPill>
            )}
          </>
        }
      />

      {moreOpen && (
        <div className="absolute right-4 top-[68px] z-40 w-56 overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/40">
          {[
            {
              label: 'Copy record ID',
              icon: Copy,
              action: copyId,
            },
            {
              label: 'Open Deal DNA',
              icon: Dna,
              href: `/deals/${transaction.id}`,
            },
            {
              label: 'View evidence vault',
              icon: FileText,
              href: '/evidence',
            },
            {
              label: 'View audit timeline',
              icon: Clock3,
              href: '/audit',
            },
          ].map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 text-[12px] text-ink-soft hover:bg-white/[0.04]"
              >
                <item.icon className="h-3.5 w-3.5 text-muted" />
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  item.action?.();
                  setMoreOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] text-ink-soft hover:bg-white/[0.04]"
              >
                <item.icon className="h-3.5 w-3.5 text-muted" />
                {item.label}
              </button>
            )
          )}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-[1680px] gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_minmax(300px,0.8fr)]">
        {/* Conversation */}
        <section className="flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-line bg-panel lg:min-h-[calc(100vh-110px)]">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
            <div className="flex items-center gap-2.5">
              <MessageCircle className="h-4 w-4 text-cyan" />
              <div>
                <h2 className="text-[13px] font-semibold text-ink">
                  Conversation
                </h2>
                <p className="text-[10.5px] text-muted">
                  The source of truth for this deal
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <PersonAvatar person={demoPeople.arjun} size="xs" />
                <PersonAvatar person={person} size="xs" />
              </div>
              <span className="text-[10.5px] text-muted">2 participants</span>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-line-soft" />
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-dim">
                {transaction.created}
              </span>
              <div className="h-px flex-1 bg-line-soft" />
            </div>

            {messages.map((item) => {
              const author =
                item.authorId === 'system'
                  ? undefined
                  : demoPeople[item.authorId];
              const mine = item.authorId === 'arjun';

              if (item.system) {
                return (
                  <div key={item.id} className="flex justify-center">
                    <div
                      className={cn(
                        'max-w-[92%] rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-relaxed sm:max-w-[86%]',
                        item.tone === 'receipt'
                          ? 'border-green/20 bg-green/[0.055] text-green-soft/90'
                          : 'border-cyan/15 bg-cyan/[0.045] text-ink-soft/80'
                      )}
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan">
                        {item.tone === 'receipt' ? (
                          <Receipt className="h-3 w-3" />
                        ) : (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {item.tone === 'receipt' ? 'Payment receipt' : 'PayTrust AI'}
                        <span className="ml-auto font-normal normal-case tracking-normal text-muted-dim">
                          {item.time}
                        </span>
                      </div>
                      <p className="whitespace-pre-line">{item.content}</p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-end gap-2.5',
                    mine ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <PersonAvatar
                    person={author ?? demoPeople.arjun}
                    size="xs"
                    className="mb-1 shrink-0"
                  />
                  <div className={cn('max-w-[85%]', mine && 'items-end')}>
                    {item.dateLabel && (
                      <div className="mb-1.5 flex justify-center">
                        <span className="text-[9.5px] uppercase tracking-wider text-muted-dim">
                          {item.dateLabel}
                        </span>
                      </div>
                    )}
                    <div
                      className={cn(
                        'rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed',
                        mine
                          ? 'rounded-br-md bg-brand/90 text-white'
                          : 'rounded-bl-md border border-line bg-panel-soft text-ink-soft'
                      )}
                    >
                      {item.content}
                      {item.attachment && (
                        <div
                          className={cn(
                            'mt-2 flex items-center gap-2.5 rounded-lg border px-2.5 py-2',
                            mine
                              ? 'border-white/15 bg-white/10'
                              : 'border-line bg-white/[0.03]'
                          )}
                        >
                          <span
                            className={cn(
                              'flex h-8 w-8 items-center justify-center rounded-lg',
                              mine
                                ? 'bg-white/15 text-white'
                                : 'bg-panel text-cyan'
                            )}
                          >
                            <FileText className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-medium">
                              {item.attachment.name}
                            </p>
                            <p
                              className={cn(
                                'text-[9.5px]',
                                mine ? 'text-white/60' : 'text-muted'
                              )}
                            >
                              {item.attachment.meta || 'Attachment'}
                            </p>
                          </div>
                          <Download className="h-3.5 w-3.5 opacity-70" />
                        </div>
                      )}
                    </div>
                    <div
                      className={cn(
                        'mt-1 flex items-center gap-1 text-[9.5px] text-muted-dim',
                        mine ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <span>{author?.name.split(' ')[0]}</span>
                      <span>·</span>
                      <span>{item.time}</span>
                      {mine && <Check className="h-2.5 w-2.5 text-cyan" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={threadEndRef} />
          </div>

          <div className="border-t border-line-soft p-3">
            <div className="rounded-xl border border-line bg-panel-soft/60 p-2">
              <TextArea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                placeholder={`Message ${person.name.split(' ')[0]}…`}
                className="min-h-[52px] resize-none border-0 bg-transparent p-1 text-[12.5px] focus:ring-0"
              />
              <div className="flex items-center justify-between gap-2 px-1 pt-1">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Attach evidence"
                    onClick={() => setEvidenceOpen(true)}
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Add payment note"
                    onClick={() =>
                      setMessage((current) =>
                        current
                          ? current
                          : 'Sharing a quick update on the next milestone.'
                      )
                    }
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </Button>
                  <span className="ml-1 hidden text-[9.5px] text-muted-dim sm:inline">
                    Enter to send · Shift+Enter for a new line
                  </span>
                </div>
                <Button
                  size="icon-sm"
                  aria-label="Send message"
                  disabled={!message.trim()}
                  onClick={sendMessage}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <div className="flex flex-col gap-4">
          {/* Escrow */}
          <section className="overflow-hidden rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Wallet className="h-4 w-4 text-cyan" />
                Payment overview
              </h2>
              <StatusPill tone={held > 0 ? 'amber' : 'green'} dot>
                {held > 0 ? 'Protected' : 'Released'}
              </StatusPill>
            </div>
            <div className="px-4 py-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[28px] font-semibold leading-none tracking-[-0.02em] text-ink">
                    {formatMoney(transaction.amount, transaction.currency, {
                      decimals: true,
                    })}
                  </div>
                  <p className="mt-1 text-[10.5px] text-muted">
                    Total deal value · {transaction.currency}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-[12.5px] font-semibold text-green-soft">
                    {formatMoney(total, transaction.currency)} released
                  </div>
                  <div className="text-[10.5px] text-muted">
                    {formatMoney(held, transaction.currency)} held
                  </div>
                </div>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan/70 to-cyan"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9.5px] text-muted-dim">
                <span>{paidPercent}% released</span>
                <span>{100 - paidPercent}% protected</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                    Method
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ink-soft">
                    {transaction.method}
                  </div>
                </div>
                <div className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                    Created
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ink-soft">
                    {transaction.created}
                  </div>
                </div>
              </div>

              {isBuyer &&
                (transaction.status === 'pending' ||
                  (held === 0 &&
                    transaction.status !== 'completed' &&
                    transaction.status !== 'cancelled')) && (
                  <div className="mt-3 rounded-xl border border-[#0070BA]/30 bg-[#0070BA]/10 p-3">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white">
                      <ShieldCheck className="h-3.5 w-3.5 text-cyan" />
                      Escrow Protection
                    </div>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                      Funds are safely held in PayTrust Escrow via PayPal Sandbox until you review and release.
                    </p>
                    <Button
                      className="mt-2.5 w-full bg-[#0070BA] font-medium text-white shadow-md shadow-[#0070BA]/20 hover:bg-[#005ea6]"
                      size="sm"
                      onClick={handlePayPalSandboxPay}
                      disabled={paying}
                    >
                      {paying ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <span className="mr-1 font-bold text-[#FFD140]">P</span>
                          Fund Escrow ({transaction.currency} {transaction.amount.toLocaleString()})
                        </>
                      )}
                    </Button>
                  </div>
                )}

              {!isBuyer &&
                (transaction.status === 'pending' ||
                  (held === 0 &&
                    transaction.status !== 'completed' &&
                    transaction.status !== 'cancelled')) && (
                  <div className="mt-3 rounded-xl border border-amber/30 bg-amber/[0.06] p-3">
                    <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-amber-soft">
                      <Clock className="h-3.5 w-3.5 text-amber" />
                      Awaiting Payer Escrow Deposit
                    </div>
                    <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                      You requested {transaction.currency} {transaction.amount.toLocaleString()}. Payer ({person?.name || 'Counterparty'}) must fund escrow via PayPal Sandbox before you deliver work.
                    </p>
                    <div className="mt-2.5 flex flex-col gap-2">
                      <Button
                        size="sm"
                        className="w-full bg-[#0070BA] font-medium text-white shadow-md shadow-[#0070BA]/20 hover:bg-[#005ea6]"
                        onClick={handlePayerDeposit}
                        disabled={paying}
                      >
                        {paying ? (
                          <>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Funding via PayPal Sandbox...
                          </>
                        ) : (
                          <>
                            <span className="mr-1.5 font-bold text-[#FFD140]">P</span>
                            Simulate Payer Escrow Deposit ({person?.name || 'Rahul Mehta'})
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-amber/30 text-amber-soft hover:bg-amber/[0.1]"
                        onClick={handleCopyPaymentLink}
                      >
                        <Share2 className="mr-1.5 h-3.5 w-3.5" />
                        Copy payment link for payer
                      </Button>
                    </div>
                  </div>
                )}

              {isBuyer && held > 0 && transaction.status !== 'disputed' && (
                <Button
                  className="mt-3 w-full bg-green hover:bg-green-soft text-slate-950 font-medium"
                  size="sm"
                  onClick={() => setReleaseOpen(true)}
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Release {formatMoney(held, transaction.currency)} to Seller
                </Button>
              )}

              {!isBuyer && held > 0 && transaction.status !== 'disputed' && (
                <div className="mt-3 rounded-xl border border-green/30 bg-green/[0.06] p-3">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-green-soft">
                    <ShieldCheck className="h-3.5 w-3.5 text-green" />
                    {formatMoney(held, transaction.currency)} Locked in Escrow
                  </div>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                    Payer has funded the escrow deposit via PayPal Sandbox. Deliver your agreed work to receive release.
                  </p>
                </div>
              )}
              {transaction.status === 'disputed' && (
                <Link href="/mediator" className="mt-3 block">
                  <Button variant="outline" className="w-full" size="sm">
                    <Users className="h-3.5 w-3.5" />
                    Open AI Mediator
                  </Button>
                </Link>
              )}
            </div>
          </section>

          {/* Agreement */}
          <section className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Dna className="h-4 w-4 text-cyan" />
                Deal DNA
              </h2>
              {transaction.agreement && (
                <StatusPill
                  tone={
                    transaction.agreementStatus === 'approved'
                      ? 'green'
                      : transaction.agreementStatus === 'changes_requested'
                        ? 'cyan'
                        : 'amber'
                  }
                >
                  {transaction.agreementStatus === 'approved'
                    ? 'Approved by both'
                    : transaction.agreementStatus === 'awaiting_you'
                      ? 'Your approval needed'
                      : transaction.agreementStatus === 'awaiting'
                        ? 'Awaiting approval'
                        : transaction.agreementStatus === 'partial'
                          ? 'Partial agreement'
                          : 'Draft'}
                </StatusPill>
              )}
            </div>
            {transaction.agreement ? (
              <div className="px-4 py-3">
                <p className="text-[11.5px] leading-relaxed text-ink-soft/85">
                  {transaction.agreement.overview}
                </p>
                <dl className="mt-3 space-y-2">
                  {[
                    ['Amount', formatMoney(transaction.agreement.paymentAmount, transaction.currency)],
                    ['Split', transaction.agreement.split],
                    ['Deadline', `${transaction.agreement.deadline} · ${transaction.agreement.deadlineTime}`],
                    ['Revisions', transaction.agreement.revisions],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-start justify-between gap-3 text-[11px]">
                      <dt className="shrink-0 text-muted">{label}</dt>
                      <dd className="text-right text-ink-soft">{value}</dd>
                    </div>
                  ))}
                </dl>
                {transaction.agreement.missing.length > 0 && (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber/20 bg-amber/[0.055] px-2.5 py-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                    <p className="text-[10.5px] leading-relaxed text-amber-soft/90">
                      {transaction.agreement.missing.length} missing condition
                      {transaction.agreement.missing.length > 1 ? 's' : ''} need a
                      decision before both parties approve.
                    </p>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <Link href={`/deals/${transaction.id}`} className="flex-1">
                    <Button variant="secondary" size="sm" className="w-full">
                      Open Deal DNA
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  {!transaction.agreement.approvals.you && (
                    <Button
                      size="sm"
                      onClick={() => approveAgreement(transaction.id)}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="px-4 pb-4 pt-2">
                <p className="text-[11.5px] leading-relaxed text-muted">
                  No agreement is attached. PayTrust can draft one from the
                  conversation; both parties must approve before it is binding.
                </p>
                <Link href={`/deals/${transaction.id}`} className="mt-3 block">
                  <Button variant="secondary" size="sm" className="w-full">
                    <Sparkles className="h-3.5 w-3.5" />
                    Create Deal DNA
                  </Button>
                </Link>
              </div>
            )}
          </section>

          {/* Promises */}
          <section className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <ClipboardCheck className="h-4 w-4 text-cyan" />
                Promise tracker
              </h2>
              <span className="text-[10px] text-muted">
                {donePromises}/{transaction.promises.length} done
              </span>
            </div>
            <div className="mt-2 divide-y divide-line-soft">
              {transaction.promises.map((promise) => (
                <button
                  key={promise.id}
                  type="button"
                  onClick={() => togglePromise(transaction.id, promise.id)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                      promise.status === 'done'
                        ? 'border-green/40 bg-green/20 text-green-soft'
                        : promise.status === 'overdue'
                          ? 'border-red/40 bg-red/10 text-red'
                          : 'border-line-strong bg-white/[0.02] text-transparent'
                    )}
                  >
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-[11.5px]',
                        promise.status === 'done'
                          ? 'text-muted line-through'
                          : 'text-ink-soft'
                      )}
                    >
                      {promise.label}
                    </p>
                    <p className="text-[9.5px] text-muted-dim">
                      {promise.ownerLabel}
                      {promise.dueLabel ? ` · ${promise.dueLabel}` : ''}
                    </p>
                  </div>
                  {promise.status === 'overdue' && (
                    <StatusPill tone="red">Overdue</StatusPill>
                  )}
                  {promise.status === 'current' && (
                    <StatusPill tone="cyan">Current</StatusPill>
                  )}
                </button>
              ))}
              {transaction.promises.length === 0 && (
                <p className="px-4 pb-4 pt-1 text-[11px] text-muted">
                  No promises recorded yet.
                </p>
              )}
            </div>
          </section>

          {/* Evidence */}
          <section className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <FileText className="h-4 w-4 text-cyan" />
                Evidence vault
              </h2>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setEvidenceOpen(true)}
              >
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </div>
            <div className="mt-2 divide-y divide-line-soft">
              {txEvidence.slice(0, 4).map((item) => {
                const Icon = attachmentIcon(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 px-4 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-soft text-cyan">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] text-ink-soft">
                        {item.name}
                      </p>
                      <p className="text-[9.5px] text-muted-dim">
                        {item.sizeLabel} · {item.dateLabel}
                      </p>
                    </div>
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-soft/70" />
                  </div>
                );
              })}
              {txEvidence.length === 0 && (
                <p className="px-4 pb-4 pt-1 text-[11px] text-muted">
                  No evidence attached yet. Files are timestamped and kept with
                  this record.
                </p>
              )}
            </div>
            <div className="border-t border-line-soft px-4 py-2.5">
              <Link
                href="/evidence"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-cyan hover:text-cyan-soft"
              >
                Open full vault <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </section>
        </div>

        {/* Intelligence */}
        <div className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
          <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(120% 120% at 100% 0%, rgba(34,211,238,0.14) 0%, transparent 55%)',
              }}
            />
            <div className="relative px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.13em] text-cyan">
                  <Bot className="h-3.5 w-3.5" />
                  AI deal intelligence
                </span>
                <span className="text-[9.5px] text-muted-dim">Advisory</span>
              </div>
              <p className="mt-2.5 text-[12.5px] font-medium leading-relaxed text-ink">
                {transaction.aiInsight?.headline ||
                  'Review the record before making a decision.'}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
                {transaction.aiInsight?.body}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-dim">
                    Conflicts
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-ink-soft">
                    {transaction.aiInsight?.conflicts || 'None detected'}
                  </div>
                </div>
                <div className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
                  <div className="text-[9px] uppercase tracking-wide text-muted-dim">
                    Dispute
                  </div>
                  <div className="mt-0.5 text-[10.5px] text-ink-soft">
                    {transaction.aiInsight?.dispute || 'None'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {transaction.dispute && (
            <section className="rounded-2xl border border-red/20 bg-red/[0.035] p-4">
              <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-red-soft">
                <Flag className="h-3.5 w-3.5" />
                Conflict summary
              </div>
              <div className="mt-3 space-y-2.5">
                <div className="rounded-lg border border-line-soft bg-white/[0.02] p-2.5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-dim">
                    Your account
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    {transaction.dispute.claimB}
                  </p>
                </div>
                <div className="rounded-lg border border-line-soft bg-white/[0.02] p-2.5">
                  <p className="text-[9.5px] font-semibold uppercase tracking-wide text-muted-dim">
                    {person.name}&apos;s account
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                    {transaction.dispute.claimA}
                  </p>
                </div>
              </div>
              <p className="mt-2.5 text-[10px] leading-relaxed text-muted">
                {transaction.dispute.conflict}. PayTrust organizes the record; it
                does not decide fault.
              </p>
              <Link href="/mediator" className="mt-3 block">
                <Button variant="secondary" size="sm" className="w-full">
                  Open neutral mediator
                </Button>
              </Link>
            </section>
          )}

          {/* Timeline */}
          <section className="rounded-2xl border border-line bg-panel">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <Clock3 className="h-4 w-4 text-cyan" />
                Record timeline
              </h2>
              <span className="text-[9.5px] text-muted-dim">
                {transaction.id}
              </span>
            </div>
            <div className="px-4 py-4">
              <ol className="relative space-y-3.5">
                <span className="absolute bottom-1.5 left-[5px] top-1.5 w-px bg-line" />
                {transaction.timeline.map((event) => (
                  <li key={event.id} className="relative flex gap-3">
                    <span
                      className={cn(
                        'relative z-10 mt-0.5 flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full border-2',
                        event.state === 'done'
                          ? 'border-green/50 bg-green'
                          : event.state === 'current'
                            ? 'border-cyan/50 bg-cyan'
                            : 'border-line-strong bg-panel'
                      )}
                    />
                    <div className="-mt-0.5 min-w-0">
                      <p
                        className={cn(
                          'text-[11.5px] font-medium',
                          event.state === 'upcoming'
                            ? 'text-muted'
                            : 'text-ink-soft'
                        )}
                      >
                        {event.label}
                      </p>
                      <p className="mt-0.5 text-[9.5px] text-muted-dim">
                        {event.date}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* Participants */}
          <section className="rounded-2xl border border-line bg-panel px-4 py-4">
            <h2 className="text-[13px] font-semibold text-ink">Participants</h2>
            <div className="mt-3 space-y-3">
              <Link
                href="/trust"
                className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/[0.03]"
              >
                <PersonAvatar person={demoPeople.arjun} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium text-ink">
                    Arjun Sharma <span className="text-muted">(you)</span>
                  </p>
                  <p className="text-[9.5px] text-muted">Verified · Mumbai</p>
                </div>
                <ShieldCheck className="h-3.5 w-3.5 text-cyan" />
              </Link>
              <Link
                href="/trust"
                className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-white/[0.03]"
              >
                <PersonAvatar person={person} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-[11.5px] font-medium text-ink">
                    {person.name}
                  </p>
                  <p className="text-[9.5px] text-muted">
                    {person.verified ? 'Verified' : 'Not verified'} · {person.role}
                  </p>
                </div>
                {person.verified ? (
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber" />
                )}
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-1.5 border-t border-line-soft pt-3">
              <span className="text-[10px] text-muted-dim">Record ID</span>
              <button
                type="button"
                onClick={copyId}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan hover:text-cyan-soft"
              >
                {transaction.id}
                {copied ? (
                  <Check className="h-2.5 w-2.5" />
                ) : (
                  <Copy className="h-2.5 w-2.5" />
                )}
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Release dialog */}
      <Modal
        open={releaseOpen}
        onClose={() => {
          if (!busy) setReleaseOpen(false);
        }}
        title="Release payment"
        description="This is a simulated transfer. No real funds move."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReleaseOpen(false)}
              disabled={busy === 'release'}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleRelease}
              isLoading={busy === 'release'}
              disabled={!releaseAck}
            >
              Release {formatMoney(held, transaction.currency)}
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white/[0.025] p-3.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted">Amount</span>
              <span className="font-semibold text-ink">{formatMoney(held, transaction.currency)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-muted">Recipient</span>
              <span className="text-ink-soft">{person.name}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[12px]">
              <span className="text-muted">Record</span>
              <span className="text-ink-soft">{transaction.id}</span>
            </div>
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] p-3">
            <input
              type="checkbox"
              checked={releaseAck}
              onChange={(event) => setReleaseAck(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan"
            />
            <span className="text-[11px] leading-relaxed text-muted">
              I confirm the agreed work is complete and I want to release the
              protected balance. I understand this is a demo payment.
            </span>
          </label>
          <p className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted-dim">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-green-soft/70" />
            A receipt will be added to the Evidence Vault and both parties can
            access the record.
          </p>
        </div>
      </Modal>

      {/* Dispute dialog */}
      <Modal
        open={disputeOpen}
        onClose={() => {
          if (!busy) setDisputeOpen(false);
        }}
        title="Raise a dispute"
        description="A dispute opens a neutral review space. It does not move money."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDisputeOpen(false)}
              disabled={busy === 'dispute'}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDispute}
              isLoading={busy === 'dispute'}
              disabled={!disputeAck}
            >
              <Flag className="h-3.5 w-3.5" />
              Open dispute
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="dispute-reason">
              What is different from the agreed terms?
            </FieldLabel>
            <TextArea
              id="dispute-reason"
              rows={3}
              value={disputeReason}
              onChange={(event) => setDisputeReason(event.target.value)}
              placeholder="Describe what happened. Facts are easier to review than conclusions."
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] p-3">
            <input
              type="checkbox"
              checked={disputeAck}
              onChange={(event) => setDisputeAck(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan"
            />
            <span className="text-[11px] leading-relaxed text-muted">
              I understand PayTrust will not decide who is right. Both parties
              can add their account and evidence, and a neutral summary may be
              generated.
            </span>
          </label>
          <div className="rounded-lg border border-amber/20 bg-amber/[0.055] p-2.5 text-[10.5px] leading-relaxed text-amber-soft/90">
            Funds stay exactly where they are. Nothing is frozen or reversed
            automatically.
          </div>
        </div>
      </Modal>

      {/* Evidence dialog */}
      <Modal
        open={evidenceOpen}
        onClose={() => setEvidenceOpen(false)}
        title="Add evidence"
        description="Files are timestamped and linked to this record."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEvidenceOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                handleUpload(fileInputRef.current?.files || null);
              }}
              disabled={!fileName}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white/[0.015] px-4 py-7 text-center transition-colors hover:border-cyan/30 hover:bg-cyan/[0.03]"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel-soft text-cyan">
              <Upload className="h-4 w-4" />
            </span>
            <span className="text-[12px] font-medium text-ink">
              Choose files from this device
            </span>
            <span className="text-[10.5px] text-muted">
              Images, PDFs or receipts · processed locally in the demo
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
          />
          {fileName && (
            <p className="truncate rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-[11px] text-ink-soft">
              Selected: {fileName}
            </p>
          )}
          <div className="relative py-1 text-center">
            <span className="relative z-10 bg-panel px-2 text-[9.5px] uppercase tracking-wider text-muted-dim">
              or add a sample
            </span>
            <span className="absolute left-0 right-0 top-1/2 h-px bg-line-soft" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['image', 'Concept image', ImageIcon],
                ['receipt', 'Payment receipt', Receipt],
                ['file', 'Delivery note', FileText],
              ] as const
            ).map(([kind, label, Icon]) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  addEvidence(transaction.id, {
                    name:
                      kind === 'image'
                        ? 'Concept direction.png'
                        : kind === 'receipt'
                          ? 'Payment receipt.pdf'
                          : 'Delivery note.pdf',
                    kind,
                    sizeLabel:
                      kind === 'image'
                        ? 'PNG · 1.2 MB'
                        : kind === 'receipt'
                          ? 'PDF · 82 KB'
                          : 'PDF · 240 KB',
                  });
                  setEvidenceOpen(false);
                }}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-white/[0.02] px-2 py-2.5 text-center transition-colors hover:border-cyan/25 hover:bg-cyan/[0.04]"
              >
                <Icon className="h-3.5 w-3.5 text-cyan" />
                <span className="text-[9.5px] text-muted">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-muted-dim">
            Evidence never expires while the record is active. You can remove a
            file you uploaded by mistake from the Evidence Vault.
          </p>
        </div>
      </Modal>
    </div>
  );
}
