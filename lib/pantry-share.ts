import { timingSafeEqual } from 'node:crypto';
import type { PantryItem } from '@/db/schema';
import type { PantryStatus } from '@/lib/pantry-status';
import { isEdibleCategory } from '@/lib/categories';

/**
 * Read-only pantry sharing for trusted companion apps (The Cookbook's AI
 * Kitchen). Only items you actually have are shared: "in stock" and "running
 * low". Out and To-buy items are left out because you can't cook with them.
 */
export const SHAREABLE_STATUSES = ['IN_STOCK', 'LOW'] as const satisfies readonly PantryStatus[];

export type SharedPantryItem = {
  name: string;
  quantity: string | null;
  unit: string | null;
  category: string | null;
  status: (typeof SHAREABLE_STATUSES)[number];
};

export function isShareableStatus(status: PantryStatus): status is SharedPantryItem['status'] {
  return (SHAREABLE_STATUSES as readonly PantryStatus[]).includes(status);
}

/**
 * Only food you have, and only the fields a recipe suggester needs; ids, notes
 * and ordering stay private. Household / Personal Care items are dropped.
 */
export function toSharedPantry(
  rows: Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'category' | 'status'>[]
): SharedPantryItem[] {
  return rows
    .filter((r) => isShareableStatus(r.status) && isEdibleCategory(r.category))
    .map((r) => ({
      name: r.name.trim(),
      quantity: r.quantity ?? null,
      unit: r.unit ?? null,
      category: r.category ?? null,
      status: r.status as SharedPantryItem['status'],
    }));
}

/**
 * Constant-time check of an `Authorization: Bearer <secret>` header so the
 * secret can't be recovered by timing responses.
 */
export function isAuthorizedBearer(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match) return false;
  const given = Buffer.from(match[1]!.trim());
  const expected = Buffer.from(secret);
  if (given.length !== expected.length) return false;
  return timingSafeEqual(given, expected);
}
