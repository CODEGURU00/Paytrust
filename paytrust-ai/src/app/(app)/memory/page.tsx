'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Flag,
  Lightbulb,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

type Category = 'deal' | 'risk' | 'preference' | 'client' | 'note';

const categoryMeta: Record<
  Category,
  { label: string; icon: typeof Wallet; className: string }
> = {
  deal: { label: 'Deal fact', icon: Wallet, className: 'text-cyan border-cyan/20 bg-cyan/[0.06]' },
  risk: { label: 'Risk signal', icon: Flag, className: 'text-amber border-amber/20 bg-amber/[0.07]' },
  preference: { label: 'Preference', icon: Lightbulb, className: 'text-violet border-violet/20 bg-violet/[0.07]' },
  client: { label: 'Client', icon: Users, className: 'text-green-soft border-green/20 bg-green/[0.06]' },
  note: { label: 'Your note', icon: FileText, className: 'text-muted border-line bg-white/[0.03]' },
};

export default function MemoryPage() {
  const { transactions, project, alerts, demoPeople, pushToast } = useDemo();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [notes, setNotes] = useState<{ id: string; content: string; date: string }[]>([
    {
      id: 'note-1',
      content:
        'I prefer two milestone payments on design work — concept approval and final files. No more full upfront payments.',
      date: 'Added 2 May',
    },
    {
      id: 'note-2',
      content:
        'Always confirm new payout details through a phone number already in the record, never through the chat alone.',
      date: 'Added 8 May',
    },
  ]);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const facts = useMemo(() => {
    const items: {
      id: string;
      category: Category;
      title: string;
      body: string;
      source: string;
      date: string;
      href?: string;
    }[] = [];

    transactions.forEach((tx) => {
      items.push({
        id: `fact-${tx.id}`,
        category: 'deal',
        title: `${tx.title} with ${demoPeople[tx.counterpartyId].name}`,
        body: `${formatINR(tx.amount)} · ${tx.purpose} · ${tx.status.replace('_', ' ')}. ${
          tx.released
            ? `${formatINR(tx.released)} released to date.`
            : 'No funds released yet.'
        }`,
        source: tx.id,
        date: tx.dateLabel,
        href: `/transactions/${tx.id}`,
      });
    });

    alerts
      .filter((alert) => alert.status === 'open')
      .forEach((alert) => {
        items.push({
          id: `mem-${alert.id}`,
          category: 'risk',
          title: alert.title,
          body: alert.reasons.join(' · '),
          source: alert.transactionId || 'Risk Radar',
          date: alert.timeLabel,
          href: alert.transactionId ? `/transactions/${alert.transactionId}` : '/risk',
        });
      });

    items.push({
      id: 'mem-project',
      category: 'deal',
      title: project.title,
      body: `${project.milestones.length} milestones · ${formatINR(project.paid)} of ${formatINR(project.total)} confirmed with ${demoPeople[project.counterpartyId].name}.`,
      source: project.id,
      date: 'Active project',
      href: '/milestones',
    });

    notes.forEach((note) => {
      items.push({
        id: note.id,
        category: 'note',
        title: 'Personal rule',
        body: note.content,
        source: 'You',
        date: note.date,
      });
    });

    return items;
  }, [alerts, demoPeople, notes, project, transactions]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return facts.filter((fact) => {
      const matchesCategory = category === 'all' || fact.category === category;
      const matchesSearch =
        !search ||
        fact.title.toLowerCase().includes(search) ||
        fact.body.toLowerCase().includes(search) ||
        fact.source.toLowerCase().includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [category, facts, query]);

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Financial Memory"
        description="The facts and preferences PayTrust may use when helping with a decision."
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add a note
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Panel className="flex items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[17px] font-semibold text-ink">
              {facts.length}
            </div>
            <div className="text-[9.5px] text-muted">Remembered facts</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-green/20 bg-green/[0.07] text-green-soft">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[17px] font-semibold text-ink">
              {transactions.length}
            </div>
            <div className="text-[9.5px] text-muted">Linked deal records</div>
          </div>
        </Panel>
        <Panel className="flex items-center gap-3 p-3.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025] text-muted">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <div className="text-[17px] font-semibold text-ink">Private</div>
            <div className="text-[9.5px] text-muted">Never shown on your passport</div>
          </div>
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-dim" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search memory…"
              aria-label="Search memory"
              className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(['all', 'deal', 'risk', 'note'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium capitalize transition-colors',
                  category === item
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-muted hover:text-ink-soft'
                )}
              >
                {item === 'all' ? 'All memory' : item === 'note' ? 'My notes' : item === 'deal' ? 'Deals' : 'Risk'}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-line-soft">
          {filtered.map((fact) => {
            const meta = categoryMeta[fact.category];
            const content = (
              <div className="flex items-start gap-3 px-4 py-3.5">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                    meta.className
                  )}
                >
                  <meta.icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-dim">
                      {meta.label}
                    </span>
                    <span className="text-[9px] text-muted-dim">· {fact.date}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] font-medium text-ink">
                    {fact.title}
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-muted">
                    {fact.body}
                  </p>
                  <div className="mt-1 flex items-center gap-1 text-[9px] text-muted-dim">
                    <FileText className="h-2.5 w-2.5" />
                    Source: {fact.source}
                  </div>
                </div>
                {fact.category === 'note' && (
                  <button
                    type="button"
                    aria-label="Delete note"
                    onClick={(event) => {
                      event.preventDefault();
                      setNotes((current) =>
                        current.filter((note) => note.id !== fact.id)
                      );
                      pushToast('Note removed', {
                        description: 'It will no longer be used as context.',
                        tone: 'info',
                      });
                    }}
                    className="mt-1 text-muted-dim hover:text-red-soft"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {fact.href && (
                  <ChevronRight className="mt-2 h-3.5 w-3.5 shrink-0 text-muted-dim" />
                )}
              </div>
            );
            return fact.href ? (
              <Link
                key={fact.id}
                href={fact.href}
                className="block transition-colors hover:bg-white/[0.015]"
              >
                {content}
              </Link>
            ) : (
              <div key={fact.id}>{content}</div>
            );
          })}
          {filtered.length === 0 && (
            <p className="px-5 py-12 text-center text-[11px] text-muted">
              Nothing matches this view.
            </p>
          )}
        </div>
      </Panel>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cyan/15 bg-cyan/[0.035] px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Memory is used only to make the assistant more useful. You can delete
          any note at any time, and nothing here is shared with other members or
          included in a Trust Passport.
        </p>
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add a memory note"
        description="A rule or preference the assistant should remember."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!draft.trim()) return;
                setNotes((current) => [
                  {
                    id: `note-${Date.now()}`,
                    content: draft.trim(),
                    date: 'Added just now',
                  },
                  ...current,
                ]);
                setDraft('');
                setAddOpen(false);
                pushToast('Memory updated', {
                  description: 'The assistant can now use this preference.',
                });
              }}
              disabled={!draft.trim()}
            >
              Save note
            </Button>
          </div>
        }
      >
        <div>
          <FieldLabel htmlFor="memory-note">Your rule or preference</FieldLabel>
          <TextArea
            id="memory-note"
            rows={4}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="e.g. Always keep the final source files tied to the last milestone."
          />
          <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <CalendarClock className="mt-0.5 h-3 w-3 shrink-0" />
            Notes stay private and never override an agreement.
          </p>
        </div>
      </Modal>
    </div>
  );
}
