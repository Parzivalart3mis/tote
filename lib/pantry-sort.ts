import type { PantryItem } from '@/db/schema';
import { PANTRY_STATUS_RANK } from '@/lib/pantry-status';
import { PANTRY_CATEGORIES, toPantryCategory } from '@/lib/categories';

export const PANTRY_SORT_MODES = ['manual', 'name-asc', 'name-desc'] as const;
export type PantrySortMode = (typeof PANTRY_SORT_MODES)[number];

export const PANTRY_SORT_KEY = 'tote:pantry:sort';
export const PANTRY_COLLAPSE_KEY = 'tote:pantry:collapsed';

export function nextSortMode(mode: PantrySortMode): PantrySortMode {
  return PANTRY_SORT_MODES[(PANTRY_SORT_MODES.indexOf(mode) + 1) % PANTRY_SORT_MODES.length]!;
}

export function sortModeLabel(mode: PantrySortMode): string {
  if (mode === 'name-asc') return 'A–Z';
  if (mode === 'name-desc') return 'Z–A';
  return 'Manual';
}

/** Compare two items *within* a status group, per the active sort mode. */
export function compareWithinGroup(a: PantryItem, b: PantryItem, mode: PantrySortMode): number {
  if (mode === 'name-asc') return a.name.localeCompare(b.name);
  if (mode === 'name-desc') return b.name.localeCompare(a.name);
  return (
    a.position - b.position ||
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

/** Status grouping always wins; the sort mode only orders items inside a group. */
export function sortPantryItems(arr: PantryItem[], mode: PantrySortMode): PantryItem[] {
  return [...arr].sort((a, b) => {
    const rank = PANTRY_STATUS_RANK[a.status] - PANTRY_STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return compareWithinGroup(a, b, mode);
  });
}

/** Case-insensitive substring match on the item name. */
export function matchesQuery(item: PantryItem, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return item.name.toLowerCase().includes(q);
}

export function filterPantryItems(arr: PantryItem[], query: string): PantryItem[] {
  const q = query.trim();
  if (!q) return arr;
  return arr.filter((i) => matchesQuery(i, q));
}

/** Pantry views: the original status list, or the same list with category sub-groups. */
export const PANTRY_VIEW_MODES = ['status', 'category'] as const;
export type PantryViewMode = (typeof PANTRY_VIEW_MODES)[number];
export const PANTRY_VIEW_KEY = 'tote:pantry:view';

/**
 * Split rows (already sorted) into category groups in shelf order: pantry
 * categories first, then any other values A–Z, uncategorized last. Older
 * store-aisle values join their matching shelf ("Dairy" → "Dairy & Eggs").
 * Row order inside a group is preserved.
 */
export function groupByCategory<T extends { category: string | null }>(
  rows: T[]
): { category: string | null; rows: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const row of rows) {
    const key = toPantryCategory(row.category);
    const list = groups.get(key);
    if (list) list.push(row);
    else groups.set(key, [row]);
  }
  const rank = (c: string | null) => {
    if (c === null) return Number.MAX_SAFE_INTEGER;
    const i = (PANTRY_CATEGORIES as readonly string[]).indexOf(c);
    return i === -1 ? PANTRY_CATEGORIES.length : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || (a ?? '').localeCompare(b ?? ''))
    .map(([category, rows]) => ({ category, rows }));
}
