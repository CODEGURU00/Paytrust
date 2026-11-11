import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Dna,
  FileLock2,
  Fingerprint,
  Flag,
  Lock,
  MessageCircle,
  QrCode,
  Radar,
  Scale,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoLink } from '@/components/ui/logo';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { demoPeople } from '@/lib/demo/data';

const navLinks = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#trust', label: 'Trust' },
  { href: '/community', label: 'Community' },
];

const features = [
  {
    icon: Dna,
    title: 'Deal DNA',
    description:
      'Turn a conversation into a shared draft. PayTrust detects the amount, split, deadline and the gaps nobody mentioned.',
    tone: 'cyan',
  },
  {
    icon: MessageCircle,
    title: 'One record',
    description:
      'Chat, terms, promises, evidence and receipts stay linked to the same transaction — not scattered across apps.',
    tone: 'blue',
  },
  {
    icon: FileLock2,
    title: 'Evidence Vault',
    description:
      'Timestamped files that both parties can rely on. Nothing gets lost, nothing gets edited silently.',
    tone: 'violet',
  },
  {
    icon: Radar,
    title: 'Risk Radar',
    description:
      'Early signals when a recipient changes, a duplicate is likely, or a request feels unusual. Advice, never a verdict.',
    tone: 'amber',
  },
  {
    icon: BadgeCheck,
    title: 'Trust Passport',
    description:
      'A portable record of completed deals and kept promises. Built from outcomes, not followers or ratings.',
    tone: 'green',
  },
  {
    icon: Scale,
    title: 'Neutral mediation',
    description:
      'When accounts differ, organize both sides and the evidence side by side. PayTrust never decides fault for you.',
    tone: 'cyan',
  },
];

const steps = [
  {
    number: '01',
    title: 'Agree in conversation',
    description: 'Start a record and talk normally. The chat stays the source of truth.',
  },
  {
    number: '02',
    title: 'Let Deal DNA draft the terms',
    description:
      'Amounts, milestones and deadlines are detected. Missing conditions are highlighted for both sides.',
  },
  {
    number: '03',
    title: 'Approve together',
    description:
      'Terms become mutual only when both parties approve the same version. Every approval is timestamped.',
  },
  {
    number: '04',
    title: 'Release with evidence',
    description:
      'Funds stay protected until the agreed work is confirmed. A receipt lands in the record automatically.',
  },
];

