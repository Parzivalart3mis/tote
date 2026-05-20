import { db } from './index';
import { users, stores, items } from './schema';

const SEED_USER_ID = 'seed_user_1';

async function seed() {
  console.log('Seeding database…');

  // Upsert seed user
  await db.insert(users).values({
    id: SEED_USER_ID,
    email: 'seed@tote.app',
  }).onConflictDoNothing();

  // Wipe existing seed data
  await db.delete(stores).all();

  const [tj, costco, ig] = await db.insert(stores).values([
    {
      userId: SEED_USER_ID,
      name: "Trader Joe's",
      coverImageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800',
      position: 0,
    },
    {
      userId: SEED_USER_ID,
      name: 'Costco',
      coverImageUrl: 'https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=800',
      position: 1,
    },
    {
      userId: SEED_USER_ID,
      name: 'Indian Grocery',
      coverImageUrl: null,
      position: 2,
    },
  ]).returning();

  if (!tj || !costco || !ig) {
    throw new Error('Failed to insert seed stores');
  }

  await db.insert(items).values([
    // Trader Joe's
    { storeId: tj.id, userId: SEED_USER_ID, name: 'Everything Bagels', quantity: '1', unit: 'bag', position: 0 },
    { storeId: tj.id, userId: SEED_USER_ID, name: 'Mandarin Orange Chicken', quantity: '2', position: 1, favorite: true },
    { storeId: tj.id, userId: SEED_USER_ID, name: 'Unexpected Cheddar', quantity: '1', position: 2, runningLow: true },
    { storeId: tj.id, userId: SEED_USER_ID, name: 'Cold Brew Coffee', position: 3, checked: true },

    // Costco
    { storeId: costco.id, userId: SEED_USER_ID, name: 'Kirkland Olive Oil', quantity: '2', unit: 'bottles', position: 0 },
    { storeId: costco.id, userId: SEED_USER_ID, name: 'Paper Towels', quantity: '1', unit: 'pack', position: 1 },
    { storeId: costco.id, userId: SEED_USER_ID, name: 'Rotisserie Chicken', position: 2, note: 'Get two on Sundays' },
    { storeId: costco.id, userId: SEED_USER_ID, name: 'Greek Yogurt', quantity: '500g', position: 3, checked: true },
    { storeId: costco.id, userId: SEED_USER_ID, name: 'Medjool Dates', position: 4 },

    // Indian Grocery
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Basmati Rice', quantity: '5', unit: 'kg', position: 0 },
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Red Lentils (Masoor Dal)', quantity: '2', unit: 'kg', position: 1 },
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Ghee', quantity: '500g', position: 2, favorite: true },
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Turmeric Powder', quantity: '200g', position: 3, runningLow: true },
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Paneer', position: 4, checked: true },
    { storeId: ig.id, userId: SEED_USER_ID, name: 'Fresh Curry Leaves', position: 5 },
  ]);

  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
