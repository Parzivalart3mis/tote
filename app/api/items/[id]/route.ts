import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { items } from '@/db/schema';
import { updateItemSchema } from '@/lib/schemas/item';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id } = await params;

  const item = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)))
    .get();
  if (!item) return apiError('NOT_FOUND', 'Item not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = updateItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const updates: Partial<typeof items.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if ('quantity' in parsed.data) updates.quantity = parsed.data.quantity ?? null;
  if ('unit' in parsed.data) updates.unit = parsed.data.unit ?? null;
  if ('note' in parsed.data) updates.note = parsed.data.note ?? null;
  if ('price' in parsed.data) updates.price = parsed.data.price ?? null;
  if ('priceUnit' in parsed.data) updates.priceUnit = parsed.data.priceUnit ?? null;
  if ('category' in parsed.data) updates.category = parsed.data.category ?? null;
  if (parsed.data.onList !== undefined) updates.onList = parsed.data.onList;
  if (parsed.data.checked !== undefined) updates.checked = parsed.data.checked;
  if (parsed.data.favorite !== undefined) updates.favorite = parsed.data.favorite;
  if (parsed.data.runningLow !== undefined) updates.runningLow = parsed.data.runningLow;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;

  const [updated] = await db
    .update(items)
    .set(updates)
    .where(and(eq(items.id, id), eq(items.userId, userId)))
    .returning();

  return apiOk({ item: updated });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id } = await params;

  const item = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId)))
    .get();
  if (!item) return apiError('NOT_FOUND', 'Item not found', 404);

  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, userId)));

  return apiOk({ ok: true });
}
