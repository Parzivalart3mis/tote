import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';

type Params = { params: Promise<{ id: string }> };

const reorderSchema = z.object({ ids: z.array(z.string().min(1)).min(1).max(500) }).strict();

export async function PATCH(req: Request, { params }: Params) {
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
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) return apiError('VALIDATION', 'Invalid ids', 422);

  await Promise.all(
    parsed.data.ids.map((itemId, position) =>
      db
        .update(items)
        .set({ position })
        .where(and(eq(items.id, itemId), eq(items.storeId, storeId), eq(items.userId, userId)))
    )
  );

  return apiOk({ ok: true });
}
