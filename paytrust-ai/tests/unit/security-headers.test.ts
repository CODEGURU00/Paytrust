import { describe, expect, it } from 'vitest';
import { buildContentSecurityPolicy } from '@/lib/security/csp';

const nonce = 'test-nonce-123';

describe('buildContentSecurityPolicy', () => {
  it('includes the nonce and strict-dynamic in script-src', () => {
    const policy = buildContentSecurityPolicy(nonce);

    expect(policy).toContain(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`);
    expect(policy).not.toContain("'unsafe-eval'");
  });

  it('allows unsafe-eval only in development', () => {
    expect(
      buildContentSecurityPolicy(nonce, { isDevelopment: true })
    ).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy(nonce)).not.toContain("'unsafe-eval'");
  });

  it('upgrades insecure requests only in production', () => {
    expect(
      buildContentSecurityPolicy(nonce, { isDevelopment: false })
    ).toContain('upgrade-insecure-requests');
    expect(
      buildContentSecurityPolicy(nonce, { isDevelopment: true })
    ).not.toContain('upgrade-insecure-requests');
  });

  it('adds the configured Supabase origin to connect-src', () => {
    const policy = buildContentSecurityPolicy(nonce, {
      supabaseUrl: 'https://project-ref.supabase.co',
    });

    expect(policy).toContain('https://project-ref.supabase.co');
    expect(policy).toContain('wss://project-ref.supabase.co');
  });

  it('ignores a malformed Supabase URL without throwing', () => {
    expect(() =>
      buildContentSecurityPolicy(nonce, { supabaseUrl: 'not a url' })
    ).not.toThrow();
  });

  it('locks down objects, frames and the base URL', () => {
    const policy = buildContentSecurityPolicy(nonce);

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("form-action 'self'");
  });

  it('permits same-origin and blob media while defaulting to self', () => {
    const policy = buildContentSecurityPolicy(nonce);

    expect(policy).toContain("media-src 'self' blob:");
    expect(policy).toContain("default-src 'self'");
  });
});
