'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PayTrustMark } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

export function WorkspaceHeader({
  backHref,
  breadcrumb,
  title,
  description,
  badge,
  actions,
  nav,
  className,
}: {
  backHref?: string;
  breadcrumb?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  nav?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-line-soft bg-[#060b16]/92 backdrop-blur-xl',
        className
      )}
    >
      <div className="mx-auto flex min-h-[72px] w-full max-w-[1680px] flex-wrap items-center gap-2.5 px-4 py-3 sm:px-6">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white/[0.03] text-muted transition-colors hover:bg-white/[0.06] hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}

        <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
          <PayTrustMark size={30} />
          <span className="hidden text-[14px] font-semibold tracking-[-0.01em] text-ink md:inline">
            PayTrust <span className="text-cyan">AI</span>
          </span>
        </Link>

        {nav && (
          <>
            <span className="mx-1 hidden text-muted-dim xl:inline">/</span>
            <div className="hidden items-center gap-4 whitespace-nowrap xl:flex">
              {nav}
            </div>
          </>
        )}

        <div className="mx-1 h-5 w-px shrink-0 bg-line" />

        {/*
          On a narrow screen the title takes its own line. It used to share
          one line with the actions, which left it 0px wide - the title of
          the record you are looking at was invisible on a phone.
        */}
        <div className="order-last min-w-0 basis-full overflow-hidden sm:order-none sm:basis-auto sm:flex-1">
          {breadcrumb && (
            <div className="truncate text-[10.5px] font-medium text-muted-dim">
              {breadcrumb}
            </div>
          )}
          <div className="flex min-w-0 items-center gap-2">
            {/*
              The page title is the page's single h1. It used to be a
              <span>, which left the workspace with no heading at all -
              bad for screen readers, and it broke the E2E assertion that
              looks for the transaction title as a level-1 heading.
            */}
            <h1 className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink sm:text-[16px]">
              {title}
            </h1>
            {badge && <span className="shrink-0">{badge}</span>}
          </div>
          {description && (
            <p className="mt-0.5 truncate text-[11px] text-muted">{description}</p>
          )}
        </div>

        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}

export function HeaderNavLink({
  href,
  children,
  active,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'text-[12.5px] font-medium whitespace-nowrap transition-colors',
        active ? 'text-ink' : 'text-muted hover:text-ink-soft'
      )}
    >
      {children}
    </Link>
  );
}
