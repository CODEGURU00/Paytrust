'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Flag,
  Link2,
  Lock,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea, TextInput } from '@/components/ui/form';
import { Progress } from '@/components/ui/charts';
import { formatINR } from '@/lib/demo/format';
import type { MilestoneItem } from '@/lib/demo/types';
import { cn } from '@/lib/utils';

export default function MilestonesPage() {
  const {
    project,
    demoPeople,
    confirmMilestone,
    addMilestone,
    pushToast,
  } = useDemo();
  const [confirmTarget, setConfirmTarget] = useState<MilestoneItem | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    detail: '',
    amount: '',
    dueLabel: '',
  });

  const person = demoPeople[project.counterpartyId];
  const remaining = project.total - project.paid;
  const progress = Math.round((project.paid / Math.max(project.total, 1)) * 100);
  const paidCount = project.milestones.filter((m) => m.status === 'paid').length;

  const handleConfirm = () => {
    if (!confirmTarget || !ack) return;
    setBusy(true);
    setTimeout(() => {
      confirmMilestone(confirmTarget.id);
      setBusy(false);
      setConfirmTarget(null);
      setAck(false);
    }, 950);
  };

  const steps = [
    { label: 'Deal created', note: '2 May', state: 'done' as const },
    { label: 'Terms approved', note: '2 May', state: 'done' as const },
    {
      label: 'Design milestone',
      note: project.milestones[0]?.status === 'paid' ? 'Paid 9 May' : 'Due 8 May',
      state: project.milestones[0]?.status === 'paid' ? ('done' as const) : ('current' as const),
    },
    {
      label: 'Development',
      note:
        project.milestones[1]?.status === 'paid'
          ? 'Paid just now'
          : project.milestones[1]?.status === 'awaiting'
            ? 'Awaiting your confirmation'
            : 'Not started',
      state:
        project.milestones[1]?.status === 'paid'
          ? ('done' as const)
          : project.milestones[1]?.status === 'awaiting'
            ? ('current' as const)
            : ('upcoming' as const),
    },
    {
      label: 'Final delivery',
      note: 'Due 28 May',
      state:
        project.milestones[1]?.status === 'paid'
          ? ('current' as const)
          : ('upcoming' as const),
    },
    { label: 'Launch & handover', note: 'After final payment', state: 'upcoming' as const },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Milestones"
        description={`${project.title} · agreement ${project.id}`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/evidence">
              <Button variant="secondary" size="sm">
                <FileText className="h-3.5 w-3.5" />
                Evidence
              </Button>
            </Link>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add milestone
            </Button>
          </div>
        }
      />

      {/* Project summary */}
      <section className="mb-4 overflow-hidden rounded-2xl border border-line bg-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <PersonAvatar person={person} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[16px] font-semibold text-ink">
                  {project.title}
                </h2>
                <StatusPill tone="cyan" dot>
                  Activated
                </StatusPill>
              </div>
              <p className="mt-0.5 text-[11.5px] text-muted">
                with {person.name} · {project.milestones.length} milestones ·{' '}
                {paidCount} paid
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-5">
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                Total
              </div>
              <div className="text-[15px] font-semibold text-ink">
                {formatINR(project.total)}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                Paid
              </div>
              <div className="text-[15px] font-semibold text-green-soft">
                {formatINR(project.paid)}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] uppercase tracking-wide text-muted-dim">
                Remaining
              </div>
              <div className="text-[15px] font-semibold text-ink">
                {formatINR(remaining)}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-line-soft px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-muted">
              {progress}% of the project value confirmed
            </span>
            <span className="text-muted-dim">
              Next: {project.milestones.find((m) => m.status !== 'paid')?.title || 'Complete'}
            </span>
          </div>
          <Progress
            value={progress}
            className="mt-1.5 h-1.5"
            fillClassName="bg-gradient-to-r from-cyan/70 to-cyan"
          />
        </div>
      </section>

      {/* Stepper */}
      <Panel className="mb-4 overflow-hidden">
        <div className="overflow-x-auto px-4 py-4 sm:px-5">
          <ol className="flex min-w-[720px] items-start">
            {steps.map((step, index) => (
              <li key={step.label} className="relative flex-1">
                {index < steps.length - 1 && (
                  <span
                    className={cn(
                      'absolute left-[14px] top-[7px] h-px w-[calc(100%-14px)]',
                      step.state === 'done' ? 'bg-green/40' : 'bg-line'
                    )}
                  />
                )}
                <div className="relative flex flex-col items-center px-1 text-center">
                  <span
                    className={cn(
                      'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[9px] font-semibold',
                      step.state === 'done'
                        ? 'border-green/50 bg-green/20 text-green-soft'
                        : step.state === 'current'
                          ? 'border-cyan/60 bg-[#081525] text-cyan'
                          : 'border-line-strong bg-panel text-muted-dim'
                    )}
                  >
                    {step.state === 'done' ? (
                      <Check className="h-3 w-3" />
                    ) : step.state === 'current' ? (
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-cyan" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      'mt-2 text-[10px] font-medium leading-tight',
                      step.state === 'upcoming' ? 'text-muted' : 'text-ink-soft'
                    )}
                  >
                    {step.label}
                  </span>
                  <span className="mt-0.5 text-[8.5px] text-muted-dim">
                    {step.note}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
        <div className="space-y-3">
          {project.milestones.map((milestone) => {
            const isAwaiting = milestone.status === 'awaiting';
            const isPaid = milestone.status === 'paid';
            return (
              <Panel
                key={milestone.id}
                className={cn(
                  'overflow-hidden',
                  isAwaiting && 'border-amber/25'
                )}
              >
                <div className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
                  <span
                    className={cn(
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[12px] font-semibold',
                      isPaid
                        ? 'border-green/25 bg-green/[0.08] text-green-soft'
                        : isAwaiting
                          ? 'border-amber/25 bg-amber/[0.08] text-amber'
                          : 'border-line bg-white/[0.025] text-muted'
                    )}
                  >
                    {isPaid ? <Check className="h-4 w-4" /> : milestone.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[13.5px] font-semibold text-ink">
                        {milestone.title}
                      </h3>
                      <StatusPill
                        tone={isPaid ? 'green' : isAwaiting ? 'amber' : 'muted'}
                        dot={isAwaiting}
                      >
                        {isPaid
                          ? 'Paid'
                          : isAwaiting
                            ? 'Awaiting confirmation'
                            : 'Not started'}
                      </StatusPill>
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-muted">
                      {milestone.detail}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-dim">
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {isPaid
                          ? milestone.paidOn
                          : milestone.status === 'not_started'
                            ? milestone.dueLabel
                            : 'Submitted 12 May'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Receipt className="h-3 w-3" />
                        {milestone.evidence.length} evidence file
                        {milestone.evidence.length === 1 ? '' : 's'}
                      </span>
                    </div>
                    {milestone.completionNote && (
                      <p
                        className={cn(
                          'mt-2 rounded-lg border px-2.5 py-1.5 text-[10px] leading-relaxed',
                          isAwaiting
                            ? 'border-amber/15 bg-amber/[0.04] text-amber-soft/85'
                            : 'border-line-soft bg-white/[0.02] text-muted'
                        )}
                      >
                        {milestone.completionNote}
                      </p>
                    )}
                    {milestone.evidence.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {milestone.evidence.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() =>
                              pushToast('Evidence opened (demo)', {
                                description: `${item.label} · ${item.meta || 'Attached file'}`,
                                tone: 'info',
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-line bg-white/[0.02] px-2 py-1 text-[9.5px] text-muted transition-colors hover:border-cyan/25 hover:text-cyan-soft"
                          >
                            {item.kind === 'url' ? (
                              <Link2 className="h-2.5 w-2.5" />
                            ) : (
                              <FileText className="h-2.5 w-2.5" />
                            )}
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <div className="text-right">
                      <div className="text-[15px] font-semibold text-ink">
                        {formatINR(milestone.amount)}
                      </div>
                      <div className="text-[9.5px] text-muted-dim">
                        {isPaid ? 'Released' : 'Protected'}
                      </div>
                    </div>
                    {isAwaiting && (
                      <Button
                        size="sm"
                        onClick={() => setConfirmTarget(milestone)}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Review &amp; pay
                      </Button>
                    )}
                    {isPaid && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() =>
                          pushToast('Receipt downloaded (demo)', {
                            description: `${milestone.title} payment receipt`,
                            tone: 'info',
                          })
                        }
                      >
                        <Receipt className="h-3 w-3" />
                        Receipt
                      </Button>
                    )}
                    {milestone.status === 'not_started' && (
                      <Button
                        variant="secondary"
                        size="xs"
                        onClick={() =>
                          pushToast('Milestone locked', {
                            description:
                              'This milestone unlocks when the previous one is confirmed.',
                            tone: 'info',
                          })
                        }
                      >
                        <Lock className="h-3 w-3" />
                        Locked
                      </Button>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}

          {project.milestones.length === 0 && (
            <Panel>
              <EmptyState
                icon={<Flag className="h-5 w-5" />}
                title="No milestones yet"
                description="Define the first milestone so both parties know what is being paid for."
                action={
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add milestone
                  </Button>
                }
              />
            </Panel>
          )}
        </div>

        <div className="space-y-4">
          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <h2 className="text-[12.5px] font-semibold text-ink">
                Milestone protection
              </h2>
            </div>
            <ul className="mt-2.5 space-y-2">
              {[
                'Each payment is tied to one deliverable.',
                'Funds stay protected until you confirm.',
                'Evidence and receipts stay with the record.',
                'A dispute pauses confirmation, not the conversation.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-soft/80" />
                  <span className="text-[10px] leading-relaxed text-muted">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
            <Link href="/deals/TX-48213" className="mt-3 block">
              <Button variant="secondary" size="sm" className="w-full">
                View the agreement
                <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <Clock3 className="h-3.5 w-3.5 text-cyan" />
                Milestone history
              </h2>
              <Link
                href="/audit"
                className="text-[10px] font-medium text-cyan hover:text-cyan-soft"
              >
                Full audit
              </Link>
            </div>
            <div className="mt-2.5 divide-y divide-line-soft">
              {project.history.map((event) => (
                <div key={event.id} className="flex items-start gap-2.5 px-4 py-2.5">
                  <span
                    className={cn(
                      'mt-1 h-1.5 w-1.5 shrink-0 rounded-full',
                      event.tone === 'green' ? 'bg-green' : 'bg-brand'
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10.5px] leading-relaxed text-ink-soft">
                      {event.label}
                    </p>
                    <p className="text-[9px] text-muted-dim">{event.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-3.5 w-3.5 text-amber" />
              <h2 className="text-[11.5px] font-semibold text-ink">
                Cash-flow note
              </h2>
            </div>
            <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
              If Development is confirmed today, the remaining balance drops to{' '}
              <span className="font-medium text-ink-soft">
                {formatINR(remaining - (project.milestones.find((m) => m.status === 'awaiting')?.amount || 0))}
              </span>{' '}
              and Final delivery stays protected.
            </p>
          </Panel>
        </div>
      </div>

      {/* Confirm milestone modal */}
      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (!busy) {
            setConfirmTarget(null);
            setAck(false);
          }
        }}
        title="Confirm milestone completion"
        description="Release the protected amount for this milestone (simulated)."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmTarget(null)}
              disabled={busy}
            >
              Not yet
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              isLoading={busy}
              disabled={!ack}
            >
              Confirm &amp; pay {confirmTarget ? formatINR(confirmTarget.amount) : ''}
            </Button>
          </div>
        }
      >
        {confirmTarget && (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-white/[0.025] p-3.5">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted">Milestone</span>
                <span className="font-medium text-ink">{confirmTarget.title}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted">Amount</span>
                <span className="font-semibold text-ink">
                  {formatINR(confirmTarget.amount)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted">Recipient</span>
                <span className="text-ink-soft">{person.name}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted">Evidence</span>
                <span className="text-ink-soft">
                  {confirmTarget.evidence.length} file
                  {confirmTarget.evidence.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
            {confirmTarget.evidence.length > 0 && (
              <div className="space-y-1.5">
                {confirmTarget.evidence.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-1.5 text-[10.5px] text-ink-soft"
                  >
                    <FileText className="h-3 w-3 shrink-0 text-cyan" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    <span className="shrink-0 text-[9px] text-muted-dim">
                      {item.meta}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] p-3">
              <input
                type="checkbox"
                checked={ack}
                onChange={(event) => setAck(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-cyan"
              />
              <span className="text-[11px] leading-relaxed text-muted">
                I reviewed the evidence and confirm this milestone is complete. I
                understand the payment is simulated and cannot be reversed in the
                demo.
              </span>
            </label>
          </div>
        )}
      </Modal>

      {/* Add milestone modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a milestone"
        description="Both parties will see the new milestone and its amount."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                addMilestone({
                  title: form.title,
                  detail: form.detail,
                  amount: Number(form.amount) || 0,
                  dueLabel: form.dueLabel,
                });
                setForm({ title: '', detail: '', amount: '', dueLabel: '' });
                setAddOpen(false);
              }}
              disabled={!form.title.trim() || !form.amount}
            >
              Add milestone
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="ms-title">Title</FieldLabel>
            <TextInput
              id="ms-title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Content migration"
            />
          </div>
          <div>
            <FieldLabel htmlFor="ms-detail">Deliverable</FieldLabel>
            <TextArea
              id="ms-detail"
              rows={2}
              value={form.detail}
              onChange={(event) => setForm({ ...form, detail: event.target.value })}
              placeholder="What exactly will be delivered?"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="ms-amount">Amount (INR)</FieldLabel>
              <TextInput
                id="ms-amount"
                type="number"
                min="0"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder="10000"
              />
            </div>
            <div>
              <FieldLabel htmlFor="ms-due">Due date</FieldLabel>
              <TextInput
                id="ms-due"
                value={form.dueLabel}
                onChange={(event) =>
                  setForm({ ...form, dueLabel: event.target.value })
                }
                placeholder="e.g. 30 May"
              />
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" />
            Adding a milestone changes the project total. The other party will be
            asked to acknowledge it before work begins.
          </p>
        </div>
      </Modal>
    </div>
  );
}
