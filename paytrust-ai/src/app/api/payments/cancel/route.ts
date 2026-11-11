import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('token');

  const cancelled = () =>
    NextResponse.redirect(new URL('/dashboard?payment=cancelled', url.origin));

  if (!orderId) {
    return cancelled();
  }

  const admin = await createAdminClient();
  const { data: transaction } = await admin
    .from('transactions')
    .select('id, buyer_id, seller_id')
    .eq('paypal_order_id', orderId)
    .maybeSingle();

  if (!transaction) {
    return cancelled();
  }

  /*
   * This is a public return URL - PayPal redirects the browser here - so the
   * order token is the only thing the caller has. Without this check anyone
   * holding an order token could resolve the transaction behind it.
   */
  const { user } = await getAuthContext(request);
  if (
    !user ||
    (user.id !== transaction.buyer_id && user.id !== transaction.seller_id)
  ) {
    return cancelled();
  }

  return NextResponse.redirect(
    new URL(`/transactions/${transaction.id}?payment=cancelled`, url.origin)
  );
}
