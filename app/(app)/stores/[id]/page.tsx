import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
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

  const storeItems = await db
    .select()
    .from(items)
    .where(and(eq(items.storeId, id), eq(items.userId, userId)))
    .orderBy(asc(items.checked), asc(items.position), asc(items.createdAt));

  return <StoreDetailView store={store} initialItems={storeItems} />;
}
