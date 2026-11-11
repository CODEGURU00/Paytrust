'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  HelpCircle,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Upload,
  UserRound,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { Button } from '@/components/ui/button';
import { FieldLabel, Select, TextArea } from '@/components/ui/form';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Why was my account suspended?',
    answer:
      'A recent payout pattern matched our security review rules. That is a signal, not a verdict: we pause payouts while a person reviews the evidence. Your existing records and messages stay available.',
  },
  {
    question: 'Can I still receive money?',
    answer:
      'Incoming payments are still recorded, but they stay protected and cannot be released until the review closes. No funds are removed from your balance during this time.',
  },
  {
    question: 'What happens after I appeal?',
    answer:
      'A support specialist reads your appeal, the transaction record and any attached evidence. Most appeals receive a first response within one business day. You can add more context at any time.',
  },
  {
    question: 'Will my clients see that I am suspended?',
    answer:
      'No. Your public Trust Passport does not show account status. Active counterparties can still message you; only new payout requests are paused.',
  },
  {
    question: 'What if I need money urgently?',
    answer:
      'You can request a priority review in the appeal form. Priority does not skip the review, but it places the case in the next available queue.',
  },
];

export default function SupportPage() {
  const { pushToast, demoPeople } = useDemo();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [reason, setReason] = useState('payout-review');
  const [details, setDetails] = useState('');
  const [priority, setPriority] = useState(false);
  const [attachment, setAttachment] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setSubmitted(true);
      pushToast('Appeal submitted (demo)', {
        description:
          'Case PTC-98421 is queued for a support specialist. Nothing was sent for real.',
        tone: 'success',
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-[#060b16]/92 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="Back to dashboard"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber/20 bg-amber/[0.08] text-amber">
              <ShieldAlert className="h-4 w-4" />
            </span>
            <div>
              <h1 className="text-[15px] font-semibold text-ink">Support center</h1>
              <p className="text-[10.5px] text-muted">Case PTC-98421 · demo</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <StatusPill tone="amber" dot pulse>
              Account limited
            </StatusPill>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                Back to app
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-4 py-5 sm:px-6">
        {/* Suspended banner */}
        <section className="relative overflow-hidden rounded-2xl border border-red/25 bg-[#1a0d12]">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(80% 150% at 0% 0%, rgba(242,109,125,0.16) 0%, transparent 55%)',
            }}
          />
          <div className="relative flex flex-wrap items-start gap-4 p-5 sm:p-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red/25 bg-red/[0.1] text-red-soft">
              <Lock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-semibold tracking-[-0.015em] text-ink">
                  Payouts are paused while we review your account
                </h2>
                <StatusPill tone={submitted ? 'cyan' : 'red'} dot>
                  {submitted ? 'Appeal received' : 'Action needed'}
                </StatusPill>
              </div>
              <p className="mt-1.5 max-w-2xl text-[12.5px] leading-relaxed text-ink-soft/80">
                {submitted
                  ? 'Your context is now with the Trust & Safety team. Payouts stay paused until a person completes the review.'
                  : 'A payout pattern on 8 November matched our security review rules. Your balance, conversations and records are unchanged. You can appeal and add context below.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[10.5px] text-muted">
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  Case opened 8 Nov, 09:14
                </span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-cyan" />
                  First review due within 1 business day
                </span>
                <span className="inline-flex items-center gap-1">
                  <UserRound className="h-3 w-3" />
                  Assigned to Trust &amp; Safety
                </span>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,1fr)]">
          <div className="space-y-4">
            {/* Case progress */}
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex items-center justify-between px-4 pt-4">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">
                    Case status
                  </h2>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    PTC-98421 · payout review
                  </p>
                </div>
                <StatusPill tone={submitted ? 'green' : 'amber'}>
                  {submitted ? 'In review' : 'Awaiting your appeal'}
                </StatusPill>
              </div>
              <div className="px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      title: 'Review opened',
                      date: '8 Nov · 09:14',
                      state: 'done',
                      note: 'Payouts paused',
                    },
                    {
                      title: 'Your appeal',
                      date: submitted ? 'Submitted just now' : 'Waiting on you',
                      state: submitted ? 'done' : 'current',
                      note: submitted ? 'Appeal received' : 'Add context below',
                    },
                    {
                      title: 'Human review',
                      date: 'Within 1 business day',
                      state: submitted ? 'current' : 'upcoming',
                      note: 'You can add more later',
                    },
                  ].map((step, index) => (
                    <div
                      key={step.title}
                      className={cn(
                        'relative rounded-xl border px-3 py-3',
                        step.state === 'current'
                          ? 'border-cyan/25 bg-cyan/[0.045]'
                          : step.state === 'done'
                            ? 'border-green/15 bg-green/[0.03]'
                            : 'border-line-soft bg-white/[0.015]'
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-full text-[9.5px] font-semibold',
                            step.state === 'done'
                              ? 'bg-green/15 text-green-soft'
                              : step.state === 'current'
                                ? 'bg-cyan/15 text-cyan'
                                : 'bg-white/[0.05] text-muted-dim'
                          )}
                        >
                          {step.state === 'done' ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <span className="text-[11px] font-medium text-ink">
                          {step.title}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] text-muted">{step.date}</p>
                      <p className="text-[9.5px] text-muted-dim">{step.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Appeal form */}
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3.5">
                <MessageCircle className="h-4 w-4 text-cyan" />
                <div>
                  <h2 className="text-[13.5px] font-semibold text-ink">
                    Appeal this review
                  </h2>
                  <p className="text-[10px] text-muted">
                    Explain the context. A person will read this.
                  </p>
                </div>
              </div>

              {submitted ? (
                <div className="flex flex-col items-center px-5 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full border border-green/25 bg-green/[0.08] text-green-soft">
                    <CheckCircle2 className="h-6 w-6" />
                  </span>
                  <h3 className="mt-3 text-[15px] font-semibold text-ink">
                    Appeal received
                  </h3>
                  <p className="mt-1 max-w-md text-[12px] leading-relaxed text-muted">
                    Your context was added to case PTC-98421. A support specialist
                    will review it within one business day. Payouts stay paused
                    until the review closes.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setSubmitted(false);
                        setDetails('');
                        setAttachment('');
                      }}
                    >
                      Add more context
                    </Button>
                    <Link href="/dashboard">
                      <Button size="sm">Back to dashboard</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 px-4 py-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <FieldLabel htmlFor="appeal-reason">Reason</FieldLabel>
                      <Select
                        id="appeal-reason"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      >
                        <option value="payout-review">
                          This payout was legitimate
                        </option>
                        <option value="account-change">
                          My payout account changed recently
                        </option>
                        <option value="client-request">
                          A client asked for a different payment path
                        </option>
                        <option value="other">Something else</option>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel htmlFor="appeal-case">Case reference</FieldLabel>
                      <div className="flex h-10 items-center rounded-lg border border-line bg-white/[0.02] px-3 text-[12px] text-muted">
                        PTC-98421 · payout review
                      </div>
                    </div>
                  </div>

                  <div>
                    <FieldLabel
                      htmlFor="appeal-details"
                      hint={`${details.length}/800`}
                    >
                      What happened?
                    </FieldLabel>
                    <TextArea
                      id="appeal-details"
                      rows={4}
                      maxLength={800}
                      value={details}
                      onChange={(event) => setDetails(event.target.value)}
                      placeholder="Include dates, the counterparty name, and why this payout is expected. Do not include passwords or full card numbers."
                    />
                  </div>

                  <div>
                    <FieldLabel>Supporting evidence</FieldLabel>
                    <button
                      type="button"
                      onClick={() => {
                        setAttachment('invoice-2210.pdf');
                        pushToast('Demo attachment added', {
                          description: 'invoice-2210.pdf is attached to this appeal.',
                          tone: 'info',
                        });
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-line-strong bg-white/[0.015] px-3 py-2.5 text-left transition-colors hover:border-cyan/30"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel-soft text-cyan">
                        {attachment ? (
                          <FileText className="h-3.5 w-3.5" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] text-ink-soft">
                          {attachment || 'Attach an invoice or context file'}
                        </span>
                        <span className="block text-[9.5px] text-muted-dim">
                          {attachment
                            ? 'PDF · attached · demo only'
                            : 'PDF, PNG or JPG · max 10 MB'}
                        </span>
                      </span>
                      <Paperclip className="h-3.5 w-3.5 text-muted" />
                    </button>
                  </div>

                  <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] p-3">
                    <input
                      type="checkbox"
                      checked={priority}
                      onChange={(event) => setPriority(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-cyan"
                    />
                    <span className="text-[10.5px] leading-relaxed text-muted">
                      Request a priority review. This does not skip the review;
                      it places the case in the next available queue.
                    </span>
                  </label>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3">
                    <p className="text-[9.5px] text-muted-dim">
                      Demo appeal · no data leaves this browser.
                    </p>
                    <Button
                      size="sm"
                      onClick={submit}
                      isLoading={busy}
                      disabled={!details.trim()}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Submit appeal
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <section className="rounded-2xl border border-line bg-panel">
              <div className="flex items-center gap-2 px-4 pt-4">
                <HelpCircle className="h-4 w-4 text-cyan" />
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">
                    Common questions
                  </h2>
                  <p className="text-[10px] text-muted">
                    Short answers, no legal language.
                  </p>
                </div>
              </div>
              <div className="mt-2 px-4 pb-2">
                {faqs.map((faq, index) => {
                  const open = openFaq === index;
                  return (
                    <div key={faq.question} className="border-b border-line-soft last:border-0">
                      <button
                        type="button"
                        onClick={() => setOpenFaq(open ? null : index)}
                        className="flex w-full items-center gap-2 py-3 text-left"
                        aria-expanded={open}
                      >
                        <span className="flex-1 text-[11.5px] font-medium text-ink-soft">
                          {faq.question}
                        </span>
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 shrink-0 text-muted transition-transform',
                            open && 'rotate-180'
                          )}
                        />
                      </button>
                      {open && (
                        <p className="pb-3 text-[10.5px] leading-relaxed text-muted">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <PersonAvatar person={demoPeople.support} size="sm" />
                <div>
                  <h2 className="text-[12px] font-semibold text-ink">
                    Talk to a human
                  </h2>
                  <p className="text-[9.5px] text-muted">Trust &amp; safety team</p>
                </div>
              </div>
              <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
                Support is available 9:00–21:00 IST, every day. Include your case
                reference so nothing gets lost.
              </p>
              <div className="mt-2.5 space-y-1.5">
                {[
                  { icon: Mail, label: 'support@paytrust.demo' },
                  { icon: Phone, label: '+91 80 4000 2210' },
                  { icon: MessageCircle, label: 'Live chat · usually under 5 min' },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2 text-[10.5px] text-ink-soft"
                  >
                    <row.icon className="h-3 w-3 text-cyan" />
                    {row.label}
                  </div>
                ))}
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2.5 w-full"
                onClick={() =>
                  pushToast('Demo chat opened', {
                    description:
                      'A support agent would join this conversation in production.',
                    tone: 'info',
                  })
                }
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Start live chat
              </Button>
            </section>

            <section className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-green-soft" />
                <h2 className="text-[12px] font-semibold text-ink">
                  What stays available
                </h2>
              </div>
              <ul className="mt-2.5 space-y-2">
                {[
                  'Your balance and past receipts',
                  'Conversations and Deal DNA',
                  'Evidence Vault downloads',
                  'Incoming messages from clients',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-1.5">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-soft/80" />
                    <span className="text-[10.5px] text-muted">{item}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/transactions"
                className="mt-2.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-cyan"
              >
                Open my records <ChevronRight className="h-3 w-3" />
              </Link>
            </section>
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
          <AlertTriangle className="h-3 w-3" />
          This is a demo suspension screen · no real account is restricted
        </p>
      </div>
    </div>
  );
}
