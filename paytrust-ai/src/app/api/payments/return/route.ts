import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAuthContext } from '@/lib/api';
import { captureAndRecord } from '@/lib/payments';
import type { Transaction } from '@/lib/types';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('token');
  const baseUrl = url.origin;

  if (!orderId) {
    return NextResponse.redirect(
      new URL('/dashboard?payment=missing_order', baseUrl)
    );
  }

  const { user } = await getAuthContext();
  if (!user) {
    return NextResponse.redirect(
      new URL('/auth/login?callbackUrl=/dashboard', baseUrl)
    );
  }

  const admin = await createAdminClient();
  const { data: transaction } = await admin
    .from('transactions')
    .select('*')
    .eq('paypal_order_id', orderId)
    .maybeSingle();

  if (!transaction) {
    return NextResponse.redirect(
      new URL('/dashboard?payment=unknown_order', baseUrl)
    );
  }

  const tx = transaction as Transaction;

  if (tx.buyer_id !== user.id && tx.seller_id !== user.id) {
    return NextResponse.redirect(
      new URL('/dashboard?payment=forbidden', baseUrl)
    );
  }

  try {
    await captureAndRecord({
      orderId,
      transactionId: tx.id,
    });

    return NextResponse.redirect(
      new URL(`/transactions/${tx.id}?payment=success`, baseUrl)
    );
  } catch {
    return NextResponse.redirect(
      new URL(`/transactions/${tx.id}?payment=failed`, baseUrl)
    );
  }
}
