export const runtime = 'nodejs';

import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';
import { isPushConfigured, sendToUser } from '@/lib/push';

export async function POST() {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  if (!isPushConfigured()) {
    return apiError('INTERNAL', 'Push not configured on the server', 503);
  }

  const result = await sendToUser(userId, {
    title: 'Tote',
    body: 'Notifications are on. This is a test.',
    url: '/pantry',
    tag: 'tote-test',
  });

  return apiOk({ ok: true, ...result });
}
