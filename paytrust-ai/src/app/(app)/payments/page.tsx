'use client';

import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Link2,
  QrCode,
  Repeat,
  Send,
  ShieldCheck,
  Split,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { useQuickActions } from '@/components/shell/quick-actions';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { formatINR } from '@/lib/demo/format';

export default function PaymentsPage() {
  const { transactions, demoPeople, project } = useDemo();
  const { openAction } = useQuickActions();

  const recent = transactions.slice(0, 4);
  const held = transactions.reduce((total, tx) => total + (tx.held || 0), 0);

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Payments"
        description="Send, request and protect money without losing the context."
        action={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => openAction('scan')}>
              <QrCode className="h-3.5 w-3.5" />
              Scan
            </Button>
            <Button size="sm" onClick={() => openAction('send')}>
              <ArrowUpRight className="h-3.5 w-3.5" />
              Send money
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-brand/25 bg-[#0a1428] p-5">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(100% 150% at 0% 0%, rgba(34,211,238,0.14) 0%, transparent 50%), radial-gradient(90% 130% at 100% 0%, rgba(76,125,255,0.22) 0%, transparent 55%)',
              }}
            />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] text-ink-soft/70">
                  <Wallet className="h-3.5 w-3.5" />
                  Available balance
                </div>
                <div className="mt-1.5 text-[32px] font-semibold tracking-[-0.03em] text-ink">
                  ₹1,24,580<span className="text-[18px] text-ink-soft/60">.50</span>
                </div>
                <p className="mt-1 text-[10.5px] text-muted">
                  {formatINR(held)} protected across {transactions.filter((t) => t.held).length} active records
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { kind: 'send', label: 'Send', icon: ArrowUpRight },
                  { kind: 'request', label: 'Request', icon: ArrowDownLeft },
                  { kind: 'deal', label: 'New deal', icon: ShieldCheck },
                ] as const).map((item) => (
                  <button
                    key={item.kind}
                    type="button"
                    onClick={() => openAction(item.kind)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-[11px] font-medium text-ink-soft hover:bg-white/[0.09]"
                  >
                    <item.icon className="h-3.5 w-3.5 text-cyan" />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <Panel>
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-[13px] font-semibold text-ink">Recent payments</h2>
              <Link
                href="/transactions"
                className="inline-flex items-center gap-1 text-[10.5px] font-medium text-cyan hover:text-cyan-soft"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="mt-2 divide-y divide-line-soft">
              {recent.map((tx) => {
                const person = demoPeople[tx.counterpartyId];
                return (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.018]"
                  >
                    <PersonAvatar person={person} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11.5px] font-medium text-ink">
                        {tx.title}
                      </p>
                      <p className="truncate text-[9.5px] text-muted">
                        {person.name} · {tx.dateLabel}
                      </p>
                    </div>
                    <StatusPill
                      tone={tx.status === 'disputed' ? 'red' : tx.held ? 'amber' : 'green'}
                    >
                      {tx.status === 'disputed'
                        ? 'Disputed'
                        : tx.held
                          ? 'Protected'
                          : 'Released'}
                    </StatusPill>
                    <span
                      className={
                        tx.direction === 'in'
                          ? 'w-[80px] text-right text-[11.5px] font-semibold text-green-soft'
                          : 'w-[80px] text-right text-[11.5px] font-semibold text-ink'
                      }
                    >
                      {tx.direction === 'in' ? '+' : '−'}
                      {formatINR(tx.amount)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          {[
            {
              href: '/payments/send',
              title: 'Send & request',
              body: 'Start a protected payment or ask for one.',
              icon: Send,
              tone: 'text-cyan border-cyan/20 bg-cyan/[0.07]',
            },
            {
              href: '/payments/links',
              title: 'Payment links',
              body: 'Share a link that opens a named record.',
              icon: Link2,
              tone: 'text-[#9fbbff] border-brand/25 bg-brand/[0.09]',
            },
            {
              href: '/payments/split',
              title: 'Split payments',
              body: 'Divide a bill and track each share.',
              icon: Split,
              tone: 'text-violet border-violet/20 bg-violet/[0.08]',
            },
            {
              href: '/payments/subscriptions',
              title: 'Subscriptions',
              body: 'Recurring retainers with clear terms.',
              icon: Repeat,
              tone: 'text-green-soft border-green/20 bg-green/[0.08]',
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Panel className="flex items-center gap-3 p-4 transition-colors hover:bg-panel-hover">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl border ${item.tone}`}>
                  <item.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-ink">{item.title}</p>
                  <p className="text-[9.5px] text-muted">{item.body}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-dim" />
              </Panel>
            </Link>
          ))}

          <Panel className="p-4">
            <h2 className="text-[12px] font-semibold text-ink">Active project</h2>
            <p className="mt-1 text-[10px] text-muted">{project.title}</p>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-muted">Paid</span>
              <span className="font-medium text-green-soft">
                {formatINR(project.paid)} / {formatINR(project.total)}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-cyan"
                style={{
                  width: `${Math.round((project.paid / project.total) * 100)}%`,
                }}
              />
            </div>
            <Link href="/milestones" className="mt-2.5 block">
              <Button variant="secondary" size="sm" className="w-full">
                Open milestones
              </Button>
            </Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
