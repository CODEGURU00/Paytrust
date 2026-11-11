import * as React from 'react';
import { cn } from '@/lib/utils';

export function Panel({
  className,
  children,
  interactive = false,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'panel',
        interactive && 'panel-interactive hover:bg-panel-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 px-5 pt-5',
        className
      )}
    >
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'mb-6 flex flex-wrap items-end justify-between gap-4',
        className
      )}
    >
      <div>
        {eyebrow && (
          <div className="mb-1.5 text-[12px] font-medium text-muted">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.025em] text-ink">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-dim">
      {children}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-line-soft', className)} />;
}

export function InfoBanner({
  icon,
  children,
  tone = 'info',
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: 'info' | 'warning' | 'danger' | 'success';
  className?: string;
}) {
  const tones = {
    info: 'border-brand/20 bg-brand/[0.055] text-ink-soft',
    warning: 'border-amber/20 bg-amber/[0.055] text-amber-soft/90',
    danger: 'border-red/20 bg-red/[0.055] text-red-soft/90',
    success: 'border-green/20 bg-green/[0.055] text-green-soft/90',
  };
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px] leading-relaxed',
        tones[tone],
        className
      )}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-panel-soft text-muted">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
