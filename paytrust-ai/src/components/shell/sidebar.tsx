'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { navGroups } from '@/components/shell/nav-config';
import { useDemo } from '@/components/demo/demo-provider';
import { LogoLink } from '@/components/ui/logo';
import { cn } from '@/lib/utils';

export function Sidebar({
  mobileOpen,
  onCloseMobile,
}: {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { notifications, transactions } = useDemo();
  const unread = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    onCloseMobile();
  }, [pathname, onCloseMobile]);

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-line-soft px-5">
        <LogoLink href="/dashboard" />
        <button
          type="button"
          onClick={onCloseMobile}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-white/[0.06] hover:text-ink lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Primary navigation"
      >
        {navGroups.map((group, groupIndex) => (
          <div
            key={group.label}
            className={cn(groupIndex > 0 && 'mt-5')}
          >
            <div className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.15em] text-muted-dim/90">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                /*
                 * "Deal DNA" points at a transaction, and the transaction id
                 * changes every time the demo database is re-seeded. It used
                 * to be hardcoded, which made the link lead to "Deal not
                 * found" after every seed. It now resolves to the first
                 * transaction in the workspace.
                 */
                const href =
                  item.href === '/deals'
                    ? transactions[0]
                      ? `/deals/${transactions[0].id}`
                      : '/transactions'
                    : item.href;
                const isActive =
                  pathname === href ||
                  (item.match ? pathname.startsWith(item.match) : false);
                const showBadge = item.badge === 'messages' && unread > 0;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'group flex h-[33px] items-center gap-2.5 rounded-lg px-3 text-[12.5px] font-medium transition-all duration-150',
                      isActive
                        ? 'bg-[#152647] text-ink shadow-[inset_0_0_0_1px_rgba(76,125,255,0.12)]'
                        : 'text-muted hover:bg-white/[0.04] hover:text-ink-soft'
                    )}
                  >
                    <item.icon
                      className={cn(
                        'h-[15px] w-[15px] shrink-0 transition-colors',
                        isActive
                          ? 'text-[#8fb0ff]'
                          : 'text-muted-dim group-hover:text-muted'
                      )}
                      strokeWidth={1.8}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {item.label}
                    </span>
                    {showBadge && (
                      <span className="flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brand px-1 text-[9.5px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-line-soft p-3">
        <div className="rounded-xl border border-amber/20 bg-amber/[0.04] p-3">
          <div className="flex items-center gap-1.5">
            <TriangleAlert className="h-3.5 w-3.5 text-amber" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-soft">
              Demo mode
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-[1.55] text-muted">
            All payments are simulated. No real money, UPI or bank rails are
            used.
          </p>
          <Link
            href="/settings"
            className="mt-2 inline-flex text-[10.5px] font-medium text-cyan-soft hover:underline"
          >
            Learn about demo mode
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[262px] border-r border-line bg-[#070e1b] lg:block">
        {content}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px] animate-fade-in"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-[280px] border-r border-line bg-[#070e1b] shadow-2xl animate-slide-up">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
