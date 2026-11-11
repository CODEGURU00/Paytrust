'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Flag,
  History,
  Link2,
  Lock,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { Select } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

type AuditKind = 'payment' | 'agreement' | 'evidence' | 'dispute' | 'trust';

interface AuditEntry {
  id: string;
  kind: AuditKind;
  title: string;
  detail: string;
  dateLabel: string;
  actor: string;
  transactionId?: string;
}

const kindMeta: Record<
  AuditKind,
  { label: string; icon: typeof Wallet; className: string }
> = {
  payment: {
    label: 'Payment',
    icon: Wallet,
    className: 'border-green/20 bg-green/[0.07] text-green-soft',
  },
  agreement: {
    label: 'Agreement',
    icon: Sparkles,
    className: 'border-cyan/20 bg-cyan/[0.07] text-cyan',
  },
  evidence: {
    label: 'Evidence',
    icon: FileText,
    className: 'border-brand/25 bg-brand/[0.08] text-[#9fbbff]',
  },
  dispute: {
    label: 'Dispute',
    icon: Flag,
    className: 'border-red/20 bg-red/[0.07] text-red-soft',
  },
  trust: {
    label: 'Trust',
    icon: ShieldCheck,
    className: 'border-violet/20 bg-violet/[0.07] text-violet',
  },
};

const filters: { value: 'all' | AuditKind; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'payment', label: 'Payments' },
  { value: 'agreement', label: 'Agreements' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'dispute', label: 'Disputes' },
  { value: 'trust', label: 'Trust' },
];

function classify(label: string): AuditKind {
  const value = label.toLowerCase();
  if (value.includes('pay') || value.includes('release') || value.includes('fund')) {
    return 'payment';
  }
  if (
    value.includes('agreement') ||
    value.includes('terms') ||
    value.includes('approv') ||
    value.includes('deal dna')
  ) {
    return 'agreement';
  }
  if (value.includes('dispute') || value.includes('conflict')) return 'dispute';
  if (value.includes('evidence') || value.includes('file')) return 'evidence';
  if (value.includes('trust') || value.includes('milestone')) return 'trust';
  return 'agreement';
}

function dayWeight(label: string) {
  if (/just now|today/i.test(label)) return 100;
  const match = label.match(/(\d{1,2})\s+[A-Za-z]{3}/);
  return match ? 100 - Number(match[1]) : 0;
}

function groupLabel(label: string) {
  if (/just now|today/i.test(label)) return 'Today';
  const match = label.match(/\d{1,2}\s+[A-Za-z]{3,}/);
  return match ? match[0] : 'Earlier';
}

function digest(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 8);
}

