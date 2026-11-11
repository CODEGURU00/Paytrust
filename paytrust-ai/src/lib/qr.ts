export type QRCodeType = 'paytrust' | 'paypal' | 'upi' | 'emvco' | 'unknown';

export interface ParsedQR {
  type: QRCodeType;
  provider: string | null;
  recipient: string | null;
  amount: number | null;
  currency: string | null;
  reference: string | null;
  url: string | null;
  transaction_id: string | null;
  raw: string;
}

export interface QRValidation {
  isValid: boolean;
  message: string | null;
}

function parseAmount(value: string | null): number | null {
  if (!value) return null;
  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

export function parseQRCode(raw: string): ParsedQR {
  const trimmed = raw.trim();

  // PayTrust: paytrust://pay?tx=ID, paytrust://t/ID, or https://paytrust.ai/t/ID
  const paytrustQuery = trimmed.match(/^paytrust:\/\/pay\?(.*)$/i);
  const paytrustPath =
    trimmed.match(/^paytrust:\/\/t\/([a-zA-Z0-9_-]+)/i) ||
    trimmed.match(/^https?:\/\/(?:www\.)?paytrust\.(?:ai|com)\/t\/([a-zA-Z0-9_-]+)/i);

  if (paytrustQuery) {
    const params = new URLSearchParams(paytrustQuery[1]);
    const transactionId =
      params.get('tx') || params.get('transaction_id') || null;
    return {
      type: 'paytrust',
      provider: 'paytrust',
      recipient: params.get('recipient'),
      amount: parseAmount(params.get('amount')),
      currency: params.get('currency'),
      reference: transactionId,
      url: null,
      transaction_id: transactionId,
      raw: trimmed,
    };
  }

  if (paytrustPath) {
    const transactionId = paytrustPath[1];
    return {
      type: 'paytrust',
      provider: 'paytrust',
      recipient: null,
      amount: null,
      currency: null,
      reference: transactionId,
      url: null,
      transaction_id: transactionId,
      raw: trimmed,
    };
  }

  // PayPal: paypal.me/USERNAME, paypal.com/paypalme/USERNAME, or checkout links.
  const paypalMatch = trimmed.match(
    /paypal\.(?:com|me)\/([a-zA-Z0-9._-]+)/i
  );
  if (paypalMatch) {
    return {
      type: 'paypal',
      provider: 'paypal',
      recipient: paypalMatch[1],
      amount: null,
      currency: null,
      reference: null,
      url: trimmed,
      transaction_id: null,
      raw: trimmed,
    };
  }

  // UPI: upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=CURRENCY
  const upiMatch = trimmed.match(/^upi:\/\/pay\?(.*)$/i);
  if (upiMatch) {
    const params = new URLSearchParams(upiMatch[1]);
    return {
      type: 'upi',
      provider: 'upi',
      recipient: params.get('pa'),
      amount: parseAmount(params.get('am')),
      currency: params.get('cu'),
      reference: params.get('tn') || params.get('ref'),
      url: null,
      transaction_id: null,
      raw: trimmed,
    };
  }

  // EMVCo payloads are TLV strings that usually start with 00xx.
  if (/^(00|01|02)[0-9A-Z]{2}/.test(trimmed) && trimmed.length > 20) {
    return {
      type: 'emvco',
      provider: 'emvco',
      recipient: null,
      amount: null,
      currency: null,
      reference: null,
      url: null,
      transaction_id: null,
      raw: trimmed,
    };
  }

  return {
    type: 'unknown',
    provider: null,
    recipient: null,
    amount: null,
    currency: null,
    reference: null,
    url: null,
    transaction_id: null,
    raw: trimmed,
  };
}

export function validateQRCode(parsed: ParsedQR): QRValidation {
  switch (parsed.type) {
    case 'paytrust':
      if (!parsed.transaction_id) {
        return {
          isValid: false,
          message: 'PayTrust QR is missing a transaction reference',
        };
      }
      return { isValid: true, message: 'PayTrust payment intent is valid' };
    case 'paypal':
      if (!parsed.recipient) {
        return {
          isValid: false,
          message: 'PayPal QR is missing a recipient',
        };
      }
      return { isValid: true, message: 'PayPal payment intent is valid' };
    case 'upi':
      if (!parsed.recipient) {
        return {
          isValid: false,
          message: 'UPI QR is missing a payment address (VPA)',
        };
      }
      return { isValid: true, message: 'UPI payment intent is valid' };
    case 'emvco':
      return {
        isValid: true,
        message: 'EMVCo QR detected. Verify the amount before paying.',
      };
    case 'unknown':
      return {
        isValid: false,
        message: 'Unknown QR format. Cannot proceed safely.',
      };
  }
}