const toneClasses: Record<string, string> = {
  cyan: 'border-cyan/20 bg-cyan/[0.07] text-cyan',
  blue: 'border-brand/25 bg-brand/[0.09] text-[#9fbbff]',
  violet: 'border-violet/20 bg-violet/[0.08] text-violet',
  amber: 'border-amber/20 bg-amber/[0.08] text-amber',
  green: 'border-green/20 bg-green/[0.08] text-green-soft',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-canvas">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-line-soft bg-[#060b16]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
          <LogoLink href="/" />
          <nav className="ml-6 hidden items-center gap-6 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12.5px] font-medium text-muted transition-colors hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/auth/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                Explore the demo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(80% 70% at 15% 0%, rgba(34,211,238,0.13) 0%, transparent 60%), radial-gradient(70% 80% at 85% 5%, rgba(76,125,255,0.17) 0%, transparent 60%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.25]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,173,214,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(148,173,214,0.09) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage:
              'radial-gradient(ellipse at 50% 0%, #000 10%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 pb-14 pt-14 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-20 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan/20 bg-cyan/[0.055] px-3 py-1 text-[10.5px] font-medium text-cyan-soft">
              <Sparkles className="h-3 w-3" />
              Trust-first payments for independent work
            </div>
            <h1 className="mt-5 max-w-2xl text-[40px] font-semibold leading-[1.05] tracking-[-0.04em] text-ink sm:text-[54px]">
              Money moves.
              <br />
              <span className="bg-gradient-to-r from-cyan via-[#7dd3fc] to-brand bg-clip-text text-transparent">
                Trust stays.
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-muted sm:text-[15px]">
              PayTrust turns every payment into one shared record: the
              conversation, the agreement, the promises, the evidence and the
              release. No screenshots. No &ldquo;I thought we agreed.&rdquo;
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Open the live demo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="#how">
                <Button size="lg" variant="secondary">
                  See how it works
                </Button>
              </Link>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[10.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-soft" />
                No card required
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-soft" />
                All payments simulated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-green-soft" />
                Works for freelancers and small teams
              </span>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <div className="flex -space-x-2">
                {['rahul', 'priya', 'vikram', 'ananya'].map((id) => (
                  <PersonAvatar key={id} person={demoPeople[id]} size="sm" ring />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1 text-amber">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-3 w-3 fill-current" />
                  ))}
                </div>
                <p className="text-[10px] text-muted">
                  Built with independent designers, developers and studios
                </p>
              </div>
            </div>
          </div>

          {/* Product mock */}
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-[32px] opacity-60 blur-2xl"
              style={{
                background:
                  'radial-gradient(60% 60% at 50% 40%, rgba(34,211,238,0.16) 0%, rgba(76,125,255,0.12) 45%, transparent 75%)',
              }}
            />
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.09] bg-[#08111f] shadow-2xl shadow-black/50">
              <div className="flex items-center gap-2 border-b border-line-soft px-3 py-2.5">
                <span className="h-2 w-2 rounded-full bg-red/70" />
                <span className="h-2 w-2 rounded-full bg-amber/70" />
                <span className="h-2 w-2 rounded-full bg-green/70" />
                <div className="ml-2 flex-1 rounded-md border border-line bg-[#060b16]/80 px-2 py-1 text-[9px] text-muted-dim">
                  app.paytrust.demo/transactions/TX-48213
                </div>
                <Lock className="h-3 w-3 text-muted-dim" />
              </div>
              <div className="p-3.5">
                <div className="flex items-center gap-2.5">
                  <PersonAvatar person={demoPeople.rahul} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11.5px] font-semibold text-ink">
                        Logo design
                      </span>
                      <ShieldCheck className="h-3 w-3 text-cyan" />
                    </div>
                    <div className="text-[9px] text-muted">
                      Rahul Mehta · TX-48213 · 14 messages
                    </div>
                  </div>
                  <span className="rounded-full border border-green/20 bg-green/[0.08] px-2 py-0.5 text-[8.5px] text-green-soft">
                    In progress
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-[1.2fr_1fr] gap-2.5">
                  <div className="space-y-2">
                    <div className="rounded-lg border border-line-soft bg-white/[0.018] p-2.5">
                      <div className="text-[8px] uppercase tracking-wider text-muted-dim">
                        Protected value
                      </div>
                      <div className="mt-1 text-[18px] font-semibold text-ink">
                        ₹18,000
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full w-1/2 rounded-full bg-cyan" />
                      </div>
                      <div className="mt-1 flex justify-between text-[7.5px] text-muted-dim">
                        <span>₹9,000 released</span>
                        <span>₹9,000 held</span>
                      </div>
                    </div>
                    <div className="rounded-lg border border-cyan/20 bg-cyan/[0.045] p-2.5">
                      <div className="flex items-center gap-1 text-[7.5px] font-semibold uppercase tracking-wider text-cyan">
                        <Sparkles className="h-2 w-2" />
                        Deal DNA
                      </div>
                      <p className="mt-1 text-[8.5px] leading-relaxed text-ink-soft/85">
                        Draft v2 · 2 missing conditions
                      </p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="h-3.5 w-3.5 rounded-full border border-amber/30 bg-amber/10" />
                        <span className="h-3.5 w-3.5 rounded-full border border-line bg-white/[0.03]" />
                        <span className="text-[7.5px] text-muted">
                          Awaiting both approvals
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      ['Rahul', '3 concepts by 14th evening.'],
                      ['You', 'Works. ₹18,000 total, half after…'],
                      ['AI', 'Detected 50% on concept approval.'],
                      ['Rahul', 'Concepts attached.'],
                    ].map(([author, text], index) => (
                      <div
                        key={index}
                        className={
                          author === 'You'
                            ? 'ml-3 rounded-lg bg-brand/80 px-2 py-1.5 text-right text-[8px] text-white'
                            : author === 'AI'
                              ? 'rounded-lg border border-cyan/15 bg-cyan/[0.04] px-2 py-1.5 text-[7.5px] text-ink-soft/80'
                              : 'rounded-lg border border-line bg-white/[0.025] px-2 py-1.5 text-[8px] text-ink-soft'
                        }
                      >
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2.5 flex items-center gap-1.5">
                  <div className="flex h-6 flex-1 items-center rounded-md border border-line bg-white/[0.02] px-2 text-[7.5px] text-muted-dim">
                    Message Rahul…
                  </div>
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-white">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 -left-3 hidden items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0b1424]/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-green/25 bg-green/[0.1] text-green-soft">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[9px] font-semibold text-ink">
                  Payment released
                </div>
                <div className="text-[8px] text-muted">Receipt added · simulated</div>
              </div>
            </div>
            <div className="absolute -right-2 -top-3 hidden items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0b1424]/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur sm:flex">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-amber/25 bg-amber/[0.1] text-amber">
                <Flag className="h-3.5 w-3.5" />
              </span>
              <div>
                <div className="text-[9px] font-semibold text-ink">
                  Cancellation gap found
                </div>
                <div className="text-[8px] text-muted">Suggested clause ready</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-line-soft bg-[#070d19]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 text-[10px] text-muted sm:px-6">
          <span className="font-medium uppercase tracking-[0.16em] text-muted-dim">
            Built for real work
          </span>
          {[
            'Freelance designers',
            'Development studios',
            'Consultants',
            'Print & production',
            'Tutoring',
          ].map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-cyan/60" />
              {item}
            </span>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan">
              The problem
            </span>
            <h2 className="mt-3 max-w-md text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              The money is not the only thing that gets lost.
            </h2>
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-muted">
              Terms live in one app, files in another, receipts in email and
              promises in someone&apos;s memory. When something goes wrong, nobody
              can reconstruct what was actually agreed.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: MessageCircle,
                title: 'Scattered context',
                body: 'The deal was agreed in chat, but the payment lives somewhere else entirely.',
              },
              {
                icon: FileLock2,
                title: 'Evidence with no home',
                body: 'Screenshots and files disappear into camera rolls and downloads.',
              },
              {
                icon: Wallet,
                title: 'Pressure to release',
                body: 'Clients and freelancers both feel exposed when the record is incomplete.',
              },
              {
                icon: Flag,
                title: 'Disputes without structure',
                body: 'Two accounts, no shared facts, and no neutral way to lay them side by side.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-line bg-panel p-4"
              >
                <card.icon className="h-4 w-4 text-muted" />
                <h3 className="mt-2.5 text-[12.5px] font-semibold text-ink">
                  {card.title}
                </h3>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line-soft bg-[#070d19]">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="max-w-2xl">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan">
              How it works
            </span>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              One record. Four honest steps.
            </h2>
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              PayTrust does not replace the conversation. It gives the
              conversation a memory — and gives both parties the same one.
            </p>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-xl border border-line bg-panel p-4"
              >
                <span className="text-[22px] font-semibold tracking-[-0.03em] text-white/[0.08]">
                  {step.number}
                </span>
                <h3 className="mt-1 text-[13px] font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan">
              The product
            </span>
            <h2 className="mt-3 text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              Everything the deal needs, in the deal.
            </h2>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-cyan hover:text-cyan-soft"
          >
            Try every feature in the demo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-xl border border-line bg-panel p-5 transition-colors hover:border-line-strong hover:bg-panel-hover"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-xl border ${toneClasses[feature.tone]}`}
              >
                <feature.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 text-[14px] font-semibold text-ink">
                {feature.title}
              </h3>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted">
                {feature.description}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-medium text-muted-dim transition-colors group-hover:text-cyan">
                Explore in demo <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section id="trust" className="border-y border-line-soft bg-[#070d19]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
          <div>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-cyan">
              Trust by design
            </span>
            <h2 className="mt-3 max-w-lg text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[34px]">
              AI helps you see clearly. It never decides for you.
            </h2>
            <p className="mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
              PayTrust is built around a simple rule: the person who moves the
              money makes the decision. Our job is to organize the facts, surface
              the gaps and keep the record honest.
            </p>
            <div className="mt-5 space-y-2.5">
              {[
                'No automatic freezes or reversed payments',
                'No hidden trust scores or public ratings',
                'Every AI summary is labeled as advisory',
                'Both parties see the same record',
                'Evidence is timestamped and access-controlled',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border border-green/25 bg-green/[0.08] text-green-soft">
                    <Check className="h-2.5 w-2.5" />
                  </span>
                  <span className="text-[11.5px] text-ink-soft/85">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              {
                icon: Fingerprint,
                title: 'Identity verification',
                body: 'Government ID checks, shown as a badge — never public documents.',
                tone: 'cyan',
              },
              {
                icon: Bot,
                title: 'AI with boundaries',
                body: 'Summaries cite the record. No verdicts, no invented facts.',
                tone: 'blue',
              },
              {
                icon: Scale,
                title: 'Neutral mediation',
                body: 'Both accounts, side by side. A human decides what happens next.',
                tone: 'violet',
              },
              {
                icon: QrCode,
                title: 'Safe handoffs',
                body: 'Scan once to open a record. Nothing is paid by scanning alone.',
                tone: 'green',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-line bg-panel p-4"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${toneClasses[card.tone]}`}
                >
                  <card.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-2.5 text-[12px] font-semibold text-ink">
                  {card.title}
                </h3>
                <p className="mt-1 text-[10px] leading-relaxed text-muted">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="relative overflow-hidden rounded-2xl border border-cyan/20 bg-[#081525] px-5 py-10 text-center sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(70% 120% at 50% 0%, rgba(34,211,238,0.16) 0%, transparent 60%), radial-gradient(60% 100% at 80% 100%, rgba(76,125,255,0.14) 0%, transparent 60%)',
            }}
          />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">
              Give your next deal a memory.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[13px] leading-relaxed text-muted">
              Explore the full product with a seeded workspace. Send, request,
              draft an agreement, release a milestone and open a dispute — all
              simulated, all reversible.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/dashboard">
                <Button size="lg">
                  Open the demo workspace
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary">
                  Create an account
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-[10px] text-muted-dim">
              Demo-first · no real funds move · clear labels everywhere
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line-soft bg-[#070d19]">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <LogoLink href="/" />
            <p className="mt-3 max-w-xs text-[10.5px] leading-relaxed text-muted">
              A trust-first transaction workspace for people who work together
              without a legal team on retainer.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/[0.02] px-2.5 py-1 text-[9.5px] text-muted">
              <ShieldCheck className="h-3 w-3 text-green-soft" />
              Demo environment · simulated payments
            </div>
          </div>
          {[
            {
              title: 'Product',
              links: [
                ['Dashboard', '/dashboard'],
                ['Transactions', '/transactions'],
                ['Deal DNA', '/deals'],
                ['Milestones', '/milestones'],
              ],
            },
            {
              title: 'Trust',
              links: [
                ['Trust Passport', '/trust'],
                ['Risk Radar', '/risk'],
                ['AI Mediator', '/mediator'],
                ['Audit timeline', '/audit'],
              ],
            },
            {
              title: 'Company',
              links: [
                ['Community', '/community'],
                ['Support', '/support'],
                ['Sign in', '/auth/login'],
                ['Create account', '/auth/signup'],
              ],
            },
          ].map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-dim">
                {group.title}
              </h3>
              <ul className="mt-2.5 space-y-1.5">
                {group.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="text-[10.5px] text-muted transition-colors hover:text-ink-soft"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-line-soft">
          <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[9.5px] text-muted-dim sm:px-6">
            <span>© 2026 PayTrust AI. Demo product for review.</span>
            <span className="flex items-center gap-3">
              <span>Privacy</span>
              <span>Terms</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" />
                No real funds
              </span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
