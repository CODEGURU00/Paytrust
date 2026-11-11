'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { FieldLabel, TextInput } from '@/components/ui/form';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      setSent(true);
    }, 900);
  };

  if (sent) {
    return (
      <AuthShell
        eyebrow="Check your inbox"
        title="Reset link ready"
        description={`If an account exists for ${email}, a password reset link would be sent. This is a demo, so nothing was emailed.`}
        footer={
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-cyan-soft hover:text-cyan"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        }
      >
        <div className="flex flex-col items-center rounded-xl border border-green/20 bg-green/[0.05] px-5 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-green/25 bg-green/[0.1] text-green-soft">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[12.5px] font-medium text-ink">
            Demo reset requested
          </p>
          <p className="mt-1 max-w-xs text-[10.5px] leading-relaxed text-muted">
            In production, the link expires after 30 minutes and can be used once.
            The demo workspace remains accessible without signing in.
          </p>
          <Link href="/dashboard" className="mt-3">
            <Button variant="secondary" size="sm">
              Continue to the demo
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      description="Enter the email on your PayTrust account. We will send a single-use reset link."
      footer={
        <p className="text-[11.5px] text-muted">
          Remembered it?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-cyan-soft hover:text-cyan hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="reset-email">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted" />
              Email
            </span>
          </FieldLabel>
          <TextInput
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <Button type="submit" className="w-full" isLoading={busy}>
          Send reset link
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="flex items-start justify-center gap-1.5 text-center text-[9px] leading-relaxed text-muted-dim">
          <ShieldCheck className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          Demo flow · no email is sent and no password can be changed from here.
        </p>
      </form>
    </AuthShell>
  );
}
