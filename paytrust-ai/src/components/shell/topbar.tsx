'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { createClient } from '@/lib/supabase/client';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { cn } from '@/lib/utils';

const notificationIcons = {
  info: Info,
  warning: TriangleAlert,
  success: CheckCircle2,
};

export function Topbar({
  displayName,
  email,
  signedIn,
  onOpenSearch,
  onOpenMobile,
}: {
  displayName: string;
  email: string;
  signedIn: boolean;
  onOpenSearch: () => void;
  onOpenMobile: () => void;
}) {
  const router = useRouter();
  const { notifications, markNotificationRead, markAllNotificationsRead, resetDemo } =
    useDemo();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const unread = notifications.filter((notification) => !notification.read).length;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      /* Demo entry is not authenticated; still return to sign-in. */
    }
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-line-soft bg-canvas/85 px-4 backdrop-blur-xl lg:px-7">
      <button
        type="button"
        onClick={onOpenMobile}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-white/[0.05] hover:text-ink lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>

      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-[15px] font-semibold text-ink lg:hidden"
      >
        PayTrust <span className="text-cyan">AI</span>
      </Link>

      <button
        type="button"
        onClick={onOpenSearch}
        className="group hidden h-10 max-w-[420px] flex-1 items-center gap-2.5 rounded-[10px] border border-line bg-panel px-3.5 text-left text-[13px] text-muted-dim transition-colors hover:border-line-strong hover:text-muted sm:flex"
        aria-label="Search transactions, people, promises"
      >
        <Search className="h-[15px] w-[15px] shrink-0" />
        <span className="min-w-0 flex-1 truncate">
          Search transactions, people, promises…
        </span>
        <span className="kbd ml-1">⌘K</span>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-white/[0.05] hover:text-ink sm:hidden"
          aria-label="Search"
        >
          <Search className="h-[17px] w-[17px]" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            className={cn(
              'relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
              notificationsOpen
                ? 'border-line-strong bg-panel-soft text-ink'
                : 'border-transparent text-muted hover:bg-white/[0.05] hover:text-ink'
            )}
            aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-[17px] w-[17px]" />
            {unread > 0 && (
              <span className="absolute right-[7px] top-[7px] h-[7px] w-[7px] rounded-full border-2 border-canvas bg-cyan" />
            )}
          </button>

          {notificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotificationsOpen(false)}
                aria-hidden="true"
              />
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[360px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border border-line bg-[#0c1627] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] animate-scale-in">
                <div className="flex items-center justify-between border-b border-line-soft px-4 py-3">
                  <div>
                    <h3 className="text-[13px] font-semibold text-ink">
                      Notifications
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {unread > 0 ? `${unread} unread` : 'You are caught up'}
                    </p>
                  </div>
                  {unread > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-[11px] font-medium text-cyan-soft hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {notifications.map((notification) => {
                    const Icon = notificationIcons[notification.tone];
                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => {
                          markNotificationRead(notification.id);
                          setNotificationsOpen(false);
                          router.push(notification.href);
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 border-b border-line-soft/60 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03]',
                          !notification.read && 'bg-brand/[0.035]'
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                            notification.tone === 'warning'
                              ? 'border-amber/20 bg-amber/[0.07] text-amber'
                              : notification.tone === 'success'
                                ? 'border-green/20 bg-green/[0.07] text-green'
                                : 'border-brand/20 bg-brand/[0.07] text-[#8fb0ff]'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-[12.5px] font-medium text-ink">
                              {notification.title}
                            </span>
                            {!notification.read && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                            )}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-relaxed text-muted">
                            {notification.body}
                          </span>
                          <span className="mt-1 block text-[10px] text-muted-dim">
                            {notification.timeLabel}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-1.5 rounded-full transition-opacity hover:opacity-90"
            aria-label="Open profile menu"
            aria-expanded={profileOpen}
          >
            <PersonAvatar
              person={{ name: displayName, avatar: 'arjun' }}
              size="md"
              className="ring-1 ring-white/10"
            />
            <ChevronDown className="hidden h-3 w-3 text-muted sm:block" />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
                aria-hidden="true"
              />
              <div
                ref={menuRef}
                className="absolute right-0 top-[calc(100%+10px)] z-50 w-[264px] overflow-hidden rounded-xl border border-line bg-[#0c1627] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] animate-scale-in"
              >
                <div className="border-b border-line-soft px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-ink">
                      {displayName}
                    </span>
                    <span className="rounded-full border border-cyan/20 bg-cyan/[0.06] px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-cyan-soft">
                      {signedIn ? 'Verified' : 'Demo'}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] text-muted">{email}</p>
                </div>
                <div className="p-1.5">
                  <MenuLink
                    href="/trust"
                    icon={ShieldCheck}
                    label="Your Trust Passport"
                    onClick={() => setProfileOpen(false)}
                  />
                  <MenuLink
                    href="/settings"
                    icon={Settings}
                    label="Account settings"
                    onClick={() => setProfileOpen(false)}
                  />
                  <MenuLink
                    href="/dashboard"
                    icon={LayoutDashboard}
                    label="Demo workspace"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="my-1 h-px bg-line-soft" />
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      resetDemo();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-muted" />
                    Reset demo data
                  </button>
                  {signedIn ? (
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-red-soft transition-colors hover:bg-red/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                  ) : (
                    <Link
                      href="/auth/login"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
                    >
                      <UserRound className="h-3.5 w-3.5 text-muted" />
                      Sign in to an account
                    </Link>
                  )}
                </div>
                <div className="border-t border-line-soft px-4 py-2 text-[10px] text-muted-dim">
                  Prototype · all funds simulated
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
  onClick,
}: {
  href: string;
  icon: typeof ShieldCheck;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] text-ink-soft transition-colors hover:bg-white/[0.05] hover:text-ink"
    >
      <Icon className="h-3.5 w-3.5 text-muted" />
      {label}
    </Link>
  );
}
