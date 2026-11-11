'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  Laptop,
  Lock,
  LogOut,
  Mail,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react';
import { useDemo } from '@/components/demo/demo-provider';
import { signOut } from '@/actions/auth';
import { PageHeader, Panel } from '@/components/ui/panel';
import { PersonAvatar } from '@/components/ui/person-avatar';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FieldLabel, TextInput } from '@/components/ui/form';
import { formatINR } from '@/lib/demo/format';
import { cn } from '@/lib/utils';

const privacyRows = [
  {
    key: 'showCompletedDeals' as const,
    title: 'Show completed deal count',
    note: 'A number on your shared passport — never the deal details.',
    icon: CheckCircle2,
  },
  {
    key: 'showMilestones' as const,
    title: 'Show earned milestones',
    note: 'Milestones are earned from outcomes, not bought.',
    icon: CheckCircle2,
  },
  {
    key: 'showResponseTime' as const,
    title: 'Show median response time',
    note: 'Based on first replies inside PayTrust records.',
    icon: CheckCircle2,
  },
  {
    key: 'showInCommunity' as const,
    title: 'List me in the community',
    note: 'Your name can appear in contributor lists.',
    icon: CheckCircle2,
  },
  {
    key: 'shareEvidence' as const,
    title: 'Attach evidence to shared records',
    note: 'Off by default. Evidence stays with the transaction either way.',
    icon: CheckCircle2,
  },
];

const notificationRows = [
  {
    key: 'productUpdates' as const,
    title: 'Product updates',
    note: 'Occasional notes about new trust features.',
    icon: BellRing,
  },
  {
    key: 'paymentReminders' as const,
    title: 'Payment reminders',
    note: 'When a milestone or retainer is waiting on you.',
    icon: BellRing,
  },
  {
    key: 'disputeUpdates' as const,
    title: 'Dispute and review updates',
    note: 'Changes to a case where you are a party.',
    icon: AlertTriangle,
  },
];

