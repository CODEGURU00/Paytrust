import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Milestone } from '@/lib/types';
import { createMilestoneSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
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
    .from('milestones')
    .select('*')
    .eq('transaction_id', id)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return fail(error.message, 500);

  return json({ data: (data || []) as Milestone[] });
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
  });
  if ('error' in access) return fail(access.error, access.status);

  if (access.data.transaction.status === 'CANCELLED') {
    return fail('Cannot add milestones to a cancelled transaction', 409);
  }

  const parsed = await parseJsonBody(request, createMilestoneSchema);
  if ('response' in parsed) return parsed.response;

  let position = parsed.data.position;
  if (position === undefined) {
    const { data: last } = await supabase
      .from('milestones')
      .select('position')
      .eq('transaction_id', id)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    position = (last?.position ?? -1) + 1;
  }

  const { data, error } = await supabase
    .from('milestones')
    .insert({
      transaction_id: id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      amount: parsed.data.amount,
      currency: access.data.transaction.currency,
      due_at: parsed.data.due_at || null,
      position,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as Milestone }, 201);
}
