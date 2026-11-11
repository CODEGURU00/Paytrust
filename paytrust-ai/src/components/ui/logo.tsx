import Link from 'next/link';
import { cn } from '@/lib/utils';

export function PayTrustMark({
  size = 36,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[11px]',
        className
      )}
      style={{
        width: size,
        height: size,
        background:
          'linear-gradient(145deg, #22d3ee 0%, #38bdf8 34%, #4c7dff 100%)',
        boxShadow:
          '0 6px 18px -8px rgba(34,211,238,0.55), inset 0 1px 0 rgba(255,255,255,0.32)',
      }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 2.8 20 6v5.7c0 4.6-3.1 8.2-8 9.5-4.9-1.3-8-4.9-8-9.5V6l8-3.2Z"
          fill="#ffffff"
          fillOpacity="0.96"
        />
        <circle cx="12" cy="11" r="2.1" fill="#0b6fa4" />
        <path
          d="M12 12.4v3.4"
          stroke="#0b6fa4"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function PayTrustLogo({
  size = 34,
  wordmark = true,
  className,
  textClassName,
}: {
  size?: number;
  wordmark?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <PayTrustMark size={size} />
      {wordmark && (
        <span
          className={cn(
            'text-[19px] font-semibold tracking-[-0.02em] text-ink',
            textClassName
          )}
        >
          PayTrust <span className="text-cyan">AI</span>
        </span>
      )}
    </span>
  );
}

export function LogoLink({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} aria-label="PayTrust AI home" className="inline-flex">
      <PayTrustLogo />
    </Link>
  );
}
