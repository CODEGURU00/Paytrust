'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Plus,
  Search,
  Send,
  ShieldCheck,
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

type InvoiceStatus = 'paid' | 'awaiting' | 'held' | 'overdue' | 'draft';

interface Invoice {
  id: string;
  title: string;
  counterpartyId: string;
  amount: number;
  issued: string;
  due: string;
  status: InvoiceStatus;
  transactionId?: string;
  note: string;
}

const initialInvoices: Invoice[] = [
  {
    id: 'INV-2210',
    title: 'May website retainer',
    counterpartyId: 'priya',
    amount: 45000,
    issued: '1 May',
    due: '14 May',
    status: 'awaiting',
    transactionId: 'TX-48190',
    note: 'Content updates and maintenance for May.',
  },
  {
    id: 'INV-2207',
    title: 'Print production',
    counterpartyId: 'sunrise',
    amount: 42000,
    issued: '6 May',
    due: '10 May',
    status: 'held',
    transactionId: 'TX-48231',
    note: 'Production of 500 brochures. Recipient details changed before payment.',
  },
  {
    id: 'INV-2203',
    title: 'Final logo files',
    counterpartyId: 'rahul',
    amount: 9000,
    issued: '2 May',
    due: '12 May',
    status: 'paid',
    transactionId: 'TX-48213',
    note: 'Final milestone: source files and usage rights transfer.',
  },
  {
    id: 'INV-2198',
    title: 'April tutoring cycle',
    counterpartyId: 'ananya',
    amount: 6000,
    issued: '28 Apr',
    due: '5 May',
    status: 'paid',
    transactionId: 'TX-48077',
    note: 'Eight sessions completed and confirmed.',
  },
  {
    id: 'INV-2185',
    title: 'Photography booking',
    counterpartyId: 'vikram',
    amount: 12000,
    issued: '20 Apr',
    due: '28 Apr',
    status: 'overdue',
    transactionId: 'TX-47980',
    note: 'Cancelled by mutual agreement. No funds captured.',
  },
];

const statusMeta: Record<
  InvoiceStatus,
  { label: string; tone: 'green' | 'amber' | 'red' | 'muted' | 'cyan' }
> = {
  paid: { label: 'Paid', tone: 'green' },
  awaiting: { label: 'Awaiting payment', tone: 'amber' },
  held: { label: 'Payment held', tone: 'cyan' },
  overdue: { label: 'Overdue', tone: 'red' },
  draft: { label: 'Draft', tone: 'muted' },
};

