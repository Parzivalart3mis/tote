import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from '@/db/schema';
import { users, pantryItems } from '@/db/schema';
import { toSharedPantry } from '@/lib/pantry-share';
import { signPantryIdentity } from '@/lib/pantry-identity';

const testDb = drizzle(createClient({ url: ':memory:' }), { schema });
vi.mock('@/db', () => ({ db: testDb }));
const getUserList = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({ clerkClient: async () => ({ users: { getUserList } }) }));
const { GET, POST } = await import('@/app/api/integrations/pantry/route');
const OWNER = 'user_share_owner';
const OTHER = 'user_share_other';
const SECRET = 'test-share-secret-0123456789';
function clerkUser(id: string, email: string, verified = true) {
  return {
    id,
    emailAddresses: [
      { emailAddress: email, verification: { status: verified ? 'verified' : 'unverified' } },
    ],
  };
}
function request(email = 'owner@test.com', now = Date.now(), secret = SECRET) {
  return new Request('http://localhost/api/integrations/pantry', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${signPantryIdentity('different-cookbook-id', email, secret, now)}`,
    },
  });
}
beforeAll(async () => {
  await testDb.run(
    `CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, created_at INTEGER NOT NULL)`,
  );
  await testDb.run(`CREATE TABLE pantry_items (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL, quantity TEXT, unit TEXT, note TEXT, category TEXT,
    status TEXT NOT NULL DEFAULT 'IN_STOCK', position INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
  )`);
  await testDb.insert(users).values([
    { id: OWNER, email: 'old-stale-email@test.com' },
    { id: OTHER, email: 'other@test.com' },
  ]);
});
beforeEach(async () => {
  vi.stubEnv('PANTRY_SHARE_SECRET', SECRET);
  vi.stubEnv('PANTRY_SHARE_USER_ID', OWNER); // Must never select or fall back to this legacy value.
  vi.stubEnv('GEMINI_API_KEY', '');
  getUserList.mockReset();
  getUserList.mockImplementation(async ({ emailAddress }: { emailAddress: string[] }) => {
    const user =
      emailAddress[0] === 'owner@test.com'
        ? clerkUser(OWNER, 'Owner@Test.com')
        : clerkUser(OTHER, 'other@test.com');
    return { data: [user], totalCount: 1 };
  });
  await testDb.delete(pantryItems);
  await testDb.insert(pantryItems).values([
    {
      userId: OWNER,
      name: 'Eggs',
      quantity: '12',
      status: 'IN_STOCK',
      position: 0,
      note: 'private note',
    },
    { userId: OWNER, name: 'Spinach', status: 'LOW', position: 1 },
    { userId: OWNER, name: 'Milk', status: 'OUT', position: 2 },
    { userId: OWNER, name: 'Rice', status: 'BUY', position: 3 },
    {
      userId: OWNER,
      name: 'Laundry Detergent',
      status: 'IN_STOCK',
      position: 4,
      category: 'Household',
    },
    { userId: OWNER, name: 'Shampoo', status: 'LOW', position: 5, category: 'Personal Care' },
    { userId: OWNER, name: 'Paper Towels', status: 'IN_STOCK', position: 6 },
    { userId: OTHER, name: 'Someone else’s tofu', status: 'IN_STOCK', position: 0 },
  ]);
});
afterEach(() => vi.unstubAllEnvs());

describe('verified-email pantry sharing', () => {
  it('returns only the live Clerk email match, ignoring stale DB email and Cookbook IDs', async () => {
    const res = await POST(request(' OWNER@test.com '));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    const body = await res.json();
    expect(body.protocolVersion).toBe(2);
    expect(body.connectionId).toMatch(/^[a-f0-9]{64}$/);
    expect(body.items.map((i: { name: string }) => i.name)).toEqual(['Eggs', 'Spinach']);
    expect(body.items[0]).toEqual({
      name: 'Eggs',
      quantity: '12',
      unit: null,
      category: null,
      status: 'IN_STOCK',
    });
    expect(body.items[0]).not.toHaveProperty('note');
    expect(body.items[0]).not.toHaveProperty('id');
    expect(body).not.toHaveProperty('email');
  });
  it('isolates two accounts and never falls back to PANTRY_SHARE_USER_ID', async () => {
    const first = await (await POST(request())).json();
    const other = await (await POST(request('other@test.com'))).json();
    expect(other.items.map((i: { name: string }) => i.name)).toEqual(['Someone else’s tofu']);
    expect(other.connectionId).not.toBe(first.connectionId);
  });
  it('rejects the old secret, unsigned headers, wrong signatures and expired assertions before looking up users', async () => {
    for (const auth of [null, `Bearer ${SECRET}`, 'Bearer nope']) {
      const res = await POST(
        new Request('http://localhost', {
          method: 'POST',
          headers: auth ? { authorization: auth } : {},
        }),
      );
      expect(res.status).toBe(401);
    }
    expect((await POST(request('owner@test.com', Date.now(), 'wrong-secret'))).status).toBe(401);
    expect((await POST(request('owner@test.com', Date.now() - 120_000))).status).toBe(401);
    expect(getUserList).not.toHaveBeenCalled();
    expect((await GET()).status).toBe(410);
  });
  it('does not grant access for missing, unverified, mismatched or duplicate Clerk accounts', async () => {
    getUserList.mockResolvedValueOnce({ data: [], totalCount: 0 });
    expect((await POST(request())).status).toBe(404);
    getUserList.mockResolvedValueOnce({
      data: [clerkUser(OWNER, 'owner@test.com', false)],
      totalCount: 1,
    });
    expect((await POST(request())).status).toBe(403);
    getUserList.mockResolvedValueOnce({
      data: [clerkUser(OTHER, 'other@test.com')],
      totalCount: 1,
    });
    expect((await POST(request())).status).toBe(404);
    getUserList.mockResolvedValueOnce({
      data: [clerkUser(OWNER, 'owner@test.com'), clerkUser(OTHER, 'owner@test.com')],
      totalCount: 2,
    });
    expect((await POST(request())).status).toBe(409);
  });
  it('accepts a matching verified secondary email but not an unverified one', async () => {
    getUserList.mockResolvedValueOnce({
      data: [
        {
          id: OWNER,
          emailAddresses: [
            { emailAddress: 'primary@test.com', verification: { status: 'verified' } },
            { emailAddress: 'owner@test.com', verification: { status: 'verified' } },
          ],
        },
      ],
      totalCount: 1,
    });
    expect((await POST(request())).status).toBe(200);
  });
  it('fails closed if configuration or Clerk are unavailable', async () => {
    getUserList.mockRejectedValueOnce(new Error('Clerk down'));
    expect((await POST(request())).status).toBe(503);
    vi.stubEnv('PANTRY_SHARE_SECRET', '');
    expect((await POST(request())).status).toBe(503);
  });
});
it('only shares food in stock or running low', () => {
  const shared = toSharedPantry([
    { name: 'A', quantity: null, unit: null, category: null, status: 'IN_STOCK' },
    { name: 'B', quantity: null, unit: null, category: null, status: 'OUT' },
    { name: 'C', quantity: null, unit: null, category: null, status: 'BUY' },
    { name: 'D', quantity: null, unit: null, category: null, status: 'LOW' },
  ]);
  expect(shared.map((s) => s.name)).toEqual(['A', 'D']);
});
