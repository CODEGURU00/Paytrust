'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useDemo } from '@/components/demo/demo-provider';
import { allNavItems } from '@/components/shell/nav-config';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { transactionStatusMeta } from '@/components/ui/status-pill';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { transactions, people, project } = useDemo();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  const close = () => {
    setQuery('');
    setActive(0);
    onClose();
  };

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const nav = allNavItems.filter((item) =>
      normalized ? item.label.toLowerCase().includes(normalized) : true
    );
    const tx = transactions.filter((transaction) => {
      if (!normalized) return transaction.status !== 'cancelled';
      const person = people[transaction.counterpartyId];
      return (
        transaction.id.toLowerCase().includes(normalized) ||
        transaction.title.toLowerCase().includes(normalized) ||
        person?.name.toLowerCase().includes(normalized) ||
        transaction.purpose.toLowerCase().includes(normalized)
      );
    });
    const promises = transactions.flatMap((transaction) =>
      transaction.promises
        .filter(
          (promise) =>
            promise.status !== 'done' &&
            (!normalized ||
              promise.label.toLowerCase().includes(normalized) ||
              promise.ownerLabel.toLowerCase().includes(normalized))
        )
        .map((promise) => ({ ...promise, transactionId: transaction.id }))
    );

    return { nav: nav.slice(0, 6), tx: tx.slice(0, 5), promises: promises.slice(0, 4) };
  }, [query, transactions, people]);

  const totalItems =
    results.nav.length + results.tx.length + results.promises.length;
  const txOffset = results.nav.length;
  const promiseOffset = txOffset + results.tx.length;

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % Math.max(totalItems, 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) =>
        current - 1 < 0 ? Math.max(totalItems - 1, 0) : current - 1
      );
    } else if (event.key === 'Enter') {
      event.preventDefault();
      let index = 0;
      if (index === active && results.nav[0]) {
        go(results.nav[0].href);
        return;
      }
      index += results.nav.length;
      if (active >= index && active < index + results.tx.length) {
        go(`/transactions/${results.tx[active - index].id}`);
        return;
      }
      index += results.tx.length;
      if (active >= index && active < index + results.promises.length) {
        go(`/transactions/${results.promises[active - index].transactionId}`);
        return;
      }
      if (results.nav[0]) go(results.nav[0].href);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      className="max-h-[80vh]"
      title={undefined}
    >
      <div className="-mx-5 -mt-4">
        <div className="flex items-center gap-3 border-b border-line-soft px-5">
          <Search className="h-[18px] w-[18px] shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search transactions, people, promises…"
            className="h-[58px] w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-muted-dim"
            aria-label="Search PayTrust"
          />
          <span className="kbd">ESC</span>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {totalItems === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-panel-soft">
                <Search className="h-4 w-4 text-muted" />
              </div>
              <p className="text-[13px] font-medium text-ink">
                No matching records
              </p>
              <p className="mt-1 text-[12px] text-muted">
                Try a name, transaction ID or promise.
              </p>
            </div>
          )}

          {results.nav.length > 0 && (
            <Section title="Go to">
              {results.nav.map((item, index) => {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(item.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      active === index
                        ? 'bg-brand/10 text-ink'
                        : 'text-ink-soft hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-soft text-muted">
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 text-[13px] font-medium">
                      {item.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-dim" />
                  </button>
                );
              })}
            </Section>
          )}

          {results.tx.length > 0 && (
            <Section title="Transactions">
              {results.tx.map((transaction, offset) => {
                const index = txOffset + offset;
                const person = people[transaction.counterpartyId];
                const meta = transactionStatusMeta(transaction.status);
                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(`/transactions/${transaction.id}`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      active === index
                        ? 'bg-brand/10'
                        : 'hover:bg-white/[0.04]'
                    )}
                  >
                    {person && <PersonAvatar person={person} size="sm" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {person?.name} · {transaction.title}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {transaction.id} · {transaction.dateLabel}
                      </span>
                    </span>
                    <span className="text-[11px] text-muted">{meta.label}</span>
                  </button>
                );
              })}
            </Section>
          )}

          {results.promises.length > 0 && (
            <Section title="Promises">
              {results.promises.map((promise, offset) => {
                const index = promiseOffset + offset;
                return (
                  <button
                    key={`${promise.transactionId}-${promise.id}`}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(`/transactions/${promise.transactionId}`)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      active === index
                        ? 'bg-brand/10'
                        : 'hover:bg-white/[0.04]'
                    )}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-panel-soft text-amber">
                      <Sparkles className="h-3.5 w-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {promise.label}
                      </span>
                      <span className="block text-[11px] text-muted">
                        {promise.ownerLabel} · {promise.transactionId}
                      </span>
                    </span>
                    <span className="text-[11px] text-amber">
                      {promise.dueLabel}
                    </span>
                  </button>
                );
              })}
            </Section>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5 text-[10.5px] text-muted-dim">
          <span className="flex items-center gap-2">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> to navigate
            <span className="kbd">↵</span> to open
          </span>
          <span>{project.id} · demo workspace</span>
        </div>
      </div>
    </Modal>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5">
      <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-dim">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
