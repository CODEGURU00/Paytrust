'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Dna,
  Flag,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { useQuickActions } from '@/components/shell/quick-actions';
import { Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill, TransactionStatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Sparkline } from '@/components/ui/charts';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

const quickActions = [
  { kind: 'send', label: 'Send money', icon: ArrowUpRight },
  { kind: 'request', label: 'Request', icon: ArrowDownLeft },
  { kind: 'deal', label: 'New deal', icon: Dna },
  { kind: 'ask', label: 'Ask AI', icon: Sparkles },
  { kind: 'scan', label: 'Scan QR', icon: QrCode },
] as const;

const filters = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'awaiting', label: 'Awaiting you' },
  { value: 'disputed', label: 'Disputed' },
] as const;

type Filter = (typeof filters)[number]['value'];

export default function DashboardPage() {
  const {
    user,
    transactions,
    trustProfiles,
    demoPeople,
    project,
    notifications,
  } = useDemo();
  const { openAction } = useQuickActions();
  const [filter, setFilter] = useState<Filter>('all');

  const metrics = useMemo(() => {
    let received = 0;
    let sent = 0;
    let heldInEscrow = 0;

    for (const tx of transactions) {
      if (tx.status === 'completed') {
        if (tx.direction === 'in') received += tx.amount;
        if (tx.direction === 'out') sent += tx.amount;
      }
      if (tx.status === 'in_progress' || tx.held) {
        heldInEscrow += tx.held || tx.amount;
      }
    }

    const available = Math.max(0, received - sent);
    return {
      received,
      sent,
      heldInEscrow,
      available,
    };
  }, [transactions]);

  const filtered = useMemo(() => {
    if (filter === 'active') {
      return transactions.filter(
        (tx) => tx.status === 'in_progress' || tx.status === 'pending'
      );
    }
    if (filter === 'awaiting') {
      return transactions.filter(
        (tx) =>
          tx.status === 'awaiting_confirmation' ||
          tx.agreementStatus === 'awaiting_you' ||
          tx.promises.some(
            (promise) =>
              promise.ownerId === 'arjun' &&
              (promise.status === 'current' || promise.status === 'overdue')
          )
      );
    }
    if (filter === 'disputed') {
      return transactions.filter((tx) => tx.status === 'disputed');
    }
    return transactions;
  }, [transactions, filter]);

  const promises = useMemo(
    () =>
      transactions
        .flatMap((tx) =>
          tx.promises
            .filter(
              (promise) =>
                promise.ownerId === 'arjun' &&
                promise.status !== 'done' &&
                promise.status !== 'upcoming'
            )
            .map((promise) => ({ ...promise, transaction: tx }))
        )
        .slice(0, 4),
    [transactions]
  );

  const primaryInsight = useMemo(
    () =>
      transactions.find((tx) => tx.status === 'disputed') ||
      transactions.find((tx) => tx.status === 'awaiting_confirmation') ||
      transactions[0],
    [transactions]
  );

  const trust = trustProfiles.arjun;
  const partner = demoPeople.rahul;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8">
      {/* Greeting */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[12px] text-muted">
            <span>Sunday, 8 November</span>
            <span className="h-1 w-1 rounded-full bg-muted-dim" />
            <span className="inline-flex items-center gap-1.5 text-cyan">
              <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan" />
              Demo workspace
            </span>
          </div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-ink">
            Good morning, {user?.name ? user.name.split(' ')[0] : 'there'}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            Here is what needs your attention across {transactions.length} trust
            records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openAction('scan')}>
            <QrCode className="h-3.5 w-3.5" />
            Scan
          </Button>
          <Button size="sm" onClick={() => openAction('send')}>
            <Plus className="h-3.5 w-3.5" />
            New transaction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          {/* Balance hero */}
          <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-[#0a1428]">
            <div
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background:
                  'radial-gradient(120% 150% at 0% 0%, rgba(34,211,238,0.18) 0%, transparent 48%), radial-gradient(110% 130% at 100% 0%, rgba(76,125,255,0.28) 0%, transparent 55%)',
              }}
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(148,173,214,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,173,214,0.06) 1px, transparent 1px)',
                backgroundSize: '34px 34px',
                maskImage:
                  'radial-gradient(ellipse at 30% 0%, #000 20%, transparent 75%)',
              }}
            />
            <div className="relative p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-ink-soft/70">
                    <Wallet className="h-3.5 w-3.5" />
                    Available balance
                  </div>
                  <div className="mt-2 flex flex-wrap items-end gap-3">
                    <span className="text-[34px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[40px]">
                      {formatINR(metrics.available)}
                    </span>
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full border border-green/25 bg-green/[0.1] px-2 py-0.5 text-[11px] font-semibold text-green-soft">
                      <TrendingUp className="h-3 w-3" />
                      Protected
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] text-muted">
                    Protected balance across active deals ·{' '}
                    <span className="text-ink-soft">{formatINR(metrics.heldInEscrow)}</span> held in escrow
                  </p>
                </div>
                <div className="hidden w-[230px] sm:block">
                  <Sparkline
                    values={[
                      3350, 4010, 3600, 4450, 4020, 4890, 4550, 4120, 5030, 4700,
                      5120, 4950,
                    ]}
                    height={68}
                  />
                  <div className="mt-1 flex justify-between text-[9.5px] text-muted-dim">
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {quickActions.map((action) => (
                  <button
                    key={action.kind}
                    type="button"
                    onClick={() => openAction(action.kind)}
                    className="group flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 text-left text-[12px] font-medium text-ink-soft backdrop-blur transition-all hover:border-cyan/30 hover:bg-white/[0.08] hover:text-ink"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#08101e]/70 text-cyan transition-colors group-hover:border-cyan/30">
                      <action.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Received / sent */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] font-medium text-muted">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-green/20 bg-green/[0.08] text-green-soft">
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  </span>
                  Received
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-green-soft">
                  <TrendingUp className="h-3 w-3" />
                  Settled
                </span>
              </div>
              <div className="mt-3 text-[24px] font-semibold tracking-[-0.02em] text-ink">
                {formatINR(metrics.received)}
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                {transactions.filter((tx) => tx.direction === 'in').length} incoming payments
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-green/60 to-green" />
              </div>
            </Panel>
            <Panel className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[12px] font-medium text-muted">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/25 bg-brand/[0.09] text-[#9fbbff]">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                  Sent
                </span>
                <span className="inline-flex items-center gap-1 text-[10.5px] font-medium text-brand-bright">
                  <TrendingDown className="h-3 w-3" />
                  Escrowed
                </span>
              </div>
              <div className="mt-3 text-[24px] font-semibold tracking-[-0.02em] text-ink">
                {formatINR(metrics.sent)}
              </div>
              <p className="mt-0.5 text-[11px] text-muted">
                {transactions.filter((tx) => tx.direction === 'out').length} outgoing payments
              </p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-[54%] rounded-full bg-gradient-to-r from-brand/60 to-brand" />
              </div>
            </Panel>
          </div>

          {/* Recent transactions */}
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-ink">
                  Recent transactions
                </h2>
                <p className="mt-0.5 text-[12px] text-muted">
                  Every payment keeps its conversation, agreement and evidence.
                </p>
              </div>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-[12px] font-medium text-cyan hover:text-cyan-soft"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 px-5">
              {filters.map((item) => {
                const active = item.value === filter;
                const count =
                  item.value === 'all'
                    ? transactions.length
                    : item.value === 'active'
                      ? transactions.filter(
                          (tx) =>
                            tx.status === 'in_progress' || tx.status === 'pending'
                        ).length
                      : item.value === 'awaiting'
                        ? transactions.filter(
                            (tx) =>
                              tx.status === 'awaiting_confirmation' ||
                              tx.agreementStatus === 'awaiting_you'
                          ).length
                        : transactions.filter((tx) => tx.status === 'disputed')
                            .length;
                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium transition-colors',
                      active
                        ? 'border-cyan/30 bg-cyan/[0.08] text-cyan-soft'
                        : 'border-line bg-transparent text-muted hover:border-line-strong hover:text-ink-soft'
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        'rounded-full px-1 text-[9.5px]',
                        active ? 'bg-cyan/15 text-cyan-soft' : 'bg-white/[0.05]'
                      )}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 divide-y divide-line-soft">
              {filtered.map((tx) => {
                const person = demoPeople[tx.counterpartyId] || {
                  id: tx.counterpartyId,
                  name: tx.counterpartyId.includes('@')
                    ? tx.counterpartyId.split('@')[0]
                    : 'Partner',
                  handle: 'partner',
                  avatar: 'rahul' as const,
                  verified: true,
                  role: 'Verified member',
                };
                return (
                  <div
                    key={tx.id}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.018]"
                  >
                    <PersonAvatar person={person} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/transactions/${tx.id}`}
                          className="truncate text-[13px] font-medium text-ink hover:text-cyan"
                        >
                          {tx.title}
                        </Link>
                        {tx.verified && (
                          <ShieldCheck className="h-3 w-3 shrink-0 text-cyan" />
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted">
                        <span className="truncate">{person.name}</span>
                        <span className="text-muted-dim">·</span>
                        <span>{tx.dateLabel}</span>
                        {tx.agreementStatus !== 'none' && (
                          <>
                            <span className="text-muted-dim">·</span>
                            <span className="inline-flex items-center gap-1 text-[10.5px] text-muted">
                              <Dna className="h-2.5 w-2.5" /> Deal DNA
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="hidden shrink-0 sm:block">
                      <TransactionStatusPill status={tx.status} />
                    </div>
                    <div className="w-[92px] shrink-0 text-right">
                      <div
                        className={cn(
                          'text-[13px] font-semibold tnum',
                          tx.direction === 'in' ? 'text-green-soft' : 'text-ink'
                        )}
                      >
                        {tx.direction === 'in' ? '+' : '−'}
                        {formatINR(tx.amount)}
                      </div>
                      <div className="text-[10px] text-muted-dim">
                        {tx.status === 'disputed'
                          ? 'Under review'
                          : tx.direction === 'in'
                            ? 'Incoming'
                            : 'Outgoing'}
                      </div>
                    </div>
                    <Link
                      href={`/transactions/${tx.id}`}
                      aria-label={`Open ${tx.title}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.02] text-muted transition-colors hover:border-line-strong hover:text-ink"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel-soft text-cyan">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <p className="text-[13px] font-semibold text-ink">
                    {transactions.length === 0 ? 'No transactions yet' : 'Nothing in this filter'}
                  </p>
                  <p className="mt-1 max-w-sm text-[12px] text-muted">
                    {transactions.length === 0
                      ? 'Create your first escrow deal or payment to start protecting your work.'
                      : 'Your records are all caught up.'}
                  </p>
                  {transactions.length === 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      <Button size="sm" onClick={() => openAction('deal')}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Create Deal
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => openAction('send')}>
                        Send Money
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* AI insight */}
          {primaryInsight && (
            <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] p-5">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 120% at 100% 0%, rgba(34,211,238,0.14) 0%, transparent 55%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI insight
                  </span>
                  <span className="text-[10px] text-muted-dim">Advisory only</span>
                </div>
                <p className="mt-3 text-[14px] font-medium leading-relaxed text-ink">
                  {primaryInsight.aiInsight?.headline ||
                    'Review your active trust records before releasing funds.'}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
                  {primaryInsight.aiInsight?.body}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={`/transactions/${primaryInsight.id}`}>
                    <Button size="sm" variant="cyan">
                      Review record
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openAction('ask')}
                  >
                    Ask AI
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-2 border-t border-cyan/10 pt-3 text-[10.5px] text-muted">
                  <Bot className="h-3 w-3 text-cyan" />
                  PayTrust never decides fault or moves money on its own.
                </div>
              </div>
            </section>
          )}

          {/* Promises */}
          <Panel>
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber/20 bg-amber/[0.08] text-amber-soft">
                  <Clock3 className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">
                    Pending promises
                  </h2>
                  <p className="text-[10.5px] text-muted">What you owe or await</p>
                </div>
              </div>
              <Link
                href="/deals/TX-48213"
                className="text-[11px] font-medium text-cyan hover:text-cyan-soft"
              >
                Tracker
              </Link>
            </div>
            <div className="mt-3 divide-y divide-line-soft">
              {promises.map((promise) => (
                <Link
                  key={`${promise.transaction.id}-${promise.id}`}
                  href={`/transactions/${promise.transaction.id}`}
                  className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-white/[0.018]"
                >
                  <span
                    className={cn(
                      'mt-1 h-2 w-2 shrink-0 rounded-full',
                      promise.status === 'overdue'
                        ? 'bg-red'
                        : promise.status === 'due-soon'
                          ? 'bg-amber'
                          : 'bg-cyan'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">
                      {promise.label}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-muted">
                      {promise.transaction.title} · {promise.transaction.id}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-[10.5px]',
                      promise.status === 'overdue'
                        ? 'text-red-soft'
                        : 'text-muted'
                    )}
                  >
                    {promise.dueLabel || 'No date'}
                  </span>
                </Link>
              ))}
              {promises.length === 0 && (
                <div className="px-5 py-8 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-green-soft" />
                  <p className="mt-2 text-[12px] text-muted">
                    No promises need action.
                  </p>
                </div>
              )}
            </div>
          </Panel>

          {/* Trust card */}
          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-green/20 bg-green/[0.08] text-green-soft">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">
                    Trust activity
                  </h2>
                  <p className="text-[10.5px] text-muted">Your live reputation</p>
                </div>
              </div>
              <Link
                href="/trust"
                className="text-[11px] font-medium text-cyan hover:text-cyan-soft"
              >
                Passport
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-px border-y border-line-soft bg-line-soft">
              <div className="bg-panel px-3 py-3 text-center">
                <div className="text-[17px] font-semibold text-ink">
                  {trust?.stats.completed ?? 0}
                </div>
                <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-muted-dim">
                  Deals
                </div>
              </div>
              <div className="bg-panel px-3 py-3 text-center">
                <div className="text-[17px] font-semibold text-green-soft">
                  {trust?.stats.onTime ?? '—'}
                </div>
                <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-muted-dim">
                  On time
                </div>
              </div>
              <div className="bg-panel px-3 py-3 text-center">
                <div className="text-[17px] font-semibold text-ink">
                  {trust?.stats.responseTime ?? '—'}
                </div>
                <div className="mt-0.5 text-[9.5px] uppercase tracking-wide text-muted-dim">
                  Reply
                </div>
              </div>
            </div>
            <div className="px-5 py-4">
              <div className="flex items-center gap-3">
                <PersonAvatar person={partner} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {partner.name}
                  </p>
                  <p className="truncate text-[10.5px] text-muted">
                    Approved Deal DNA · 12 May
                  </p>
                </div>
                <StatusPill tone="green" dot>
                  Verified
                </StatusPill>
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-line-soft bg-white/[0.02] px-3 py-2">
                <Flag className="h-3.5 w-3.5 shrink-0 text-amber" />
                <p className="min-w-0 flex-1 truncate text-[10.5px] text-muted">
                  {project.paid > 0
                    ? `${formatINR(project.paid)} confirmed across ${project.milestones.filter((m) => m.status === 'paid').length} milestones`
                    : 'No milestones paid yet'}
                </p>
                <Link
                  href="/milestones"
                  className="shrink-0 text-[10.5px] font-medium text-cyan"
                >
                  Open
                </Link>
              </div>
            </div>
          </Panel>

          {/* Notifications preview */}
          <Panel>
            <div className="flex items-center justify-between px-5 pt-5">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-brand/25 bg-brand/[0.09] text-[#9fbbff]">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">
                    Latest activity
                  </h2>
                  <p className="text-[10.5px] text-muted">
                    {notifications.filter((item) => !item.read).length} unread
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 divide-y divide-line-soft">
              {notifications.slice(0, 3).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.href}
                  className="flex items-start gap-2.5 px-5 py-2.5 hover:bg-white/[0.018]"
                >
                  <span
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      notification.read ? 'bg-muted-dim' : 'bg-cyan'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-medium text-ink-soft">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-[10.5px] text-muted">
                      {notification.body}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-[10.5px] text-muted-dim">
        <ShieldCheck className="h-3 w-3" />
        Demo environment · all payments are simulated · no real funds can move
      </p>
    </div>
  );
}
