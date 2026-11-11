import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Milestone } from '@/lib/types';
import { updateMilestoneSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string; milestoneId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id, milestoneId } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (
    !uuidSchema.safeParse(id).success ||
    !uuidSchema.safeParse(milestoneId).success
  ) {
    return fail('Invalid ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id, {
    minPermission: 'full',
  });
  if ('error' in access) return fail(access.error, access.status);

  const { data: existing, error: existingError } = await supabase
    .from('milestones')
    .select('id, transaction_id, status')
    .eq('id', milestoneId)
    .eq('transaction_id', id)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail('Milestone not found', 404);

  const parsed = await parseJsonBody(request, updateMilestoneSchema);
  if ('response' in parsed) return parsed.response;

  const update: Record<string, unknown> = { ...parsed.data };

  // paid is service-role only; the API never sets it directly.
  if (parsed.data.status === 'approved') {
    update.approved_by = user.id;
    update.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('milestones')
    .update(update)
    .eq('id', milestoneId)
    .eq('transaction_id', id)
    .select('*')
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as Milestone });
}