export default function AuditPage() {
  const { transactions, demoPeople, evidence, alerts, pushToast } = useDemo();
  const [filter, setFilter] = useState<'all' | AuditKind>('all');
  const [record, setRecord] = useState('all');
  const [query, setQuery] = useState('');

  const entries = useMemo(() => {
    const list: AuditEntry[] = [];

    transactions.forEach((tx) => {
      const person = demoPeople[tx.counterpartyId];
      list.push({
        id: `created-${tx.id}`,
        kind: 'trust',
        title: 'Trust record created',
        detail: `${tx.title} · ${person.name} · ${formatINR(tx.amount)}`,
        dateLabel: tx.created,
        actor: 'Arjun Sharma',
        transactionId: tx.id,
      });

      tx.timeline.forEach((event) => {
        if (event.label.toLowerCase().includes('record created')) return;
        list.push({
          id: `${tx.id}-${event.id}`,
          kind: classify(event.label),
          title: event.label,
          detail: `${tx.title} · ${person.name}`,
          dateLabel: event.date,
          actor:
            event.state === 'upcoming'
              ? 'Not yet'
              : classify(event.label) === 'payment'
                ? 'Arjun Sharma'
                : 'PayTrust record',
          transactionId: tx.id,
        });
      });

      if (tx.agreementStatus === 'approved') {
        list.push({
          id: `agreement-${tx.id}`,
          kind: 'agreement',
          title: 'Deal DNA approved by both parties',
          detail: `${tx.title} · ${tx.agreement?.version || 'Draft'} · mutual approval timestamped`,
          dateLabel: tx.dateLabel,
          actor: 'Both parties',
          transactionId: tx.id,
        });
      }

      if (tx.status === 'disputed') {
        list.push({
          id: `dispute-${tx.id}`,
          kind: 'dispute',
          title: 'Dispute opened',
          detail: `${tx.title} · funds remain where they were · neutral review available`,
          dateLabel: tx.dateLabel,
          actor: 'Arjun Sharma',
          transactionId: tx.id,
        });
      }
    });

    evidence.forEach((item) => {
      list.push({
        id: `ev-${item.id}`,
        kind: 'evidence',
        title: `Evidence added: ${item.name}`,
        detail: `${item.transactionId} · ${item.sizeLabel} · hash recorded`,
        dateLabel: item.dateLabel,
        actor: item.uploadedBy,
        transactionId: item.transactionId,
      });
    });

    alerts
      .filter((alert) => alert.status !== 'open')
      .forEach((alert) => {
        list.push({
          id: `alert-${alert.id}`,
          kind: 'trust',
          title: `Risk signal ${alert.status}`,
          detail: `${alert.title} · ${alert.amountLabel}`,
          dateLabel: alert.timeLabel,
          actor: 'Arjun Sharma',
          transactionId: alert.transactionId,
        });
      });

    return list.sort((a, b) => dayWeight(b.dateLabel) - dayWeight(a.dateLabel));
  }, [alerts, demoPeople, evidence, transactions]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesKind = filter === 'all' || entry.kind === filter;
      const matchesRecord =
        record === 'all' || entry.transactionId === record;
      const matchesSearch =
        !search ||
        entry.title.toLowerCase().includes(search) ||
        entry.detail.toLowerCase().includes(search) ||
        entry.actor.toLowerCase().includes(search) ||
        (entry.transactionId || '').toLowerCase().includes(search);
      return matchesKind && matchesRecord && matchesSearch;
    });
  }, [entries, filter, query, record]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    filtered.forEach((entry) => {
      const group = groupLabel(entry.dateLabel);
      const current = map.get(group) || [];
      current.push(entry);
      map.set(group, current);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const paymentEvents = entries.filter((entry) => entry.kind === 'payment').length;
  const approved = transactions.filter(
    (tx) => tx.agreementStatus === 'approved'
  ).length;

  const exportAudit = () => {
    const rows = [
      ['Event ID', 'Type', 'Event', 'Detail', 'Date', 'Actor', 'Record', 'Hash'],
      ...filtered.map((entry) => [
        entry.id,
        kindMeta[entry.kind].label,
        entry.title,
        entry.detail,
        entry.dateLabel,
        entry.actor,
        entry.transactionId || '',
        digest(entry.id),
      ]),
    ];
    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'paytrust-audit-timeline.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('Audit export downloaded (demo)', {
      description: `${filtered.length} events exported as CSV.`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Trust"
        title="Audit Timeline"
        description="Every event, in order, with the record it belongs to."
        action={
          <Button variant="secondary" size="sm" onClick={exportAudit}>
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Export audit</span>
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {([
          ['Total events', entries.length, History, 'text-cyan'],
          ['Payment events', paymentEvents, Wallet, 'text-green-soft'],
          ['Evidence files', evidence.length, FileText, 'text-[#9fbbff]'],
          ['Mutual approvals', approved, ShieldCheck, 'text-violet'],
        ] as [string, number, LucideIcon, string][]).map(([label, value, Icon, tone]) => (
          <Panel key={label as string} className="flex items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025]">
              <Icon className={cn('h-4 w-4', tone as string)} />
            </span>
            <div>
              <div className="text-[17px] font-semibold text-ink">
                {value as number}
              </div>
              <div className="text-[9.5px] text-muted">{label as string}</div>
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Panel className="overflow-hidden">
          <div className="space-y-3 border-b border-line-soft px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-dim" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search events, actors or records…"
                  aria-label="Search audit events"
                  className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
                />
              </div>
              <Select
                value={record}
                onChange={(event) => setRecord(event.target.value)}
                aria-label="Filter by record"
                className="h-8 w-auto min-w-[160px] text-[10.5px]"
              >
                <option value="all">All records</option>
                {transactions.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.id} · {tx.title}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {filters.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-colors',
                    filter === item.value
                      ? 'bg-white/[0.07] text-ink'
                      : 'text-muted hover:text-ink-soft'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {grouped.length === 0 ? (
            <EmptyState
              icon={<History className="h-5 w-5" />}
              title="No events in this view"
              description="Try another record or clear the filters. New actions appear here immediately."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setFilter('all');
                    setRecord('all');
                    setQuery('');
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <div className="px-4 py-3">
              {grouped.map(([group, items]) => (
                <section key={group} className="mb-4 last:mb-0">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-muted-dim">
                      {group}
                    </span>
                    <span className="h-px flex-1 bg-line-soft" />
                    <span className="text-[8.5px] text-muted-dim">
                      {items.length} event{items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <ol className="relative ml-2 space-y-0.5">
                    <span className="absolute bottom-2 left-[5px] top-2 w-px bg-line" />
                    {items.map((entry) => {
                      const meta = kindMeta[entry.kind];
                      return (
                        <li
                          key={entry.id}
                          className="group relative flex items-start gap-3 rounded-lg py-2 pl-5 pr-2 transition-colors hover:bg-white/[0.02]"
                        >
                          <span
                            className={cn(
                              'absolute left-0 top-3 z-10 flex h-[11px] w-[11px] items-center justify-center rounded-full border-2',
                              entry.kind === 'payment'
                                ? 'border-green/50 bg-green'
                                : entry.kind === 'dispute'
                                  ? 'border-red/50 bg-red'
                                  : entry.kind === 'agreement'
                                    ? 'border-cyan/50 bg-cyan'
                                    : entry.kind === 'evidence'
                                      ? 'border-brand/60 bg-brand'
                                      : 'border-violet/50 bg-violet'
                            )}
                          />
                          <span
                            className={cn(
                              'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                              meta.className
                            )}
                          >
                            <meta.icon className="h-3.5 w-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-[11.5px] font-medium text-ink">
                                {entry.title}
                              </p>
                              <StatusPill tone="muted">{meta.label}</StatusPill>
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted">
                              {entry.detail}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[8.5px] text-muted-dim">
                              <span>{entry.dateLabel}</span>
                              <span>·</span>
                              <span>{entry.actor}</span>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1">
                                <Lock className="h-2 w-2" />#
                                {digest(entry.id)}
                              </span>
                              {entry.transactionId && (
                                <>
                                  <span>·</span>
                                  <Link
                                    href={`/transactions/${entry.transactionId}`}
                                    className="font-medium text-cyan hover:text-cyan-soft"
                                  >
                                    {entry.transactionId}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                          {entry.transactionId && (
                            <Link
                              href={`/transactions/${entry.transactionId}`}
                              aria-label={`Open ${entry.transactionId}`}
                              className="mt-1 hidden shrink-0 text-muted-dim hover:text-cyan sm:block"
                            >
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-green-soft" />
              Integrity
            </h2>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Each event carries a short fingerprint derived from its record. A
              changed event would produce a different fingerprint in production.
            </p>
            <div className="mt-2.5 rounded-lg border border-line-soft bg-[#060b16] px-2.5 py-2 font-mono text-[8.5px] leading-relaxed text-muted-dim">
              <div className="flex justify-between gap-2">
                <span>chain</span>
                <span className="text-green-soft">verified (demo)</span>
              </div>
              <div className="mt-1 truncate">
                #{digest(entries[0]?.id || 'empty')} → #
                {digest(entries[1]?.id || 'empty')} → #
                {digest(entries[2]?.id || 'empty')}
              </div>
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-[9px] leading-relaxed text-muted-dim">
              <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0" />
              This is a visual demo of an append-only log. It is not a
              cryptographic proof.
            </p>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <Link2 className="h-3.5 w-3.5 text-cyan" />
              Quick links
            </h2>
            <div className="mt-2.5 space-y-1.5">
              {[
                { href: '/transactions', label: 'All transaction records' },
                { href: '/evidence', label: 'Evidence Vault' },
                { href: '/deals/TX-48213', label: 'Deal DNA draft' },
                { href: '/trust', label: 'Trust Passport' },
                { href: '/mediator', label: 'AI Mediator' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10.5px] text-muted transition-colors hover:bg-white/[0.03] hover:text-ink-soft"
                >
                  <ChevronRight className="h-3 w-3" />
                  <span className="flex-1">{link.label}</span>
                </Link>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <PersonAvatar person={demoPeople.arjun} size="xs" />
              Record owner
            </h2>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Every event in this view is scoped to Arjun Sharma&apos;s workspace.
              Counterparties see their own events for shared records only.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[9px] text-muted-dim">
              <Clock3 className="h-2.5 w-2.5" />
              Demo timeline · seeded and locally appended
            </div>
          </Panel>

          <div className="flex items-start gap-2 rounded-xl border border-cyan/15 bg-cyan/[0.035] px-3 py-2.5">
            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
            <p className="text-[9.5px] leading-relaxed text-muted">
              Releasing a payment, adding evidence or approving a draft adds a new
              event immediately. Past events are never rewritten.
            </p>
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
        <History className="h-3 w-3" />
        Demo audit log · seeded events plus your actions in this browser
      </p>
    </div>
  );
}
