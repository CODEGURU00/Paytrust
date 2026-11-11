'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  Plus,
  Repeat,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, Select, TextArea, TextInput } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

interface Subscription {
  id: string;
  title: string;
  counterpartyId: string;
  amount: number;
  cadence: 'weekly' | 'monthly' | 'quarterly';
  nextCharge: string;
  status: 'active' | 'paused' | 'ended';
  note: string;
  protectedAmount: number;
  charges: number;
}

const initialSubscriptions: Subscription[] = [
  {
    id: 'SUB-2210',
    title: 'Website maintenance retainer',
    counterpartyId: 'priya',
    amount: 45000,
    cadence: 'monthly',
    nextCharge: '1 Jun',
    status: 'active',
    note: 'Content updates, uptime checks and one landing page per month.',
    protectedAmount: 45000,
    charges: 6,
  },
  {
    id: 'SUB-2204',
    title: 'Brand design retainer',
    counterpartyId: 'rahul',
    amount: 18000,
    cadence: 'monthly',
    nextCharge: '14 Jun',
    status: 'active',
    note: 'Two design requests per month, source files on final payment.',
    protectedAmount: 18000,
    charges: 3,
  },
  {
    id: 'SUB-2187',
    title: 'Studio production support',
    counterpartyId: 'sunrise',
    amount: 12000,
    cadence: 'quarterly',
    nextCharge: 'Paused',
    status: 'paused',
    note: 'Print proofing and production coordination. Paused during the audit.',
    protectedAmount: 0,
    charges: 2,
  },
];

const cadenceLabel: Record<Subscription['cadence'], string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every quarter',
};

