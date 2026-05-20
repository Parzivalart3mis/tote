import { auth } from '@clerk/nextjs/server';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { createStoreSchema } from '@/lib/schemas/store';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const rows = await db
    .select({
      id: stores.id,
      userId: stores.userId,
      name: stores.name,
      coverImageUrl: stores.coverImageUrl,
      position: stores.position,
      createdAt: stores.createdAt,
      updatedAt: stores.updatedAt,
      uncheckedCount: sql<number>`cast(count(case when ${items.checked} = 0 then 1 end) as integer)`,
    })
    .from(stores)
    .leftJoin(items, eq(items.storeId, stores.id))
    .where(eq(stores.userId, userId))
    .groupBy(stores.id)
    .orderBy(stores.position, stores.createdAt);

  return apiOk({ stores: rows });
}

export async function POST(req: Request) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const body = await req.json().catch(() => null);
  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  const maxPos = await db
    .select({ pos: sql<number>`coalesce(max(${stores.position}), -1)` })
    .from(stores)
    .where(eq(stores.userId, userId))
    .get();

  const [store] = await db
    .insert(stores)
    .values({
      userId,
      name: parsed.data.name,
      coverImageUrl: parsed.data.coverImageUrl ?? null,
      position: (maxPos?.pos ?? -1) + 1,
    })
    .returning();

  return apiOk({ store }, 201);
}
