import { fail, getAuthContext, json } from '@/lib/api';
import { qrPayloadSchema } from '@/lib/validations';

export async function POST(request: Request) {
  const { supabase, user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = qrPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  const { data, error } = await supabase
    .from('qr_payloads')
    .insert({
      ...parsed.data,
      user_id: user.id,
    })
    .select('*')
    .single();

  if (error) return fail(error.message, 500);

  return json({ data }, 201);
}
