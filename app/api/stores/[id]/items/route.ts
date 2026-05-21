import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { createItemSchema } from '@/lib/schemas/item';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id: storeId } = await params;

  // Verify store ownership
  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const maxPos = await db
    .select({ pos: sql<number>`coalesce(max(${items.position}), -1)` })
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId)))
    .get();

  const [item] = await db
    .insert(items)
    .values({
      storeId,
      userId,
      name: parsed.data.name,
      quantity: parsed.data.quantity ?? null,
      unit: parsed.data.unit ?? null,
      note: parsed.data.note ?? null,
      price: parsed.data.price ?? null,
      priceUnit: parsed.data.priceUnit ?? null,
      category: parsed.data.category ?? null,
      position: (maxPos?.pos ?? -1) + 1,
    })
    .returning();

  return apiOk({ item }, 201);
}
