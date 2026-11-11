import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import { addParticipantSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface UserLookup {
  id: string;
  display_name: string;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id);
  if ('error' in access) return fail(access.error, access.status);

  const { data, error } = await supabase
    .from('transaction_participants')
    .select(
      `
      *,
      profile:profiles!transaction_participants_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('transaction_id', id)
    .order('joined_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data: data || [] });
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id, {
    minPermission: 'full',
    partyOnly: true,
  });
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, addParticipantSchema);
  if ('response' in parsed) return parsed.response;

  const { data: users, error: lookupError } = await supabase.rpc(
    'find_user_by_email',
    { lookup_email: parsed.data.email }
  );

  if (lookupError) return fail(lookupError.message, 500);

  const invitee = ((users || []) as UserLookup[])[0];
  if (!invitee) return fail('No account found with that email', 404);

  if (
    invitee.id === access.data.transaction.buyer_id ||
    invitee.id === access.data.transaction.seller_id
  ) {
    return fail('That user is already a primary party', 409);
  }

  const { data, error } = await supabase.rpc('add_transaction_participant', {
    p_transaction_id: id,
    p_user_id: invitee.id,
    p_role: parsed.data.role,
    p_permission_level: parsed.data.permission_level,
  });

  if (error) return fail(error.message, 400);

  return json({ data }, 201);
}
