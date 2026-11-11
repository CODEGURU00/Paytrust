'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useSelectedLayoutSegments } from 'next/navigation';
import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { CommandPalette } from '@/components/shell/command-palette';
import { QuickActionsProvider } from '@/components/shell/quick-actions';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

function isFocusedRoute(pathname: string | null, segments: string[]) {
  if (segments && segments.length > 0) {
    const [first, second] = segments;
    if (first === 'deals') return true;
    if (first === 'transactions' && second) return true;
    if (first === 'trust' || first === 'community' || first === 'support') return true;
  }
  if (pathname) {
    const clean = pathname.replace(/\/+$/, '');
    if (/^\/transactions\/[^/]+$/.test(clean)) return true;
    if (clean.startsWith('/deals/')) return true;
    if (clean === '/trust' || clean.startsWith('/trust/')) return true;
    if (clean === '/community' || clean.startsWith('/community/')) return true;
    if (clean === '/support' || clean.startsWith('/support/')) return true;
  }
  return false;
}

export function AppShell({
  children,
  displayName,
  email,
  signedIn,
}: {
  children: React.ReactNode;
  displayName: string;
  email: string;
  signedIn: boolean;
}) {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  const focused = isFocusedRoute(pathname, segments);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <QuickActionsProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <div className="min-h-screen bg-canvas">
        {!focused && (
          <Suspense fallback={null}>
            <Sidebar mobileOpen={mobileOpen} onCloseMobile={closeMobile} />
          </Suspense>
        )}
        <div
          className={cn(
            'flex min-h-screen flex-col',
            !focused && 'lg:pl-[262px]'
          )}
        >
          {!focused && (
            <Topbar
              displayName={displayName}
              email={email}
              signedIn={signedIn}
              onOpenSearch={openSearch}
              onOpenMobile={openMobile}
            />
          )}
          <main
            id="main-content"
            className={cn(
              'flex-1',
              !focused &&
                'mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7'
            )}
          >
            {children}
          </main>
        </div>
      </div>

      <CommandPalette open={searchOpen} onClose={closeSearch} />
      <Toaster />
    </QuickActionsProvider>
  );
}