const filters: { value: 'all' | InvoiceStatus; label: string }[] = [
  { value: 'all', label: 'All invoices' },
  { value: 'awaiting', label: 'Awaiting' },
  { value: 'held', label: 'Held' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
  { value: 'draft', label: 'Drafts' },
];

export default function InvoicesPage() {
  const { demoPeople, pushToast } = useDemo();
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filter, setFilter] = useState<'all' | InvoiceStatus>('all');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    counterpartyId: 'priya',
    amount: '',
    due: '',
    note: '',
  });

  const people = Object.values(demoPeople).filter(
    (person) => person.id !== 'arjun' && person.id !== 'support'
  );

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const person = demoPeople[invoice.counterpartyId];
      const matchesFilter = filter === 'all' || invoice.status === filter;
      const matchesSearch =
        !search ||
        invoice.title.toLowerCase().includes(search) ||
        invoice.id.toLowerCase().includes(search) ||
        person.name.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });
  }, [demoPeople, filter, invoices, query]);

  const total = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paid = invoices
    .filter((invoice) => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const awaiting = invoices
    .filter((invoice) => invoice.status === 'awaiting' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const held = invoices
    .filter((invoice) => invoice.status === 'held')
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  const markPaid = (invoice: Invoice) => {
    setInvoices((current) =>
      current.map((item) =>
        item.id === invoice.id ? { ...item, status: 'paid' as InvoiceStatus } : item
      )
    );
    pushToast('Invoice marked paid (demo)', {
      description: `${invoice.id} · ${formatINR(invoice.amount)}. No real settlement occurred.`,
      tone: 'success',
    });
  };

  const remind = (invoice: Invoice) => {
    const person = demoPeople[invoice.counterpartyId];
    pushToast('Reminder queued (demo)', {
      description: `A reminder for ${invoice.id} would be sent to ${person.name}.`,
      tone: 'info',
    });
  };

  const create = () => {
    if (!form.title.trim() || !Number(form.amount)) return;
    const id = `INV-${Math.floor(2215 + Math.random() * 60)}`;
    setInvoices((current) => [
      {
        id,
        title: form.title.trim(),
        counterpartyId: form.counterpartyId,
        amount: Number(form.amount),
        issued: 'Just now',
        due: form.due || 'Not set',
        status: 'awaiting',
        note: form.note.trim() || 'No description added.',
      },
      ...current,
    ]);
    setForm({
      title: '',
      counterpartyId: 'priya',
      amount: '',
      due: '',
      note: '',
    });
    setCreateOpen(false);
    pushToast('Invoice created (demo)', {
      description: `${id} is awaiting payment. It has not been sent anywhere.`,
    });
  };

  const download = (invoice: Invoice) => {
    const person = demoPeople[invoice.counterpartyId];
    const text = [
      'PayTrust AI — Demo Invoice',
      `Invoice: ${invoice.id}`,
      `From: Arjun Sharma`,
      `To: ${person.name}`,
      `Issued: ${invoice.issued}`,
      `Due: ${invoice.due}`,
      '',
      `${invoice.title}`,
      `Amount: ${formatINR(invoice.amount)}`,
      `Status: ${statusMeta[invoice.status].label}`,
      '',
      invoice.note,
      '',
      invoice.transactionId ? `Linked record: ${invoice.transactionId}` : '',
      'This is a demo invoice. It is not a tax document and no real payment is due.',
    ]
      .filter(Boolean)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${invoice.id}-demo-invoice.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast('Invoice downloaded (demo)', {
      description: 'A plain-text copy was generated locally.',
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Business"
        title="Invoices"
        description="Invoices stay linked to the payment record and the evidence behind them."
        action={
          <div className="flex items-center gap-2">
            <Link href="/transactions">
              <Button variant="secondary" size="sm">
                <Wallet className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Transactions</span>
              </Button>
            </Link>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              New invoice
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          ['Invoiced', formatINR(total), 'All demo invoices', FileText, 'text-ink'],
          ['Paid', formatINR(paid), 'Confirmed payments', CheckCircle2, 'text-green-soft'],
          ['Awaiting', formatINR(awaiting), 'Including overdue', Clock3, 'text-amber'],
          ['Held', formatINR(held), 'Protected or in review', ShieldCheck, 'text-cyan'],
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
              placeholder="Search invoice, client or ID…"
              aria-label="Search invoices"
              className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium transition-colors',
                  filter === item.value
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-muted hover:text-ink-soft'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-5 w-5" />}
            title="No invoices in this view"
            description="Create an invoice or clear the filters to see everything."
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
          <div className="divide-y divide-line-soft">
            {filtered.map((invoice) => {
              const person = demoPeople[invoice.counterpartyId];
              const meta = statusMeta[invoice.status];
              return (
                <div
                  key={invoice.id}
                  className="flex flex-wrap items-start gap-3 px-4 py-4 transition-colors hover:bg-white/[0.015] sm:px-5"
                >
                  <PersonAvatar person={person} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[13px] font-semibold text-ink">
                        {invoice.title}
                      </h2>
                      <StatusPill tone={meta.tone} dot={invoice.status === 'overdue'}>
                        {meta.label}
                      </StatusPill>
                      <span className="text-[9.5px] text-muted-dim">
                        {invoice.id}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10.5px] text-muted">
                      {person.name} · issued {invoice.issued} · due {invoice.due}
                      {invoice.transactionId ? ` · ${invoice.transactionId}` : ''}
                    </p>
                    <p className="mt-1 line-clamp-1 max-w-xl text-[10px] text-muted">
                      {invoice.note}
                    </p>
                    {invoice.transactionId && (
                      <Link
                        href={`/transactions/${invoice.transactionId}`}
                        className="mt-1.5 inline-flex items-center gap-1 text-[9.5px] font-medium text-cyan hover:text-cyan-soft"
                      >
                        Open linked record
                        <ChevronRight className="h-2.5 w-2.5" />
                      </Link>
                    )}
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end">
                    <div className="text-right">
                      <div className="text-[16px] font-semibold text-ink">
                        {formatINR(invoice.amount)}
                      </div>
                      <div className="text-[9px] text-muted-dim">
                        {invoice.status === 'paid'
                          ? 'Settled in demo'
                          : invoice.status === 'held'
                            ? 'Protected'
                            : 'Not settled'}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      {(invoice.status === 'awaiting' ||
                        invoice.status === 'overdue') && (
                        <>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => remind(invoice)}
                          >
                            <BellRing className="h-3 w-3" />
                            Remind
                          </Button>
                          <Button
                            variant="secondary"
                            size="xs"
                            onClick={() => markPaid(invoice)}
                          >
                            <Check className="h-3 w-3" />
                            Mark paid
                          </Button>
                        </>
                      )}
                      {invoice.status === 'held' && (
                        <Link href={`/transactions/${invoice.transactionId}`}>
                          <Button variant="secondary" size="xs">
                            Review hold
                          </Button>
                        </Link>
                      )}
                      {invoice.status === 'paid' && (
                        <StatusPill tone="green">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Receipt
                        </StatusPill>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Download invoice"
                        onClick={() => download(invoice)}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Panel className="flex items-start gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan/20 bg-cyan/[0.07] text-cyan">
            <CalendarClock className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[11.5px] font-semibold text-ink">
              Invoices are not demands
            </h2>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              An invoice records what was agreed. It never debits an account.
              Payment still requires an explicit action and, for protected
              records, a release.
            </p>
          </div>
        </Panel>
        <Panel className="flex items-start gap-3 p-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-green/20 bg-green/[0.07] text-green-soft">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-[11.5px] font-semibold text-ink">
              One record, one truth
            </h2>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              Every invoice links to its transaction, Deal DNA and evidence. When
              a payment is released, the receipt lands in the same record.
            </p>
          </div>
        </Panel>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <FileText className="h-2.5 w-2.5" />
        Demo invoices · not tax documents · no real payment is due
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New invoice"
        description="Create a demo invoice linked to a client."
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
              <Send className="h-3.5 w-3.5" />
              Create invoice
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="inv-title">What is being invoiced?</FieldLabel>
            <TextInput
              id="inv-title"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="e.g. June website retainer"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="inv-person">Client</FieldLabel>
              <Select
                id="inv-person"
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
              <FieldLabel htmlFor="inv-due">Due date</FieldLabel>
              <TextInput
                id="inv-due"
                value={form.due}
                onChange={(event) => setForm({ ...form, due: event.target.value })}
                placeholder="e.g. 14 June"
              />
            </div>
          </div>
          <div>
            <FieldLabel htmlFor="inv-amount">Amount (INR)</FieldLabel>
            <TextInput
              id="inv-amount"
              type="number"
              min="1"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: event.target.value })
              }
              placeholder="45000"
            />
          </div>
          <div>
            <FieldLabel htmlFor="inv-note" hint="Optional">
              Description
            </FieldLabel>
            <TextArea
              id="inv-note"
              rows={3}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder="What was delivered, and what is included?"
            />
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0" />
            The invoice stays in this browser and is never emailed by the demo.
          </p>
        </div>
      </Modal>
    </div>
  );
}
