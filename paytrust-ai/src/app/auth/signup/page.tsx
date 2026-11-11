'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signUp } from '@/actions/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { FieldLabel, TextInput } from '@/components/ui/form';
import { ArrowRight, CheckCircle2, Mail, Shield, UserRound } from 'lucide-react';

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    const displayName = String(formData.get('display_name') || '');

    const result = await signUp({
      email,
      password,
      display_name: displayName,
    });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccess(
      result.data?.message ||
        'Account created. Check your email to confirm your address.'
    );
  };

  if (success) {
    return (
      <AuthShell
        eyebrow="Account created"
        title="Check your inbox"
        description={success}
        footer={
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-1 text-[11.5px] font-medium text-cyan-soft hover:text-cyan"
          >
            Continue to sign in <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        <div className="flex flex-col items-center rounded-xl border border-green/20 bg-green/[0.05] px-5 py-8 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-green/25 bg-green/[0.1] text-green-soft">
            <CheckCircle2 className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[12.5px] font-medium text-ink">
            You&apos;re one step away
          </p>
          <p className="mt-1 max-w-xs text-[10.5px] leading-relaxed text-muted">
            Confirm your email address, then sign in to connect your live
            Supabase workspace. The demo remains open without an account.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start a trust record"
      description="Build a shared workspace around your next deal. Demo access needs no card."
      footer={
        <p className="text-[11.5px] text-muted">
          Already have an account?{' '}
          <Link
            href="/auth/login"
            className="font-medium text-cyan-soft hover:text-cyan hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <FieldLabel htmlFor="display_name">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3 w-3 text-muted" />
              Display name
            </span>
          </FieldLabel>
          <TextInput
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            minLength={2}
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="email">
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-muted" />
              Email
            </span>
          </FieldLabel>
          <TextInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <FieldLabel htmlFor="password" hint="At least 8 characters">
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-3 w-3 text-muted" />
              Password
            </span>
          </FieldLabel>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red/25 bg-red/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-red-soft">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Create account
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="flex items-start gap-1.5 text-center text-[9px] leading-relaxed text-muted-dim">
          <CheckCircle2 className="mt-0.5 h-2.5 w-2.5 shrink-0" />
          By continuing you agree to the demo terms. No real payments are
          enabled in this workspace.
        </p>
      </form>
    </AuthShell>
  );
}
