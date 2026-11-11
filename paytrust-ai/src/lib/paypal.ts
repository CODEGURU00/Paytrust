import { getPayPalApiBase } from '@/lib/env';
import { getErrorMessage } from '@/lib/errors';

export interface PayPalLink {
  href: string;
  rel: string;
  method?: string;
}

export interface PayPalAmount {
  currency_code: string;
  value: string;
}

export interface PayPalCapture {
  id: string;
  status: string;
  amount?: PayPalAmount;
  supplementary_data?: {
    related_ids?: {
      order_id?: string;
    };
  };
}

export interface PayPalPurchaseUnit {
  reference_id?: string;
  custom_id?: string;
  description?: string;
  amount?: PayPalAmount;
  payments?: {
    captures?: PayPalCapture[];
  };
}

export interface PayPalOrder {
  id: string;
  status: string;
  links?: PayPalLink[];
  purchase_units?: PayPalPurchaseUnit[];
}

export interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource_type?: string;
  resource?: PayPalOrder & PayPalCapture;
  summary?: string;
}

export class PayPalError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'PayPalError';
    this.status = status;
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

/**
 * Currencies the PayPal Orders v2 API accepts.
 *
 * The database allows a wider set (`USD, EUR, GBP, INR, AUD, CAD`), but
 * PayPal rejects the codes it does not carry - notably INR - with
 * `422 UNPROCESSABLE_ENTITY :: Currency code is not currently supported`.
 * Checking here turns that provider error into a clear, actionable message
 * instead of a raw 422 from the API.
 *
 * Source: https://developer.paypal.com/docs/integration/direct/rest/currency-codes/
 */
export const PAYPAL_SUPPORTED_CURRENCIES = [
  'AUD',
  'BRL',
  'CAD',
  'CNY',
  'CZK',
  'DKK',
  'EUR',
  'HKD',
  'HUF',
  'ILS',
  'JPY',
  'MYR',
  'MXN',
  'TWD',
  'NZD',
  'NOK',
  'PHP',
  'PLN',
  'GBP',
  'RUB',
  'SGD',
  'SEK',
  'CHF',
  'THB',
  'USD',
] as const;

export function isPayPalCurrencySupported(currency: string): boolean {
  return (PAYPAL_SUPPORTED_CURRENCIES as readonly string[]).includes(
    currency.toUpperCase()
  );
}

export function isPayPalConfigured(): boolean {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  return Boolean(
    clientId &&
    clientSecret &&
    !clientId.startsWith('your_') &&
    !clientSecret.startsWith('your_')
  );
}

function requireCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();

  if (
    !clientId ||
    !clientSecret ||
    clientId.startsWith('your_') ||
    clientSecret.startsWith('your_')
  ) {
    throw new PayPalError(
      'PayPal is not configured. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to .env.local.',
      503
    );
  }

  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.value;
  }

  const { clientId, clientSecret } = requireCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
    error?: string;
  };

  if (!response.ok || !payload.access_token) {
    throw new PayPalError(
      payload.error_description || payload.error || 'PayPal authentication failed',
      502
    );
  }

  const expiresIn = Number(payload.expires_in) || 3600;
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + expiresIn * 1000,
  };

  return payload.access_token;
}

async function paypalRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${getPayPalApiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const payload = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    details?: Array<{ description?: string }>;
  };

  if (!response.ok) {
    const detail = payload.details?.[0]?.description;
    throw new PayPalError(
      detail || payload.message || `PayPal request failed (${response.status})`,
      response.status
    );
  }

  return payload;
}

export function findApprovalUrl(order: PayPalOrder): string | null {
  const link = order.links?.find(
    (candidate) => candidate.rel === 'approve' || candidate.rel === 'payer-action'
  );
  return link?.href || null;
}

/**
 * Simulated orders created while PayPal is not configured.
 *
 * The simulated order carries the real transaction binding and amount so the
 * same verification path runs as it does against the PayPal API. A stub that
 * omitted the amount would make the amount check a no-op (it fails closed on
 * a missing amount) and would let a simulated capture skip the binding
 * checks entirely.
 */
interface SimulatedOrder {
  transactionId: string;
  amount: number;
  currency: string;
  description?: string;
}

const simulatedOrders = new Map<string, SimulatedOrder>();