export default function SubscriptionsPage() {
  const { demoPeople, pushToast } = useDemo();
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions);
  const [createOpen, setCreateOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    counterpartyId: 'priya',
    amount: '',
    cadence: 'monthly',
    note: '',
  });

  const people = Object.values(demoPeople).filter(
    (person) => person.id !== 'arjun' && person.id !== 'support'
  );

  const active = subscriptions.filter((item) => item.status === 'active');
  const monthlyValue = active.reduce(
    (total, item) =>
      total +
      (item.cadence === 'monthly'
        ? item.amount
        : item.cadence === 'quarterly'
          ? item.amount / 3
          : item.amount * 4),
    0
  );

  const stats = useMemo(
    () => [
      {
        label: 'Active retainers',
        value: `${active.length}`,
        note: `${subscriptions.length} total`,
        icon: Repeat,
        tone: 'text-cyan',
      },
      {
        label: 'Monthly recurring',
        value: formatINR(Math.round(monthlyValue)),
        note: 'Approximate value',
        icon: Wallet,
        tone: 'text-green-soft',
      },
      {
        label: 'Next charge',
        value: '1 Jun',
        note: 'Website maintenance',
        icon: CalendarClock,
        tone: 'text-[#9fbbff]',
      },
      {
        label: 'Protected at charge',
        value: formatINR(
          active.reduce((total, item) => total + item.protectedAmount, 0)
        ),
        note: 'Released only by you',
        icon: ShieldCheck,
        tone: 'text-amber',
      },
    ],
    [active, monthlyValue, subscriptions.length]
  );

  const toggleStatus = (subscription: Subscription) => {
    setBusyId(subscription.id);
    setTimeout(() => {
      setSubscriptions((current) =>
        current.map((item) =>
          item.id === subscription.id
            ? {
                ...item,
                status: item.status === 'active' ? 'paused' : 'active',
                nextCharge:
                  item.status === 'active'
                    ? 'Paused'
                    : item.cadence === 'monthly'
                      ? '1 Jun'
                      : '14 Jun',
              }
            : item
        )
      );
      setBusyId(null);
      pushToast(
        subscription.status === 'active' ? 'Retainer paused' : 'Retainer resumed',
        {
          description:
            subscription.status === 'active'
              ? 'No charge will be requested until you resume it.'
              : 'The next charge will follow the retainer schedule.',
          tone: 'info',
        }
      );
    }, 500);
  };

  const cancel = (subscription: Subscription) => {
    setSubscriptions((current) =>
      current.filter((item) => item.id !== subscription.id)
    );
    pushToast('Retainer ended', {
      description:
        'The history stays in the linked records. No further charges will be requested.',
      tone: 'info',
    });
  };

  const create = () => {
    if (!form.title.trim() || !Number(form.amount)) return;
    const id = `SUB-${Math.floor(2300 + Math.random() * 90)}`;
    setSubscriptions((current) => [
      {
        id,
        title: form.title.trim(),
        counterpartyId: form.counterpartyId,
        amount: Number(form.amount),
        cadence: form.cadence as Subscription['cadence'],
        nextCharge: '1 Jun',
        status: 'active',
        note: form.note.trim() || 'No description added yet.',
        protectedAmount: Number(form.amount),
        charges: 0,
      },
      ...current,
    ]);
    setForm({
      title: '',
      counterpartyId: 'priya',
      amount: '',
      cadence: 'monthly',
      note: '',
    });
    setCreateOpen(false);
    pushToast('Recurring retainer created (demo)', {
      description:
        'Each future charge will stay protected until you confirm the work.',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Subscriptions"
        description="Recurring retainers with the same protection as one-off payments."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New retainer
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <Panel key={stat.label} className="p-3.5">
            <div className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
              <stat.icon className={cn('h-3 w-3', stat.tone)} />
              {stat.label}
            </div>
            <div className="mt-1.5 text-[19px] font-semibold text-ink">
              {stat.value}
            </div>
            <div className="text-[9.5px] text-muted">{stat.note}</div>
          </Panel>
        ))}
      </div>

      {subscriptions.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Repeat className="h-5 w-5" />}
            title="No recurring retainers"
            description="Set up a retainer so both sides know the cadence and the amount."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New retainer
              </Button>
            }
          />
        </Panel>
      ) : (
        <div className="space-y-3">
          {subscriptions.map((subscription) => {
            const person = demoPeople[subscription.counterpartyId];
            const isActive = subscription.status === 'active';
            return (
              <Panel key={subscription.id} className="overflow-hidden">
                <div className="flex flex-wrap items-start gap-3 px-4 py-4 sm:px-5">
                  <PersonAvatar person={person} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[13.5px] font-semibold text-ink">
                        {subscription.title}
                      </h2>
                      <StatusPill
                        tone={isActive ? 'green' : subscription.status === 'paused' ? 'amber' : 'muted'}
                        dot={isActive}
                      >
                        {isActive ? 'Active' : subscription.status === 'paused' ? 'Paused' : 'Ended'}
                      </StatusPill>
                      <span className="text-[9.5px] text-muted-dim">
                        {subscription.id}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {person.name} · {cadenceLabel[subscription.cadence]} ·{' '}
                      {subscription.charges} charges so far
                    </p>
                    <p className="mt-1 line-clamp-1 max-w-xl text-[10.5px] text-muted">
                      {subscription.note}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-muted-dim">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-2.5 w-2.5" />
                        {isActive
                          ? `Next charge ${subscription.nextCharge}`
                          : 'Not charging while paused'}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-2.5 w-2.5 text-green-soft/70" />
                        {subscription.protectedAmount
                          ? `${formatINR(subscription.protectedAmount)} protected per charge`
                          : 'Protection paused'}
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <div className="text-right">
                      <div className="text-[16px] font-semibold text-ink">
                        {formatINR(subscription.amount)}
                      </div>
                      <div className="text-[9.5px] text-muted-dim">
                        {cadenceLabel[subscription.cadence]}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="secondary"
                        size="xs"
                        isLoading={busyId === subscription.id}
                        onClick={() => toggleStatus(subscription)}
                      >
                        {isActive ? (
                          <>
                            <Pause className="h-3 w-3" /> Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3" /> Resume
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="End retainer"
                        onClick={() => cancel(subscription)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <Panel className="mt-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green/20 bg-green/[0.07] text-green-soft">
              <CheckCircle2 className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[12px] font-semibold text-ink">
                A retainer is still a deal
              </h2>
              <p className="mt-0.5 max-w-2xl text-[10.5px] leading-relaxed text-muted">
                Each charge keeps its own Deal DNA, evidence and receipt. Pausing
                never deletes history, and ending a retainer never reverses a
                completed charge.
              </p>
            </div>
          </div>
          <Link href="/deals/TX-48190">
            <Button variant="secondary" size="sm">
              View linked Deal DNA
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </Panel>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <ShieldCheck className="h-2.5 w-2.5" />
        Demo subscriptions · no card or UPI mandate is created
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New recurring retainer"
        description="Set the cadence and amount. Each charge still needs your confirmation."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={create}
              disabled={!form.title.trim() || !Number(form.amount)}
            >
              Create retainer
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="sub-title">What is the retainer for?</FieldLabel>
            <TextInput
              id="sub-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="e.g. Monthly design support"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="sub-person">Counterparty</FieldLabel>
              <Select
                id="sub-person"
                value={form.counterpartyId}
                onChange={(event) =>
                  setForm({ ...form, counterpartyId: event.target.value })
                }
              >
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="sub-cadence">Cadence</FieldLabel>
              <Select
                id="sub-cadence"
                value={form.cadence}
                onChange={(event) =>
                  setForm({ ...form, cadence: event.target.value })
                }
              >
                <option value="weekly">Every week</option>
                <option value="monthly">Every month</option>
                <option value="quarterly">Every quarter</option>
              </Select>
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="sub-amount">Amount per charge (INR)</FieldLabel>
            <TextInput
              id="sub-amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              placeholder="18000"
            />
          </div>
          <div>
            <FieldLabel htmlFor="sub-note" hint="Optional">
              Scope
            </FieldLabel>
            <TextArea
              id="sub-note"
              rows={3}
              value={form.note}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              placeholder="What is included each cycle, and what is not?"
            />
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            This demo creates a local reminder only. No mandate, debit or
            automatic charge is set up.
          </p>
        </div>
      </Modal>
    </div>
  );
}
