import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function ensureUser(userId: string, email: string) {
  const existing = await db.select().from(users).where(eq(users.id, userId)).get();
  if (!existing) {
    await db.insert(users).values({ id: userId, email }).onConflictDoNothing();
  }
}
