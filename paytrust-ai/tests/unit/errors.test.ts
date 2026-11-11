import { describe, expect, it } from 'vitest';
import {
  getErrorMessage,
  isProviderQuotaError,
  providerRetryAfterSeconds,
} from '@/lib/errors';

describe('isProviderQuotaError', () => {
  it('recognises the quota answers Gemini returns', () => {
    expect(
      isProviderQuotaError(
        'You exceeded your current quota, please check your plan and billing details.'
      )
    ).toBe(true);
    expect(
      isProviderQuotaError(
        '* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-3.6-flash, description: Generate content requests per day limit exceeded on Free Tier.'
      )
    ).toBe(true);
    expect(isProviderQuotaError('RESOURCE_EXHAUSTED')).toBe(true);
    expect(isProviderQuotaError('429 Too Many Requests')).toBe(true);
  });

  it('does not treat ordinary failures as quota exhaustion', () => {
    expect(isProviderQuotaError('invalid request')).toBe(false);
    expect(isProviderQuotaError('Transaction not found')).toBe(false);
    expect(
      isProviderQuotaError(
        'This model is currently experiencing high demand. Please try again later.'
      )
    ).toBe(false);
  });
});

describe('providerRetryAfterSeconds', () => {
  it('honours the retry hint the provider includes', () => {
    expect(
      providerRetryAfterSeconds('Please retry in 18h50m18.498114409s.')
    ).toBe(18 * 3600 + 50 * 60);
    expect(providerRetryAfterSeconds('Please retry in 2h5m')).toBe(2 * 3600 + 5 * 60);
  });

  it('falls back when the provider gives no hint', () => {
    expect(providerRetryAfterSeconds('quota exceeded')).toBe(3600);
    expect(providerRetryAfterSeconds('quota exceeded', 900)).toBe(900);
  });

  it('never asks a caller to wait more than a day', () => {
    expect(providerRetryAfterSeconds('Please retry in 400h0m')).toBe(86400);
  });
});

describe('getErrorMessage', () => {
  it('reads the message from an Error, a string or an object', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
    expect(getErrorMessage('boom')).toBe('boom');
    expect(getErrorMessage({ message: 'boom' })).toBe('boom');
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
