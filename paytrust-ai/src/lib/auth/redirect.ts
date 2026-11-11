/**
 * Restrict a post-authentication redirect to a path on this origin.
 *
 * Rejecting only '//host' is not enough: the WHATWG URL parser treats a
 * backslash as a forward slash in a special-scheme URL, so '/\evil.com'
 * resolves to 'https://evil.com/'. The check therefore rejects backslashes
 * and verifies the resolved origin.
 */
export function safeRedirectPath(value: string | null): string {
  if (!value) return '/dashboard';

  const candidate = value.trim();
  if (!candidate.startsWith('/')) return '/dashboard';
  if (candidate.startsWith('//')) return '/dashboard';
  if (candidate.includes('\\')) return '/dashboard';

  try {
    const resolved = new URL(candidate, 'https://placeholder.invalid');
    if (resolved.origin !== 'https://placeholder.invalid') return '/dashboard';

    const path = `${resolved.pathname}${resolved.search}${resolved.hash}`;

    /*
     * The URL parser normalises '/..//evil.com' to the path '//evil.com'.
     * The origin check above still passes (the authority was parsed before
     * normalisation), but a path starting with '//' is protocol-relative
     * again once it is used, so it has to be rejected too.
     */
    if (path.startsWith('//') || path.startsWith('\\')) return '/dashboard';

    return path;
  } catch {
    return '/dashboard';
  }
}