export default function SettingsPage() {
  const {
    user,
    privacy,
    updatePrivacy,
    resetDemo,
    transactions,
    evidence,
    project,
    pushToast,
  } = useDemo();
  const [tab, setTab] = useState<'profile' | 'privacy' | 'security' | 'demo'>(
    'profile'
  );
  const [displayName, setDisplayName] = useState(user.name);
  const [twoFactor, setTwoFactor] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetAck, setResetAck] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportDemo = () => {
    try {
      const raw = window.localStorage.getItem('paytrust-demo-state-v1');
      if (!raw) {
        pushToast('Nothing to export yet', {
          description: 'The demo writes to storage after your first action.',
          tone: 'info',
        });
        return;
      }
      const blob = new Blob([raw], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'paytrust-demo-state.json';
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast('Demo data exported', {
        description: 'The local workspace was saved as JSON.',
      });
    } catch {
      pushToast('Could not export the demo data', { tone: 'error' });
    }
  };

  const handleReset = () => {
    if (!resetAck) return;
    setBusy(true);
    setTimeout(() => {
      resetDemo();
      setBusy(false);
      setResetOpen(false);
      setResetAck(false);
    }, 700);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // No live Supabase session is fine in the demo.
    }
    window.location.href = '/auth/login';
  };

  const tabs = [
    { value: 'profile', label: 'Profile', icon: UserRound },
    { value: 'privacy', label: 'Privacy', icon: Eye },
    { value: 'security', label: 'Security', icon: Lock },
    { value: 'demo', label: 'Demo data', icon: RefreshCw },
  ] as const;

  return (
    <div>
      <PageHeader
        eyebrow="Settings"
        title="Security & privacy"
        description="You decide what is shared, what is remembered and what leaves this browser."
        action={
          <StatusPill tone="green" dot>
            Demo workspace
          </StatusPill>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Tabs */}
        <div className="space-y-3">
          <Panel className="p-1.5">
            <nav className="flex gap-1 overflow-x-auto lg:flex-col">
              {tabs.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[11.5px] font-medium transition-colors',
                    tab === item.value
                      ? 'bg-white/[0.07] text-ink'
                      : 'text-muted hover:bg-white/[0.03] hover:text-ink-soft'
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </Panel>

          <Panel className="p-3.5">
            <div className="flex items-center gap-2">
              <PersonAvatar person={user} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[10.5px] font-medium text-ink">
                  {user.name}
                </p>
                <p className="truncate text-[8.5px] text-muted">{user.handle}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-[8.5px] text-green-soft">
              <ShieldCheck className="h-2.5 w-2.5" />
              Identity verified (demo)
            </div>
          </Panel>

          <Panel className="p-3.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-dim">
              At a glance
            </h2>
            <div className="mt-2 space-y-1.5 text-[9.5px]">
              <div className="flex justify-between">
                <span className="text-muted">Records</span>
                <span className="text-ink-soft">{transactions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Evidence</span>
                <span className="text-ink-soft">{evidence.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Milestones</span>
                <span className="text-ink-soft">
                  {project.milestones.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Project value</span>
                <span className="text-ink-soft">{formatINR(project.total)}</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {tab === 'profile' && (
            <>
              <Panel className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-4 border-b border-line-soft px-5 py-4">
                  <PersonAvatar person={user} size="2xl" ring />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[18px] font-semibold text-ink">
                        {user.name}
                      </h2>
                      <StatusPill tone="cyan" dot>
                        Verified
                      </StatusPill>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {user.role} · {user.location}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9.5px] text-muted">
                      <span className="inline-flex items-center gap-1">
                        <Fingerprint className="h-2.5 w-2.5 text-cyan" />
                        PT-2210-AS
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-2.5 w-2.5" />
                        arjun@paytrust.demo
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-2.5 w-2.5" />
                        Mumbai, India
                      </span>
                    </div>
                  </div>
                  <Link href="/trust">
                    <Button variant="secondary" size="sm">
                      View passport
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="settings-name">Display name</FieldLabel>
                    <TextInput
                      id="settings-name"
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                    <TextInput
                      id="settings-email"
                      value="arjun@paytrust.demo"
                      readOnly
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="settings-handle">Public handle</FieldLabel>
                    <TextInput
                      id="settings-handle"
                      value={`@${user.handle}`}
                      readOnly
                      className="opacity-70"
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="settings-location">Location</FieldLabel>
                    <TextInput
                      id="settings-location"
                      defaultValue="Mumbai, India"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-3">
                  <p className="text-[9px] text-muted-dim">
                    Demo profile changes are local and reset with the demo data.
                  </p>
                  <Button
                    size="sm"
                    onClick={() =>
                      pushToast('Profile saved (demo)', {
                        description: `${displayName.trim() || user.name} · local only`,
                        tone: 'success',
                      })
                    }
                    disabled={!displayName.trim()}
                  >
                    Save profile
                  </Button>
                </div>
              </Panel>

              <Panel className="p-5">
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <ShieldCheck className="h-4 w-4 text-green-soft" />
                  Verification
                </h2>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">
                  Identity verification is shown as a badge. Documents are never
                  public and are never included in a shared passport.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {[
                    ['Government ID', 'Verified 2 May', true],
                    ['Email address', 'Verified', true],
                    ['Phone number', 'Verified', true],
                  ].map(([label, note, done]) => (
                    <div
                      key={label as string}
                      className="flex items-center gap-2 rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2"
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full',
                          done
                            ? 'bg-green/12 text-green-soft'
                            : 'bg-white/[0.05] text-muted'
                        )}
                      >
                        <Check className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-[10px] font-medium text-ink-soft">
                          {label as string}
                        </p>
                        <p className="text-[8.5px] text-muted-dim">
                          {note as string}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}

          {tab === 'privacy' && (
            <>
              <Panel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
                  <Eye className="h-4 w-4 text-cyan" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Shared passport
                    </h2>
                    <p className="text-[10px] text-muted">
                      These switches apply to the public view of your Trust
                      Passport.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-line-soft">
                  {privacyRows.map((row) => {
                    const on = privacy[row.key];
                    return (
                      <div
                        key={row.key}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium text-ink-soft">
                            {row.title}
                          </span>
                          <span className="mt-0.5 block text-[9.5px] leading-relaxed text-muted">
                            {row.note}
                          </span>
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={on}
                          aria-label={row.title}
                          onClick={() => {
                            updatePrivacy({ [row.key]: !on });
                            pushToast(
                              on ? 'Hidden from shared view' : 'Included in shared view',
                              { description: row.title, tone: 'info' }
                            );
                          }}
                          className={cn(
                            'relative h-5 w-9 shrink-0 rounded-full transition-colors',
                            on ? 'bg-cyan/80' : 'bg-white/[0.1]'
                          )}
                        >
                          <span
                            className={cn(
                              'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                              on ? 'translate-x-[18px]' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line-soft px-5 py-2.5">
                  <p className="text-[9px] text-muted-dim">
                    Evidence is private unless explicitly opted in.
                  </p>
                  <Link href="/trust">
                    <Button variant="ghost" size="xs">
                      Preview passport
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
                  <BellRing className="h-4 w-4 text-amber" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Notifications
                    </h2>
                    <p className="text-[10px] text-muted">
                      Choose what deserves a nudge. Nothing is sent for real in
                      the demo.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-line-soft">
                  {notificationRows.map((row) => {
                    const on = privacy[row.key];
                    return (
                      <label
                        key={row.key}
                        className="flex cursor-pointer items-center gap-3 px-5 py-3.5"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11.5px] font-medium text-ink-soft">
                            {row.title}
                          </span>
                          <span className="mt-0.5 block text-[9.5px] text-muted">
                            {row.note}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(event) =>
                            updatePrivacy({
                              [row.key]: event.target.checked,
                            })
                          }
                          className="h-4 w-4 accent-cyan"
                        />
                      </label>
                    );
                  })}
                </div>
              </Panel>

              <Panel className="p-4">
                <div className="flex items-start gap-2.5">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-green-soft" />
                  <p className="text-[10px] leading-relaxed text-muted">
                    PayTrust never sells contact data, never ranks people by spend
                    and never shows private messages on a passport. AI summaries
                    cite the record and are always labeled as advisory.
                  </p>
                </div>
              </Panel>
            </>
          )}

          {tab === 'security' && (
            <>
              <Panel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
                  <KeyRound className="h-4 w-4 text-cyan" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Sign-in and sessions
                    </h2>
                    <p className="text-[10px] text-muted">
                      Demo access is local. Live accounts use a Supabase session.
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-line-soft">
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025] text-muted">
                      <Mail className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-ink-soft">
                        Email and password
                      </p>
                      <p className="text-[9.5px] text-muted">
                        arjun@paytrust.demo · demo session
                      </p>
                    </div>
                    <StatusPill tone="green" dot>
                      Active
                    </StatusPill>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025] text-muted">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-ink-soft">
                        Two-step verification
                      </p>
                      <p className="text-[9.5px] text-muted">
                        {twoFactor
                          ? 'On for this demo session'
                          : 'Off · adds a code after your password'}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={twoFactor}
                      aria-label="Toggle two-step verification"
                      onClick={() => {
                        setTwoFactor((current) => !current);
                        pushToast(
                          twoFactor
                            ? 'Two-step verification off (demo)'
                            : 'Two-step verification on (demo)',
                          {
                            description:
                              'No real authentication provider is configured in the demo.',
                            tone: 'info',
                          }
                        );
                      }}
                      className={cn(
                        'relative h-5 w-9 rounded-full transition-colors',
                        twoFactor ? 'bg-cyan/80' : 'bg-white/[0.1]'
                      )}
                    >
                      <span
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                          twoFactor ? 'translate-x-[18px]' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                  <label className="flex cursor-pointer items-center gap-3 px-5 py-3.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025] text-muted">
                      <EyeOff className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-ink-soft">
                        Hide balances on this device
                      </p>
                      <p className="text-[9.5px] text-muted">
                        Useful when screen sharing. Not persisted in the demo.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-cyan"
                      onChange={(event) =>
                        pushToast(
                          event.target.checked
                            ? 'Balances hidden (demo)'
                            : 'Balances visible again',
                          { tone: 'info' }
                        )
                      }
                    />
                  </label>
                </div>
              </Panel>

              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between gap-2 border-b border-line-soft px-5 py-3.5">
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Active sessions
                    </h2>
                    <p className="text-[10px] text-muted">
                      Seeded devices for this demo.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      pushToast('Other sessions cleared (demo)', {
                        description:
                          'No real session was revoked in this demo.',
                        tone: 'info',
                      })
                    }
                  >
                    Revoke others
                  </Button>
                </div>
                <div className="divide-y divide-line-soft">
                  {[
                    {
                      icon: Laptop,
                      title: 'Chrome · Windows',
                      note: 'Mumbai, India · current session',
                      current: true,
                    },
                    {
                      icon: Smartphone,
                      title: 'PayTrust mobile · iPhone',
                      note: 'Mumbai, India · last active 2 days ago',
                      current: false,
                    },
                  ].map((session) => (
                    <div
                      key={session.title}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white/[0.025] text-muted">
                        <session.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-ink-soft">
                          {session.title}
                        </p>
                        <p className="text-[9.5px] text-muted">{session.note}</p>
                      </div>
                      {session.current ? (
                        <StatusPill tone="green" dot>
                          This device
                        </StatusPill>
                      ) : (
                        <Button variant="ghost" size="xs">
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="flex items-start gap-2.5">
                  <LogOut className="mt-0.5 h-4 w-4 text-muted" />
                  <div>
                    <h2 className="text-[12px] font-semibold text-ink">
                      Sign out
                    </h2>
                    <p className="text-[9.5px] text-muted">
                      Demo records stay readable until the demo data is reset.
                    </p>
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </Panel>
            </>
          )}

          {tab === 'demo' && (
            <>
              <Panel className="overflow-hidden">
                <div className="flex items-center gap-2 border-b border-line-soft px-5 py-3.5">
                  <RefreshCw className="h-4 w-4 text-cyan" />
                  <div>
                    <h2 className="text-[13px] font-semibold text-ink">
                      Demo data
                    </h2>
                    <p className="text-[10px] text-muted">
                      Everything is stored in this browser under{' '}
                      <span className="font-mono text-[9px]">
                        paytrust-demo-state-v1
                      </span>
                      .
                    </p>
                  </div>
                </div>
                <div className="grid gap-2 px-5 py-4 sm:grid-cols-3">
                  {[
                    ['Records', transactions.length],
                    ['Evidence files', evidence.length],
                    ['Milestones', project.milestones.length],
                  ].map(([label, value]) => (
                    <div
                      key={label as string}
                      className="rounded-lg border border-line-soft bg-white/[0.02] px-3 py-2.5 text-center"
                    >
                      <div className="text-[17px] font-semibold text-ink">
                        {value as number}
                      </div>
                      <div className="text-[8.5px] uppercase tracking-wide text-muted-dim">
                        {label as string}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft px-5 py-3">
                  <p className="text-[9px] text-muted-dim">
                    Payments, messages and approvals are simulated. No real funds
                    move.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={exportDemo}
                    >
                      <Download className="h-3.5 w-3.5" />
                      Export JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetAck(false);
                        setResetOpen(true);
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset demo
                    </Button>
                  </div>
                </div>
              </Panel>

              <div className="rounded-xl border border-red/20 bg-red/[0.03] p-5">
                <h2 className="flex items-center gap-2 text-[12px] font-semibold text-ink">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-soft" />
                  Reset is local and immediate
                </h2>
                <p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-muted">
                  Resetting restores the seeded Arjun Sharma workspace. Messages,
                  evidence, promises, approvals and notes you added in this
                  browser are discarded. Nothing on a server is affected.
                </p>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-cyan/15 bg-cyan/[0.035] px-3 py-2.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-cyan" />
                <p className="text-[9.5px] leading-relaxed text-muted">
                  Looking for the account suspension flow? Open{' '}
                  <Link href="/support" className="font-medium text-cyan">
                    Support center
                  </Link>{' '}
                  to see the appeal screen. It is a demo case and does not
                  restrict anything.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-5 flex items-center justify-center gap-1.5 text-[10px] text-muted-dim">
        <ShieldCheck className="h-3 w-3" />
        Demo settings · no real identity, bank or notification provider connected
      </p>

      <Modal
        open={resetOpen}
        onClose={() => {
          if (!busy) setResetOpen(false);
        }}
        title="Reset the demo workspace?"
        description="This restores every seeded record. Your local changes will be lost."
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResetOpen(false)}
              disabled={busy}
            >
              Keep my changes
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleReset}
              isLoading={busy}
              disabled={!resetAck}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset demo
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-line bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-relaxed text-muted">
            The following will be restored: {transactions.length} records,{' '}
            {evidence.length} evidence files and {project.milestones.length}{' '}
            milestones. This cannot be undone.
          </div>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line-soft bg-white/[0.015] p-3">
            <input
              type="checkbox"
              checked={resetAck}
              onChange={(event) => setResetAck(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-cyan"
            />
            <span className="text-[10.5px] leading-relaxed text-muted">
              I understand this only resets the demo data in this browser. No real
              payment or account is affected.
            </span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
