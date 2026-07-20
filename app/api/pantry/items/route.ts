import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { pantryStatusRank } from '@/lib/pantry-order';
import { createPantryItemSchema } from '@/lib/schemas/pantry';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';

export async function GET() {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const items = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(pantryStatusRank, asc(pantryItems.position), asc(pantryItems.createdAt));

  return apiOk({ items });
}

export async function POST(req: Request) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const body = await req.json().catch(() => null);
  const parsed = createPantryItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const maxPos = await db
    .select({ pos: sql<number>`coalesce(max(${pantryItems.position}), -1)` })
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .get();

  const [item] = await db
    .insert(pantryItems)
    .values({
      userId,
      name: parsed.data.name,
      quantity: parsed.data.quantity ?? null,
      unit: parsed.data.unit ?? null,
      note: parsed.data.note ?? null,
      category: parsed.data.category ?? null,
      position: (maxPos?.pos ?? -1) + 1,
    })
    .returning();

  return apiOk({ item }, 201);
}