export async function createPayPalOrder(input: {
  transactionId: string;
  amount: number;
  currency: string;
  description?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalOrder> {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new PayPalError('Invalid PayPal order amount', 400);
  }

  if (!isPayPalCurrencySupported(input.currency)) {
    throw new PayPalError(
      `PayPal does not support ${input.currency.toUpperCase()} transactions. Use one of: ${PAYPAL_SUPPORTED_CURRENCIES.join(', ')}.`,
      400
    );
  }

  if (!isPayPalConfigured()) {
    const simulatedOrderId = `SANDBOX-ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    simulatedOrders.set(simulatedOrderId, {
      transactionId: input.transactionId,
      amount,
      currency: input.currency,
      description: input.description,
    });

    return {
      id: simulatedOrderId,
      status: 'CREATED',
      links: [
        {
          href: `${input.returnUrl}?token=${simulatedOrderId}&sandbox=simulated`,
          rel: 'approve',
          method: 'GET',
        },
      ],
      purchase_units: [
        {
          reference_id: input.transactionId,
          custom_id: input.transactionId,
          description: input.description?.slice(0, 127) || 'PayTrust Escrow Payment',
          amount: {
            currency_code: input.currency,
            value: amount.toFixed(2),
          },
        },
      ],
    };
  }

  return paypalRequest<PayPalOrder>('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: input.transactionId,
          custom_id: input.transactionId,
          description: input.description?.slice(0, 127),
          amount: {
            currency_code: input.currency,
            value: amount.toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: 'PayTrust AI',
        user_action: 'PAY_NOW',
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  if (orderId.startsWith('SANDBOX-ORDER-')) {
    const simulated = simulatedOrders.get(orderId);
    if (!simulated) {
      throw new PayPalError('Unknown simulated PayPal order', 404);
    }

    return {
      id: orderId,
      status: 'APPROVED',
      links: [],
      purchase_units: [
        {
          reference_id: simulated.transactionId,
          custom_id: simulated.transactionId,
          description: simulated.description?.slice(0, 127) || 'PayTrust Escrow Payment',
          amount: {
            currency_code: simulated.currency,
            value: simulated.amount.toFixed(2),
          },
        },
      ],
    };
  }

  return paypalRequest<PayPalOrder>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}`
  );
}

export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalOrder> {
  if (orderId.startsWith('SANDBOX-ORDER-')) {
    const simulated = simulatedOrders.get(orderId);
    if (!simulated) {
      throw new PayPalError('Unknown simulated PayPal order', 404);
    }

    const captureId = `SANDBOX-CAPTURE-${Date.now()}`;
    const amount = {
      currency_code: simulated.currency,
      value: simulated.amount.toFixed(2),
    };

    return {
      id: orderId,
      status: 'COMPLETED',
      purchase_units: [
        {
          reference_id: simulated.transactionId,
          custom_id: simulated.transactionId,
          amount,
          payments: {
            captures: [
              {
                id: captureId,
                status: 'COMPLETED',
                amount,
                supplementary_data: {
                  related_ids: {
                    order_id: orderId,
                  },
                },
              },
            ],
          },
        },
      ],
    };
  }

  return paypalRequest<PayPalOrder>(
    `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
    { method: 'POST' }
  );
}

export function getCaptureFromOrder(
  order: PayPalOrder
): PayPalCapture | null {
  for (const unit of order.purchase_units || []) {
    const capture = unit.payments?.captures?.[0];
    if (capture) return capture;
  }
  return null;
}

export function getOrderIdFromCapture(capture: PayPalCapture): string | null {
  return capture.supplementary_data?.related_ids?.order_id || null;
}

export async function verifyPayPalWebhook(
  rawBody: string,
  headers: Headers
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  if (!webhookId || webhookId.startsWith('your_')) {
    throw new PayPalError(
      'PayPal webhook is not configured. Add PAYPAL_WEBHOOK_ID to .env.local.',
      503
    );
  }

  const authAlgo = headers.get('paypal-auth-algo');
  const certUrl = headers.get('paypal-cert-url');
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionSig = headers.get('paypal-transmission-sig');
  const transmissionTime = headers.get('paypal-transmission-time');

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return false;
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new PayPalError('Invalid webhook JSON', 400);
  }

  try {
    const result = await paypalRequest<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: JSON.stringify({
          auth_algo: authAlgo,
          cert_url: certUrl,
          transmission_id: transmissionId,
          transmission_sig: transmissionSig,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: event,
        }),
      }
    );

    return result.verification_status === 'SUCCESS';
  } catch (error) {
    throw new PayPalError(
      `PayPal webhook verification failed: ${getErrorMessage(error)}`,
      401
    );
  }
}
