import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { requireTransactionAccess } from '@/lib/server/transactions';
import type { TransactionWithDetails } from '@/lib/types';
import { updateTransactionSchema, uuidSchema } from '@/lib/validations';

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

  const { data, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      buyer:profiles!transactions_buyer_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      seller:profiles!transactions_seller_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
      participants:transaction_participants(
        *,
        profile:profiles!transaction_participants_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
      ),
      messages:transaction_messages(
        *,
        sender:profiles!transaction_messages_sender_id_fkey(${PUBLIC_PROFILE_COLUMNS})
      ),
      payment_events:payment_events(*),
      ai_summaries:ai_summaries(*),
      attachments:attachments(
        *,
        uploader:profiles!attachments_uploaded_by_fkey(${PUBLIC_PROFILE_COLUMNS})
      ),
      disputes:disputes(
        *,
        opener:profiles!disputes_opened_by_fkey(${PUBLIC_PROFILE_COLUMNS}),
        statements:dispute_statements(
          *,
          author:profiles!dispute_statements_author_id_fkey(${PUBLIC_PROFILE_COLUMNS})
        )
      ),
      agreements:agreement_versions(
        *,
        creator:profiles!agreement_versions_created_by_fkey(${PUBLIC_PROFILE_COLUMNS}),
        approvals:agreement_approvals(
          *,
          user:profiles!agreement_approvals_user_id_fkey(${PUBLIC_PROFILE_COLUMNS})
        ),
        change_requests:agreement_change_requests(
          *,
          requester:profiles!agreement_change_requests_requested_by_fkey(${PUBLIC_PROFILE_COLUMNS})
        )
      ),
      commitments:commitments(
        *,
        owner:profiles!commitments_owner_id_fkey(${PUBLIC_PROFILE_COLUMNS}),
        creator:profiles!commitments_created_by_fkey(${PUBLIC_PROFILE_COLUMNS})
      ),
      milestones:milestones(*),
      audit_events:audit_events(*)
    `
    )
    .eq('id', id)
    .single();

  if (error || !data) return fail('Transaction not found', 404);

  const transaction = data as unknown as TransactionWithDetails;

  transaction.messages?.sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );
  transaction.attachments?.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );
  transaction.agreements?.sort((a, b) => b.version - a.version);
  transaction.commitments?.sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
  );
  transaction.milestones?.sort((a, b) => a.position - b.position);
  transaction.audit_events?.sort(
    (a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)
  );

  return json({ data: transaction });
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  if (!uuidSchema.safeParse(id).success) {
    return fail('Invalid transaction ID', 400);
  }

  const access = await requireTransactionAccess(
    supabase,
    id,
    user.id,
    { minPermission: 'full' }
  );
  if ('error' in access) return fail(access.error, access.status);

  const parsed = await parseJsonBody(request, updateTransactionSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase
    .from('transactions')
    .update(parsed.data)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return fail(error.message, 500);

  return json({ data });
}
