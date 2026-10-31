export const runtime = 'nodejs';
export const maxDuration = 60;

import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { ITEM_CATEGORIES } from '@/lib/categories';
import { CATEGORIZE_BATCH, STORE_CATEGORIZE_SYSTEM, categorizeErrorResponse, categorizeWithAi } from '@/lib/ai-categorize';
import { geminiConfigured } from '@/lib/gemini';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id: storeId } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const uncategorized = await db
    .select({ id: items.id, name: items.name })
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId), isNull(items.category)))
    .limit(CATEGORIZE_BATCH)
    .all();

  if (uncategorized.length === 0) {
    return apiOk({ categorized: 0, items: [] });
  }

  if (!geminiConfigured()) return apiError('INTERNAL', 'Gemini API key not configured', 503);

  let updates: { id: string; category: string }[];
  try {
    updates = await categorizeWithAi(uncategorized, { system: STORE_CATEGORIZE_SYSTEM, categories: ITEM_CATEGORIES });
  } catch (err) {
    return categorizeErrorResponse('stores/categorize', err);
  }

  // `category IS NULL` in the update too: an edit made while the model was
  // thinking wins over the AI's answer.
  await Promise.all(
    updates.map(({ id, category }) =>
      db
        .update(items)
        .set({ category })
        .where(and(eq(items.id, id), eq(items.storeId, storeId), eq(items.userId, userId), isNull(items.category)))
    )
  );

  // Return the updated items so the client can update state
  const updatedItems = await db
    .select()
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId)))
    .all();

  return apiOk({ categorized: updates.length, items: updatedItems });
}
