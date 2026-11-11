import { describe, expect, it } from 'vitest';
import { parseQRCode, validateQRCode } from '@/lib/qr';

describe('parseQRCode', () => {
  it('parses PayTrust query payloads', () => {
    const parsed = parseQRCode(
      'paytrust://pay?tx=TX-123&amount=125.50&currency=USD&recipient=seller@paytrust.demo'
    );
    expect(parsed.type).toBe('paytrust');
    expect(parsed.transaction_id).toBe('TX-123');
    expect(parsed.reference).toBe('TX-123');
    expect(parsed.amount).toBe(125.5);
    expect(parsed.currency).toBe('USD');
    expect(parsed.recipient).toBe('seller@paytrust.demo');
    expect(validateQRCode(parsed).isValid).toBe(true);
  });

  it('parses PayTrust web links and short paths', () => {
    expect(parseQRCode('https://paytrust.ai/t/abc_123').transaction_id).toBe(
      'abc_123'
    );
    expect(parseQRCode('https://www.paytrust.com/t/xyz-9').transaction_id).toBe(
      'xyz-9'
    );
    expect(parseQRCode('paytrust://t/abc-1').transaction_id).toBe('abc-1');
  });

  it('parses PayPal.me recipients', () => {
    const parsed = parseQRCode('https://paypal.me/priya.design');
    expect(parsed.type).toBe('paypal');
    expect(parsed.recipient).toBe('priya.design');
    expect(validateQRCode(parsed).isValid).toBe(true);
  });

  it('parses UPI payment addresses and amounts', () => {
    const parsed = parseQRCode(
      'upi://pay?pa=priya@upi&pn=Priya&am=99.50&cu=INR&tn=Invoice%2012'
    );
    expect(parsed.type).toBe('upi');
    expect(parsed.recipient).toBe('priya@upi');
    expect(parsed.amount).toBe(99.5);
    expect(parsed.currency).toBe('INR');
    expect(parsed.reference).toBe('Invoice 12');
    expect(validateQRCode(parsed).isValid).toBe(true);
  });

  it('detects EMVCo TLV payloads', () => {
    const parsed = parseQRCode(
      '00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING'
    );
    expect(parsed.type).toBe('emvco');
    expect(validateQRCode(parsed).isValid).toBe(true);
    expect(validateQRCode(parsed).message).toContain('Verify the amount');
  });

  it('rejects unknown payloads', () => {
    const parsed = parseQRCode('just some random text');
    expect(parsed.type).toBe('unknown');
    expect(parsed.provider).toBeNull();
    expect(validateQRCode(parsed).isValid).toBe(false);
  });

  it('ignores non-positive amounts', () => {
    expect(parseQRCode('paytrust://pay?tx=TX-1&amount=0').amount).toBeNull();
    expect(parseQRCode('paytrust://pay?tx=TX-1&amount=-4').amount).toBeNull();
    expect(parseQRCode('upi://pay?pa=a@upi&am=abc').amount).toBeNull();
  });

  it('trims user input and preserves the normalized raw value', () => {
    const parsed = parseQRCode('  paytrust://t/TX-42  ');
    expect(parsed.raw).toBe('paytrust://t/TX-42');
  });

  it('flags PayTrust and UPI payloads without a recipient/reference', () => {
    const paytrust = parseQRCode('paytrust://pay?amount=10');
    expect(validateQRCode(paytrust)).toEqual({
      isValid: false,
      message: 'PayTrust QR is missing a transaction reference',
    });

    const upi = parseQRCode('upi://pay?am=10');
    expect(validateQRCode(upi).isValid).toBe(false);
  });
});
