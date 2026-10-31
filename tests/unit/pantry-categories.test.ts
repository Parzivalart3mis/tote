import { describe, it, expect } from 'vitest';
import {
  PANTRY_CATEGORIES,
  isEdibleCategory,
  toStoreCategory,
} from '@/lib/categories';
import { groupByCategory } from '@/lib/pantry-sort';
import { categorizePrompt, categorizeSchema, matchResults } from '@/lib/pantry-categorize';
import { createPantryItemSchema } from '@/lib/schemas/pantry';

describe('pantry categories', () => {
  it('treats household and personal care as not edible, everything else (and uncategorized) as edible', () => {
    expect(isEdibleCategory('Household')).toBe(false);
    expect(isEdibleCategory('Personal Care')).toBe(false);
    expect(isEdibleCategory('Lentils & Beans')).toBe(true);
    expect(isEdibleCategory(null)).toBe(true);
  });

  it('maps pantry shelves to store aisles, leaving unclear ones for the store AI', () => {
    expect(toStoreCategory('Dairy & Eggs')).toBe('Dairy');
    expect(toStoreCategory('Proteins')).toBe('Meat & Seafood');
    expect(toStoreCategory('Household')).toBe('Household');
    expect(toStoreCategory('Lentils & Beans')).toBeNull();
    expect(toStoreCategory('Snacks')).toBe('Snacks'); // older store-aisle value passes through
    expect(toStoreCategory(null)).toBeNull();
  });

  it('accepts pantry shelves and older store-aisle values, rejects anything else', () => {
    expect(createPantryItemSchema.safeParse({ name: 'Moong Dal', category: 'Lentils & Beans' }).success).toBe(true);
    expect(createPantryItemSchema.safeParse({ name: 'Milk', category: 'Dairy' }).success).toBe(true);
    expect(createPantryItemSchema.safeParse({ name: 'X', category: 'Made Up' }).success).toBe(false);
  });
});

describe('groupByCategory', () => {
  it('orders groups by shelf order, older values next, uncategorized last, keeping row order', () => {
    const rows = [
      { id: 'a', category: 'Spices & Masalas' },
      { id: 'b', category: null },
      { id: 'c', category: 'Produce' },
      { id: 'd', category: 'Snacks' },
      { id: 'e', category: 'Produce' },
    ];
    const groups = groupByCategory(rows);
    expect(groups.map((g) => g.category)).toEqual(['Produce', 'Spices & Masalas', 'Snacks', null]);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['c', 'e']);
  });
});

describe('AI categorize helpers', () => {
  const rows = [
    { id: 'id1', name: 'Moong Dal' },
    { id: 'id2', name: 'Toilet Paper' },
    { id: 'id3', name: 'Jeera' },
  ];

  it('numbers the items and constrains categories to the shelf list', () => {
    expect(categorizePrompt(rows.map((r) => r.name))).toContain('2. Toilet Paper');
    const schema = categorizeSchema(3) as { properties: { results: { items: { properties: { category: { enum: string[] } } } } } };
    expect(schema.properties.results.items.properties.category.enum).toEqual([...PANTRY_CATEGORIES]);
  });

  it('maps numbered answers back to ids and drops malformed, unknown or duplicate answers', () => {
    const out = matchResults(rows, {
      results: [
        { n: 1, category: 'Lentils & Beans' },
        { n: 2, category: 'Household' },
        { n: 2, category: 'Other' }, // duplicate
        { n: 3, category: 'Not A Shelf' }, // unknown
        { n: 9, category: 'Produce' }, // out of range
        { category: 'Produce' }, // missing n
      ],
    });
    expect(out).toEqual([
      { id: 'id1', category: 'Lentils & Beans' },
      { id: 'id2', category: 'Household' },
    ]);
    expect(matchResults(rows, 'garbage')).toEqual([]);
  });
});
