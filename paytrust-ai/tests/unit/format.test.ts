import { describe, expect, it } from 'vitest';
import { formatINR, formatMoney } from '@/lib/demo/format';

describe('formatMoney', () => {
  it('renders the currency the transaction was recorded in', () => {
    // A USD transaction used to be rendered as "₹2,400" because every
    // amount went through formatINR.
    expect(formatMoney(2400, 'USD', { decimals: true })).toContain('2,400.00');
    expect(formatMoney(2400, 'USD', { decimals: true })).not.toContain('₹');
    expect(formatMoney(2400, 'EUR', { decimals: true })).not.toContain('₹');
    expect(formatMoney(2400, 'GBP', { decimals: true })).not.toContain('₹');
  });

  it('keeps the rupee symbol for INR', () => {
    expect(formatMoney(2400, 'INR', { decimals: true })).toContain('₹');
  });

  it('is case insensitive', () => {
    expect(formatMoney(10, 'usd')).toBe(formatMoney(10, 'USD'));
  });

  it('falls back to the currency code for an unknown currency', () => {
    const formatted = formatMoney(10, 'XYZ');
    expect(formatted).toContain('XYZ');
    expect(formatted).toContain('10');
  });

  it('defaults to USD when the currency is missing', () => {
    expect(formatMoney(10, '')).toBe(formatMoney(10, 'USD'));
  });
});

describe('formatINR', () => {
  it('still formats rupees', () => {
    expect(formatINR(2400, { decimals: true })).toContain('₹');
  });
});
