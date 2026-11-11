export interface ContentSecurityPolicyOptions {
  isDevelopment?: boolean;
  supabaseUrl?: string;
}

/**
 * Builds a nonce-based Content Security Policy.
 *
 * Next.js reads the policy from the request headers set by the proxy and
 * forwards the nonce to its own script tags. Styles keep 'unsafe-inline'
 * because Tailwind and React style attributes cannot carry a nonce.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  options: ContentSecurityPolicyOptions = {}
): string {
  const { isDevelopment = false, supabaseUrl } = options;

  const scriptSources = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  if (isDevelopment) {
    scriptSources.push("'unsafe-eval'");
  }

  const connectSources = [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
  ];
  if (supabaseUrl) {
    try {
      const url = new URL(supabaseUrl);
      connectSources.push(url.origin, `wss://${url.host}`);
    } catch {
      // Ignore a malformed URL; wildcard Supabase hosts still apply.
    }
  }

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSources.join(' ')}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(' ')}`,
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];

  if (!isDevelopment) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}
