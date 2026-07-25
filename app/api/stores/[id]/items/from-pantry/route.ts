import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { stores, items, pantryItems } from '@/db/schema';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';
import { planPantryToStore } from '@/lib/pantry-to-store';

type Params = { params: Promise<{ id: string }> };

const bodySchema = z
  .object({ pantryItemIds: z.array(z.string()).min(1).max(200) })
  .strict();

export async function POST(req: Request, { params }: Params) {
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

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  // Load the requested pantry items, scoped to this user.
  const sourceItems = await db
    .select()
    .from(pantryItems)
    .where(and(eq(pantryItems.userId, userId), inArray(pantryItems.id, parsed.data.pantryItemIds)))
    .all();

  if (sourceItems.length === 0) {
    return apiOk({ added: 0, reused: 0, store: { id: store.id, name: store.name } });
  }

  // Existing items in this store drive dedup by normalized name.
  const existing = await db
    .select()
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId)))
    .all();

  const plan = planPantryToStore(sourceItems, existing);

  const maxPos = await db
    .select({ pos: sql<number>`coalesce(max(${items.position}), -1)` })
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId)))
    .get();
  let nextPos = (maxPos?.pos ?? -1) + 1;

  for (const entry of plan.entries) {
    if (entry.kind === 'reuse') {
      if (!entry.alreadyOnList) {
        await db
          .update(items)
          .set({ onList: true })
          .where(and(eq(items.id, entry.itemId), eq(items.userId, userId)));
      }
    } else {
      await db.insert(items).values({
        storeId,
        userId,
        name: entry.source.name,
        quantity: entry.source.quantity ?? null,
        unit: entry.source.unit ?? null,
        category: entry.source.category ?? null,
        onList: true,
        position: nextPos++,
      });
    }
  }

  return apiOk({ added: plan.added, reused: plan.reused, store: { id: store.id, name: store.name } });
}
