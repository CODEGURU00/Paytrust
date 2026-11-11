'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Dna,
  Mail,
  MapPin,
  MessageCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { useQuickActions } from '@/components/shell/quick-actions';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

type ClientFilter = 'all' | 'active' | 'repeat' | 'prospect';

interface ClientNote {
  id: string;
  personId: string;
  body: string;
  date: string;
}

const initialNotes: ClientNote[] = [
  {
    id: 'note-priya',
    personId: 'priya',
    body: 'Prefers a single monthly invoice. Always approve the content report before the retainer release.',
    date: 'Added 2 May',
  },
  {
    id: 'note-sunrise',
    personId: 'sunrise',
    body: 'Confirm production timelines on a call. Payout details changed once — verify through the saved number before paying.',
    date: 'Added 8 May',
  },
  {
    id: 'note-rahul',
    personId: 'rahul',
    body: 'Two revision rounds is the norm. Final source files only after the last milestone.',
    date: 'Added 12 May',
  },
];

export default function ClientsPage() {
  const { demoPeople, transactions, trustProfiles, pushToast } = useDemo();
  const { openAction } = useQuickActions();
  const [filter, setFilter] = useState<ClientFilter>('all');
  const [query, setQuery] = useState('');
  const [notes, setNotes] = useState(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState<string | null>(null);

  const clients = useMemo(() => {
    return Object.values(demoPeople)
      .filter(
        (person) =>
          person.id !== 'arjun' &&
          person.id !== 'support' &&
          person.id !== 'maya'
      )
      .map((person) => {
        const records = transactions.filter(
          (tx) => tx.counterpartyId === person.id
        );
        const active = records.filter(
          (tx) => tx.status !== 'completed' && tx.status !== 'cancelled'
        ).length;
        const value = records.reduce((sum, tx) => sum + tx.amount, 0);
        const profile = trustProfiles[person.id];
        const clientNotes = notes.filter((note) => note.personId === person.id);
        return {
          person,
          records,
          active,
          value,
          profile,
          notes: clientNotes,
          lastActivity: records[0]?.dateLabel || 'No activity yet',
        };
      })
      .sort((a, b) => b.value - a.value);
  }, [demoPeople, notes, transactions, trustProfiles]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !search ||
        client.person.name.toLowerCase().includes(search) ||
        client.person.role.toLowerCase().includes(search) ||
        client.person.handle.toLowerCase().includes(search);
      if (!matchesSearch) return false;
      if (filter === 'active') return client.active > 0;
      if (filter === 'repeat') {
        const completed = client.records.filter(
          (tx) => tx.status === 'completed'
        ).length;
        return completed > 1 || (client.profile?.stats.repeatClients || 0) > 0;
      }
      if (filter === 'prospect') return client.records.length === 0;
      return true;
    });
  }, [clients, filter, query]);

  const selected = selectedId
    ? clients.find((client) => client.person.id === selectedId)
    : null;

  const totals = {
    clients: clients.length,
    active: clients.reduce(
      (sum, client) => sum + client.active,
      0
    ),
    value: clients.reduce((sum, client) => sum + client.value, 0),
    repeat: clients.filter((client) => client.notes.length > 0).length,
  };

  const addNote = () => {
    if (!noteTarget || !noteDraft.trim()) return;
    setNotes((current) => [
      {
        id: `note-${Date.now()}`,
        personId: noteTarget,
        body: noteDraft.trim(),
        date: 'Added just now',
      },
      ...current,
    ]);
    pushToast('Client note saved', {
      description: 'It stays private to your workspace.',
      tone: 'info',
    });
    setNoteDraft('');
    setNoteTarget(null);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business"
        title="Client CRM"
        description="A small, honest address book built from real deal outcomes."
        action={
          <Button size="sm" onClick={() => openAction('deal')}>
            <Plus className="h-3.5 w-3.5" />
            New deal
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['Clients', `${totals.clients}`, 'People on a record', Users, 'text-cyan'],
          ['Active deals', `${totals.active}`, 'In progress or awaiting', Dna, 'text-[#9fbbff]'],
          ['Lifetime value', formatINR(totals.value), 'Across demo records', Wallet, 'text-green-soft'],
          ['With notes', `${totals.repeat}`, 'Context you added', Star, 'text-amber'],
        ].map(([label, value, note, Icon, tone]) => (
          <Panel key={label as string} className="p-3.5">
            <div className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
              <Icon className={cn('h-3 w-3', tone as string)} />
              {label as string}
            </div>
            <div className="mt-1.5 text-[19px] font-semibold text-ink">
              {value as string}
            </div>
            <div className="text-[9.5px] text-muted">{note as string}</div>
          </Panel>
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-dim" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients by name or role…"
              aria-label="Search clients"
              className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                ['all', 'All'],
                ['active', 'Active'],
                ['repeat', 'Repeat'],
                ['prospect', 'Prospects'],
              ] as [ClientFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-colors',
                  filter === value
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-muted hover:text-ink-soft'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title="No clients match"
            description="Try another filter, or start a deal with someone new."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setFilter('all');
                  setQuery('');
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((client) => {
              const completed = client.records.filter(
                (tx) => tx.status === 'completed'
              ).length;
              return (
                <div
                  key={client.person.id}
                  className="flex flex-col rounded-xl border border-line bg-white/[0.015] p-3.5 transition-colors hover:border-line-strong"
                >
                  <div className="flex items-start gap-2.5">
                    <PersonAvatar person={client.person} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-[12.5px] font-semibold text-ink">
                          {client.person.name}
                        </p>
                        {client.person.verified && (
                          <ShieldCheck className="h-3 w-3 shrink-0 text-cyan" />
                        )}
                      </div>
                      <p className="truncate text-[9.5px] text-muted">
                        {client.person.role}
                      </p>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[8.5px] text-muted-dim">
                        <MapPin className="h-2.5 w-2.5" />
                        {client.person.location || 'Location not set'}
                      </p>
                    </div>
                    {client.profile && (
                      <span className="flex h-8 w-8 shrink-0 flex-col items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.055]">
                        <span className="text-[10px] font-semibold text-cyan">
                          {Math.min(
                            98,
                            Math.round(
                              62 +
                                client.profile.stats.completed * 0.6 +
                                Number(
                                  client.profile.stats.onTime.replace('%', '')
                                ) *
                                  0.14 -
                                client.profile.stats.disputes * 4
                            )
                          )}
                        </span>
                        <span className="text-[6px] uppercase tracking-wide text-muted-dim">
                          trust
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-px rounded-lg border border-line-soft bg-line-soft">
                    {[
                      ['Deals', `${client.records.length}`],
                      ['Active', `${client.active}`],
                      ['Value', formatINR(client.value)],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-panel px-2 py-1.5 text-center">
                        <div className="truncate text-[10.5px] font-medium text-ink">
                          {value}
                        </div>
                        <div className="text-[8px] uppercase tracking-wide text-muted-dim">
                          {label}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {completed > 0 && (
                      <StatusPill tone="green" dot>
                        {completed} completed
                      </StatusPill>
                    )}
                    {client.records.length === 0 && (
                      <StatusPill tone="muted">Prospect</StatusPill>
                    )}
                    {client.notes.length > 0 && (
                      <StatusPill tone="cyan">
                        {client.notes.length} note
                        {client.notes.length > 1 ? 's' : ''}
                      </StatusPill>
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 border-t border-line-soft pt-2.5">
                    <Button
                      variant="secondary"
                      size="xs"
                      className="flex-1"
                      onClick={() => setSelectedId(client.person.id)}
                    >
                      Open profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Add note for ${client.person.name}`}
                      onClick={() => {
                        setNoteTarget(client.person.id);
                        setNoteDraft('');
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-cyan/15 bg-cyan/[0.035] px-4 py-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-cyan" />
        <p className="text-[10.5px] leading-relaxed text-muted">
          Client profiles are built from records you already share. Notes are
          private, never appear on a Trust Passport and never change a deal term.
        </p>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <Users className="h-2.5 w-2.5" />
        Demo CRM · seeded contacts · notes live in this browser only
      </p>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelectedId(null)}
        title={selected?.person.name}
        description={
          selected
            ? `${selected.person.role} · ${selected.records.length} record${
                selected.records.length === 1 ? '' : 's'
              }`
            : ''
        }
        size="md"
        footer={
          selected ? (
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setNoteTarget(selected.person.id);
                  setSelectedId(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add note
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setSelectedId(null);
                  openAction('deal');
                }}
              >
                Start a deal
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white/[0.02] px-3 py-2.5">
              <PersonAvatar person={selected.person} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] font-medium text-ink">
                    {selected.person.handle}
                  </span>
                  {selected.person.verified && (
                    <StatusPill tone="cyan">Verified</StatusPill>
                  )}
                </div>
                <p className="text-[9.5px] text-muted">
                  Last activity · {selected.lastActivity}
                </p>
              </div>
              <div className="text-right">
                <div className="text-[13px] font-semibold text-ink">
                  {formatINR(selected.value)}
                </div>
                <div className="text-[8.5px] text-muted-dim">Lifetime value</div>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-dim">
                Records
              </h3>
              <div className="mt-1.5 space-y-1.5">
                {selected.records.map((tx) => (
                  <Link
                    key={tx.id}
                    href={`/transactions/${tx.id}`}
                    onClick={() => setSelectedId(null)}
                    className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-2 transition-colors hover:border-cyan/25"
                  >
                    <Dna className="h-3 w-3 shrink-0 text-cyan" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10.5px] font-medium text-ink-soft">
                        {tx.title}
                      </p>
                      <p className="text-[8.5px] text-muted-dim">
                        {tx.id} · {tx.dateLabel}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium text-ink">
                      {formatINR(tx.amount)}
                    </span>
                    <ChevronRight className="h-3 w-3 text-muted-dim" />
                  </Link>
                ))}
                {selected.records.length === 0 && (
                  <p className="rounded-lg border border-dashed border-line px-3 py-6 text-center text-[10px] text-muted">
                    No shared record yet. Start a deal to create one.
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-dim">
                Private notes
              </h3>
              <div className="mt-1.5 space-y-1.5">
                {selected.notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-line-soft bg-white/[0.015] px-2.5 py-2"
                  >
                    <p className="text-[10px] leading-relaxed text-ink-soft">
                      {note.body}
                    </p>
                    <p className="mt-1 text-[8.5px] text-muted-dim">{note.date}</p>
                  </div>
                ))}
                {selected.notes.length === 0 && (
                  <p className="text-[9.5px] text-muted">
                    No notes yet. Notes are for your eyes only.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-line-soft pt-2.5 text-[9px] text-muted-dim">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-2.5 w-2.5" />
                {selected.person.location || 'Location not set'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Mail className="h-2.5 w-2.5" />
                Contact stays inside PayTrust
              </span>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(noteTarget)}
        onClose={() => setNoteTarget(null)}
        title="Add a private note"
        description={
          noteTarget
            ? `Only you can see notes about ${demoPeople[noteTarget]?.name}.`
            : ''
        }
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setNoteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={addNote} disabled={!noteDraft.trim()}>
              Save note
            </Button>
          </div>
        }
      >
        <div>
          <FieldLabel htmlFor="client-note">
            What should you remember next time?
          </FieldLabel>
          <TextArea
            id="client-note"
            rows={4}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            placeholder="Preferences, boundaries or context that is useful before the next deal."
          />
          <p className="mt-2 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <MessageCircle className="mt-0.5 h-2.5 w-2.5 shrink-0" />
            Notes never affect trust scores or appear in a shared passport.
          </p>
        </div>
      </Modal>
    </div>
  );
}
