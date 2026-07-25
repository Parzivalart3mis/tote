export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems, stores } from '@/db/schema';
import { pantryStatusRank } from '@/lib/pantry-order';
import { PantryView } from '@/components/pantry/pantry-view';

export default async function PantryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const [items, storeList] = await Promise.all([
    db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userId))
      .orderBy(pantryStatusRank, asc(pantryItems.position), asc(pantryItems.createdAt)),
    db
      .select({ id: stores.id, name: stores.name })
      .from(stores)
      .where(eq(stores.userId, userId))
      .orderBy(asc(stores.position), asc(stores.createdAt)),
  ]);

  return <PantryView initialItems={items} stores={storeList} />;
}
