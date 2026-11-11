'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronRight,
  Dna,
  FileText,
  Inbox,
  MessageCircle,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { useQuickActions } from '@/components/shell/quick-actions';
import { Panel, PageHeader } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill, TransactionStatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { FilterTabs } from '@/components/ui/tabs';
import { TextInput } from '@/components/ui/form';
import { formatINR, formatMoney } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'active' | 'awaiting' | 'disputed' | 'closed';

export default function TransactionsPage() {
  const { transactions, demoPeople, pushToast } = useDemo();
  const { openAction } = useQuickActions();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const counts = useMemo(
    () => ({
      all: transactions.length,
      active: transactions.filter(
        (tx) => tx.status === 'in_progress' || tx.status === 'pending'
      ).length,
      awaiting: transactions.filter(
        (tx) =>
          tx.status === 'awaiting_confirmation' ||
          tx.agreementStatus === 'awaiting_you' ||
          tx.agreementStatus === 'awaiting'
      ).length,
      disputed: transactions.filter((tx) => tx.status === 'disputed').length,
      closed: transactions.filter(
        (tx) => tx.status === 'completed' || tx.status === 'cancelled'
      ).length,
    }),
    [transactions]
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return transactions.filter((tx) => {
      const person = demoPeople[tx.counterpartyId];
      const matchesQuery =
        !search ||
        tx.title.toLowerCase().includes(search) ||
        tx.id.toLowerCase().includes(search) ||
        person?.name.toLowerCase().includes(search) ||
        tx.purpose.toLowerCase().includes(search);

      if (!matchesQuery) return false;

      switch (filter) {
        case 'active':
          return tx.status === 'in_progress' || tx.status === 'pending';
        case 'awaiting':
          return (
            tx.status === 'awaiting_confirmation' ||
            tx.agreementStatus === 'awaiting_you' ||
            tx.agreementStatus === 'awaiting'
          );
        case 'disputed':
          return tx.status === 'disputed';
        case 'closed':
          return tx.status === 'completed' || tx.status === 'cancelled';
        default:
          return true;
      }
    });
  }, [demoPeople, filter, query, transactions]);

  const protectedValue = transactions.reduce(
    (total, tx) => total + (tx.held || 0),
    0
  );

  /*
   * The escrow total can span transactions in different currencies, so it is
   * only labelled with a currency when every transaction agrees on one.
   */
  const protectedCurrencies = [...new Set(transactions.map((tx) => tx.currency))];
  const protectedCurrency =
    protectedCurrencies.length === 1 ? protectedCurrencies[0] : 'USD';

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Every payment has a story"
        description="Open a record to see the conversation, agreement, promises and evidence behind it."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => openAction('request')}>
              <ArrowDownLeft className="h-3.5 w-3.5" />
              Request
            </Button>
            <Button size="sm" onClick={() => openAction('send')}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Send money
            </Button>
          </div>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand/25 bg-brand/[0.09] text-[#9fbbff]">
            <Wallet className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[16px] font-semibold text-ink">
              {formatMoney(protectedValue, protectedCurrency)}
            </div>
            <div className="text-[10.5px] text-muted">Held in demo escrow</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-green/20 bg-green/[0.08] text-green-soft">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[16px] font-semibold text-ink">
              {counts.active} active
            </div>
            <div className="text-[10.5px] text-muted">Deals in progress</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 px-4 py-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber/20 bg-amber/[0.08] text-amber-soft">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[16px] font-semibold text-ink">
              {counts.awaiting} waiting
            </div>
            <div className="text-[10.5px] text-muted">Need your attention</div>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3.5 sm:px-5">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-dim" />
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by title, person, amount or ID…"
              className="h-9 pl-9 text-[12.5px]"
              aria-label="Search transactions"
            />
          </div>
          <div className="flex items-center gap-2">
            <FilterTabs
              size="sm"
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'awaiting', label: 'Awaiting' },
                { value: 'disputed', label: 'Disputed' },
                { value: 'closed', label: 'Closed' },
              ]}
              counts={counts}
              value={filter}
              onChange={setFilter}
            />
            <Button
              variant="secondary"
              size="icon-sm"
              aria-label="Filter options"
              onClick={() =>
                pushToast('Filters are applied instantly', {
                  description:
                    'Use the tabs to narrow by state, or search by person and record ID.',
                  tone: 'info',
                })
              }
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="divide-y divide-line-soft">
          {filtered.map((tx) => {
            const person = demoPeople[tx.counterpartyId] || {
              id: tx.counterpartyId,
              name: tx.counterpartyId.includes('@')
                ? tx.counterpartyId.split('@')[0]
                : 'Partner',
              handle: 'partner',
              avatar: 'rahul' as const,
              verified: true,
              role: 'Verified participant',
            };
            const isBusiness = person?.id === 'sunrise';
            const done = tx.promises.filter((p) => p.status === 'done').length;
            const progress = tx.promises.length
              ? Math.round((done / tx.promises.length) * 100)
              : 0;
            return (
              <div
                key={tx.id}
                className="group relative px-4 py-4 transition-colors hover:bg-white/[0.018] sm:px-5"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="relative shrink-0">
                    <PersonAvatar person={person} size="lg" />
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-panel',
                        tx.status === 'disputed'
                          ? 'bg-red'
                          : tx.status === 'in_progress'
                            ? 'bg-green'
                            : tx.status === 'awaiting_confirmation'
                              ? 'bg-amber'
                              : 'bg-muted-dim'
                      )}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/transactions/${tx.id}`}
                        className="text-[14px] font-semibold text-ink hover:text-cyan"
                      >
                        {tx.title}
                      </Link>
                      {tx.verified && (
                        <ShieldCheck
                          className="h-3.5 w-3.5 text-cyan"
                          aria-label="Verified counterparty"
                        />
                      )}
                      <span className="text-[10.5px] font-medium text-muted-dim">
                        {tx.id}
                      </span>
                      <TransactionStatusPill status={tx.status} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        {isBusiness ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        {person?.name}
                      </span>
                      <span className="text-muted-dim">·</span>
                      <span>{tx.dateLabel}</span>
                      <span className="text-muted-dim">·</span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {tx.messageCount} messages
                      </span>
                      <span className="text-muted-dim">·</span>
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {Object.values(tx.evidence).reduce((a, b) => a + b, 0)} evidence
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 max-w-2xl text-[11.5px] text-muted">
                      {tx.purpose}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                      {tx.agreementStatus !== 'none' && (
                        <Link
                          href={`/deals/${tx.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-cyan/20 bg-cyan/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-cyan-soft transition-colors hover:bg-cyan/[0.1]"
                        >
                          <Dna className="h-3 w-3" />
                          Deal DNA
                          {tx.agreement?.missing.length ? (
                            <span className="text-amber-soft">
                              · {tx.agreement.missing.length} gap
                              {tx.agreement.missing.length > 1 ? 's' : ''}
                            </span>
                          ) : null}
                        </Link>
                      )}
                      {tx.promises.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.025] px-2 py-0.5 text-[10.5px] text-muted">
                          Promises
                          <span className="h-1 w-12 overflow-hidden rounded-full bg-white/[0.07]">
                            <span
                              className="block h-full rounded-full bg-brand"
                              style={{ width: `${progress}%` }}
                            />
                          </span>
                          {done}/{tx.promises.length}
                        </span>
                      )}
                      {tx.status === 'disputed' && (
                        <StatusPill tone="red" dot pulse>
                          Needs review
                        </StatusPill>
                      )}
                      {tx.agreementStatus === 'awaiting_you' && (
                        <StatusPill tone="amber" dot>
                          Your approval needed
                        </StatusPill>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <div className="text-right">
                      <div
                        className={cn(
                          'text-[16px] font-semibold tnum',
                          tx.direction === 'in' ? 'text-green-soft' : 'text-ink'
                        )}
                      >
                        {tx.direction === 'in' ? '+' : '−'}
                        {formatMoney(tx.amount, tx.currency)}
                      </div>
                      <div className="mt-0.5 text-[10px] text-muted-dim">
                        {tx.held
                          ? `${formatMoney(tx.held, tx.currency)} held`
                          : tx.released
                            ? `${formatMoney(tx.released, tx.currency)} released`
                            : tx.status === 'cancelled'
                              ? 'No funds captured'
                              : tx.direction === 'in'
                                ? 'Incoming'
                                : 'Outgoing'}
                      </div>
                    </div>
                    <Link href={`/transactions/${tx.id}`}>
                      <Button variant="secondary" size="xs">
                        Open workspace
                        <ChevronRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel-soft text-cyan">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-ink">
                {transactions.length === 0 ? 'No transactions yet' : 'No transactions match'}
              </h3>
              <p className="mt-1.5 max-w-sm text-[12.5px] text-muted">
                {transactions.length === 0
                  ? 'Start by creating your first escrow-protected deal or sending money with PayPal Sandbox.'
                  : 'Try a different search term or clear the filter to see the full record.'}
              </p>
              {transactions.length === 0 ? (
                <div className="mt-4 flex items-center gap-2">
                  <Button size="sm" onClick={() => openAction('deal')}>
                    Create Deal
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => openAction('send')}>
                    Send Money
                  </Button>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setQuery('');
                    setFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </Panel>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-[10.5px] text-muted-dim">
        <span>
          Showing {filtered.length} of {transactions.length} records
        </span>
        <Link
          href="/milestones"
          className="inline-flex items-center gap-1 text-cyan hover:text-cyan-soft"
        >
          View milestone plan <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
