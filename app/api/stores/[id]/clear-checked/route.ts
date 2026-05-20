import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id: storeId } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const deleted = await db
    .delete(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId), eq(items.checked, true)))
    .returning();

  return apiOk({ deleted: deleted.length });
}
