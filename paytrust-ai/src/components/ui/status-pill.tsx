import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  AgreementApprovalStatus,
  DemoTransactionStatus,
} from '@/lib/demo/types';

type Tone = 'green' | 'amber' | 'red' | 'cyan' | 'blue' | 'muted' | 'violet';

const toneClasses: Record<Tone, string> = {
  green: 'border-green/20 bg-green/[0.08] text-green-soft',
  amber: 'border-amber/20 bg-amber/[0.08] text-amber-soft',
  red: 'border-red/20 bg-red/[0.08] text-red-soft',
  cyan: 'border-cyan/20 bg-cyan/[0.07] text-cyan-soft',
  blue: 'border-brand/25 bg-brand/[0.09] text-[#9fbbff]',
  muted: 'border-line bg-white/[0.03] text-muted',
  violet: 'border-violet/20 bg-violet/[0.08] text-[#c9b8ff]',
};

const dotClasses: Record<Tone, string> = {
  green: 'bg-green',
  amber: 'bg-amber',
  red: 'bg-red',
  cyan: 'bg-cyan',
  blue: 'bg-brand',
  muted: 'bg-muted-dim',
  violet: 'bg-violet',
};

export function StatusPill({
  tone = 'muted',
  dot = false,
  children,
  className,
  pulse = false,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11px] font-medium leading-[16px]',
        toneClasses[tone],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'status-dot',
            dotClasses[tone],
            pulse && 'animate-pulse-soft'
          )}
        />
      )}
      {children}
    </span>
  );
}

export function transactionStatusMeta(status: DemoTransactionStatus): {
  label: string;
  tone: Tone;
} {
  switch (status) {
    case 'completed':
      return { label: 'Completed', tone: 'green' };
    case 'in_progress':
      return { label: 'In progress', tone: 'green' };
    case 'awaiting_confirmation':
      return { label: 'Awaiting confirmation', tone: 'amber' };
    case 'pending':
      return { label: 'Pending', tone: 'muted' };
    case 'disputed':
      return { label: 'Disputed', tone: 'red' };
    case 'cancelled':
      return { label: 'Cancelled', tone: 'muted' };
    default:
      return { label: status, tone: 'muted' };
  }
}

export function TransactionStatusPill({
  status,
  dot = true,
}: {
  status: DemoTransactionStatus;
  dot?: boolean;
}) {
  const meta = transactionStatusMeta(status);
  return (
    <StatusPill tone={meta.tone} dot={dot} pulse={status === 'in_progress'}>
      {meta.label}
    </StatusPill>
  );
}

export function agreementStatusMeta(status: AgreementApprovalStatus): {
  label: string;
  tone: Tone;
} {
  switch (status) {
    case 'approved':
      return { label: 'Approved by both', tone: 'green' };
    case 'awaiting':
      return { label: 'Awaiting approval', tone: 'amber' };
    case 'awaiting_you':
      return { label: 'Awaiting your approval', tone: 'amber' };
    case 'partial':
      return { label: 'Partial', tone: 'amber' };
    case 'changes_requested':
      return { label: 'Changes requested', tone: 'cyan' };
    case 'cancelled':
      return { label: 'Cancelled by mutual consent', tone: 'muted' };
    default:
      return { label: 'No agreement yet', tone: 'muted' };
  }
}

export function AgreementStatusPill({
  status,
}: {
  status: AgreementApprovalStatus;
}) {
  const meta = agreementStatusMeta(status);
  return <StatusPill tone={meta.tone}>{meta.label}</StatusPill>;
}
