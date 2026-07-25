import type { PantryItem, Item } from '@/db/schema';

/** Normalize a name for case/space-insensitive matching between pantry and store. */
export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type PantryToStorePlanEntry =
  | { kind: 'reuse'; itemId: string; alreadyOnList: boolean }
  | { kind: 'create'; source: Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'category'> };

export interface PantryToStorePlan {
  entries: PantryToStorePlanEntry[];
  added: number;
  reused: number;
}

/**
 * Decide, for each requested pantry item, whether it maps to an existing store
 * item (reuse) or a new one (create). Pure and deterministic so it can be unit
 * tested without a database. Deduplicates by normalized name within the request.
 */
export function planPantryToStore(
  sources: Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'category'>[],
  existingStoreItems: Pick<Item, 'id' | 'name' | 'onList'>[]
): PantryToStorePlan {
  const byName = new Map(existingStoreItems.map((i) => [normalizeName(i.name), i]));
  const seen = new Set<string>();
  const entries: PantryToStorePlanEntry[] = [];
  let added = 0;
  let reused = 0;

  for (const source of sources) {
    const key = normalizeName(source.name);
    if (seen.has(key)) continue;
    seen.add(key);

    const match = byName.get(key);
    if (match) {
      entries.push({ kind: 'reuse', itemId: match.id, alreadyOnList: !!match.onList });
      reused++;
    } else {
      entries.push({
        kind: 'create',
        source: { name: source.name, quantity: source.quantity, unit: source.unit, category: source.category },
      });
      added++;
    }
  }

  return { entries, added, reused };
}

/** A pantry item eligible to be restocked when its store counterpart is bought. */
export interface RestockCandidate {
  id: string;
  name: string;
  status: string;
}

/**
 * Given the name of a just-purchased store item, find the pantry item that
 * should be offered a restock: same normalized name, and currently Low or Out
 * (an in-stock item needs no restock). Returns null when nothing qualifies.
 * Pure so the store→pantry matching can be unit tested without a database.
 */
export function findRestockCandidate<T extends RestockCandidate>(
  purchasedName: string,
  candidates: T[]
): T | null {
  const key = normalizeName(purchasedName);
  return (
    candidates.find(
      (c) => c.status !== 'IN_STOCK' && normalizeName(c.name) === key
    ) ?? null
  );
}
