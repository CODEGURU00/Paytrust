'use client';

import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Info,
  Plus,
  ShieldCheck,
  Split,
  Trash2,
  Users,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { Button } from '@/components/ui/button';
import { FieldLabel, TextInput } from '@/components/ui/form';
import { StatusPill } from '@/components/ui/status-pill';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

const contacts = ['rahul', 'priya', 'vikram', 'ananya'];

export default function SplitPaymentsPage() {
  const { demoPeople, pushToast } = useDemo();
  const [amount, setAmount] = useState('12000');
  const [selected, setSelected] = useState<string[]>(['rahul', 'priya']);
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'equal' | 'custom'>('equal');
  const [created, setCreated] = useState<
    { id: string; amount: number; people: string[]; date: string }[]
  >([
    { id: 'SPL-2210', amount: 9500, people: ['rahul', 'arjun'], date: '10 May' },
  ]);

  const total = Number(amount) || 0;
  const share = selected.length ? Math.round(total / selected.length) : 0;

  const shares = useMemo(() => {
    return selected.map((id) => ({
      id,
      value:
        mode === 'equal'
          ? share
          : Number(custom[id] || 0) || 0,
    }));
  }, [custom, mode, selected, share]);

  const customTotal = shares.reduce((sum, item) => sum + item.value, 0);
  const validCustom = mode === 'equal' || customTotal === total;

  const create = () => {
    if (!selected.length || !total || !validCustom) return;
    const id = `SPL-${Math.floor(2300 + Math.random() * 90)}`;
    setCreated((current) => [
      { id, amount: total, people: [...selected], date: 'Just now' },
      ...current,
    ]);
    pushToast('Split created (demo)', {
      description: `${selected.length} people · ${formatINR(total)} total. Requests are simulated.`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Split payments"
        description="Divide a bill, track each share and keep one record."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,1fr)]">
        <Panel className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <Split className="h-4 w-4 text-cyan" />
            <h2 className="text-[12.5px] font-semibold text-ink">New split</h2>
          </div>
          <div className="space-y-4 px-4 py-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="split-amount">Total amount (INR)</FieldLabel>
                <TextInput
                  id="split-amount"
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Split method</FieldLabel>
                <div className="flex h-10 items-center gap-0.5 rounded-lg border border-line bg-white/[0.02] p-0.5">
                  {(['equal', 'custom'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setMode(item)}
                      className={cn(
                        'h-8 flex-1 rounded-md text-[10.5px] font-medium capitalize transition-colors',
                        mode === item
                          ? 'bg-white/[0.07] text-ink'
                          : 'text-muted hover:text-ink-soft'
                      )}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <FieldLabel>People</FieldLabel>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {contacts.map((id) => {
                  const person = demoPeople[id];
                  const active = selected.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() =>
                        setSelected((current) =>
                          current.includes(id)
                            ? current.filter((item) => item !== id)
                            : [...current, id]
                        )
                      }
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                        active
                          ? 'border-cyan/35 bg-cyan/[0.06]'
                          : 'border-line bg-white/[0.015] hover:border-line-strong'
                      )}
                    >
                      <PersonAvatar person={person} size="xs" />
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-medium text-ink">
                          {person.name.split(' ')[0]}
                        </p>
                        <p className="truncate text-[8px] text-muted">
                          {active ? 'Included' : 'Add'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[9px] text-muted-dim">
                You are always included as the payer.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-white/[0.02] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-ink-soft">
                  {mode === 'equal' ? 'Equal split' : 'Custom split'}
                </span>
                <span className="text-[10px] text-muted">
                  {selected.length + 1} people including you
                </span>
              </div>
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <PersonAvatar person={demoPeople.arjun} size="xs" />
                  <span className="flex-1 text-[10.5px] text-ink-soft">
                    You
                  </span>
                  <span className="text-[10.5px] font-medium text-ink">
                    {formatINR(share)}
                  </span>
                </div>
                {shares.map((item) => (
                  <div key={item.id} className="flex items-center gap-2">
                    <PersonAvatar person={demoPeople[item.id]} size="xs" />
                    <span className="flex-1 truncate text-[10.5px] text-ink-soft">
                      {demoPeople[item.id].name}
                    </span>
                    {mode === 'equal' ? (
                      <span className="text-[10.5px] font-medium text-ink">
                        {formatINR(item.value)}
                      </span>
                    ) : (
                      <TextInput
                        type="number"
                        min="0"
                        value={custom[item.id] ?? ''}
                        onChange={(event) =>
                          setCustom((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                        placeholder="0"
                        aria-label={`${demoPeople[item.id].name} share`}
                        className="h-8 w-24 text-right text-[10.5px]"
                      />
                    )}
                  </div>
                ))}
              </div>
              {mode === 'custom' && (
                <div className="mt-2.5 flex items-center justify-between border-t border-line-soft pt-2 text-[10px]">
                  <span className="text-muted">Allocated</span>
                  <span
                    className={cn(
                      'font-medium',
                      validCustom ? 'text-green-soft' : 'text-red-soft'
                    )}
                  >
                    {formatINR(customTotal)} / {formatINR(total)}
                  </span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              onClick={create}
              disabled={!selected.length || !total || !validCustom}
            >
              <Split className="h-4 w-4" />
              Create split request (simulated)
            </Button>
            {!validCustom && (
              <p className="text-center text-[9.5px] text-red-soft">
                Custom shares must add up to the total.
              </p>
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                <Users className="h-3.5 w-3.5 text-cyan" />
                Active splits
              </h2>
              <span className="text-[9.5px] text-muted-dim">{created.length}</span>
            </div>
            <div className="mt-2 divide-y divide-line-soft">
              {created.map((split) => (
                <div key={split.id} className="flex items-center gap-2.5 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-panel-soft text-cyan">
                    <Split className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-ink">
                      {formatINR(split.amount)}
                    </p>
                    <p className="text-[9px] text-muted">
                      {split.id} · {split.people.length + 1} people · {split.date}
                    </p>
                    <div className="mt-1 flex -space-x-1.5">
                      <PersonAvatar person={demoPeople.arjun} size="xs" />
                      {split.people.map((id) => (
                        <PersonAvatar key={id} person={demoPeople[id]} size="xs" />
                      ))}
                    </div>
                  </div>
                  <StatusPill tone="amber" dot>
                    Pending
                  </StatusPill>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <h2 className="flex items-center gap-2 text-[11.5px] font-semibold text-ink">
              <ShieldCheck className="h-3.5 w-3.5 text-green-soft" />
              How split protection works
            </h2>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-muted">
              {[
                'Each share is its own protected record.',
                'One late person never blocks the others.',
                'Receipts are issued per share.',
                'You can cancel an unpaid share at any time.',
              ].map((item) => (
                <li key={item} className="flex items-start gap-1.5">
                  <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0 text-green-soft/80" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>

          <div className="flex items-start gap-2 rounded-xl border border-cyan/15 bg-cyan/[0.035] px-3 py-2.5">
            <Info className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
            <p className="text-[9.5px] leading-relaxed text-muted">
              Splits are a demo convenience. They do not create a legal
              partnership or change an existing agreement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
