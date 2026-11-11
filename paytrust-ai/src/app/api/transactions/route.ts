import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { createTransactionSchema } from '@/lib/validations';

interface SellerLookup {
  id: string;
  display_name: string;
}

export async function GET() {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      buyer:profiles!transactions_buyer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      seller:profiles!transactions_seller_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .order('created_at', { ascending: false });

  if (error) return fail(error.message, 500);

  return json({ data });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const { data: sellers, error: sellerError } = await supabase.rpc(
    'find_seller_by_email',
    { seller_email: parsed.data.seller_email }
  );

  if (sellerError) return fail(sellerError.message, 500);

  const seller = ((sellers || []) as SellerLookup[])[0];
  if (!seller) return fail('No account found with that seller email', 404);

  if (seller.id === user.id) {
    return fail('You cannot create a transaction with yourself', 400);
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      seller_id: seller.id,
      buyer_id: user.id,
      status: 'CREATED',
    })
    .select('*')
    .single();

  if (error) return fail(error.message, 500);

  // Participants are created automatically by a database trigger.
  return json({ data }, 201);
}
