'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Award,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Copy,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  Flag,
  History,
  Link2,
  Lock,
  MessageCircle,
  Repeat2,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
  X,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { MiniBarChart } from '@/components/ui/charts';
import { cn } from '@/lib/utils';

const viewable = ['rahul', 'arjun'] as const;

export default function TrustPassportPage() {
  const { trustProfiles, demoPeople, privacy, updatePrivacy, pushToast } =
    useDemo();
  const [viewer, setViewer] = useState<(typeof viewable)[number]>('rahul');
  const [shareOpen, setShareOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const profile = trustProfiles[viewer];
  const person = demoPeople[viewer];
  const stats = profile?.stats;
  const isSelf = viewer === 'arjun';

  const trustScore = useMemo(() => {
    if (!stats) return 0;
    return Math.min(
      98,
      Math.round(
        62 +
          stats.completed * 0.6 +
          Number(stats.onTime.replace('%', '')) * 0.14 -
          stats.disputes * 4
      )
    );
  }, [stats]);

  if (!person || !stats) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Passport unavailable.
      </div>
    );
  }

  const share = async () => {
    const url = `${window.location.origin}/trust?u=${person.handle}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      pushToast('Passport link copied', {
        description: 'The shared view respects your privacy settings.',
      });
    } catch {
      pushToast('Could not copy the link', { tone: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line-soft bg-[#060b16]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[68px] w-full max-w-[1280px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10.5px] text-muted-dim">
              <Link href="/dashboard" className="hover:text-ink-soft">
                Dashboard
              </Link>
              <ChevronRight className="h-2.5 w-2.5" />
              Trust Passport
            </div>
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold text-ink">
                {person.name}
              </h1>
              {person.verified && <BadgeCheck className="h-3.5 w-3.5 text-cyan" />}
            </div>
          </div>

          <div className="hidden items-center gap-1 rounded-lg border border-line bg-white/[0.02] p-0.5 sm:flex">
            {viewable.map((id) => {
              const p = demoPeople[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewer(id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                    viewer === id
                      ? 'bg-white/[0.07] text-ink'
                      : 'text-muted hover:text-ink-soft'
                  )}
                >
                  <PersonAvatar person={p} size="xs" />
                  {p.name.split(' ')[0]}
                  {id === 'arjun' && (
                    <span className="text-[9px] text-muted-dim">You</span>
                  )}
                </button>
              );
            })}
          </div>

          <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Privacy settings"
            onClick={() => setPrivacyOpen(true)}
          >
            <Lock className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1280px] px-4 py-5 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="space-y-4">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-2xl border border-line bg-panel">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(100% 150% at 0% 0%, rgba(34,211,238,0.1) 0%, transparent 55%), radial-gradient(90% 140% at 100% 0%, rgba(76,125,255,0.13) 0%, transparent 55%)',
                }}
              />
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="relative">
                    <PersonAvatar person={person} size="2xl" ring />
                    {person.verified && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-panel bg-cyan text-[#05131b]">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
                        {person.name}
                      </h1>
                      {person.verified && (
                        <StatusPill tone="cyan" dot>
                          Identity verified
                        </StatusPill>
                      )}
                      {isSelf && <StatusPill tone="muted">Your passport</StatusPill>}
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-soft/80">
                      {person.role} · {person.location}
                    </p>
                    <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-muted">
                      {person.bio ||
                        'A portable record of completed deals, kept promises and mutual approvals.'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Fingerprint className="h-3 w-3 text-cyan" />
                        {stats.passportId}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        On PayTrust {stats.accountAge}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-green-soft" />
                        {stats.verifiedOn}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-center rounded-2xl border border-cyan/20 bg-[#081525] px-4 py-3">
                    <div className="relative flex h-16 w-16 items-center justify-center">
                      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                        <circle
                          cx="32"
                          cy="32"
                          r="27"
                          fill="none"
                          stroke="rgba(148,173,214,0.12)"
                          strokeWidth="5"
                        />
                        <circle
                          cx="32"
                          cy="32"
                          r="27"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeDasharray={`${(trustScore / 100) * 169.6} 169.6`}
                        />
                      </svg>
                      <span className="absolute text-[17px] font-semibold text-ink">
                        {trustScore}
                      </span>
                    </div>
                    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan">
                      Trust score
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  label: 'Completed deals',
                  value: `${stats.completed}`,
                  note: `of ${stats.total} started`,
                  icon: CheckCircle2,
                  tone: 'text-green-soft',
                },
                {
                  label: 'On time',
                  value: stats.onTime,
                  note: 'Delivery promises kept',
                  icon: CalendarClock,
                  tone: 'text-cyan',
                },
                {
                  label: 'Response time',
                  value: stats.responseTime,
                  note: 'Median first reply',
                  icon: MessageCircle,
                  tone: 'text-[#9fbbff]',
                },
                {
                  label: 'Repeat clients',
                  value: `${stats.repeatClients}`,
                  note: 'Chose to work again',
                  icon: Repeat2,
                  tone: 'text-violet',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-line bg-panel p-3.5"
                >
                  <div className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
                    <stat.icon className={cn('h-3 w-3', stat.tone)} />
                    {stat.label}
                  </div>
                  <div className="mt-1.5 text-[20px] font-semibold text-ink">
                    {stat.value}
                  </div>
                  <div className="text-[9.5px] text-muted">{stat.note}</div>
                </div>
              ))}
            </div>

            {/* History */}
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <div>
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <History className="h-4 w-4 text-cyan" />
                    Trust history
                  </h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    Monthly trust score movement · last 12 months
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-green/20 bg-green/[0.07] px-2 py-0.5 text-[10px] font-medium text-green-soft">
                  <TrendingUp className="h-3 w-3" />
                  +12 this month
                </span>
              </div>
              <div className="px-4 pb-4 pt-4">
                <MiniBarChart data={stats.history} height={150} />
              </div>
              <div className="grid grid-cols-2 gap-px border-t border-line-soft bg-line-soft sm:grid-cols-3">
                <div className="bg-panel px-4 py-3">
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                    Cancellations
                  </div>
                  <div className="mt-0.5 text-[12px] font-medium text-ink">
                    {stats.cancellations}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
                    {stats.cancellationNote}
                  </p>
                </div>
                <div className="bg-panel px-4 py-3">
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                    Disputes
                  </div>
                  <div className="mt-0.5 text-[12px] font-medium text-ink">
                    {stats.disputes}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
                    {stats.disputeNote}
                  </p>
                </div>
                <div className="col-span-2 bg-panel px-4 py-3 sm:col-span-1">
                  <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                    Evidence sharing
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[12px] font-medium text-ink">
                    {privacy.shareEvidence ? 'Opted in' : 'Private'}
                    {privacy.shareEvidence ? (
                      <Eye className="h-3 w-3 text-cyan" />
                    ) : (
                      <EyeOff className="h-3 w-3 text-muted" />
                    )}
                  </div>
                  <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
                    Evidence is never included by default.
                  </p>
                </div>
              </div>
            </section>

            {/* Milestones */}
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Award className="h-4 w-4 text-amber" />
                    Milestones
                  </h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    Earned from completed work, not followers or likes.
                  </p>
                </div>
                <span className="text-[10px] text-muted-dim">
                  {stats.milestones.filter((m) => m.state === 'done').length}/
                  {stats.milestones.length}
                </span>
              </div>
              <div className="px-4 py-4">
                <ol className="relative space-y-3">
                  <span className="absolute bottom-2 left-[5px] top-2 w-px bg-line" />
                  {stats.milestones.map((milestone) => (
                    <li key={milestone.label} className="relative flex gap-3">
                      <span
                        className={cn(
                          'relative z-10 mt-0.5 flex h-[11px] w-[11px] shrink-0 items-center justify-center rounded-full border-2',
                          milestone.state === 'done'
                            ? 'border-green/50 bg-green'
                            : milestone.state === 'current'
                              ? 'border-cyan/50 bg-cyan'
                              : 'border-line-strong bg-panel'
                        )}
                      />
                      <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2">
                        <p
                          className={cn(
                            'text-[11.5px]',
                            milestone.state === 'upcoming'
                              ? 'text-muted'
                              : 'text-ink-soft'
                          )}
                        >
                          {milestone.label}
                        </p>
                        <span className="shrink-0 text-[9.5px] text-muted-dim">
                          {milestone.date}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] p-4">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 120% at 100% 0%, rgba(34,211,238,0.13) 0%, transparent 55%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-cyan">
                  <Sparkles className="h-3.5 w-3.5" />
                  What this passport proves
                </div>
                <ul className="mt-3 space-y-2.5">
                  {[
                    'Identity was checked with a government ID.',
                    'Every deal below was mutually approved.',
                    'Promises and evidence are timestamped.',
                    'Trust is computed from outcomes, never bought.',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
                      <span className="text-[10.5px] leading-relaxed text-ink-soft/85">
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-[9.5px] leading-relaxed text-muted">
                  PayTrust never ranks people by followers, spend or public
                  ratings. Only verified deal outcomes count.
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-panel">
              <div className="px-4 pt-4">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <ClipboardCheck className="h-4 w-4 text-cyan" />
                  Shared deal record
                </h2>
                <p className="mt-0.5 text-[10px] text-muted">
                  Defaults to the latest mutually approved record.
                </p>
              </div>
              <div className="px-4 py-3">
                <div className="rounded-xl border border-line-soft bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11.5px] font-medium text-ink">
                      Logo design
                    </span>
                    <StatusPill tone="amber">Draft v2</StatusPill>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    Arjun Sharma ↔ {person.name}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between text-[10px]">
                    <span className="text-muted">Deal value</span>
                    <span className="font-medium text-ink-soft">₹18,000</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-muted">Milestones</span>
                    <span className="font-medium text-ink-soft">1 of 2 paid</span>
                  </div>
                  <Link href="/deals/TX-48213" className="mt-2.5 block">
                    <Button variant="secondary" size="xs" className="w-full">
                      Open Deal DNA
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-panel px-4 py-4">
              <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                <Share2 className="h-3.5 w-3.5 text-cyan" />
                Share this passport
              </h2>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                The link shows only what the privacy settings allow. Changes are
                reflected immediately.
              </p>
              <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-line bg-white/[0.02] px-2.5 py-2">
                <Link2 className="h-3 w-3 shrink-0 text-muted" />
                <span className="min-w-0 flex-1 truncate text-[10px] text-muted">
                  paytrust.app/trust/{person.handle}
                </span>
                <button
                  type="button"
                  onClick={share}
                  aria-label="Copy passport link"
                  className="shrink-0 text-cyan hover:text-cyan-soft"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  className="flex-1"
                  onClick={share}
                >
                  <Copy className="h-3 w-3" />
                  Copy link
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  className="flex-1"
                  onClick={() =>
                    pushToast('Passport PDF queued (demo)', {
                      description:
                        'In production this generates a privacy-filtered PDF.',
                      tone: 'info',
                    })
                  }
                >
                  <Download className="h-3 w-3" />
                  PDF
                </Button>
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-panel px-4 py-4">
              <div className="flex items-center gap-2">
                <Flag className="h-3.5 w-3.5 text-amber" />
                <h2 className="text-[12px] font-semibold text-ink">
                  Something wrong?
                </h2>
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                You can report inaccurate information without affecting the
                other party&apos;s funds. Trust reviews are human-led.
              </p>
              <Button
                variant="outline"
                size="xs"
                className="mt-2.5 w-full"
                onClick={() =>
                  pushToast('Report started (demo)', {
                    description: 'A trust reviewer would follow up by email.',
                    tone: 'info',
                  })
                }
              >
                Report a concern
              </Button>
            </section>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
          <Lock className="h-3 w-3" />
          Passports are private by default · demo profile · no real identity data
        </p>
      </div>

      {/* Share modal */}
      <Modal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="Share this passport"
        description={`${person.name} controls what is visible.`}
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button size="sm" onClick={share}>
              <Copy className="h-3.5 w-3.5" />
              Copy public link
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-white/[0.025] p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-dim">
              Public link
            </div>
            <div className="mt-1 truncate text-[11.5px] text-ink-soft">
              paytrust.app/trust/{person.handle}
            </div>
          </div>
          <div className="space-y-2">
            {[
              ['Completed deals', privacy.showCompletedDeals, 'showCompletedDeals'],
              ['Milestones', privacy.showMilestones, 'showMilestones'],
              ['Response time', privacy.showResponseTime, 'showResponseTime'],
            ].map(([label, value, key]) => (
              <div
                key={label as string}
                className="flex items-center justify-between rounded-lg border border-line-soft bg-white/[0.015] px-3 py-2"
              >
                <span className="text-[11px] text-ink-soft">{label as string}</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[9.5px]',
                    value
                      ? 'bg-green/12 text-green-soft'
                      : 'bg-white/[0.05] text-muted'
                  )}
                >
                  {value ? 'Included' : 'Hidden'}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] leading-relaxed text-muted-dim">
            The shared view never includes private messages, receipts or the
            other party&apos;s evidence.
          </p>
        </div>
      </Modal>

      {/* Privacy modal */}
      <Modal
        open={privacyOpen}
        onClose={() => setPrivacyOpen(false)}
        title="Passport privacy"
        description="These preferences apply to the shared passport view."
        size="sm"
        footer={
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setPrivacyOpen(false)}>
              Done
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {(
            [
              ['showCompletedDeals', 'Show completed deal count'],
              ['showMilestones', 'Show earned milestones'],
              ['showResponseTime', 'Show response time'],
              ['showInCommunity', 'List me in the community'],
              ['shareEvidence', 'Attach evidence to shared records'],
            ] as const
          ).map(([key, label]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-line-soft bg-white/[0.015] px-3 py-2.5"
            >
              <span className="text-[11.5px] text-ink-soft">{label}</span>
              <button
                type="button"
                role="switch"
                aria-checked={privacy[key]}
                onClick={() => updatePrivacy({ [key]: !privacy[key] })}
                className={cn(
                  'relative h-5 w-9 rounded-full transition-colors',
                  privacy[key] ? 'bg-cyan/80' : 'bg-white/[0.1]'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                    privacy[key] ? 'translate-x-[18px]' : 'translate-x-0.5'
                  )}
                />
              </button>
            </label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
