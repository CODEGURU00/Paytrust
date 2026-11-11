import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Attachment } from '@/lib/types';
import { evidenceKindSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(supabase, id, user.id);
  if ('error' in access) return fail(access.error, access.status);

  const url = new URL(request.url);
  const kindParam = url.searchParams.get('kind');
  const commitmentId = url.searchParams.get('commitment_id');
  const milestoneId = url.searchParams.get('milestone_id');

  let query = supabase
    .from('attachments')
    .select(
      `
      *,
      uploader:profiles!attachments_uploaded_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .eq('transaction_id', id)
    .order('created_at', { ascending: false });

  if (kindParam) {
    const parsedKind = evidenceKindSchema.safeParse(kindParam);
    if (!parsedKind.success) return fail('Invalid evidence kind', 400);
    query = query.eq('kind', parsedKind.data);
  }

  if (commitmentId) {
    if (!uuidSchema.safeParse(commitmentId).success) {
      return fail('Invalid commitment ID', 400);
    }
    query = query.eq('commitment_id', commitmentId);
  }

  if (milestoneId) {
    if (!uuidSchema.safeParse(milestoneId).success) {
      return fail('Invalid milestone ID', 400);
    }
    query = query.eq('milestone_id', milestoneId);
  }

  const { data, error } = await query;

  if (error) return fail(error.message, 500);

  // RLS already hides other users' private evidence. This guard keeps the
  // same rule explicit if the client is ever swapped for a service role.
  const visible = ((data || []) as Attachment[]).filter(
    (attachment) =>
      attachment.visibility !== 'private' ||
      attachment.uploaded_by === user.id
  );

  const counts = visible.reduce<Record<string, number>>((acc, item) => {
    const key = item.kind || 'file';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return json({ data: visible, meta: { counts } });
}
