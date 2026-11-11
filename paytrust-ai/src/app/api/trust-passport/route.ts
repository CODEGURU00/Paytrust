import { fail, getAuthContext, json, parseJsonBody } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { loadTrustPassportStats } from '@/lib/server/trust-passport';
import type {
  AuditEvent,
  Profile,
  TrustPassport,
  TrustPassportSettings,
} from '@/lib/types';
import { trustPassportUpdateSchema } from '@/lib/validations';

async function loadOrCreateSettings(
  supabase: Awaited<ReturnType<typeof getAuthContext>>['supabase'],
  userId: string
): Promise<TrustPassportSettings> {
  const { data: existing, error: selectError } = await supabase
    .from('trust_passport_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing as TrustPassportSettings;

  const { data: created, error: insertError } = await supabase
    .from('trust_passport_settings')
    .insert({ user_id: userId })
    .select('*')
    .single();

  if (insertError) {
    // A concurrent request may have created the row.
    const { data: retried } = await supabase
      .from('trust_passport_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (retried) return retried as TrustPassportSettings;
    throw new Error(insertError.message);
  }

  return created as TrustPassportSettings;
}

export async function GET() {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return fail('Profile not found', 404);

  let settings: TrustPassportSettings;
  try {
    settings = await loadOrCreateSettings(supabase, user.id);
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : 'Could not load settings',
      500
    );
  }

  let stats;
  try {
    stats = await loadTrustPassportStats(supabase, user.id, settings, {
      respectVisibility: false,
      accountCreatedAt: (profile as unknown as Profile).created_at,
    });
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : 'Could not load passport stats',
      500
    );
  }

  const { data: activity } = await supabase
    .from('audit_events')
    .select('id, transaction_id, actor_id, event_type, metadata, created_at')
    .eq('actor_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  const passport: TrustPassport = {
    profile: profile as unknown as Profile,
    settings,
    stats,
    recent_activity: (activity || []) as AuditEvent[],
  };

  return json({ data: passport });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const parsed = await parseJsonBody(request, trustPassportUpdateSchema);
  if ('response' in parsed) return parsed.response;

  const { data, error } = await supabase
    .from('trust_passport_settings')
    .upsert({ user_id: user.id, ...parsed.data }, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) return fail(error.message, 400);

  return json({ data: data as TrustPassportSettings });
}
