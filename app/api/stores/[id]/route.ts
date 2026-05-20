import { auth } from '@clerk/nextjs/server';
import { and, eq, asc } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { updateStoreSchema } from '@/lib/schemas/store';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { id } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, id), eq(stores.userId, userId)))
    .get();

  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const storeItems = await db
    .select()
    .from(items)
    .where(and(eq(items.storeId, id), eq(items.userId, userId)))
    .orderBy(asc(items.checked), asc(items.position), asc(items.createdAt));

  return apiOk({ store, items: storeItems });
}

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, id), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const updates: Partial<typeof stores.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if ('coverImageUrl' in parsed.data) updates.coverImageUrl = parsed.data.coverImageUrl ?? null;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;

  const [updated] = await db
    .update(stores)
    .set(updates)
    .where(and(eq(stores.id, id), eq(stores.userId, userId)))
    .returning();

  return apiOk({ store: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, id), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  await db.delete(stores).where(and(eq(stores.id, id), eq(stores.userId, userId)));

  return apiOk({ ok: true });
}
