/** Store aisles: used for shopping-list items in a store. */
export const ITEM_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Frozen',
  'Bakery',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/**
 * Pantry shelves: finer-grained than store aisles so a home pantry (dals,
 * flours, masalas…) doesn't collapse into "Other". Assigned by AI (Gemini) or
 * by hand. Order here is the display order in the "By category" view.
 */
export const PANTRY_CATEGORIES = [
  'Produce',
  'Dairy & Eggs',
  'Proteins',
  'Grains & Flours',
  'Pasta & Noodles',
  'Lentils & Beans',
  'Spices & Masalas',
  'Oils & Condiments',
  'Nuts & Dry Fruits',
  'Baking & Sweeteners',
  'Bread & Bakery',
  'Ready Meals & Snacks',
  'Beverages',
  'Frozen',
  'Household',
  'Personal Care',
  'Other',
] as const;

export type PantryCategory = (typeof PANTRY_CATEGORIES)[number];

/** What a pantry item's `category` may hold: pantry shelves, plus store aisles set before shelves existed. */
export const PANTRY_CATEGORY_VALUES = [...new Set<string>([...PANTRY_CATEGORIES, ...ITEM_CATEGORIES])] as [
  string,
  ...string[],
];

/** Not food: never offered to recipe suggestions. */
export const NON_EDIBLE_CATEGORIES: readonly string[] = ['Household', 'Personal Care'];

export function isEdibleCategory(category: string | null | undefined): boolean {
  return !category || !NON_EDIBLE_CATEGORIES.includes(category);
}

const PANTRY_TO_STORE: Partial<Record<PantryCategory, ItemCategory>> = {
  Produce: 'Produce',
  'Dairy & Eggs': 'Dairy',
  Proteins: 'Meat & Seafood',
  'Bread & Bakery': 'Bakery',
  'Ready Meals & Snacks': 'Snacks',
  Beverages: 'Beverages',
  Frozen: 'Frozen',
  Household: 'Household',
  'Personal Care': 'Personal Care',
  Other: 'Other',
};

/**
 * A pantry category as a store aisle, for pantry → shopping list. Shelves with
 * no clear aisle (lentils, masalas…) return null so the store's own AI
 * categorizer can place them.
 */
export function toStoreCategory(category: string | null | undefined): ItemCategory | null {
  if (!category) return null;
  if ((ITEM_CATEGORIES as readonly string[]).includes(category)) return category as ItemCategory;
  return PANTRY_TO_STORE[category as PantryCategory] ?? null;
}
