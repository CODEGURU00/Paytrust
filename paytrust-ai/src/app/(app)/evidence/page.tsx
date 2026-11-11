'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Download,
  FileText,
  FileLock2,
  Filter,
  Image as ImageIcon,
  Link2,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { PageHeader, Panel, EmptyState } from '@/components/ui/panel';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextInput } from '@/components/ui/form';
import type { DemoEvidence } from '@/lib/demo/types';
import { cn } from '@/lib/utils';

const kindMeta = {
  receipt: { label: 'Receipt', icon: Receipt, tone: 'green' as const },
  image: { label: 'Image', icon: ImageIcon, tone: 'cyan' as const },
  file: { label: 'File', icon: FileText, tone: 'blue' as const },
};

export default function EvidencePage() {
  const { evidence, transactions, addEvidence, pushToast } = useDemo();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | DemoEvidence['kind']>('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<DemoEvidence | null>(null);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('TX-48213');
  const [uploadKind, setUploadKind] = useState<DemoEvidence['kind']>('file');

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return evidence.filter((item) => {
      const matchesKind = kind === 'all' || item.kind === kind;
      const matchesSearch =
        !search ||
        item.name.toLowerCase().includes(search) ||
        item.transactionId.toLowerCase().includes(search) ||
        item.uploadedBy.toLowerCase().includes(search);
      return matchesKind && matchesSearch;
    });
  }, [evidence, kind, query]);

  const counts = {
    receipts: evidence.filter((item) => item.kind === 'receipt').length,
    images: evidence.filter((item) => item.kind === 'image').length,
    files: evidence.filter((item) => item.kind === 'file').length,
  };

  const upload = () => {
    if (!name.trim()) return;
    addEvidence(target, {
      name: name.trim(),
      kind: uploadKind,
      sizeLabel: 'Demo file · 120 KB',
    });
    setName('');
    setUploadOpen(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Transactions"
        title="Evidence Vault"
        description="Timestamped files tied to the transaction they support."
        action={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-3.5 w-3.5" />
            Add evidence
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          ['All evidence', evidence.length, FileLock2, 'text-cyan'],
          ['Receipts', counts.receipts, Receipt, 'text-green-soft'],
          ['Images', counts.images, ImageIcon, 'text-violet'],
          ['Files', counts.files, FileText, 'text-[#9fbbff]'],
        ] as [string, number, LucideIcon, string][]).map(([label, value, Icon, tone]) => (
          <Panel key={label as string} className="flex items-center gap-3 p-3.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025]">
              <Icon className={cn('h-4 w-4', tone as string)} />
            </span>
            <div>
              <div className="text-[17px] font-semibold text-ink">
                {value as number}
              </div>
              <div className="text-[9.5px] text-muted">{label as string}</div>
            </div>
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
              placeholder="Search evidence, record or uploader…"
              aria-label="Search evidence"
              className="h-8 w-full rounded-lg border border-line bg-white/[0.02] pl-8 pr-2 text-[11.5px] text-ink placeholder:text-muted-dim focus:border-cyan/30 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            {(['all', 'receipt', 'image', 'file'] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setKind(item)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[10.5px] font-medium capitalize transition-colors',
                  kind === item
                    ? 'bg-white/[0.07] text-ink'
                    : 'text-muted hover:text-ink-soft'
                )}
              >
                {item === 'all' ? 'All' : `${item}s`}
              </button>
            ))}
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Evidence filters"
              onClick={() =>
                pushToast('Evidence is filterable by type', {
                  description: 'Use the tabs above to narrow the vault.',
                  tone: 'info',
                })
              }
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<FileLock2 className="h-5 w-5" />}
            title="No evidence in this view"
            description="Upload a receipt or file to keep it with the transaction record."
            action={
              <Button size="sm" onClick={() => setUploadOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add evidence
              </Button>
            }
          />
        ) : (
          <div className="grid gap-2.5 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const meta = kindMeta[item.kind];
              const tx = transactions.find((t) => t.id === item.transactionId);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className="group flex flex-col rounded-xl border border-line bg-white/[0.015] p-3 text-left transition-colors hover:border-cyan/25 hover:bg-cyan/[0.025]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border',
                        item.preview === 'blaze'
                          ? 'border-orange-400/30 bg-orange-400/[0.08] text-orange-300'
                          : item.preview === 'monogram'
                            ? 'border-teal-300/30 bg-teal-300/[0.08] text-teal-200'
                            : 'border-line bg-panel-soft text-cyan'
                      )}
                    >
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11.5px] font-medium text-ink group-hover:text-cyan-soft">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-[9.5px] text-muted">
                    {item.sizeLabel} · {item.dateLabel}
                  </p>
                  <div className="mt-2 flex items-center justify-between border-t border-line-soft pt-2">
                    <span className="truncate text-[9px] text-muted-dim">
                      {tx?.title || item.transactionId} · {item.uploadedBy}
                    </span>
                    <ShieldCheck className="h-3 w-3 shrink-0 text-green-soft/70" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-muted-dim">
        <ShieldCheck className="h-2.5 w-2.5" />
        Evidence is timestamped and visible only to the parties on the record
      </p>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.name}
        description={selected ? `${selected.transactionId} · ${selected.dateLabel}` : ''}
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-2">
            <Link href={selected ? `/transactions/${selected.transactionId}` : '/transactions'}>
              <Button variant="ghost" size="sm">
                Open record
              </Button>
            </Link>
            <Button
              size="sm"
              onClick={() => {
                pushToast('Evidence download started (demo)', {
                  description: selected?.name,
                  tone: 'info',
                });
                setSelected(null);
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-3">
            <div className="flex h-32 items-center justify-center rounded-xl border border-line bg-[#060b16]">
              <div className="text-center">
                {selected.preview === 'blaze' ? (
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-rose-500 text-[18px] font-bold text-white">
                    B
                  </div>
                ) : (
                  <MetaFallback kind={selected.kind} />
                )}
                <p className="mt-2 text-[9px] uppercase tracking-wider text-muted-dim">
                  Demo preview
                </p>
              </div>
            </div>
            <dl className="space-y-1.5 text-[11px]">
              {[
                ['Uploaded by', selected.uploadedBy],
                ['Size', selected.sizeLabel],
                ['Linked record', selected.transactionId],
                ['Visibility', 'Both parties'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-right text-ink-soft">{value}</dd>
                </div>
              ))}
            </dl>
            {selected.note && (
              <p className="rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2 text-[10.5px] leading-relaxed text-muted">
                {selected.note}
              </p>
            )}
            <div className="flex items-start gap-2 rounded-lg border border-green/15 bg-green/[0.04] px-2.5 py-2">
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-green-soft" />
              <p className="text-[9.5px] leading-relaxed text-muted">
                This file cannot be edited after upload. A new version creates a
                new timestamped entry.
              </p>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Add evidence"
        description="Attach a file to a demo transaction."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={upload} disabled={!name.trim()}>
              Add to vault
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="evidence-name">File name</FieldLabel>
            <TextInput
              id="evidence-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Final-delivery.pdf"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel htmlFor="evidence-kind">Type</FieldLabel>
              <select
                id="evidence-kind"
                value={uploadKind}
                onChange={(event) =>
                  setUploadKind(event.target.value as DemoEvidence['kind'])
                }
                className="field h-10 w-full"
              >
                <option value="file">File</option>
                <option value="image">Image</option>
                <option value="receipt">Receipt</option>
              </select>
            </div>
            <div>
              <FieldLabel htmlFor="evidence-target">Transaction</FieldLabel>
              <select
                id="evidence-target"
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                className="field h-10 w-full"
              >
                {transactions.map((tx) => (
                  <option key={tx.id} value={tx.id}>
                    {tx.id} · {tx.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-muted-dim">
            <Link2 className="mt-0.5 h-3 w-3 shrink-0" />
            In production this would open a file picker. The demo records the
            metadata only.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function MetaFallback({ kind }: { kind: DemoEvidence['kind'] }) {
  if (kind === 'receipt') return <Receipt className="mx-auto h-10 w-10 text-green-soft/70" />;
  if (kind === 'image') return <ImageIcon className="mx-auto h-10 w-10 text-violet/70" />;
  return <FileText className="mx-auto h-10 w-10 text-cyan/70" />;
}
