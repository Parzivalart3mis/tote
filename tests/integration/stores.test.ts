import { describe, it, expect, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { users, stores, items } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/db/schema';

function createTestDb() {
  const client = createClient({ url: ':memory:' });
  return drizzle(client, { schema });
}

async function migrateTestDb(db: ReturnType<typeof createTestDb>) {
  // Create tables manually for in-memory tests
  const client = (db as unknown as { session: { client: { execute: (sql: string) => Promise<unknown> } } }).session?.client;
  if (!client) return;

  await Promise.all([
    db.run(
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      )`
    ),
    // wait for users table first
  ]);

  await db.run(
    `CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      cover_image_url TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  );

  await db.run(
    `CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      note TEXT,
      checked INTEGER NOT NULL DEFAULT 0,
      favorite INTEGER NOT NULL DEFAULT 0,
      running_low INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  );
}

describe('cross-user isolation', () => {
  const db = createTestDb();
  const userA = 'user_a';
  const userB = 'user_b';

  beforeEach(async () => {
    await migrateTestDb(db);

    await db.insert(users).values([
      { id: userA, email: 'a@test.com' },
      { id: userB, email: 'b@test.com' },
    ]).onConflictDoNothing();

    await db.delete(stores).all();

    await db.insert(stores).values([
      { userId: userA, name: "User A's Store" },
      { userId: userB, name: "User B's Store" },
    ]);
  });

  it("user A cannot see user B's stores", async () => {
    const userAStores = await db.select().from(stores).where(eq(stores.userId, userA));
    const userBStores = await db.select().from(stores).where(eq(stores.userId, userB));

    expect(userAStores).toHaveLength(1);
    expect(userBStores).toHaveLength(1);
    expect(userAStores[0]?.name).toBe("User A's Store");
    expect(userBStores[0]?.name).toBe("User B's Store");
  });

  it('scoped query returns only own stores', async () => {
    const bStoreId = (await db.select().from(stores).where(eq(stores.userId, userB)))[0]?.id;
    if (!bStoreId) throw new Error('No store');

    // User A tries to access user B's store with the right ID — scoped query should return nothing
    const result = await db
      .select()
      .from(stores)
      .where(and(eq(stores.id, bStoreId), eq(stores.userId, userA)));

    expect(result).toHaveLength(0);
  });

  it('cascade delete removes items when store deleted', async () => {
    const [store] = await db.insert(stores).values({ userId: userA, name: 'Test' }).returning();
    if (!store) throw new Error();

    await db.insert(items).values({ storeId: store.id, userId: userA, name: 'Milk' });

    const before = await db.select().from(items).where(eq(items.storeId, store.id));
    expect(before).toHaveLength(1);

    await db.delete(stores).where(eq(stores.id, store.id));

    const after = await db.select().from(items).where(eq(items.storeId, store.id));
    expect(after).toHaveLength(0);
  });
});
