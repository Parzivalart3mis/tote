import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items, pantryItems } from '@/db/schema';
import { StoreDetailView } from '@/components/stores/store-detail-view';

type Props = { params: Promise<{ id: string }> };

export default async function StoreDetailPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const { id } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, id), eq(stores.userId, userId)))
    .get();

  if (!store) notFound();

  const [storeItems, restockCandidates] = await Promise.all([
    db
      .select()
      .from(items)
      .where(and(eq(items.storeId, id), eq(items.userId, userId)))
      .orderBy(asc(items.checked), asc(items.position), asc(items.createdAt)),
    // Only Low/Out pantry items can be restocked when their store item is bought.
    db
      .select({ id: pantryItems.id, name: pantryItems.name, status: pantryItems.status })
      .from(pantryItems)
      .where(and(eq(pantryItems.userId, userId), ne(pantryItems.status, 'IN_STOCK'))),
  ]);

  return (
    <StoreDetailView
      store={store}
      initialItems={storeItems}
      restockCandidates={restockCandidates}
    />
  );
}
