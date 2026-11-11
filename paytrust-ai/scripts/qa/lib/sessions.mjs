import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServerClient } from '@supabase/ssr';

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
);

export function loadEnv() {
  const env = {};
  for (const file of ['.env.local', '.env']) {
    const filePath = path.join(ROOT, file);
    if (!fs.existsSync(filePath)) continue;
    for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator).trim();
      let value = line.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (env[key] === undefined) env[key] = value;
    }
  }
  return env;
}

export function requiredEnv(name) {
  const env = loadEnv();
  const value = env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}

export async function createSessionCookie(email, password) {
  const env = loadEnv();
  const jar = new Map();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/+$/, ''),
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return [...jar.entries()].map(([name, value]) => ({ name, value }));
        },
        setAll(cookies) {
          for (const { name, value } of cookies) jar.set(name, value);
        },
      },
    }
  );

  /*
   * The auth endpoint occasionally fails with a transport error from this
   * network ("fetch failed"). A single blip used to abort the whole sweep
   * before any check ran, so a transient failure is retried a couple of
   * times before it is treated as a real sign-in failure.
   */
  const MAX_SIGN_IN_ATTEMPTS = 3;
  let data;
  let error;

  for (let attempt = 1; attempt <= MAX_SIGN_IN_ATTEMPTS; attempt++) {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    data = result.data;
    error = result.error;

    if (!error) break;

    const isTransportError = /fetch failed|network|socket hang up|ECONNRESET|ETIMEDOUT/i.test(
      error.message
    );
    if (!isTransportError || attempt === MAX_SIGN_IN_ATTEMPTS) break;

    await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
  }

  if (error) {
    throw new Error(`Sign-in failed for ${email}: ${error.message}`);
  }

  const cookieHeader = [...jar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');

  return {
    cookieHeader,
    userId: data.user.id,
    email: data.user.email,
    supabase,
  };
}

export async function appFetch(cookieHeader, pathname, options = {}) {
  const baseUrl =
    process.env.QA_APP_URL ||
    loadEnv().NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  const headers = new Headers(options.headers || {});
  if (cookieHeader) headers.set('cookie', cookieHeader);
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const response = await fetch(new URL(pathname, baseUrl), {
    ...options,
    headers,
    redirect: options.redirect || 'manual',
  });

  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    body = await response.json().catch(() => null);
  } else {
    body = await response.text().catch(() => null);
  }

  return { response, status: response.status, body };
}
