'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Info,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { Button } from '@/components/ui/button';
import { FieldLabel, Select, TextArea, TextInput } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

export default function SendRequestPage() {
  const { demoPeople, createTransaction, pushToast } = useDemo();
  const [mode, setMode] = useState<'payment' | 'request'>('payment');
  const [counterpartyId, setCounterpartyId] = useState('rahul');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const people = Object.values(demoPeople).filter(
    (person) => person.id !== 'arjun' && person.id !== 'support'
  );

  const submit = async () => {
    if (!title.trim() || !Number(amount)) return;
    setBusy(true);

    /*
     * The record is stored on the server before its id is published, so the
     * link that is shown here keeps working after a refresh.
     */
    const id = await createTransaction({
      title: title.trim(),
      counterpartyId,
      amount: Number(amount),
      purpose: purpose.trim() || 'No purpose added yet',
      direction: mode === 'payment' ? 'out' : 'in',
      mode,
      note,
    });

    setBusy(false);
    if (!id) return;

    setResult(id);
    setTitle('');
    setAmount('');
    setPurpose('');
    setNote('');
  };

  const person = demoPeople[counterpartyId];

  if (result) {
    return (
      <div>
        <PageHeader eyebrow="Payments" title="Send & request" />
        <Panel className="mx-auto max-w-lg px-6 py-10 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-green/25 bg-green/[0.08] text-green-soft">
            <CheckCircle2 className="h-6 w-6" />
          </span>
          <h2 className="mt-3 text-[18px] font-semibold text-ink">
            {mode === 'payment' ? 'Payment simulated' : 'Request created'}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {mode === 'payment'
              ? 'The demo payment was recorded. No real money moved.'
              : 'The request is now visible to the other party in this demo.'}
          </p>
          <p className="mt-2 text-[12px] font-medium text-cyan">{result}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/transactions/${result}`}>
              <Button size="sm">
                Open record <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => setResult(null)}>
              Create another
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Send & request"
        description="Start a record with the context attached from the first rupee."
        action={
          <Link href="/transactions">
            <Button variant="ghost" size="sm">
              All transactions
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <Panel className="overflow-hidden">
          <div className="flex gap-1 border-b border-line-soft p-1.5">
            {[
              { value: 'payment', label: 'Send money', icon: ArrowUpRight },
              { value: 'request', label: 'Request money', icon: ArrowDownLeft },
            ].map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMode(tab.value as 'payment' | 'request')}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11.5px] font-medium transition-colors',
                  mode === tab.value
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-muted hover:text-ink-soft'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4 px-5 py-5">
            <div>
              <FieldLabel>To</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {people.slice(0, 6).map((option) => {
                  const active = counterpartyId === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCounterpartyId(option.id)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-cyan/35 bg-cyan/[0.06]'
                          : 'border-line bg-white/[0.015] hover:border-line-strong'
                      )}
                    >
                      <PersonAvatar person={option} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate text-[10.5px] font-medium text-ink">
                          {option.name}
                        </p>
                        <p className="truncate text-[8.5px] text-muted">
                          {option.role}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="pay-title">What is it for?</FieldLabel>
                <TextInput
                  id="pay-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Logo design"
                />
              </div>
              <div>
                <FieldLabel htmlFor="pay-amount">Amount (INR)</FieldLabel>
                <TextInput
                  id="pay-amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="18000"
                />
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="pay-purpose">Purpose</FieldLabel>
              <TextInput
                id="pay-purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
                placeholder="What is being delivered?"
              />
            </div>

            <div>
              <FieldLabel htmlFor="pay-note" hint="Optional">
                Context for the record
              </FieldLabel>
              <TextArea
                id="pay-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add the terms you already discussed. Deal DNA can turn this into a draft later."
              />
            </div>

            <div className="rounded-xl border border-line-soft bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted">
                  {mode === 'payment' ? 'You send' : 'You request'}
                </span>
                <span className="text-[14px] font-semibold text-ink">
                  {amount ? formatINR(Number(amount)) : '₹0'}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px]">
                <span className="text-muted">To</span>
                <span className="text-ink-soft">{person.name}</span>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={submit}
              isLoading={busy}
              disabled={!title.trim() || !Number(amount)}
            >
              <ShieldCheck className="h-4 w-4" />
              {mode === 'payment' ? 'Send protected payment' : 'Send payment request'}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[9px] text-muted-dim">
              <Info className="h-2.5 w-2.5" />
              Simulated · no real funds move · you can reset the demo anytime
            </p>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Sparkles className="h-3.5 w-3.5 text-cyan" />
              What happens next
            </h2>
            <ol className="mt-2.5 space-y-2.5">
              {[
                ['A record is created', 'Chat, terms and evidence share one link.'],
                ['Deal DNA can draft terms', 'Both parties review before anything binds.'],
                ['Funds stay protected', 'You release only when the work is confirmed.'],
              ].map(([title, body], index) => (
                <li key={title} className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-[9px] font-semibold text-muted">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-[10.5px] font-medium text-ink-soft">{title}</p>
                    <p className="text-[9.5px] leading-relaxed text-muted">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
              <Users className="h-3.5 w-3.5 text-cyan" />
              Recent contacts
            </h2>
            <div className="mt-2 space-y-2">
              {people.slice(0, 4).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setCounterpartyId(option.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg p-1 text-left hover:bg-white/[0.03]"
                >
                  <PersonAvatar person={option} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10.5px] font-medium text-ink-soft">
                      {option.name}
                    </p>
                    <p className="truncate text-[8.5px] text-muted">{option.role}</p>
                  </div>
                  <ChevronRight className="h-3 w-3 text-muted-dim" />
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
