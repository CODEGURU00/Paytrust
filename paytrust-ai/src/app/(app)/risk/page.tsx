'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Info,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, InfoBanner } from '@/components/ui/panel';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { StackedRiskBars } from '@/components/ui/charts';
import { cn } from '@/lib/utils';
import type { AlertSeverity } from '@/lib/demo/types';

const severityMeta: Record<
  AlertSeverity,
  { label: string; tone: 'red' | 'amber' | 'cyan' }
> = {
  high: { label: 'High priority', tone: 'red' },
  medium: { label: 'Medium', tone: 'amber' },
  low: { label: 'Low', tone: 'cyan' },
};

type Filter = 'all' | 'high' | 'medium' | 'low' | 'reviewed';

export default function RiskRadarPage() {
  const { alerts, updateAlertStatus, pushToast } = useDemo();
  const [filter, setFilter] = useState<Filter>('all');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState('Today, 10:42');

  const openAlerts = alerts.filter((alert) => alert.status === 'open');
  const highPriority = alerts.filter(
    (alert) => alert.status === 'open' && alert.severity === 'high'
  ).length;

  const filtered = useMemo(() => {
    if (filter === 'all') return alerts;
    if (filter === 'reviewed') {
      return alerts.filter((alert) => alert.status !== 'open');
    }
    return alerts.filter((alert) => alert.severity === filter);
  }, [alerts, filter]);

  const rescan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      setLastScan('Just now');
      pushToast('Risk scan complete (demo)', {
        description:
          '5 signals reviewed. No new high-priority pattern was found in this demo.',
        tone: 'success',
      });
    }, 1200);
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI intelligence"
        title="Risk Radar"
        description="Early signals that help you pause and verify — never automatic verdicts."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden text-[10.5px] text-muted sm:inline">
              Last scan {lastScan}
            </span>
            <Button size="sm" onClick={rescan} isLoading={scanning}>
              <RefreshCw className="h-3.5 w-3.5" />
              Rescan now
            </Button>
          </div>
        }
      />

      <InfoBanner
        tone="info"
        icon={<Shield className="h-4 w-4 text-cyan" />}
        className="mb-5"
      >
        <span className="font-medium text-ink-soft">Advisory by design.</span>{' '}
        PayTrust highlights patterns and suggests a verification step. It never
        freezes funds, accuses a person or decides a dispute automatically.
      </InfoBanner>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: 'Open signals',
                value: `${openAlerts.length}`,
                note: 'Need a look',
                icon: Radar,
                tone: 'text-cyan',
              },
              {
                label: 'High priority',
                value: `${highPriority}`,
                note: 'Verify before paying',
                icon: ShieldAlert,
                tone: 'text-red-soft',
              },
              {
                label: 'Held for review',
                value: '₹42,000',
                note: 'Sunrise Print Co.',
                icon: Wallet,
                tone: 'text-amber',
              },
              {
                label: 'Resolved',
                value: `${alerts.filter((a) => a.status !== 'open').length}`,
                note: 'No action needed',
                icon: CheckCircle2,
                tone: 'text-green-soft',
              },
            ].map((stat) => (
              <Panel key={stat.label} className="p-3.5">
                <div className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
                  <stat.icon className={cn('h-3 w-3', stat.tone)} />
                  {stat.label}
                </div>
                <div className="mt-1.5 text-[20px] font-semibold text-ink">
                  {stat.value}
                </div>
                <div className="text-[9.5px] text-muted">{stat.note}</div>
              </Panel>
            ))}
          </div>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-cyan" />
                <h2 className="text-[13px] font-semibold text-ink">
                  Alerts and signals
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    ['all', 'All'],
                    ['high', 'High'],
                    ['medium', 'Medium'],
                    ['low', 'Low'],
                    ['reviewed', 'Reviewed'],
                  ] as [Filter, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-colors',
                      filter === value
                        ? 'bg-white/[0.07] text-ink'
                        : 'text-muted hover:text-ink-soft'
                    )}
                  >
                    {label}
                    {value === 'all' && (
                      <span className="ml-1 rounded-full bg-white/[0.06] px-1 text-[9px] text-muted">
                        {alerts.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-line-soft">
              {filtered.map((alert) => {
                const meta = severityMeta[alert.severity];
                const resolved = alert.status !== 'open';
                return (
                  <div key={alert.id} className="px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <span
                          className={cn(
                            'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                            alert.severity === 'high'
                              ? 'border-red/25 bg-red/[0.08] text-red-soft'
                              : alert.severity === 'medium'
                                ? 'border-amber/20 bg-amber/[0.08] text-amber'
                                : 'border-cyan/20 bg-cyan/[0.07] text-cyan'
                          )}
                        >
                          {alert.severity === 'high' ? (
                            <ShieldAlert className="h-4 w-4" />
                          ) : (
                            <AlertTriangle className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-[12.5px] font-semibold text-ink">
                              {alert.title}
                            </h3>
                            <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                            {alert.status === 'expected' && (
                              <StatusPill tone="muted">Expected</StatusPill>
                            )}
                            {alert.status === 'reviewed' && (
                              <StatusPill tone="green">Reviewed</StatusPill>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10.5px] text-muted">
                            {alert.amountLabel} · {alert.party} · {alert.timeLabel}
                          </p>
                        </div>
                      </div>
                      {alert.transactionId && (
                        <Link
                          href={`/transactions/${alert.transactionId}`}
                          className="inline-flex items-center gap-1 text-[10.5px] font-medium text-cyan hover:text-cyan-soft"
                        >
                          Open record <ChevronRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>

                    <div className="mt-2.5 grid gap-2 pl-10 sm:grid-cols-[1.3fr_1fr]">
                      <div className="rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-dim">
                          Why it surfaced
                        </p>
                        <ul className="mt-1 space-y-1">
                          {alert.reasons.map((reason) => (
                            <li
                              key={reason}
                              className="flex items-start gap-1.5 text-[10px] leading-relaxed text-muted"
                            >
                              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-dim" />
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-cyan/15 bg-cyan/[0.035] px-2.5 py-2">
                        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-cyan">
                          <Sparkles className="h-2.5 w-2.5" />
                          Suggested next step
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-ink-soft/85">
                          {alert.suggestion}
                        </p>
                      </div>
                    </div>

                    {!resolved && (
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-2 pl-10">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => updateAlertStatus(alert.id, 'reviewed')}
                        >
                          <Check className="h-3 w-3" />
                          Mark reviewed
                        </Button>
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => updateAlertStatus(alert.id, 'expected')}
                        >
                          This is expected
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center">
                  <ShieldCheck className="mx-auto h-6 w-6 text-green-soft" />
                  <p className="mt-2 text-[12px] font-medium text-ink">
                    No signals in this view
                  </p>
                  <p className="mt-1 text-[10.5px] text-muted">
                    New patterns will appear here after a scan.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between px-4 pt-4">
              <div>
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <TrendingUp className="h-4 w-4 text-cyan" />
                  Risk history
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">
                  Signals by severity · last 8 weeks
                </p>
              </div>
              <StatusPill tone="green" dot>
                Stable
              </StatusPill>
            </div>
            <div className="px-4 pb-4 pt-4">
              <StackedRiskBars
                height={150}
                data={[
                  { low: 2, medium: 1, high: 0 },
                  { low: 1, medium: 2, high: 0 },
                  { low: 3, medium: 0, high: 1 },
                  { low: 2, medium: 1, high: 0 },
                  { low: 1, medium: 2, high: 0 },
                  { low: 4, medium: 1, high: 0 },
                  { low: 2, medium: 2, high: 1 },
                  { low: 3, medium: 1, high: 0 },
                ]}
              />
              <div className="mt-3 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2 text-[9.5px] leading-relaxed text-muted">
                One high-priority signal this week: a last-minute recipient
                change on TX-48231.
              </div>
            </div>
          </Panel>

          <Panel>
            <div className="px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                <ShieldCheck className="h-4 w-4 text-green-soft" />
                Protection settings
              </h2>
              <p className="mt-0.5 text-[10px] text-muted">
                You decide which checks run before a payment.
              </p>
            </div>
            <div className="mt-3 divide-y divide-line-soft">
              {[
                ['Recipient change alerts', true, 'Notify when payout details change'],
                ['Duplicate payment check', true, 'Compare amount and recipient'],
                ['New contact warnings', true, 'Flag first-time recipients'],
                ['Large transfer review', false, 'Hold above a threshold (off in demo)'],
              ].map(([label, on, note]) => (
                <div
                  key={label as string}
                  className="flex items-center gap-2.5 px-4 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-ink-soft">
                      {label as string}
                    </p>
                    <p className="text-[9px] text-muted-dim">{note as string}</p>
                  </div>
                  <span
                    className={cn(
                      'h-4 w-7 rounded-full p-0.5',
                      on ? 'bg-cyan/70' : 'bg-white/[0.08]'
                    )}
                  >
                    <span
                      className={cn(
                        'block h-3 w-3 rounded-full bg-white transition-transform',
                        on ? 'translate-x-3' : 'translate-x-0'
                      )}
                    />
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3">
              <Link href="/settings">
                <Button variant="secondary" size="sm" className="w-full">
                  Open security settings
                </Button>
              </Link>
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-cyan" />
              <h2 className="text-[11.5px] font-semibold text-ink">
                How scoring works
              </h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              Signals look at timing, amount changes, recipient history and
              wording. Legitimate deals trigger false positives. That is why every
              signal ends with a suggested human check, not a block.
            </p>
            <div className="mt-2.5 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2 text-[9.5px] leading-relaxed text-muted-dim">
              Feedback on alerts tunes future signals privately. It is never shown
              on a Trust Passport.
            </div>
          </Panel>

          <Link href="/mediator" className="block">
            <Panel className="flex items-center gap-3 p-4 transition-colors hover:bg-panel-hover">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet/20 bg-violet/[0.08] text-violet">
                <AlertTriangle className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold text-ink">
                  Open a neutral review
                </p>
                <p className="text-[9.5px] text-muted">
                  Organize both accounts without a verdict
                </p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted" />
            </Panel>
          </Link>
        </div>
      </div>
    </div>
  );
}
