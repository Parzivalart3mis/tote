import { describe, it, expect, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users, pantryItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';

function createTestDb() {
  const client = createClient({ url: ':memory:' });
  return drizzle(client, { schema });
}

async function migrateTestDb(db: ReturnType<typeof createTestDb>) {
  await db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    )`
  );

  await db.run(
    `CREATE TABLE IF NOT EXISTS pantry_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      note TEXT,
      category TEXT,
      is_out INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  );
}

describe('pantry isolation', () => {
  const db = createTestDb();
  const userA = 'user_pantry_a';
  const userB = 'user_pantry_b';

  beforeEach(async () => {
    await migrateTestDb(db);

    await db.insert(users).values([
      { id: userA, email: 'pantry_a@test.com' },
      { id: userB, email: 'pantry_b@test.com' },
    ]).onConflictDoNothing();

    await db.delete(pantryItems).all();
  });

  it('creates a pantry item with isOut defaulting to false', async () => {
    const [item] = await db
      .insert(pantryItems)
      .values({ userId: userA, name: 'Olive Oil', position: 0 })
      .returning();

    expect(item?.name).toBe('Olive Oil');
    expect(item?.isOut).toBe(false);
    expect(item?.userId).toBe(userA);
  });

  it('can toggle isOut to true', async () => {
    const [item] = await db
      .insert(pantryItems)
      .values({ userId: userA, name: 'Salt', position: 0 })
      .returning();

    const [updated] = await db
      .update(pantryItems)
      .set({ isOut: true })
      .where(eq(pantryItems.id, item!.id))
      .returning();

    expect(updated?.isOut).toBe(true);
  });

  it('user A cannot see user B pantry items via scoped query', async () => {
    await db.insert(pantryItems).values({ userId: userB, name: 'Pepper', position: 0 });

    const aItems = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userA));

    expect(aItems).toHaveLength(0);
  });

  it('scoped query with id + userId prevents cross-user access', async () => {
    const [bItem] = await db
      .insert(pantryItems)
      .values({ userId: userB, name: 'Sugar', position: 0 })
      .returning();

    const result = await db
      .select()
      .from(pantryItems)
      .where(and(eq(pantryItems.id, bItem!.id), eq(pantryItems.userId, userA)));

    expect(result).toHaveLength(0);
  });

  it('cascade delete removes pantry items when user is deleted', async () => {
    // Note: CASCADE on user delete — verify items are tied to userId
    await db.insert(pantryItems).values({ userId: userA, name: 'Vinegar', position: 0 });

    const before = await db.select().from(pantryItems).where(eq(pantryItems.userId, userA));
    expect(before).toHaveLength(1);

    await db.delete(users).where(eq(users.id, userA));

    const after = await db.select().from(pantryItems).where(eq(pantryItems.userId, userA));
    expect(after).toHaveLength(0);
  });

  it('position ordering works correctly', async () => {
    await db.insert(pantryItems).values([
      { userId: userA, name: 'C', position: 2 },
      { userId: userA, name: 'A', position: 0 },
      { userId: userA, name: 'B', position: 1 },
    ]);

    const result = await db
      .select()
      .from(pantryItems)
      .where(eq(pantryItems.userId, userA))
      .orderBy(pantryItems.position);

    expect(result.map((r) => r.name)).toEqual(['A', 'B', 'C']);
  });
});
