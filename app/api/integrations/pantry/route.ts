export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { createHmac } from 'node:crypto';
import { clerkClient } from '@clerk/nextjs/server';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';
import { geminiConfigured } from '@/lib/gemini';
import { categorizeUncategorized } from '@/lib/pantry-categorize';
import { pantryStatusRank } from '@/lib/pantry-order';
import { SHAREABLE_STATUSES, toSharedPantry } from '@/lib/pantry-share';
import { checkRateLimit } from '@/lib/ratelimit';
import { normalizePantryEmail, verifyPantryIdentity } from '@/lib/pantry-identity';

/** Old bearer-only requests must never silently read a fixed owner's pantry. */
export async function GET() {
  return apiError('VALIDATION', 'Use the verified-email pantry linking protocol.', 410);
}

/** Only Cookbook may assert an email; tote independently checks its own Clerk. */
export async function POST(req: Request) {
  const secret = process.env['PANTRY_SHARE_SECRET']?.trim();
  if (!secret) return apiError('INTERNAL', 'Pantry linking is not configured', 503);
  const identity = verifyPantryIdentity(req.headers.get('authorization'), secret);
  if (!identity) return apiError('UNAUTHORIZED', 'Invalid or expired pantry identity', 401);
  const { ok } = await checkRateLimit(`pantry-share:${identity.subject}`);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  let userId: string;
  try {
    const client = await clerkClient();
    const result = await client.users.getUserList({ emailAddress: [identity.email], limit: 2 });
    if (result.totalCount > 1 || result.data.length > 1)
      return apiError('VALIDATION', 'Ambiguous tote account', 409);
    const user = result.data[0];
    if (!user) return apiError('NOT_FOUND', 'No matching tote account', 404);
    const matching = user.emailAddresses.filter(
      (address) => normalizePantryEmail(address.emailAddress) === identity.email,
    );
    if (!matching.length) return apiError('NOT_FOUND', 'No matching tote account', 404);
    if (!matching.some((address) => address.verification?.status === 'verified'))
      return apiError('FORBIDDEN', 'Verify the matching email in tote', 403);
    userId = user.id;
  } catch {
    console.warn('[integrations/pantry] Clerk identity lookup unavailable');
    return apiError('INTERNAL', 'Could not verify the linked account', 503);
  }

  if (geminiConfigured()) {
    await categorizeUncategorized(userId, { timeoutMs: 6_000 }).catch(() =>
      console.warn('[integrations/pantry] categorization unavailable'),
    );
  }
  const rows = await db
    .select({
      name: pantryItems.name,
      quantity: pantryItems.quantity,
      unit: pantryItems.unit,
      category: pantryItems.category,
      status: pantryItems.status,
    })
    .from(pantryItems)
    .where(
      and(eq(pantryItems.userId, userId), inArray(pantryItems.status, [...SHAREABLE_STATUSES])),
    )
    .orderBy(pantryStatusRank, asc(pantryItems.position), asc(pantryItems.createdAt));

  const connectionId = createHmac('sha256', secret)
    .update(JSON.stringify(['tote-pantry', userId, identity.email]))
    .digest('hex');
  const response = apiOk({
    protocolVersion: 2,
    connectionId,
    items: toSharedPantry(rows),
    generatedAt: new Date().toISOString(),
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
