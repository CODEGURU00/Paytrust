import { fail, getAuthContext, json } from '@/lib/api';
import { PUBLIC_PROFILE_COLUMNS } from '@/lib/selects';
import { loadTrustPassportStats } from '@/lib/server/trust-passport';
import { createAdminClient } from '@/lib/supabase/server';
import type {
  Profile,
  TrustPassport,
  TrustPassportSettings,
} from '@/lib/types';
import { uuidSchema } from '@/lib/validations';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId } = await params;

  if (!uuidSchema.safeParse(userId).success) {
    return fail('Invalid user ID', 400);
  }

  const { user } = await getAuthContext();
  const isOwner = user?.id === userId;

  const admin = await createAdminClient();

  const { data: settings, error: settingsError } = await admin
    .from('trust_passport_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (settingsError) return fail(settingsError.message, 500);

  if (!settings || (!settings.is_public && !isOwner)) {
    return fail('Trust Passport not found', 404);
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (profileError) return fail(profileError.message, 500);
  if (!profile) return fail('Trust Passport not found', 404);

  let stats;
  try {
    stats = await loadTrustPassportStats(
      admin,
      userId,
      settings as TrustPassportSettings,
      { accountCreatedAt: (profile as unknown as Profile).created_at }
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : 'Could not load passport stats',
      500
    );
  }

  const passport: TrustPassport = {
    profile: profile as unknown as Profile,
    settings: settings as TrustPassportSettings,
    stats,
    recent_activity: [],
  };

  if (isOwner) {
    const { data: activity } = await admin
      .from('audit_events')
      .select('id, transaction_id, actor_id, event_type, metadata, created_at')
      .eq('actor_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    passport.recent_activity = activity || [];
  }

  return json({ data: passport });
}
