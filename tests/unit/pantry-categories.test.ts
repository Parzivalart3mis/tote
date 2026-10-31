import { describe, it, expect } from 'vitest';
import {
  ITEM_CATEGORIES,
  PANTRY_CATEGORIES,
  isEdibleCategory,
  looksNonFood,
  toPantryCategory,
  toStoreCategory,
} from '@/lib/categories';
import { groupByCategory } from '@/lib/pantry-sort';
import { categorizePrompt, categorizeSchema, matchResults } from '@/lib/ai-categorize';
import { isFood } from '@/lib/pantry-share';
import { createPantryItemSchema } from '@/lib/schemas/pantry';
import { createItemSchema } from '@/lib/schemas/item';

describe('pantry categories', () => {
  it('treats household and personal care as not edible, everything else (and uncategorized) as edible', () => {
    expect(isEdibleCategory('Household')).toBe(false);
    expect(isEdibleCategory('Personal Care')).toBe(false);
    expect(isEdibleCategory('Lentils & Beans')).toBe(true);
    expect(isEdibleCategory(null)).toBe(true);
  });

  it('maps every pantry shelf to a store aisle', () => {
    for (const shelf of PANTRY_CATEGORIES) {
      expect(ITEM_CATEGORIES).toContain(toStoreCategory(shelf));
    }
    expect(toStoreCategory('Dairy & Eggs')).toBe('Dairy');
    expect(toStoreCategory('Proteins')).toBe('Meat & Seafood');
    expect(toStoreCategory('Lentils & Beans')).toBe('Lentils & Beans');
    expect(toStoreCategory('Snacks')).toBe('Snacks'); // older store-aisle value passes through
    expect(toStoreCategory(null)).toBeNull();
  });

  it('accepts pantry shelves and older store-aisle values, rejects anything else', () => {
    expect(createPantryItemSchema.safeParse({ name: 'Moong Dal', category: 'Lentils & Beans' }).success).toBe(true);
    expect(createPantryItemSchema.safeParse({ name: 'Milk', category: 'Dairy' }).success).toBe(true);
    expect(createPantryItemSchema.safeParse({ name: 'X', category: 'Made Up' }).success).toBe(false);
  });

  it('lets store items use the new aisles', () => {
    expect(createItemSchema.safeParse({ name: 'Moong Dal', category: 'Lentils & Beans' }).success).toBe(true);
    expect(createItemSchema.safeParse({ name: 'X', category: 'Made Up' }).success).toBe(false);
  });

  it('shows older store-aisle values on the matching shelf', () => {
    expect(toPantryCategory('Dairy')).toBe('Dairy & Eggs');
    expect(toPantryCategory('Meat & Seafood')).toBe('Proteins');
    expect(toPantryCategory('Produce')).toBe('Produce');
    expect(toPantryCategory('  ')).toBeNull();
  });
});

describe('food check for sharing', () => {
  it('trusts the category when there is one', () => {
    expect(isFood({ name: 'Sponge Cake Mix', category: 'Baking & Sweeteners' })).toBe(true);
    expect(isFood({ name: 'Vim Bar', category: 'Household' })).toBe(false);
  });

  it('falls back to the name for uncategorized items', () => {
    expect(isFood({ name: 'Paper Towels', category: null })).toBe(false);
    expect(isFood({ name: 'Hand Wash', category: null })).toBe(false);
    expect(isFood({ name: 'Moong Dal', category: null })).toBe(true);
    expect(looksNonFood('Batter mix')).toBe(false);
  });
});

describe('groupByCategory', () => {
  it('orders groups by shelf order, older values on their shelf, uncategorized last, keeping row order', () => {
    const rows = [
      { id: 'a', category: 'Spices & Masalas' },
      { id: 'b', category: null },
      { id: 'c', category: 'Produce' },
      { id: 'd', category: 'Snacks' },
      { id: 'e', category: 'Produce' },
      { id: 'f', category: 'Ready Meals & Snacks' },
    ];
    const groups = groupByCategory(rows);
    expect(groups.map((g) => g.category)).toEqual(['Produce', 'Spices & Masalas', 'Ready Meals & Snacks', null]);
    expect(groups[0]!.rows.map((r) => r.id)).toEqual(['c', 'e']);
    expect(groups[2]!.rows.map((r) => r.id)).toEqual(['d', 'f']);
  });
});

describe('AI categorize helpers', () => {
  const rows = [
    { id: 'id1', name: 'Moong Dal' },
    { id: 'id2', name: 'Toilet Paper' },
    { id: 'id3', name: 'Jeera' },
  ];

  it('numbers the items and constrains categories to the given list', () => {
    expect(categorizePrompt(rows.map((r) => r.name))).toContain('2. Toilet Paper');
    const schema = categorizeSchema(PANTRY_CATEGORIES) as { properties: { results: { items: { properties: { category: { enum: string[] } } } } } };
    expect(schema.properties.results.items.properties.category.enum).toEqual([...PANTRY_CATEGORIES]);
  });

  it('keeps the schema free of size limits Gemini rejects for real pantries', () => {
    const json = JSON.stringify(categorizeSchema(PANTRY_CATEGORIES));
    expect(json).not.toMatch(/maxItems|minItems|maximum|minimum/);
  });

  it('maps numbered answers back to ids and drops malformed, unknown or duplicate answers', () => {
    const out = matchResults(rows, {
      results: [
        { n: 1, category: 'Lentils & Beans' },
        { n: 2, category: 'Household' },
        { n: 2, category: 'Other' }, // duplicate
        { n: 3, category: 'Not A Shelf' }, // unknown
        { n: 9, category: 'Produce' }, // out of range
        { n: 0, category: 'Produce' }, // out of range
        { category: 'Produce' }, // missing n
      ],
    }, PANTRY_CATEGORIES);
    expect(out).toEqual([
      { id: 'id1', category: 'Lentils & Beans' },
      { id: 'id2', category: 'Household' },
    ]);
    expect(matchResults(rows, 'garbage', PANTRY_CATEGORIES)).toEqual([]);
  });
});
