'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Plus,
  QrCode,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextArea, TextInput } from '@/components/ui/form';
import { StatusPill } from '@/components/ui/status-pill';
import { formatINR } from '@/lib/demo/format';

interface PaymentLink {
  id: string;
  title: string;
  amount: number;
  note: string;
  active: boolean;
  opens: number;
  created: string;
}

const initialLinks: PaymentLink[] = [
  {
    id: 'PL-8841',
    title: 'Brand identity sprint',
    amount: 18000,
    note: 'Logo concepts and final source files',
    active: true,
    opens: 12,
    created: '8 May',
  },
  {
    id: 'PL-8830',
    title: 'May website retainer',
    amount: 45000,
    note: 'Content updates and maintenance',
    active: true,
    opens: 7,
    created: '1 May',
  },
  {
    id: 'PL-8792',
    title: 'Photography booking',
    amount: 12000,
    note: 'Studio booking — cancelled',
    active: false,
    opens: 3,
    created: '28 Apr',
  },
];

export default function PaymentLinksPage() {
  const { pushToast } = useDemo();
  const [links, setLinks] = useState(initialLinks);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (link: PaymentLink) => {
    try {
      await navigator.clipboard.writeText(
        `https://paytrust.demo/pay/${link.id.toLowerCase()}`
      );
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1800);
      pushToast('Payment link copied', {
        description: 'Opening the link creates a named demo record.',
      });
    } catch {
      pushToast('Could not copy the link', { tone: 'error' });
    }
  };

  const create = () => {
    const id = `PL-${Math.floor(8900 + Math.random() * 90)}`;
    setLinks((current) => [
      {
        id,
        title: title.trim(),
        amount: Number(amount) || 0,
        note: note.trim() || 'No description added',
        active: true,
        opens: 0,
        created: 'Just now',
      },
      ...current,
    ]);
    setCreateOpen(false);
    setTitle('');
    setAmount('');
    setNote('');
    pushToast('Payment link created (demo)', {
      description: `${id} is ready to share.`,
    });
  };

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Payment links"
        description="Share a link that opens a named, protected record."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New payment link
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Active links', links.filter((l) => l.active).length],
          ['Total opened', links.reduce((total, l) => total + l.opens, 0)],
          [
            'Value shared',
            formatINR(links.reduce((total, l) => total + l.amount, 0)),
          ],
          ['Paid through links', '₹27,000'],
        ].map(([label, value]) => (
          <Panel key={label as string} className="p-3.5">
            <div className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-muted-dim">
              {label as string}
            </div>
            <div className="mt-1 text-[18px] font-semibold text-ink">
              {value as string}
            </div>
          </Panel>
        ))}
      </div>

      {links.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Link2 className="h-5 w-5" />}
            title="No payment links yet"
            description="Create one and share it with a client."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                New payment link
              </Button>
            }
          />
        </Panel>
      ) : (
        <Panel className="overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <Link2 className="h-4 w-4 text-cyan" />
            <h2 className="text-[12.5px] font-semibold text-ink">Your links</h2>
          </div>
          <div className="divide-y divide-line-soft">
            {links.map((link) => (
              <div key={link.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-panel-soft text-cyan">
                  <Link2 className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[12.5px] font-semibold text-ink">
                      {link.title}
                    </p>
                    <StatusPill tone={link.active ? 'green' : 'muted'} dot={link.active}>
                      {link.active ? 'Active' : 'Paused'}
                    </StatusPill>
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {link.note} · {link.id} · created {link.created}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 text-[9.5px] text-muted-dim">
                    <span className="inline-flex items-center gap-1">
                      <QrCode className="h-2.5 w-2.5" /> {link.opens} opens
                    </span>
                    <span>·</span>
                    <span className="truncate">paytrust.demo/pay/{link.id.toLowerCase()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-semibold text-ink">
                    {formatINR(link.amount)}
                  </div>
                  <div className="text-[9px] text-muted-dim">Protected</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="xs" onClick={() => copy(link)}>
                    {copiedId === link.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={link.active ? 'Pause link' : 'Activate link'}
                    onClick={() =>
                      setLinks((current) =>
                        current.map((item) =>
                          item.id === link.id
                            ? { ...item, active: !item.active }
                            : item
                        )
                      )
                    }
                  >
                    <Wallet className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete link"
                    onClick={() => {
                      setLinks((current) => current.filter((item) => item.id !== link.id));
                      pushToast('Payment link deleted', {
                        description: 'Existing records are unaffected.',
                        tone: 'info',
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <ShieldCheck className="h-2.5 w-2.5" />
        Opening a link never sends money by itself · the payer must confirm
      </p>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New payment link"
        description="The link opens a named demo record for the payer."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={create}
              disabled={!title.trim() || !Number(amount)}
            >
              Create link
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="link-title">Title</FieldLabel>
            <TextInput
              id="link-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Brand identity sprint"
            />
          </div>
          <div>
            <FieldLabel htmlFor="link-amount">Amount (INR)</FieldLabel>
            <TextInput
              id="link-amount"
              type="number"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="18000"
            />
          </div>
          <div>
            <FieldLabel htmlFor="link-note">Description</FieldLabel>
            <TextArea
              id="link-note"
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What does this payment cover?"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
