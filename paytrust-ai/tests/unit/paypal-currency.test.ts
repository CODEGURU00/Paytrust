import { describe, expect, it } from 'vitest';
import {
  isPayPalCurrencySupported,
  PAYPAL_SUPPORTED_CURRENCIES,
} from '@/lib/paypal';

describe('PayPal currency support', () => {
  it('accepts the currencies PayPal carries', () => {
    // Verified live against the PayPal sandbox API: each of these returned
    // 201 Created.
    for (const currency of ['USD', 'EUR', 'GBP', 'AUD', 'CAD']) {
      expect(isPayPalCurrencySupported(currency)).toBe(true);
    }
  });

  it('rejects INR, which PayPal does not carry', () => {
    // The database allows INR, but PayPal answers
    // '422 UNPROCESSABLE_ENTITY :: Currency code is not currently supported'.
    expect(isPayPalCurrencySupported('INR')).toBe(false);
  });

  it('is case insensitive and rejects unknown codes', () => {
    expect(isPayPalCurrencySupported('usd')).toBe(true);
    expect(isPayPalCurrencySupported('XYZ')).toBe(false);
    expect(isPayPalCurrencySupported('')).toBe(false);
  });

  it('does not list a currency PayPal cannot carry', () => {
    expect(PAYPAL_SUPPORTED_CURRENCIES).not.toContain('INR');
    expect(PAYPAL_SUPPORTED_CURRENCIES).toContain('USD');
  });
});
