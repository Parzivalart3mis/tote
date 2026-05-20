import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function requireAuth(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  return userId;
}

export async function requireAuthWithSync(): Promise<string> {
  const [{ userId }, user] = await Promise.all([auth(), currentUser()]);
  if (!userId) throw new Error('Unauthorized');

  if (user) {
    const email = user.emailAddresses[0]?.emailAddress ?? `${userId}@clerk`;
    await db
      .insert(users)
      .values({ id: userId, email })
      .onConflictDoNothing();
  }

  return userId;
}
