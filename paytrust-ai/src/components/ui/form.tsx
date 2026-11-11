'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function FieldLabel({
  htmlFor,
  children,
  hint,
  className,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('mb-1.5 flex items-center justify-between gap-3', className)}>
      <label
        htmlFor={htmlFor}
        className="text-[12px] font-medium text-ink-soft"
      >
        {children}
      </label>
      {hint && <span className="text-[11px] text-muted-dim">{hint}</span>}
    </div>
  );
}

export const TextInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('field h-10 py-2', className)} {...props} />
));
TextInput.displayName = 'TextInput';

export const TextArea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn('field min-h-[96px] resize-y', className)}
    {...props}
  />
));
TextArea.displayName = 'TextArea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      className={cn(
        'field h-10 appearance-none py-2 pr-9',
        className
      )}
      {...props}
    >
      {children}
    </select>
    <svg
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
));
Select.displayName = 'Select';

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start justify-between gap-4',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {(label || description) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-[13px] font-medium text-ink">
              {label}
            </span>
          )}
          {description && (
            <span className="mt-0.5 block text-[12px] leading-relaxed text-muted">
              {description}
            </span>
          )}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : 'Toggle setting'}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        data-on={checked}
        className="switch mt-0.5"
      />
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
          checked
            ? 'border-brand bg-brand text-white'
            : 'border-line-strong bg-transparent'
        )}
      >
        {checked && (
          <svg
            viewBox="0 0 12 12"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              d="m2.5 6.2 2.2 2.2 4.8-4.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <span onClick={() => !disabled && onChange(!checked)}>{label}</span>
    </label>
  );
}
