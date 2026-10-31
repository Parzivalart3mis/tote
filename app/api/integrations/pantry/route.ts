export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';
import { pantryStatusRank } from '@/lib/pantry-order';
import { SHAREABLE_STATUSES, isAuthorizedBearer, toSharedPantry } from '@/lib/pantry-share';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Read-only pantry feed for The Cookbook's AI Kitchen. The two apps use
 * different Clerk instances, so this is secured by a bearer secret, NOT Clerk
 * (same model as /api/cron). The secret is bound to exactly one tote user via
 * PANTRY_SHARE_USER_ID, so a leaked secret can only ever expose that one
 * pantry, read-only, and only the in-stock / running-low items.
 */
export async function GET(req: Request) {
  const secret = process.env['PANTRY_SHARE_SECRET'];
  const userId = process.env['PANTRY_SHARE_USER_ID'];
  if (!secret || !userId) return apiError('INTERNAL', 'Pantry sharing not configured', 503);

  if (!isAuthorizedBearer(req.headers.get('authorization'), secret)) {
    return apiError('UNAUTHORIZED', 'Invalid pantry share secret', 401);
  }

  const { ok } = await checkRateLimit(`pantry-share:${userId}`);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const rows = await db
    .select({
      name: pantryItems.name,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      category: pantryItems.category,
      status: pantryItems.status,
    })
    .from(pantryItems)
    .where(and(eq(pantryItems.userId, userId), inArray(pantryItems.status, [...SHAREABLE_STATUSES])))
    .orderBy(pantryStatusRank, asc(pantryItems.position), asc(pantryItems.createdAt));

  return apiOk({ items: toSharedPantry(rows), generatedAt: new Date().toISOString() });
}
