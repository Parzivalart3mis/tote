import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const stores = sqliteTable(
  'stores',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    coverImageUrl: text('cover_image_url'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [index('stores_user_idx').on(t.userId)]
);

export const items = sqliteTable(
  'items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    storeId: text('store_id')
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: text('quantity'),
    unit: text('unit'),
    note: text('note'),
    price: text('price'),
    priceUnit: text('price_unit'),
    checked: integer('checked', { mode: 'boolean' }).notNull().default(false),
    favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
    runningLow: integer('running_low', { mode: 'boolean' }).notNull().default(false),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => [
    index('items_store_idx').on(t.storeId),
    index('items_user_checked_idx').on(t.userId, t.checked),
  ]
);

export type User = typeof users.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Item = typeof items.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
export type NewItem = typeof items.$inferInsert;
