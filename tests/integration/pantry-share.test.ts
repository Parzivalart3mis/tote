import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
import { users, pantryItems } from '@/db/schema';
import { isAuthorizedBearer, toSharedPantry } from '@/lib/pantry-share';

// In-memory DB swapped in for the real one so the route handler runs end to end.
const testDb = drizzle(createClient({ url: ':memory:' }), { schema });
vi.mock('@/db', () => ({ db: testDb }));

const { GET } = await import('@/app/api/integrations/pantry/route');

const OWNER = 'user_share_owner';
const OTHER = 'user_share_other';
const SECRET = 'test-share-secret-0123456789';

function request(auth?: string) {
  return new Request('http://localhost/api/integrations/pantry', {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeAll(async () => {
  await testDb.run(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)`);
  await testDb.run(`CREATE TABLE pantry_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, quantity TEXT, unit TEXT, note TEXT, category TEXT,
    status TEXT NOT NULL DEFAULT 'IN_STOCK',
    position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`);
  await testDb.insert(users).values([
    { id: OWNER, email: 'owner@test.com' },
    { id: OTHER, email: 'other@test.com' },
  ]);
});

beforeEach(async () => {
  vi.stubEnv('PANTRY_SHARE_SECRET', SECRET);
  vi.stubEnv('PANTRY_SHARE_USER_ID', OWNER);
  await testDb.delete(pantryItems);
  await testDb.insert(pantryItems).values([
    { userId: OWNER, name: 'Eggs', quantity: '12', status: 'IN_STOCK', position: 0, note: 'private note' },
    { userId: OWNER, name: 'Spinach', status: 'LOW', position: 1 },
    { userId: OWNER, name: 'Milk', status: 'OUT', position: 2 },
    { userId: OWNER, name: 'Rice', status: 'BUY', position: 3 },
    { userId: OTHER, name: 'Someone else’s tofu', status: 'IN_STOCK', position: 0 },
  ]);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/integrations/pantry', () => {
  it('returns only the owner’s in-stock and running-low items, without private fields', async () => {
    const res = await GET(request(`Bearer ${SECRET}`));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: Record<string, unknown>[] };
    expect(body.items.map((i) => i['name'])).toEqual(['Eggs', 'Spinach']);
    expect(body.items[0]).toEqual({ name: 'Eggs', quantity: '12', unit: null, category: null, status: 'IN_STOCK' });
    expect(body.items[0]).not.toHaveProperty('note');
    expect(body.items[0]).not.toHaveProperty('id');
  });

  it('rejects a missing or wrong secret', async () => {
    expect((await GET(request())).status).toBe(401);
    expect((await GET(request('Bearer nope'))).status).toBe(401);
    expect((await GET(request(SECRET))).status).toBe(401);
  });

  it('is disabled (503) until both env vars are set', async () => {
    vi.stubEnv('PANTRY_SHARE_USER_ID', '');
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(503);
  });
});

describe('pantry share helpers', () => {
  it('accepts only an exact bearer secret', () => {
    expect(isAuthorizedBearer(`Bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedBearer(`bearer ${SECRET}`, SECRET)).toBe(true);
    expect(isAuthorizedBearer(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isAuthorizedBearer(null, SECRET)).toBe(false);
    expect(isAuthorizedBearer('Bearer ', '')).toBe(false);
  });

  it('drops out-of-stock and to-buy items', () => {
    const shared = toSharedPantry([
      { name: 'A', quantity: null, unit: null, category: null, status: 'IN_STOCK' },
      { name: 'B', quantity: null, unit: null, category: null, status: 'OUT' },
      { name: 'C', quantity: null, unit: null, category: null, status: 'BUY' },
      { name: 'D', quantity: null, unit: null, category: null, status: 'LOW' },
    ]);
    expect(shared.map((s) => s.name)).toEqual(['A', 'D']);
  });
});
