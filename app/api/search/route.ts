import { auth } from '@clerk/nextjs/server';
import { and, asc, eq, like, or } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const q = new URL(req.url).searchParams.get('q')?.trim() ?? '';
  if (!q) return apiOk({ results: [] });

  const pattern = `%${q}%`;

  // Get all user's stores
  const userStores = await db
    .select()
    .from(stores)
    .where(eq(stores.userId, userId))
    .orderBy(stores.position, asc(stores.createdAt));

  // Get all matching items
  const matchingItems = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.userId, userId),
        or(like(items.name, pattern), like(items.note, pattern))
      )
    );

  // Group by store
  const storeMap = new Map(userStores.map((s) => [s.id, s]));
  const grouped = new Map<string, { store: typeof userStores[0]; items: typeof matchingItems }>();

  for (const item of matchingItems) {
    const store = storeMap.get(item.storeId);
    if (!store) continue;
    if (!grouped.has(store.id)) {
      grouped.set(store.id, { store, items: [] });
    }
    grouped.get(store.id)!.items.push(item);
  }

  // Also include stores whose name matches
  for (const store of userStores) {
    if (store.name.toLowerCase().includes(q.toLowerCase()) && !grouped.has(store.id)) {
      grouped.set(store.id, { store, items: [] });
    }
  }

  const results = Array.from(grouped.values());
  return apiOk({ results });
}
