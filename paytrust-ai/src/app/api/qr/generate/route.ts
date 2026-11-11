import { fail, getAuthContext, json } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { qrGenerateSchema } from '@/lib/validations';

export async function POST(request: Request) {
  // QR generation is cheap to abuse; require a signed-in user.
  const { user } = await getAuthContext();
  if (!user) return fail('Not authenticated', 401);

  const body = await request.json().catch(() => null);
  const parsed = qrGenerateSchema.safeParse(body);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message || 'Invalid input', 400);
  }

  try {
    const QRCode = (await import('qrcode')).default;
    const qrDataUrl = await QRCode.toDataURL(parsed.data.data);
    return json({ data: qrDataUrl });
  } catch (error) {
    return fail(getErrorMessage(error, 'QR generation failed'), 500);
  }
}
