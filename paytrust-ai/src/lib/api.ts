import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getErrorMessage,
  isProviderQuotaError,
  providerRetryAfterSeconds,
} from '@/lib/errors';

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/**
 * Failure response for an AI provider call.
 *
 * A quota-exhausted provider (Gemini's free tier allows 20 generate-content
 * requests per day) is not an application error and cannot be fixed by
 * retrying immediately, so it is reported as 503 with a Retry-After hint
 * instead of a generic 502. Every other provider failure stays a 502.
 */
export function failAi(error: unknown, fallback = 'AI request failed') {
  const message = getErrorMessage(error, fallback);

  if (isProviderQuotaError(message)) {
    return NextResponse.json(
      { error: message, code: 'ai_provider_quota_exhausted' },
      {
        status: 503,
        headers: { 'Retry-After': String(providerRetryAfterSeconds(message)) },
      }
    );
  }

  return fail(message, 502);
}

export async function getAuthContext(request?: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return { supabase, user };
  }

  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwt = authHeader.slice(7).trim();
      if (jwt) {
        const { data: jwtUser } = await supabase.auth.getUser(jwt);
        if (jwtUser?.user) {
          return { supabase, user: jwtUser.user };
        }
      }
    }
  }

  return { supabase, user: null };
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { response: NextResponse }> {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      response: fail(parsed.error.issues[0]?.message || 'Invalid input', 400),
    };
  }

  return { data: parsed.data };
}

export function failZod(error: z.ZodError) {
  return fail(error.issues[0]?.message || 'Invalid input', 400);
}
