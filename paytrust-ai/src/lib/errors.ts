export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong'
): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

/**
 * True when an upstream provider refused because a quota was exhausted.
 *
 * Gemini's free tier answers with "Quota exceeded for metric: ... limit: 20,
 * description: Generate content requests per day limit exceeded" and asks the
 * caller to retry in ~19 hours. That is not a bug in this application and it
 * is not retryable inside a request, so it is reported as a 503 with a
 * Retry-After hint rather than a generic 502.
 */
export function isProviderQuotaError(message: string): boolean {
  return /quota exceeded|exceeded your current quota|resource[ _-]?exhausted|too many requests|rate[ _-]?limit/i.test(
    message
  );
}

/**
 * Seconds a caller should wait before retrying a quota-blocked request.
 *
 * The provider includes its own hint ("Please retry in 18h50m..."); when it is
 * present the value is honoured, capped so a single response never instructs a
 * caller to wait for days.
 */
export function providerRetryAfterSeconds(message: string, fallback = 3600): number {
  const match = /please retry in\s+(\d+)h(\d+)m/i.exec(message);
  if (match) {
    const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60;
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(seconds, 86400);
  }
  return fallback;
}
