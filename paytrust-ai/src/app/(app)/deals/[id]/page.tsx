'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Download,
  Dna,
  FileText,
  Loader2,
  MessageCircle,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { WorkspaceHeader } from '@/components/demo/workspace-header';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill, TransactionStatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea, TextInput } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';
import { getTransactionById } from '@/actions/transactions';
import { mapSupabaseToDemoTransaction } from '@/lib/transactions/mapper';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';
import { logoTransaction } from '@/lib/demo/data';
import type { DemoTransaction, DemoPerson } from '@/lib/demo/types';

export default function DealDnaPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const isDemoMockId = id === 'TX-48213';
  const {
    transactions,
    demoPeople,
    approveAgreement,
    approveAsCounterparty,
    requestChanges,
    updateAgreement,
    resolveMissingCondition,
    startAgreement,
    pushToast,
  } = useDemo();

  const fromContext = transactions.find((tx) => tx.id === id);
  const [directTx, setDirectTx] = useState<DemoTransaction | null>(
    isDemoMockId ? logoTransaction : null
  );
  const [directLoading, setDirectLoading] = useState(!isDemoMockId && !fromContext);

  useEffect(() => {
    // The transaction is already in the demo context or is demo mock: nothing to fetch.
    if (fromContext || isDemoMockId) return;

    let isCancelled = false;
    async function load() {
      try {
        const res = await getTransactionById(id);
        if (!isCancelled && res.data) {
          const supabase = createBrowserSupabaseClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          setDirectTx(mapSupabaseToDemoTransaction(res.data, user?.id));
        } else if (!isCancelled && transactions.length > 0) {
          setDirectTx(transactions[0]);
        }
      } catch (err) {
        console.warn('Deals direct fetch error:', err);
        if (!isCancelled && transactions.length > 0) {
          setDirectTx(transactions[0]);
        }
      } finally {
        if (!isCancelled) setDirectLoading(false);
      }
    }

    load();
    return () => {
      isCancelled = true;
    };
  }, [id, fromContext, isDemoMockId, transactions]);

  // Derived rather than synchronised: the transaction is ready as soon as it
  // is in the context or the direct fetch has resolved.
  const loading = !fromContext && !directTx && directLoading;

  const transaction =
    fromContext ||
    directTx ||
    (loading ? null : (transactions.find((t) => t.id === id) || transactions[0] || logoTransaction));

  const [editOpen, setEditOpen] = useState(false);
  const [changesOpen, setChangesOpen] = useState(false);
  const [busy, setBusy] = useState<'analyze' | 'approve' | null>(null);
  const [changeNote, setChangeNote] = useState('');
  const [draft, setDraft] = useState({
    overview: '',
    responsibilities: '',
    revisions: '',
    cancellation: '',
    deadline: '',
    deadlineTime: '',
  });

  const person: DemoPerson | undefined = transaction
    ? demoPeople[transaction.counterpartyId] || {
        id: transaction.counterpartyId,
        name: 'Counterparty',
        handle: 'counterparty',
        avatar: 'rahul',
        verified: true,
        role: 'Verified participant',
      }
    : undefined;

  const agreement = transaction?.agreement;
  const confidence = agreement ? 68 + agreement.tags.length * 4 : 0;

  if (loading && !transaction) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-canvas text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan" />
        <p className="text-sm text-muted">Loading Deal DNA...</p>
      </div>
    );
  }

  if (!transaction || !person) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Dna className="h-8 w-8 text-cyan" />
        <div>
          <h1 className="text-lg font-semibold text-ink">Deal not found</h1>
          <p className="mt-1 text-sm text-muted">
            {id || 'This record'} is not part of the demo workspace.
          </p>
        </div>
        <Link href="/transactions">
          <Button variant="secondary" size="sm">
            Back to transactions
          </Button>
        </Link>
      </div>
    );
  }

  const openEdit = () => {
    if (!agreement) return;
    setDraft({
      overview: agreement.overview,
      responsibilities: agreement.responsibilities,
      revisions: agreement.revisions,
      cancellation: agreement.cancellation,
      deadline: agreement.deadline,
      deadlineTime: agreement.deadlineTime,
    });
    setEditOpen(true);
  };

  const saveDraft = () => {
    updateAgreement(transaction.id, draft);
    setEditOpen(false);
    pushToast('Draft updated', {
      description:
        'Both approvals reset. The revised draft must be approved again by both parties.',
      tone: 'info',
    });
  };

  const handleAnalyze = () => {
    setBusy('analyze');
    setTimeout(() => {
      setBusy(null);
      pushToast('Conversation re-analyzed', {
        description:
          '4 terms detected, 1 conflict removed, and the revision policy was updated. Review the highlighted changes.',
      });
    }, 1100);
  };

  const handleExport = () => {
    if (!agreement) return;
    const text = [
      `PayTrust AI — Deal DNA (${agreement.version})`,
      `Record: ${transaction.id} · ${transaction.title}`,
      `Parties: Arjun Sharma & ${person.name}`,
      '',
      `Overview: ${agreement.overview}`,
      `Amount: ${formatINR(agreement.paymentAmount)}`,
      `Split: ${agreement.split}`,
      `Deadline: ${agreement.deadline} ${agreement.deadlineTime}`,
      `Responsibilities: ${agreement.responsibilities}`,
      `Revisions: ${agreement.revisions}`,
      `Cancellation: ${agreement.cancellation}`,
      '',
      `Approvals: You — ${agreement.approvals.you ? 'approved' : 'pending'}; ${person.name} — ${agreement.approvals.counterparty ? 'approved' : 'pending'}`,
      '',
      'This is a demo draft export. It is not a legally binding document.',
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${transaction.id}-deal-dna-${agreement.version.replace(/\s+/g, '-').toLowerCase()}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('Draft exported', {
      description: 'A plain-text copy downloaded to your device.',
    });
  };

  const handleApprove = () => {
    setBusy('approve');
    setTimeout(() => {
      approveAgreement(transaction.id);
      setBusy(null);
    }, 700);
  };

  const mutual = agreement?.approvals.you && agreement?.approvals.counterparty;

  return (
    <div className="min-h-screen bg-canvas">
      <WorkspaceHeader
        backHref={`/transactions/${transaction.id}`}
        breadcrumb={
          <span className="inline-flex items-center gap-1.5">
            <Link href="/transactions" className="hover:text-ink-soft">
              Transactions
            </Link>
            <ChevronRight className="h-2.5 w-2.5" />
            <Link
              href={`/transactions/${transaction.id}`}
              className="hover:text-ink-soft"
            >
              {transaction.id}
            </Link>
            <ChevronRight className="h-2.5 w-2.5" />
            Deal DNA
          </span>
        }
        title="Deal DNA"
        description={`${transaction.title} · ${person.name}`}
        badge={
          agreement ? (
            <StatusPill
              tone={mutual ? 'green' : 'amber'}
              dot
              pulse={!mutual}
            >
              {mutual
                ? 'Mutual'
                : agreement.approvals.you
                  ? 'Awaiting counterparty'
                  : 'Awaiting approval'}
            </StatusPill>
          ) : (
            <StatusPill tone="muted">No draft</StatusPill>
          )
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              isLoading={busy === 'analyze'}
              disabled={!agreement}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Re-analyze</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExport}
              disabled={!agreement}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export draft</span>
            </Button>
          </>
        }
      />

      {!agreement ? (
        <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
          <div className="relative mb-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/[0.07] text-cyan">
              <Dna className="h-7 w-7" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-panel bg-cyan text-[#05131b]">
              <Sparkles className="h-3 w-3" />
            </span>
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            Turn this conversation into a shared agreement
          </h1>
          <p className="mt-2 max-w-lg text-[13px] leading-relaxed text-muted">
            PayTrust reads the messages on this record and drafts the payment,
            deadline, deliverables and gaps. Both parties still have to approve
            the draft — AI never commits anyone on its own.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => startAgreement(transaction.id)}>
              <Sparkles className="h-4 w-4" />
              Create draft from conversation
            </Button>
            <Link href={`/transactions/${transaction.id}`}>
              <Button variant="secondary">Open conversation</Button>
            </Link>
          </div>
          <div className="mt-6 grid w-full max-w-lg gap-2 text-left sm:grid-cols-3">
            {[
              ['Detect terms', 'Amount, split and dates'],
              ['Find gaps', 'Cancellation and rights'],
              ['Mutual approval', 'Both parties decide'],
            ].map(([title, body], index) => (
              <div
                key={title}
                className="rounded-xl border border-line bg-panel px-3 py-3"
              >
                <span className="text-[10px] font-semibold text-cyan">
                  0{index + 1}
                </span>
                <p className="mt-1 text-[11.5px] font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1680px] px-4 py-4 sm:px-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)_minmax(300px,0.85fr)]">
            {/* Conversation source */}
            <section className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel xl:sticky xl:top-[84px] xl:max-h-[calc(100vh-104px)] xl:self-start">
              <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-cyan" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Conversation source
                    </h2>
                    <p className="text-[10px] text-muted">
                      {transaction.messageCount} messages · read-only
                    </p>
                  </div>
                </div>
                <Link
                  href={`/transactions/${transaction.id}`}
                  className="text-[10.5px] font-medium text-cyan hover:text-cyan-soft"
                >
                  Open
                </Link>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {transaction.messages.slice(-5).map((message) => {
                  if (message.system) {
                    return (
                      <div
                        key={message.id}
                        className="rounded-xl border border-cyan/15 bg-cyan/[0.04] px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-soft/80"
                      >
                        <div className="mb-1 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-cyan">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI summary
                          <span className="ml-auto font-normal normal-case tracking-normal text-muted-dim">
                            {message.time}
                          </span>
                        </div>
                        {message.content}
                      </div>
                    );
                  }
                  const author = demoPeople[message.authorId];
                  const mine = message.authorId === 'arjun';
                  return (
                    <div
                      key={message.id}
                      className={cn('flex gap-2', mine && 'flex-row-reverse')}
                    >
                      <PersonAvatar
                        person={author ?? demoPeople.arjun}
                        size="xs"
                        className="mt-1 shrink-0"
                      />
                      <div className={cn('max-w-[82%]', mine && 'text-right')}>
                        <div
                          className={cn(
                            'inline-block rounded-xl px-3 py-2 text-left text-[11px] leading-relaxed',
                            mine
                              ? 'bg-brand/85 text-white'
                              : 'border border-line bg-panel-soft text-ink-soft'
                          )}
                        >
                          {message.content}
                          {message.attachment && (
                            <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-black/20 px-2 py-1 text-[9.5px]">
                              <FileText className="h-2.5 w-2.5" />
                              {message.attachment.name}
                            </div>
                          )}
                        </div>
                        <div className="mt-0.5 text-[9px] text-muted-dim">
                          {author?.name.split(' ')[0]} · {message.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-line-soft px-4 py-3">
                <div className="flex items-start gap-2 rounded-lg border border-cyan/15 bg-cyan/[0.04] px-2.5 py-2">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
                  <p className="text-[10px] leading-relaxed text-muted">
                    Only messages on this record were analyzed. Nothing from
                    other chats or your contacts was used.
                  </p>
                </div>
              </div>
            </section>

            {/* Agreement */}
            <div className="space-y-4">
              <section className="rounded-2xl border border-line bg-panel">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
                      <Dna className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-[14px] font-semibold text-ink">
                          Draft agreement
                        </h2>
                        <StatusPill tone="cyan">{agreement.version}</StatusPill>
                      </div>
                      <p className="text-[10px] text-muted">
                        AI-detected from conversation · editable
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-1.5 text-[10px] text-muted sm:flex">
                      <Sparkles className="h-3 w-3 text-cyan" />
                      {confidence}% confidence
                    </div>
                    <Button variant="secondary" size="xs" onClick={openEdit}>
                      <Pencil className="h-3 w-3" />
                      Edit terms
                    </Button>
                  </div>
                </div>

                <div className="px-4 py-4">
                  <p className="text-[12px] leading-relaxed text-ink-soft">
                    {agreement.overview}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {agreement.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-cyan/15 bg-cyan/[0.05] px-2 py-0.5 text-[9.5px] text-cyan-soft"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                    {[
                      {
                        label: 'Payment',
                        value: formatINR(agreement.paymentAmount),
                        note: agreement.split,
                        icon: CircleDashed,
                        status: 'confident',
                      },
                      {
                        label: 'Deadline',
                        value: agreement.deadline,
                        note: agreement.deadlineTime,
                        icon: CircleDashed,
                        status:
                          agreement.deadline === 'To be agreed'
                            ? 'missing'
                            : 'confident',
                      },
                      {
                        label: 'Responsibilities',
                        value: agreement.responsibilities,
                        note: 'Deliverables and client duties',
                        icon: UserCheck,
                        status: 'confident',
                      },
                      {
                        label: 'Revisions',
                        value: agreement.revisions,
                        note: 'How many rounds are included',
                        icon: RefreshCw,
                        status:
                          agreement.revisions === 'Not discussed yet.'
                            ? 'missing'
                            : 'confident',
                      },
                      {
                        label: 'Cancellation',
                        value: agreement.cancellation,
                        note: 'What happens if the deal stops',
                        icon: X,
                        status:
                          agreement.cancellation === 'Not discussed yet.' ||
                          agreement.cancellation.startsWith('Not discussed')
                            ? 'missing'
                            : 'edited',
                      },
                      {
                        label: 'Usage rights',
                        value:
                          agreement.missing.some((item) =>
                            item.id.includes('rights')
                          )
                            ? 'Not defined yet'
                            : 'Transfers on final payment',
                        note: 'Who can use the work and when',
                        icon: ShieldCheck,
                        status: agreement.missing.some((item) =>
                          item.id.includes('rights')
                        )
                          ? 'missing'
                          : 'confident',
                      },
                    ].map((clause) => (
                      <div
                        key={clause.label}
                        className={cn(
                          'rounded-xl border p-3',
                          clause.status === 'missing'
                            ? 'border-amber/20 bg-amber/[0.045]'
                            : 'border-line-soft bg-white/[0.018]'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.09em] text-muted-dim">
                            <clause.icon className="h-3 w-3" />
                            {clause.label}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-0.5 text-[8.5px] font-medium',
                              clause.status === 'missing'
                                ? 'bg-amber/15 text-amber-soft'
                                : clause.status === 'edited'
                                  ? 'bg-cyan/12 text-cyan-soft'
                                  : 'bg-green/12 text-green-soft'
                            )}
                          >
                            {clause.status === 'missing'
                              ? 'Needs input'
                              : clause.status === 'edited'
                                ? 'Suggested'
                                : 'Detected'}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-[11.5px] leading-relaxed text-ink-soft">
                          {clause.value}
                        </p>
                        <p className="mt-1 text-[9.5px] text-muted-dim">
                          {clause.note}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Missing conditions */}
              <section className="rounded-2xl border border-amber/20 bg-amber/[0.025]">
                <div className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber/20 bg-amber/[0.08] text-amber">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <h2 className="text-[13px] font-semibold text-ink">
                        Missing conditions
                      </h2>
                      <p className="text-[10px] text-muted">
                        Gaps the conversation never resolved
                      </p>
                    </div>
                  </div>
                  <StatusPill
                    tone={agreement.missing.length ? 'amber' : 'green'}
                  >
                    {agreement.missing.length
                      ? `${agreement.missing.length} open`
                      : 'All resolved'}
                  </StatusPill>
                </div>
                <div className="space-y-2 px-4 pb-4">
                  {agreement.missing.map((condition) => (
                    <div
                      key={condition.id}
                      className="rounded-xl border border-line-soft bg-panel/60 p-3"
                    >
                      <p className="text-[11.5px] font-medium text-ink-soft">
                        {condition.question}
                      </p>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                        {condition.suggestion}
                      </p>
                      <Button
                        variant="outline"
                        size="xs"
                        className="mt-2"
                        onClick={() =>
                          resolveMissingCondition(transaction.id, condition.id)
                        }
                      >
                        <Plus className="h-3 w-3" />
                        Add suggested clause
                      </Button>
                    </div>
                  ))}
                  {agreement.missing.length === 0 && (
                    <div className="rounded-xl border border-green/20 bg-green/[0.05] px-3 py-4 text-center">
                      <CheckCircle2 className="mx-auto h-4 w-4 text-green-soft" />
                      <p className="mt-1.5 text-[11px] text-green-soft/90">
                        No missing conditions detected in this draft.
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        overview: agreement.overview,
                        responsibilities: agreement.responsibilities,
                        revisions: agreement.revisions,
                        cancellation: agreement.cancellation,
                        deadline: agreement.deadline,
                        deadlineTime: agreement.deadlineTime,
                      })
                    }
                    className="hidden"
                  />
                </div>
              </section>
            </div>

            {/* Approval */}
            <div className="space-y-4">
              <section className="rounded-2xl border border-line bg-panel">
                <div className="border-b border-line-soft px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-green-soft" />
                    <h2 className="text-[13px] font-semibold text-ink">
                      Mutual approval
                    </h2>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Terms bind only when both parties approve the same version.
                  </p>
                </div>
                <div className="space-y-2.5 px-4 py-4">
                  {[
                    {
                      person: demoPeople.arjun,
                      label: 'You',
                      approved: agreement.approvals.you,
                    },
                    {
                      person,
                      label: person.name,
                      approved: agreement.approvals.counterparty,
                    },
                  ].map((party) => (
                    <div
                      key={party.label}
                      className={cn(
                        'flex items-center gap-2.5 rounded-xl border px-3 py-2.5',
                        party.approved
                          ? 'border-green/20 bg-green/[0.05]'
                          : 'border-line bg-white/[0.02]'
                      )}
                    >
                      <PersonAvatar person={party.person} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11.5px] font-medium text-ink">
                          {party.label}
                        </p>
                        <p className="text-[9.5px] text-muted">
                          {party.approved
                            ? `Approved ${agreement.version}`
                            : `Reviewing ${agreement.version}`}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full',
                          party.approved
                            ? 'bg-green/15 text-green-soft'
                            : 'border border-line-strong text-muted-dim'
                        )}
                      >
                        {party.approved ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <CircleDashed className="h-3.5 w-3.5" />
                        )}
                      </span>
                    </div>
                  ))}

                  <div className="rounded-xl border border-line-soft bg-white/[0.02] px-3 py-2.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted">Approvals</span>
                      <span className="font-medium text-ink-soft">
                        {Number(agreement.approvals.you) +
                          Number(agreement.approvals.counterparty)}
                        /2
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          mutual ? 'bg-green' : 'bg-amber'
                        )}
                        style={{
                          width: `${
                            ((Number(agreement.approvals.you) +
                              Number(agreement.approvals.counterparty)) /
                              2) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {!agreement.approvals.you && (
                    <Button
                      className="w-full"
                      size="sm"
                      onClick={handleApprove}
                      isLoading={busy === 'approve'}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Approve {agreement.version}
                    </Button>
                  )}

                  {agreement.approvals.you &&
                    !agreement.approvals.counterparty && (
                      <Button
                        className="w-full"
                        size="sm"
                        variant="secondary"
                        onClick={() => approveAsCounterparty(transaction.id)}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Simulate {person.name.split(' ')[0]}&apos;s approval
                      </Button>
                    )}

                  {mutual && (
                    <div className="rounded-xl border border-green/20 bg-green/[0.055] px-3 py-3 text-center">
                      <CheckCircle2 className="mx-auto h-5 w-5 text-green-soft" />
                      <p className="mt-1.5 text-[11.5px] font-medium text-green-soft">
                        Agreement is mutual
                      </p>
                      <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
                        Both approvals are timestamped. This demo draft is not a
                        legal contract.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1"
                      onClick={() => setChangesOpen(true)}
                    >
                      Request changes
                    </Button>
                    <Link href={`/transactions/${transaction.id}`} className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">
                        Workspace
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>

                  <div className="border-t border-line-soft pt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[9.5px] font-semibold uppercase tracking-[0.1em] text-muted-dim">
                        Demo controls
                      </span>
                      <span className="text-[8.5px] text-muted-dim">
                        For review only
                      </span>
                    </div>
                    <p className="text-[9.5px] leading-relaxed text-muted-dim">
                      In production, approvals are signed by each party on their
                      own device. The simulation above only exists in this demo.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-line bg-panel px-4 py-4">
                <h2 className="text-[12px] font-semibold text-ink">
                  Record links
                </h2>
                <div className="mt-2.5 space-y-1.5">
                  {[
                    {
                      href: `/transactions/${transaction.id}`,
                      label: 'Transaction workspace',
                      icon: MessageCircle,
                    },
                    { href: '/milestones', label: 'Milestone plan', icon: FileText },
                    { href: '/trust', label: 'Trust Passport', icon: ShieldCheck },
                    { href: '/audit', label: 'Audit timeline', icon: FileText },
                  ].map((link) => (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-muted transition-colors hover:bg-white/[0.03] hover:text-ink-soft"
                    >
                      <link.icon className="h-3 w-3" />
                      <span className="flex-1">{link.label}</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Edit terms */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit agreement terms"
        description="Saving creates a revised draft. Both parties must approve it again."
        size="lg"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={saveDraft}>
              Save revised draft
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="overview">Overview</FieldLabel>
            <TextArea
              id="overview"
              rows={2}
              value={draft.overview}
              onChange={(event) =>
                setDraft({ ...draft, overview: event.target.value })
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="deadline">Deadline</FieldLabel>
              <TextInput
                id="deadline"
                value={draft.deadline}
                onChange={(event) =>
                  setDraft({ ...draft, deadline: event.target.value })
                }
              />
            </div>
            <div>
              <FieldLabel htmlFor="deadline-time">Time</FieldLabel>
              <TextInput
                id="deadline-time"
                value={draft.deadlineTime}
                onChange={(event) =>
                  setDraft({ ...draft, deadlineTime: event.target.value })
                }
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="responsibilities">Responsibilities</FieldLabel>
            <TextArea
              id="responsibilities"
              rows={2}
              value={draft.responsibilities}
              onChange={(event) =>
                setDraft({ ...draft, responsibilities: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="revisions">Revision policy</FieldLabel>
            <TextArea
              id="revisions"
              rows={2}
              value={draft.revisions}
              onChange={(event) =>
                setDraft({ ...draft, revisions: event.target.value })
              }
            />
          </div>
          <div>
            <FieldLabel htmlFor="cancellation">Cancellation</FieldLabel>
            <TextArea
              id="cancellation"
              rows={2}
              value={draft.cancellation}
              onChange={(event) =>
                setDraft({ ...draft, cancellation: event.target.value })
              }
            />
          </div>
        </div>
      </Modal>

      {/* Request changes */}
      <Modal
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        description="Both approvals reset until a revised draft is approved."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setChangesOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                requestChanges(transaction.id, changeNote);
                setChangeNote('');
                setChangesOpen(false);
              }}
              disabled={!changeNote.trim()}
            >
              Send request
            </Button>
          </div>
        }
      >
        <div>
          <FieldLabel htmlFor="change-note">What should change?</FieldLabel>
          <TextArea
            id="change-note"
            rows={3}
            value={changeNote}
            onChange={(event) => setChangeNote(event.target.value)}
            placeholder="Be specific so the other party can revise the draft."
          />
        </div>
      </Modal>
    </div>
  );
}
