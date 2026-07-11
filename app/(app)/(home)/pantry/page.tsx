export const dynamic = 'force-dynamic';

import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { PantryView } from '@/components/pantry/pantry-view';

export default async function PantryPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const items = await db
    .select()
    .from(pantryItems)
    .where(eq(pantryItems.userId, userId))
    .orderBy(asc(pantryItems.isOut), asc(pantryItems.position), asc(pantryItems.createdAt));

  return <PantryView initialItems={items} />;
}
