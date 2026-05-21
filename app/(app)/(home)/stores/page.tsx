export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { StoresGrid } from '@/components/stores/stores-grid';

export default async function StoresPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

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

  return <StoresGrid initialStores={rows} />;
}
