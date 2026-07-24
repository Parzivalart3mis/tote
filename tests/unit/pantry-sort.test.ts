import { describe, it, expect } from 'vitest';
import {
  sortPantryItems,
  filterPantryItems,
  matchesQuery,
  nextSortMode,
  sortModeLabel,
  PANTRY_SORT_MODES,
  type PantrySortMode,
} from '@/lib/pantry-sort';
import type { PantryItem } from '@/db/schema';
import type { PantryStatus } from '@/lib/pantry-status';

const BASE = new Date('2026-07-01T12:00:00Z');

function item(name: string, status: PantryStatus = 'IN_STOCK', position = 0): PantryItem {
  return {
    id: `${name}-${position}`,
    userId: 'u1',
    name,
    quantity: null,
    unit: null,
    note: null,
    category: null,
    status,
    position,
    createdAt: BASE,
    updatedAt: BASE,
  };
}

describe('pantry search filtering', () => {
  const items = [
    item('Rice'), item('Rice Flour'), item('Basmati Rice'),
    item('Onion', 'OUT'), item('Sugar', 'LOW'), item('Salt'),
  ];

  it('returns only items containing the query', () => {
    const got = filterPantryItems(items, 'rice').map((i) => i.name);
    expect(got.sort()).toEqual(['Basmati Rice', 'Rice', 'Rice Flour']);
  });

  it('never returns a non-matching item', () => {
    for (const q of ['rice', 'onion', 'sug', 'a']) {
      for (const found of filterPantryItems(items, q)) {
        expect(found.name.toLowerCase()).toContain(q.toLowerCase());
      }
    }
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterPantryItems(items, 'zzzznotathing')).toEqual([]);
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(filterPantryItems(items, '  RICE  ').length).toBe(3);
    expect(filterPantryItems(items, 'oNiOn').length).toBe(1);
  });

  it('matches items in any status, not just in stock', () => {
    expect(filterPantryItems(items, 'onion')[0]?.status).toBe('OUT');
    expect(filterPantryItems(items, 'sugar')[0]?.status).toBe('LOW');
  });

  it('an empty query returns everything unfiltered', () => {
    expect(filterPantryItems(items, '')).toHaveLength(items.length);
    expect(filterPantryItems(items, '   ')).toHaveLength(items.length);
  });

  it('matchesQuery agrees with the filter for every item', () => {
    const q = 'ri';
    const viaFilter = filterPantryItems(items, q).map((i) => i.id).sort();
    const viaPredicate = items.filter((i) => matchesQuery(i, q)).map((i) => i.id).sort();
    expect(viaPredicate).toEqual(viaFilter);
  });
});

describe('pantry sorting', () => {
  it('groups by status regardless of sort mode', () => {
    const items = [item('Zebra', 'OUT'), item('Apple', 'LOW'), item('Mango', 'IN_STOCK')];
    for (const mode of PANTRY_SORT_MODES) {
      const got = sortPantryItems(items, mode).map((i) => i.status);
      expect(got).toEqual(['IN_STOCK', 'LOW', 'OUT']);
    }
  });

  it('sorts A–Z within a status group', () => {
    const items = [item('Cumin'), item('Atta'), item('Besan')];
    expect(sortPantryItems(items, 'name-asc').map((i) => i.name)).toEqual(['Atta', 'Besan', 'Cumin']);
  });

  it('sorts Z–A within a status group', () => {
    const items = [item('Cumin'), item('Atta'), item('Besan')];
    expect(sortPantryItems(items, 'name-desc').map((i) => i.name)).toEqual(['Cumin', 'Besan', 'Atta']);
  });

  it('honours manual position order in manual mode', () => {
    const items = [item('Third', 'IN_STOCK', 2), item('First', 'IN_STOCK', 0), item('Second', 'IN_STOCK', 1)];
    expect(sortPantryItems(items, 'manual').map((i) => i.name)).toEqual(['First', 'Second', 'Third']);
  });

  it('does not mutate the input array', () => {
    const items = [item('B'), item('A')];
    const snapshot = items.map((i) => i.name);
    sortPantryItems(items, 'name-asc');
    expect(items.map((i) => i.name)).toEqual(snapshot);
  });

  it('sorts alphabetically across a status group of mixed case', () => {
    const items = [item('banana'), item('Apple'), item('cherry')];
    expect(sortPantryItems(items, 'name-asc').map((i) => i.name)).toEqual(['Apple', 'banana', 'cherry']);
  });
});

describe('sort mode cycling', () => {
  it('cycles manual → A–Z → Z–A → manual', () => {
    let mode: PantrySortMode = 'manual';
    const seen = [mode];
    for (let i = 0; i < 3; i++) { mode = nextSortMode(mode); seen.push(mode); }
    expect(seen).toEqual(['manual', 'name-asc', 'name-desc', 'manual']);
  });

  it('labels every mode', () => {
    expect(PANTRY_SORT_MODES.map(sortModeLabel)).toEqual(['Manual', 'A–Z', 'Z–A']);
  });
});
