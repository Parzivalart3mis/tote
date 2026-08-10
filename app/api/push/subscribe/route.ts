export const runtime = 'nodejs';

import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';

const bodySchema = z
  .object({
    endpoint: z.string().url().max(1000),
    keys: z.object({
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }),
    timezone: z.string().max(64).optional(),
  })
  .strict();

export async function POST(req: Request) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const { endpoint, keys, timezone } = parsed.data;

  // Upsert by unique endpoint: a re-subscribe (same device) updates keys/owner
  // rather than erroring on the unique constraint.
  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .get();

  if (existing) {
    await db
      .update(pushSubscriptions)
      .set({ userId, p256dh: keys.p256dh, auth: keys.auth, timezone: timezone ?? 'UTC' })
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } else {
    await db.insert(pushSubscriptions).values({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      timezone: timezone ?? 'UTC',
    });
  }

  return apiOk({ ok: true }, existing ? 200 : 201);
}

export async function DELETE(req: Request) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const url = new URL(req.url);
  const endpoint = url.searchParams.get('endpoint');
  if (!endpoint) return apiError('VALIDATION', 'Missing endpoint', 422);

  await db
    .delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.endpoint, endpoint), eq(pushSubscriptions.userId, userId)));

  return apiOk({ ok: true });
}
