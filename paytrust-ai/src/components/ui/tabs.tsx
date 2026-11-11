'use client';

import { cn } from '@/lib/utils';

export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
  counts,
  className,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  counts?: Partial<Record<T, number>>;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border font-medium transition-all duration-150',
              size === 'sm' ? 'h-7 px-2.5 text-[11.5px]' : 'h-9 px-3.5 text-[12.5px]',
              active
                ? 'border-brand bg-brand text-white shadow-[0_8px_22px_-14px_rgba(76,125,255,0.9)]'
                : 'border-line bg-transparent text-muted hover:border-line-strong hover:bg-panel-soft hover:text-ink'
            )}
          >
            {option.label}
            {typeof counts?.[option.value] === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-px text-[10px]',
                  active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-muted'
                )}
              >
                {counts[option.value]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-[10px] border border-line bg-panel-soft p-[3px]',
        className
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-7 min-w-10 items-center justify-center rounded-[7px] px-2.5 text-[11.5px] font-medium transition-all',
              active
                ? 'bg-brand text-white shadow-sm'
                : 'text-muted hover:text-ink'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function UnderlineTabs<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-6 border-b border-line-soft', className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex items-center gap-1.5 pb-3 pt-1 text-[13px] font-medium transition-colors',
              active ? 'text-ink' : 'text-muted hover:text-ink-soft'
            )}
          >
            {option.label}
            {typeof option.count === 'number' && (
              <span className="rounded-full bg-white/[0.06] px-1.5 py-px text-[10px] text-muted">
                {option.count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-cyan" />
            )}
          </button>
        );
      })}
    </div>
  );
}
