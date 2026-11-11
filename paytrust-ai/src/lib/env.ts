function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill it in.`
    );
  }
  return value;
}

export function getSupabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export function getSupabaseServiceRoleKey(): string {
  return requireEnv('SUPABASE_SERVICE_ROLE_KEY');
}

export function getAppUrl(requestUrl?: string): string {
  const configured = readEnv('NEXT_PUBLIC_APP_URL');
  if (configured) return configured.replace(/\/+$/, '');

  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // Fall through to localhost.
    }
  }

  return 'http://localhost:3000';
}

export function getPayPalEnvironment(): 'sandbox' | 'live' {
  return readEnv('PAYPAL_ENV') === 'live' ? 'live' : 'sandbox';
}

export function getPayPalApiBase(): string {
  return getPayPalEnvironment() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}
