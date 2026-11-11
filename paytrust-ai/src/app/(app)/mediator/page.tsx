'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Flag,
  Gavel,
  Layers,
  Lock,
  MessageCircle,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import {
  PageHeader,
  Panel,
  InfoBanner,
  EmptyState,
} from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

interface SummarySection {
  title: string;
  body: string;
}

const generatedSummary: SummarySection[] = [
  {
    title: 'What both accounts agree on',
    body:
      'A camera rental was booked for ₹12,000 with a ₹4,000 protected deposit. The kit was collected in person and both parties agree the equipment was returned. Both accounts also agree that a lens hood was missing from the returned bag.',
  },
  {
    title: 'Where the accounts differ',
    body:
      'Arjun states the pickup was on 12 May at 18:00 and that the bag was complete at handover. Karan states the pickup was on 11 May at 19:30 and that the lens hood was already missing at pickup. The two accounts differ on the date and on when the missing item was last seen.',
  },
  {
    title: 'What the record can verify',
    body:
      'The chat contains a 11 May message from Karan proposing pickup “tomorrow evening”. A receipt for the deposit is timestamped 11 May 19:42. Two images were uploaded on 13 May, one showing the returned bag. No photo of the open bag at pickup exists in the record.',
  },
  {
    title: 'What remains unknown',
    body:
      'There is no timestamped handover checklist, no photo of the lens hood at pickup, and no independent witness message. The record cannot establish when the item was last present.',
  },
];

const options = [
  {
    title: 'Split the deposit',
    body: 'Return ₹2,000 of the ₹4,000 deposit and close the dispute by agreement.',
    tone: 'cyan',
  },
  {
    title: 'Wait for more evidence',
    body: 'Keep funds where they are and invite either party to add evidence.',
    tone: 'amber',
  },
  {
    title: 'Ask a human reviewer',
    body: 'Escalate the organized record to the PayTrust trust team.',
    tone: 'violet',
  },
];

