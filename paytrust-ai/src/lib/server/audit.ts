import { createAdminClient } from '@/lib/supabase/server';

export interface AuditEventInput {
  transactionId: string;
  actorId?: string | null;
  eventType: string;
  metadata?: Record<string, unknown>;
}

/**
 * Append-only audit event. Database triggers cover row changes made through
 * normal Supabase clients; this helper records privileged server-side actions
 * (AI runs, simulated payments, evidence access) with an explicit actor.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.from('audit_events').insert({
      transaction_id: input.transactionId,
      actor_id: input.actorId || null,
      event_type: input.eventType,
      metadata: input.metadata || {},
    });

    if (error) {
      console.error('Could not append audit event:', error.message);
    }
  } catch (error) {
    console.error('Could not append audit event:', error);
  }
}
