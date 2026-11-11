'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronRight,
  MessageCircle,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { TextArea } from '@/components/ui/form';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const { transactions, demoPeople, addMessage } = useDemo();
  const [activeId, setActiveId] = useState(transactions[0]?.id ?? '');
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return transactions;
    return transactions.filter((tx) => {
      const person = demoPeople[tx.counterpartyId];
      return (
        tx.title.toLowerCase().includes(search) ||
        person?.name.toLowerCase().includes(search)
      );
    });
  }, [demoPeople, query, transactions]);

  const active = transactions.find((tx) => tx.id === activeId) || filtered[0];
  const person = active ? demoPeople[active.counterpartyId] : undefined;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [active?.messages.length, active?.id]);

  const send = () => {
    if (!active || !message.trim()) return;
    addMessage(active.id, message.trim());
    setMessage('');
  };

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Messages"
        description="Every conversation stays attached to its payment record."
        action={
          <Link href="/transactions">
            <Button variant="secondary" size="sm">
              <ArrowRight className="h-3.5 w-3.5" />
              All transactions
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.6fr)]">
        <Panel className="overflow-hidden">
          <div className="border-b border-line-soft p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-dim" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search conversations…"
                aria-label="Search conversations"
                className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {filtered.map((tx) => {
              const p = demoPeople[tx.counterpartyId];
              const last = tx.messages[tx.messages.length - 1];
              const selected = active?.id === tx.id;
              return (
                <button
                  key={tx.id}
                  type="button"
                  onClick={() => setActiveId(tx.id)}
                  className={cn(
                    'flex w-full items-start gap-2.5 border-b border-line-soft px-3 py-3 text-left transition-colors',
                    selected ? 'bg-cyan/[0.045]' : 'hover:bg-white/[0.02]'
                  )}
                >
                  <div className="relative">
                    <PersonAvatar person={p} size="sm" />
                    {tx.status === 'disputed' && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-panel bg-red" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11.5px] font-medium text-ink">
                        {tx.title}
                      </span>
                      <span className="shrink-0 text-[8.5px] text-muted-dim">
                        {last?.time || ''}
                      </span>
                    </div>
                    <p className="text-[9.5px] text-muted">
                      {p.name} · {tx.id}
                    </p>
                    <p className="mt-0.5 truncate text-[9.5px] text-muted-dim">
                      {last?.system ? 'PayTrust AI: ' : ''}
                      {last?.content.replace(/\n/g, ' ') ||
                        'No messages yet — start the conversation.'}
                    </p>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <p className="px-3 py-10 text-center text-[11px] text-muted">
                No conversations match.
              </p>
            )}
          </div>
        </Panel>

        <Panel className="flex min-h-[560px] flex-col overflow-hidden">
          {active && person ? (
            <>
              <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-4 py-3">
                <PersonAvatar person={person} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-semibold text-ink">
                      {active.title}
                    </span>
                    {active.verified && (
                      <ShieldCheck className="h-3 w-3 text-cyan" />
                    )}
                  </div>
                  <p className="truncate text-[9.5px] text-muted">
                    {person.name} · {active.id} · {active.messageCount} messages
                  </p>
                </div>
                <StatusPill
                  tone={
                    active.status === 'disputed'
                      ? 'red'
                      : active.agreementStatus === 'awaiting_you'
                        ? 'amber'
                        : 'green'
                  }
                >
                  {active.status === 'disputed'
                    ? 'Dispute open'
                    : active.agreementStatus === 'awaiting_you'
                      ? 'Your approval needed'
                      : 'Active'}
                </StatusPill>
                <Link href={`/transactions/${active.id}`}>
                  <Button variant="secondary" size="xs">
                    Open workspace
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {active.messages.map((item) => {
                  if (item.system) {
                    return (
                      <div key={item.id} className="flex justify-center">
                        <div
                          className={cn(
                            'max-w-[88%] rounded-xl border px-3 py-2 text-[10.5px] leading-relaxed',
                            item.tone === 'receipt'
                              ? 'border-green/20 bg-green/[0.05] text-green-soft/90'
                              : 'border-cyan/15 bg-cyan/[0.04] text-ink-soft/80'
                          )}
                        >
                          <div className="mb-1 flex items-center gap-1 text-[8.5px] font-semibold uppercase tracking-wider text-cyan">
                            <Sparkles className="h-2.5 w-2.5" />
                            PayTrust
                            <span className="ml-auto font-normal normal-case tracking-normal text-muted-dim">
                              {item.time}
                            </span>
                          </div>
                          <p className="whitespace-pre-line">{item.content}</p>
                        </div>
                      </div>
                    );
                  }
                  const mine = item.authorId === 'arjun';
                  const author = demoPeople[item.authorId];
                  return (
                    <div
                      key={item.id}
                      className={cn('flex gap-2', mine && 'flex-row-reverse')}
                    >
                      <PersonAvatar
                        person={author ?? demoPeople.arjun}
                        size="xs"
                        className="mt-1 shrink-0"
                      />
                      <div className={cn('max-w-[80%]', mine && 'text-right')}>
                        <div
                          className={cn(
                            'inline-block rounded-xl px-3 py-2 text-left text-[11.5px] leading-relaxed',
                            mine
                              ? 'bg-brand/90 text-white'
                              : 'border border-line bg-panel-soft text-ink-soft'
                          )}
                        >
                          {item.content}
                        </div>
                        <div className="mt-0.5 text-[8.5px] text-muted-dim">
                          {author?.name.split(' ')[0]} · {item.time}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="border-t border-line-soft p-3">
                <div className="rounded-xl border border-line bg-panel-soft/60 p-2">
                  <TextArea
                    rows={2}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Message ${person.name.split(' ')[0]}…`}
                    className="min-h-[48px] resize-none border-0 bg-transparent p-1 text-[11.5px] focus:ring-0"
                  />
                  <div className="flex items-center justify-between px-1 pt-1">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Attach file">
                        <Paperclip className="h-3.5 w-3.5" />
                      </Button>
                      <span className="text-[8.5px] text-muted-dim">
                        Linked to {active.id}
                      </span>
                    </div>
                    <Button
                      size="icon-sm"
                      aria-label="Send message"
                      disabled={!message.trim()}
                      onClick={send}
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="h-6 w-6 text-muted" />
              <p className="text-[12px] text-muted">Select a conversation</p>
            </div>
          )}
        </Panel>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <Users className="h-2.5 w-2.5" />
        Demo inbox · messages are stored in this browser only
      </p>
    </div>
  );
}