export default function MediatorPage() {
  const { transactions, demoPeople, evidence, raiseDispute, pushToast } =
    useDemo();
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [humanRequested, setHumanRequested] = useState(false);

  const transaction = useMemo(
    () =>
      transactions.find((tx) => tx.id === 'TX-48122') ||
      transactions.find((tx) => tx.status === 'disputed'),
    [transactions]
  );

  const person = transaction
    ? demoPeople[transaction.counterpartyId]
    : demoPeople.karan;
  const txEvidence = evidence.filter(
    (item) => item.transactionId === transaction?.id
  );

  const generate = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setGenerated(true);
      pushToast('Neutral summary generated (demo)', {
        description:
          'Both accounts were organized side by side. No finding of fault was made.',
        tone: 'success',
      });
    }, 1100);
  };

  if (!transaction) {
    return (
      <div>
        <PageHeader
          eyebrow="AI intelligence"
          title="AI Mediator"
          description="A neutral space for two accounts of the same event."
        />
        <Panel>
          <EmptyState
            icon={<Scale className="h-5 w-5" />}
            title="No open dispute"
            description="When a record is disputed, both accounts and the evidence can be organized here."
            action={
              <Link href="/transactions">
                <Button variant="secondary" size="sm">
                  Open transactions
                </Button>
              </Link>
            }
          />
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="AI intelligence"
        title="AI Mediator"
        description="Both accounts, one structure. PayTrust never decides who is right."
        action={
          <div className="flex items-center gap-2">
            {transaction && (
              <Link href={`/transactions/${transaction.id}`}>
                <Button variant="secondary" size="sm">
                  Open record
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            )}
            <Button size="sm" onClick={generate} isLoading={busy}>
              <Sparkles className="h-3.5 w-3.5" />
              {generated ? 'Regenerate summary' : 'Generate summary'}
            </Button>
          </div>
        }
      />

      <InfoBanner
        tone="info"
        icon={<Scale className="h-4 w-4 text-cyan" />}
        className="mb-5"
      >
        <span className="font-medium text-ink-soft">Neutral by design.</span>{' '}
        The mediator organizes what each person said and what the record can
        verify. It does not assign fault, score credibility or move funds. A
        human makes the final decision.
      </InfoBanner>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(310px,1fr)]">
        <div className="space-y-4">
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-line-soft px-4 py-3.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-red/20 bg-red/[0.07] text-red-soft">
                <Flag className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[14px] font-semibold text-ink">
                    {transaction.title}
                  </h2>
                  <StatusPill tone="red" dot pulse>
                    Disputed
                  </StatusPill>
                  <span className="text-[9.5px] text-muted-dim">
                    {transaction.id}
                  </span>
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {formatINR(transaction.amount)} · {transaction.created} ·{' '}
                  {txEvidence.length} evidence files
                </p>
              </div>
              <StatusPill tone="amber">
                Funds unchanged · protected
              </StatusPill>
            </div>

            <div className="grid gap-px bg-line-soft sm:grid-cols-2">
              <div className="bg-panel p-4">
                <div className="flex items-center gap-2">
                  <PersonAvatar person={demoPeople.arjun} size="sm" />
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink">
                      Your account
                    </p>
                    <p className="text-[9px] text-muted">Arjun Sharma · 13 May</p>
                  </div>
                </div>
                <p className="mt-2.5 rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-soft">
                  {transaction.dispute?.claimB ||
                    'You stated the handover was complete and the bag was returned without the lens hood.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Handover on 12 May', 'Bag complete at pickup', 'Returned 13 May'].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line bg-white/[0.02] px-1.5 py-0.5 text-[8.5px] text-muted"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
              <div className="bg-panel p-4">
                <div className="flex items-center gap-2">
                  <PersonAvatar person={person} size="sm" />
                  <div>
                    <p className="text-[11.5px] font-semibold text-ink">
                      {person.name}&apos;s account
                    </p>
                    <p className="text-[9px] text-muted">
                      {person.name} · 13 May
                    </p>
                  </div>
                </div>
                <p className="mt-2.5 rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-relaxed text-ink-soft">
                  {transaction.dispute?.claimA ||
                    'The other party stated the item was already missing at pickup.'}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Pickup on 11 May', 'Item missing at pickup', 'Deposit withheld'].map(
                    (tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line bg-white/[0.02] px-1.5 py-0.5 text-[8.5px] text-muted"
                      >
                        {tag}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line-soft px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan" />
                <div>
                  <h2 className="text-[13px] font-semibold text-ink">
                    Neutral summary
                  </h2>
                  <p className="text-[10px] text-muted">
                    Generated from this record only · advisory
                  </p>
                </div>
              </div>
              <StatusPill tone="cyan">Draft · not a finding</StatusPill>
            </div>

            {busy ? (
              <div className="space-y-3 px-4 py-5">
                {[0, 1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-lg border border-line-soft bg-white/[0.02] px-3 py-3"
                  >
                    <div className="h-2.5 w-40 rounded bg-white/[0.07]" />
                    <div className="mt-2 h-2 w-full rounded bg-white/[0.04]" />
                    <div className="mt-1.5 h-2 w-4/5 rounded bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            ) : generated ? (
              <div className="divide-y divide-line-soft">
                {generatedSummary.map((section, index) => (
                  <div key={section.title} className="flex gap-3 px-4 py-3.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan/[0.08] text-[9px] font-semibold text-cyan">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-[11.5px] font-semibold text-ink">
                        {section.title}
                      </h3>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                        {section.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-10 text-center">
                <Sparkles className="mx-auto h-6 w-6 text-cyan" />
                <p className="mt-2 text-[12px] font-medium text-ink">
                  No summary yet
                </p>
                <p className="mt-1 max-w-sm text-[10.5px] leading-relaxed text-muted">
                  Generate a neutral summary that compares both accounts with the
                  evidence already in the record.
                </p>
                <Button size="sm" className="mt-3" onClick={generate}>
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate summary
                </Button>
              </div>
            )}

            {generated && !busy && (
              <div className="border-t border-line-soft px-4 py-2.5">
                <p className="flex items-start gap-1.5 text-[9px] leading-relaxed text-muted-dim">
                  <Eye className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  Both parties see this exact summary. Editing it creates a new
                  version with a timestamp; the previous version stays in the
                  audit trail.
                </p>
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
              <Layers className="h-4 w-4 text-cyan" />
              <div>
                <h2 className="text-[13px] font-semibold text-ink">
                  Evidence both parties can see
                </h2>
                <p className="text-[10px] text-muted">
                  {txEvidence.length} files · timestamped · cannot be edited
                </p>
              </div>
            </div>
            <div className="divide-y divide-line-soft">
              {txEvidence.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-soft text-cyan">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] text-ink-soft">
                      {item.name}
                    </p>
                    <p className="text-[9px] text-muted-dim">
                      {item.uploadedBy} · {item.dateLabel} · {item.sizeLabel}
                    </p>
                  </div>
                  <span className="rounded-full border border-green/15 bg-green/[0.05] px-1.5 py-0.5 text-[8.5px] text-green-soft">
                    In record
                  </span>
                </div>
              ))}
              {txEvidence.length === 0 && (
                <p className="px-4 py-6 text-center text-[10.5px] text-muted">
                  No evidence attached to this record yet.
                </p>
              )}
            </div>
            <div className="border-t border-line-soft px-4 py-2.5">
              <Link
                href="/evidence"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan"
              >
                Open Evidence Vault <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Gavel className="h-3.5 w-3.5 text-cyan" />
              Possible next steps
            </h2>
            <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
              These are options, not recommendations. Both parties still have to
              agree, or a human reviewer decides.
            </p>
            <div className="mt-2.5 space-y-2">
              {options.map((option) => {
                const selected = selectedOption === option.title;
                return (
                  <button
                    key={option.title}
                    type="button"
                    onClick={() => setSelectedOption(option.title)}
                    className={cn(
                      'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                      selected
                        ? 'border-cyan/35 bg-cyan/[0.05]'
                        : 'border-line bg-white/[0.015] hover:border-line-strong'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-ink">
                        {option.title}
                      </span>
                      <span
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded-full border',
                          selected
                            ? 'border-cyan bg-cyan text-[#05131b]'
                            : 'border-line-strong text-transparent'
                        )}
                      >
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    </div>
                    <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">
                      {option.body}
                    </p>
                  </button>
                );
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2.5 w-full"
              disabled={!selectedOption}
              onClick={() => {
                pushToast('Option shared with both parties (demo)', {
                  description:
                    'Both parties must accept before funds can change state. Nothing moved.',
                  tone: 'info',
                });
              }}
            >
              <Users className="h-3.5 w-3.5" />
              Share this option
            </Button>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <Wallet className="h-3.5 w-3.5 text-amber" />
              Funds are unchanged
            </h2>
            <div className="mt-2 space-y-1.5 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted">Record value</span>
                <span className="font-medium text-ink-soft">
                  {formatINR(transaction.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Deposit held</span>
                <span className="font-medium text-ink-soft">
                  {formatINR(transaction.held || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Released</span>
                <span className="font-medium text-green-soft">
                  {formatINR(transaction.released || 0)}
                </span>
              </div>
            </div>
            <p className="mt-2 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2 text-[9px] leading-relaxed text-muted">
              Opening a dispute or generating a summary never freezes or moves
              money. A release requires an explicit action by the payer.
            </p>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <Clock3 className="h-3.5 w-3.5 text-cyan" />
              Review timeline
            </h2>
            <ol className="relative mt-2.5 space-y-3">
              <span className="absolute bottom-1.5 left-[4px] top-1.5 w-px bg-line" />
              {[
                ['Dispute opened', '13 May · 10:12', 'done'],
                ['Both accounts added', '13 May · 14:40', 'done'],
                ['Evidence linked', '13 May · 15:05', 'done'],
                ['Neutral summary', '13 May · 15:20', 'current'],
                ['Human review (if requested)', 'Next step', 'upcoming'],
              ].map(([label, date, state]) => (
                <li key={label} className="relative flex gap-2.5">
                  <span
                    className={cn(
                      'relative z-10 mt-0.5 h-[9px] w-[9px] shrink-0 rounded-full border-2',
                      state === 'done'
                        ? 'border-green/50 bg-green'
                        : state === 'current'
                          ? 'border-cyan/50 bg-cyan'
                          : 'border-line-strong bg-panel'
                    )}
                  />
                  <div className="-mt-0.5">
                    <p
                      className={cn(
                        'text-[10px] font-medium',
                        state === 'upcoming' ? 'text-muted' : 'text-ink-soft'
                      )}
                    >
                      {label}
                    </p>
                    <p className="text-[8.5px] text-muted-dim">{date}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <div className="rounded-xl border border-violet/20 bg-violet/[0.035] p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <Scale className="h-3.5 w-3.5 text-violet" />
              Want a person to decide?
            </h2>
            <p className="mt-1 text-[9.5px] leading-relaxed text-muted">
              Request a human review. A trust specialist reads the same summary and
              evidence, and may ask both parties questions.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-2.5 w-full"
              disabled={humanRequested}
              onClick={() => {
                setHumanRequested(true);
                pushToast('Human review requested (demo)', {
                  description:
                    'The organized record is queued for the trust team. No decision has been made.',
                  tone: 'success',
                });
              }}
            >
              {humanRequested ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-soft" />
                  Review requested
                </>
              ) : (
                <>
                  <Users className="h-3.5 w-3.5" />
                  Request human review
                </>
              )}
            </Button>
          </div>

          <p className="flex items-start gap-1.5 px-1 text-[9px] leading-relaxed text-muted-dim">
            <Lock className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            This mediator view is visible only to the two parties on the record
            and the PayTrust trust team. Demo data only.
          </p>
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
        <ShieldCheck className="h-3 w-3" />
        AI Mediator organizes facts; it does not arbitrate, score or enforce
      </p>
    </div>
  );
}
