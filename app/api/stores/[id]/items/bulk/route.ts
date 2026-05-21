import { auth } from '@clerk/nextjs/server';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

const idsSchema = z
  .object({ ids: z.array(z.string().min(1)).min(1).max(100) })
  .strict();

const checkSchema = idsSchema.extend({ checked: z.boolean() }).strict();

export async function PATCH(req: Request, { params }: Params) {
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

  const body = await req.json().catch(() => null);
  const parsed = checkSchema.safeParse(body);
  if (!parsed.success)
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);

  const { ids, checked } = parsed.data;

  await db
    .update(items)
    .set({ checked })
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId), inArray(items.id, ids)));

  return apiOk({ updated: ids.length });
}

export async function DELETE(req: Request, { params }: Params) {
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

  const body = await req.json().catch(() => null);
  const parsed = idsSchema.safeParse(body);
  if (!parsed.success)
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);

  const { ids } = parsed.data;

  await db
    .delete(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId), inArray(items.id, ids)));

  return apiOk({ deleted: ids.length });
}
