import { fail, json } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import {
  PayPalError,
  verifyPayPalWebhook,
  type PayPalWebhookEvent,
} from '@/lib/paypal';
import { handlePayPalWebhookEvent } from '@/lib/payments';

export async function POST(request: Request) {
  const rawBody = await request.text();

  let event: PayPalWebhookEvent;
  try {
    event = JSON.parse(rawBody) as PayPalWebhookEvent;
  } catch {
    return fail('Invalid JSON', 400);
  }

  try {
    const valid = await verifyPayPalWebhook(rawBody, request.headers);
    if (!valid) {
      return fail('Invalid PayPal webhook signature', 401);
    }
  } catch (error) {
    const status = error instanceof PayPalError ? error.status : 401;
    return fail(getErrorMessage(error, 'Webhook verification failed'), status);
  }

  try {
    await handlePayPalWebhookEvent(event);
    return json({ received: true });
  } catch (error) {
    // Return 500 so PayPal retries transient database failures.
    return fail(getErrorMessage(error, 'Webhook processing failed'), 500);
  }
}

export async function GET() {
  return json({
    message: 'PayPal webhook endpoint. Configure this URL in PayPal.',
  });
}
