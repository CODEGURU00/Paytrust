import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { Dispute, DisputeStatus } from '@/lib/types';
import { updateDisputeSchema, uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  draft: ['open', 'closed'],
  open: ['under_review', 'resolved', 'closed'],
  under_review: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid dispute ID', 400);
  }

  const { data: dispute, error } = await supabase
    .from('disputes')
    .select(
      `
      *,
      transaction:transactions(*),
      opener:profiles!disputes_opened_by_fkey(${PUBLIC_PROFILE_COLUMNS}),
      statements:dispute_statements(
        *,
        author:profiles!dispute_statements_author_id_fkey(${PUBLIC_PROFILE_COLUMNS})
      )
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error) return fail(error.message, 500);
  if (!dispute) return fail('Dispute not found', 404);

  dispute.statements?.sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      Date.parse(a.created_at) - Date.parse(b.created_at)
  );

  const access = await requireTransactionAccess(
    supabase,
    dispute.transaction_id,
    user.id
  );
  if ('error' in access) return fail(access.error, access.status);

  const evidenceIds = new Set<string>();
  for (const statement of dispute.statements || []) {
    for (const evidenceId of statement.evidence_ids || []) {
      evidenceIds.add(evidenceId);
    }
  }

  let evidence: Array<Record<string, unknown>> = [];
  if (evidenceIds.size > 0) {
    const { data, error: evidenceError } = await supabase
      .from('attachments')
      .select(
        `
        id,
        file_name,
        kind,
        description,
        visibility,
        uploaded_by,
        created_at,
        uploader:profiles!attachments_uploaded_by_fkey(${PUBLIC_PROFILE_COLUMNS})
      `
      )
      .in('id', Array.from(evidenceIds));

    if (evidenceError) return fail(evidenceError.message, 500);
    evidence = (data || []) as Array<Record<string, unknown>>;
  }

  return json({
    data: {
      ...(dispute as unknown as Dispute),
      evidence,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid dispute ID', 400);
  }

  const { data: existing, error: existingError } = await supabase
    .from('disputes')
    .select('id, transaction_id, status')
    .eq('id', id)
    .maybeSingle();

  if (existingError) return fail(existingError.message, 500);
  if (!existing) return fail('Dispute not found', 404);

  const access = await requireTransactionAccess(
    supabase,
    existing.transaction_id,
    user.id,
    { partyOnly: true }
  );
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, updateDisputeSchema);
  if ('response' in parsed) return parsed.response;

  const currentStatus = existing.status as DisputeStatus;

  if (parsed.data.status && parsed.data.status !== currentStatus) {
    if (!ALLOWED_TRANSITIONS[currentStatus].includes(parsed.data.status)) {
      return fail(
        `Cannot move a dispute from ${currentStatus} to ${parsed.data.status}`,
        409
      );
    }
  }

  const { data, error } = await supabase
    .from('disputes')
    .update(parsed.data)
    .eq('id', id)
    .select(
      `
      *,
      transaction:transactions(*),
      opener:profiles!disputes_opened_by_fkey(${PUBLIC_PROFILE_COLUMNS})
    `
    )
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as unknown as Dispute });
}
