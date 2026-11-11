'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/actions/auth';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { FieldLabel, TextInput } from '@/components/ui/form';
import { ArrowRight, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');

    const result = await signIn({ email, password });

    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Pick up where the deal left off — the record is waiting."
      footer={
        <p className="text-[11.5px] text-muted">
          New to PayTrust?{' '}
          <Link
            href="/auth/signup"
            className="font-medium text-cyan-soft hover:text-cyan hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <FieldLabel
            htmlFor="password"
            hint={
              <Link
                href="/auth/forgot-password"
                className="font-medium text-cyan-soft hover:text-cyan"
              >
                Forgot password?
              </Link>
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-muted" />
              Password
            </span>
          </FieldLabel>
          <TextInput
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red/25 bg-red/[0.08] px-3 py-2 text-[11.5px] leading-relaxed text-red-soft">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" isLoading={isLoading}>
          Sign in
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-[9.5px] leading-relaxed text-muted-dim">
          Protected by your Supabase session. Demo records remain readable
          without an account.
        </p>
      </form>
    </AuthShell>
  );
}
