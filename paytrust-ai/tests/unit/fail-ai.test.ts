import { describe, expect, it } from 'vitest';
import { failAi } from '@/lib/api';

describe('failAi', () => {
  it('reports a quota-exhausted provider as 503 with a Retry-After hint', async () => {
    const response = failAi(
      new Error(
        'You exceeded your current quota, please check your plan and billing details. Please retry in 18h50m18s.'
      )
    );

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe(String(18 * 3600 + 50 * 60));

    const body = await response.json();
    expect(body.code).toBe('ai_provider_quota_exhausted');
    expect(body.error).toContain('exceeded your current quota');
  });

  it('keeps every other provider failure a 502', async () => {
    const response = failAi(
      new Error(
        'This model is currently experiencing high demand. Spikes in demand are usually temporary.'
      )
    );

    expect(response.status).toBe(502);
    expect(response.headers.get('retry-after')).toBeNull();

    const body = await response.json();
    expect(body.code).toBeUndefined();
    expect(body.error).toContain('high demand');
  });

  it('uses the fallback message when the error carries none', async () => {
    const response = failAi({}, 'AI summary generation failed');

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      error: 'AI summary generation failed',
    });
  });
});
