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
  Fingerprint,
  Link2,
  Lock,
  Radar,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, InfoBanner } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

const guardians = [
  {
    id: 'recipient-change',
    title: 'Recipient change guard',
    description:
      'Checks whether payout details changed shortly before a payment.',
    enabled: true,
    checked: 24,
    caught: 1,
    icon: UserCheck,
  },
  {
    id: 'duplicate',
    title: 'Duplicate payment check',
    description: 'Compares amount, recipient and note against recent records.',
    enabled: true,
    checked: 24,
    caught: 2,
    icon: RefreshCw,
  },
  {
    id: 'new-contact',
    title: 'First-time recipient warning',
    description: 'Flags payments to someone with no completed record.',
    enabled: true,
    checked: 24,
    caught: 0,
    icon: Fingerprint,
  },
  {
    id: 'large-transfer',
    title: 'Large transfer pause',
    description:
      'Adds a confirmation step above a threshold you choose. Off in this demo.',
    enabled: false,
    checked: 24,
    caught: 0,
    icon: Wallet,
  },
  {
    id: 'link-scan',
    title: 'Payment link inspection',
    description: 'Shows the named record before a link can be paid.',
    enabled: true,
    checked: 18,
    caught: 0,
    icon: Link2,
  },
];

export default function GuardianPage() {
  const { alerts, transactions, demoPeople, updateAlertStatus, pushToast } =
    useDemo();
  const [settings, setSettings] = useState(
    Object.fromEntries(guardians.map((item) => [item.id, item.enabled])) as Record<
      string,
      boolean
    >
  );
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState('Today, 10:42');

  const openAlerts = alerts.filter((alert) => alert.status === 'open');
  const highPriority = openAlerts.filter((alert) => alert.severity === 'high');
  const protectedTotal = transactions.reduce(
    (total, tx) => total + (tx.held || 0),
    0
  );

  const checksToday = useMemo(
    () => guardians.reduce((total, item) => total + item.checked, 0),
    []
  );

  const runCheck = () => {
    setRunning(true);
    setTimeout(() => {
      setRunning(false);
      setLastRun('Just now');
      pushToast('Guardian check complete (demo)', {
        description:
          '24 payments and 18 links reviewed. No new high-priority signal in this pass.',
        tone: 'success',
      });
    }, 1000);
  };

  return (
    <div>
      <PageHeader
        eyebrow="AI intelligence"
        title="Payment Guardian"
        description="The checks that run before money moves. You always make the final call."
        action={
          <div className="flex items-center gap-2">
            <span className="hidden text-[10px] text-muted sm:inline">
              Last check {lastRun}
            </span>
            <Button size="sm" onClick={runCheck} isLoading={running}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Run check
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] p-5">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'radial-gradient(110% 130% at 100% 0%, rgba(34,211,238,0.14) 0%, transparent 55%), radial-gradient(80% 120% at 0% 100%, rgba(76,125,255,0.12) 0%, transparent 60%)',
              }}
            />
            <div className="relative flex flex-wrap items-center gap-5">
              <div className="relative flex h-20 w-20 shrink-0 items-center justify-center">
                <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="rgba(148,173,214,0.12)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="196 214"
                  />
                </svg>
                <ShieldCheck className="absolute h-7 w-7 text-cyan" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[18px] font-semibold tracking-[-0.015em] text-ink">
                    Protection is active
                  </h2>
                  <StatusPill tone="green" dot>
                    4 of 5 checks on
                  </StatusPill>
                </div>
                <p className="mt-1 max-w-xl text-[11.5px] leading-relaxed text-muted">
                  Guardian reviews payment context, recipient history and link
                  destination. It can pause to ask you a question — it cannot move,
                  freeze or reverse funds.
                </p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Radar className="h-3 w-3 text-cyan" />
                    {checksToday} checks today
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-amber" />
                    {highPriority.length} high-priority signal
                    {highPriority.length === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3 text-green-soft" />
                    {formatINR(protectedTotal)} currently protected
                  </span>
                </div>
              </div>
              <Link href="/risk">
                <Button variant="secondary" size="sm">
                  Open Risk Radar
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            </div>
          </section>

          <Panel className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan" />
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">
                    Guardian checks
                  </h2>
                  <p className="text-[10px] text-muted">
                    Toggle what runs before a payment is created.
                  </p>
                </div>
              </div>
              <span className="text-[9.5px] text-muted-dim">Demo controls</span>
            </div>
            <div className="divide-y divide-line-soft">
              {guardians.map((guard) => {
                const on = settings[guard.id];
                return (
                  <div key={guard.id} className="flex items-start gap-3 px-4 py-3.5">
                    <span
                      className={cn(
                        'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border',
                        on
                          ? 'border-cyan/20 bg-cyan/[0.07] text-cyan'
                          : 'border-line bg-white/[0.02] text-muted'
                      )}
                    >
                      <guard.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] font-medium text-ink">
                          {guard.title}
                        </p>
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[8.5px] font-medium',
                            on
                              ? 'bg-green/12 text-green-soft'
                              : 'bg-white/[0.05] text-muted'
                          )}
                        >
                          {on ? 'On' : 'Off'}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                        {guard.description}
                      </p>
                      <p className="mt-1 text-[9px] text-muted-dim">
                        {guard.checked} checks · {guard.caught} question
                        {guard.caught === 1 ? '' : 's'} raised
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={on}
                      aria-label={`Toggle ${guard.title}`}
                      onClick={() => {
                        setSettings((current) => ({
                          ...current,
                          [guard.id]: !current[guard.id],
                        }));
                        pushToast(
                          on ? 'Check turned off' : 'Check turned on',
                          {
                            description: guard.title,
                            tone: 'info',
                          }
                        );
                      }}
                      className={cn(
                        'relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors',
                        on ? 'bg-cyan/80' : 'bg-white/[0.1]'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                          on ? 'translate-x-[18px]' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between px-4 pt-4">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-amber" />
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">
                    Needs your attention
                  </h2>
                  <p className="text-[10px] text-muted">
                    Guardian questions, not verdicts.
                  </p>
                </div>
              </div>
              <Link
                href="/risk"
                className="text-[10px] font-medium text-cyan hover:text-cyan-soft"
              >
                All signals
              </Link>
            </div>
            <div className="mt-2 divide-y divide-line-soft">
              {openAlerts.slice(0, 3).map((alert) => {
                const person = transactions.find(
                  (tx) => tx.id === alert.transactionId
                );
                return (
                  <div key={alert.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[11.5px] font-medium text-ink">
                            {alert.title}
                          </p>
                          <StatusPill
                            tone={alert.severity === 'high' ? 'red' : 'amber'}
                          >
                            {alert.severity === 'high' ? 'High' : 'Medium'}
                          </StatusPill>
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {alert.amountLabel} · {alert.timeLabel}
                        </p>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted">
                          {alert.suggestion}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {alert.transactionId && (
                          <Link href={`/transactions/${alert.transactionId}`}>
                            <Button variant="secondary" size="xs">
                              Review
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Mark reviewed"
                          onClick={() => updateAlertStatus(alert.id, 'reviewed')}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    {person && (
                      <div className="mt-2 flex items-center gap-2 text-[9.5px] text-muted-dim">
                        <PersonAvatar
                          person={demoPeople[person.counterpartyId]}
                          size="xs"
                        />
                        {person.title} · {person.id}
                      </div>
                    )}
                  </div>
                );
              })}
              {openAlerts.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <CheckCircle2 className="mx-auto h-5 w-5 text-green-soft" />
                  <p className="mt-2 text-[11.5px] font-medium text-ink">
                    Nothing needs a check
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    Guardian will speak up when a new pattern appears.
                  </p>
                </div>
              )}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              What Guardian watched
            </h2>
            <div className="mt-2.5 space-y-2.5">
              {[
                ['Payment context', 'Amount, purpose and note', true],
                ['Recipient history', 'Verified payouts and changes', true],
                ['Conversation signals', 'Wording that conflicts with terms', true],
                ['Link destination', 'Named record before payment', true],
                ['Device and session', 'New login or unusual location', false],
              ].map(([title, body, done]) => (
                <div key={title as string} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                      done
                        ? 'border-green/25 bg-green/[0.08] text-green-soft'
                        : 'border-line bg-white/[0.02] text-muted-dim'
                    )}
                  >
                    {done ? (
                      <Check className="h-2.5 w-2.5" />
                    ) : (
                      <Lock className="h-2 w-2" />
                    )}
                  </span>
                  <div>
                    <p className="text-[10.5px] font-medium text-ink-soft">
                      {title as string}
                    </p>
                    <p className="text-[9.5px] leading-relaxed text-muted">
                      {body as string}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Clock3 className="h-3.5 w-3.5 text-cyan" />
              Recent checks
            </h2>
            <div className="mt-2.5 space-y-2">
              {[
                ['Logo design · ₹18,000 to Rahul', 'Passed · 10:42', 'green'],
                ['Sunrise Print · ₹42,000', 'Question raised · 10:42', 'amber'],
                ['May retainer · ₹45,000 to Priya', 'Passed · 09:18', 'green'],
                ['Tutoring · ₹6,000 to Ananya', 'Passed · yesterday', 'green'],
              ].map(([title, note, tone]) => (
                <div key={title} className="flex items-start gap-2">
                  <span
                    className={cn(
                      'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                      tone === 'green' ? 'bg-green' : 'bg-amber'
                    )}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[10.5px] text-ink-soft">
                      {title}
                    </p>
                    <p className="text-[9px] text-muted-dim">{note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <InfoBanner
            tone="info"
            icon={<AlertTriangle className="h-4 w-4 text-cyan" />}
          >
            <span className="font-medium text-ink-soft">No silent blocks.</span>{' '}
            Every Guardian question appears in the record with the reason and a
            suggested way to verify. You can dismiss it with a note.
          </InfoBanner>

          <Link href="/settings" className="block">
            <Panel className="flex items-center gap-3 p-4 transition-colors hover:bg-panel-hover">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white/[0.03] text-muted">
                <Lock className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] font-semibold text-ink">
                  Security &amp; privacy
                </p>
                <p className="text-[9.5px] text-muted">
                  Sessions, device access and data controls
                </p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-dim" />
            </Panel>
          </Link>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
        <ShieldCheck className="h-3 w-3" />
        Demo protection layer · no real account, card or payout is monitored
      </p>
    </div>
  );
}
