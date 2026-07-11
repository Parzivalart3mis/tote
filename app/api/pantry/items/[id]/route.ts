import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { updatePantryItemSchema } from '@/lib/schemas/pantry';
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
    .from(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .get();
  if (!item) return apiError('NOT_FOUND', 'Pantry item not found', 404);

  const body = await req.json().catch(() => null);
  const parsed = updatePantryItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const updates: Partial<typeof pantryItems.$inferInsert> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if ('quantity' in parsed.data) updates.quantity = parsed.data.quantity ?? null;
  if ('unit' in parsed.data) updates.unit = parsed.data.unit ?? null;
  if ('note' in parsed.data) updates.note = parsed.data.note ?? null;
  if ('category' in parsed.data) updates.category = parsed.data.category ?? null;
  if (parsed.data.isOut !== undefined) updates.isOut = parsed.data.isOut;
  if (parsed.data.position !== undefined) updates.position = parsed.data.position;

  const [updated] = await db
    .update(pantryItems)
    .set(updates)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
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
    .from(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .get();
  if (!item) return apiError('NOT_FOUND', 'Pantry item not found', 404);

  await db.delete(pantryItems).where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)));

  return apiOk({ ok: true });
}
