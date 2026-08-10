export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions, pantryItems } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';
import { isPushConfigured, sendToUser } from '@/lib/push';
import { countLowOut, buildReminderPayload } from '@/lib/pantry-reminders';

/**
 * Autonomous reminder sender, triggered by an external cron (cron-job.org) at
 * the user's chosen local times (10:00 and 17:00). Secured by a bearer secret,
 * NOT Clerk. Sends a push to every subscribed user who currently has any Low or
 * Out pantry items. Idempotent per invocation and always returns 200 once it has
 * run, so the external cron never retries a completed pass.
 */
export async function GET(req: Request) {
  const secret = process.env['CRON_SECRET'];
  if (!secret) return apiError('INTERNAL', 'CRON_SECRET not configured', 503);

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return apiError('UNAUTHORIZED', 'Invalid cron secret', 401);
  }

  if (!isPushConfigured()) return apiError('INTERNAL', 'Push not configured', 503);

  // Distinct users who have at least one push subscription.
  const subs = await db
    .select({ userId: pushSubscriptions.userId })
    .from(pushSubscriptions)
    .all();
  const userIds = [...new Set(subs.map((s) => s.userId))];

  if (userIds.length === 0) return apiOk({ ok: true, processed: 0, notified: 0 });

  // Pull Low/Out pantry items for exactly those users in one query.
  const rows = await db
    .select({ userId: pantryItems.userId, status: pantryItems.status })
    .from(pantryItems)
    .where(inArray(pantryItems.userId, userIds))
    .all();

  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    if (!byUser.has(r.userId)) byUser.set(r.userId, []);
    byUser.get(r.userId)!.push(r.status);
  }

  let processed = 0;
  let notified = 0;

  for (const userId of userIds) {
    processed++;
    const payload = buildReminderPayload(countLowOut(byUser.get(userId) ?? []));
    if (!payload) continue; // nothing low or out — no reminder
    const result = await sendToUser(userId, payload);
    if (result.sent > 0) notified++;
  }

  return apiOk({ ok: true, processed, notified });
}
