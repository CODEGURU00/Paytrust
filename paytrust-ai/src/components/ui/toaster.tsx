'use client';

import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { cn } from '@/lib/utils';

const toneStyles = {
  success: {
    icon: CheckCircle2,
    ring: 'border-green/25',
    iconClass: 'text-green',
    bar: 'bg-green',
  },
  info: {
    icon: Info,
    ring: 'border-brand/25',
    iconClass: 'text-[#8fb0ff]',
    bar: 'bg-brand',
  },
  warning: {
    icon: TriangleAlert,
    ring: 'border-amber/25',
    iconClass: 'text-amber',
    bar: 'bg-amber',
  },
  error: {
    icon: XCircle,
    ring: 'border-red/25',
    iconClass: 'text-red',
    bar: 'bg-red',
  },
};

export function Toaster() {
  const { toasts, dismissToast } = useDemo();

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[120] flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end sm:p-0"
    >
      {toasts.map((toast) => {
        const style = toneStyles[toast.tone];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-xl border bg-[#0c1627]/95 p-3.5 pl-4 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md animate-slide-up',
              style.ring
            )}
          >
            <span
              className={cn(
                'absolute inset-y-3 left-0 w-[2px] rounded-full',
                style.bar
              )}
            />
            <div className="flex items-start gap-3">
              <Icon
                className={cn('mt-0.5 h-4 w-4 shrink-0', style.iconClass)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-5 text-ink">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-dim transition-colors hover:bg-white/[0.06] hover:text-ink"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
