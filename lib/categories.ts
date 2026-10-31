/**
 * Store aisles: used for shopping-list items in a store. Every pantry shelf
 * below has a matching aisle, so items moved pantry → store keep their place.
 */
export const ITEM_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat & Seafood',
  'Frozen',
  'Bakery',
  'Grains & Flours',
  'Pasta & Noodles',
  'Lentils & Beans',
  'Spices & Masalas',
  'Oils & Condiments',
  'Baking & Sweeteners',
  'Nuts & Dry Fruits',
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

/**
 * Household / toiletry words, for items nobody has categorized yet (e.g. the AI
 * was unavailable). A category, when set, always wins over the name.
 */
const NON_FOOD_NAME =
  /\b(?:toilet|tissue|paper towel|napkin|detergent|soap|shampoo|conditioner|toothpaste|toothbrush|mouthwash|deodorant|lotion|sanitizer|(?:hand|body|face) ?wash|bleach|cleaner|sponge|trash|garbage|bin bag|foil|cling ?film|plastic wrap|zip ?lock|ziploc|parchment|batter(?:y|ies)|light ?bulb|dishwasher|laundry|fabric softener|razor|floss|diaper|wipe|bandage)(?:e?s)?\b/i;

export function looksNonFood(name: string): boolean {
  return NON_FOOD_NAME.test(name);
}

const PANTRY_TO_STORE: Record<PantryCategory, ItemCategory> = {
  Produce: 'Produce',
  'Dairy & Eggs': 'Dairy',
  Proteins: 'Meat & Seafood',
  'Grains & Flours': 'Grains & Flours',
  'Pasta & Noodles': 'Pasta & Noodles',
  'Lentils & Beans': 'Lentils & Beans',
  'Spices & Masalas': 'Spices & Masalas',
  'Oils & Condiments': 'Oils & Condiments',
  'Nuts & Dry Fruits': 'Nuts & Dry Fruits',
  'Baking & Sweeteners': 'Baking & Sweeteners',
  'Bread & Bakery': 'Bakery',
  'Ready Meals & Snacks': 'Snacks',
  Beverages: 'Beverages',
  Frozen: 'Frozen',
  Household: 'Household',
  'Personal Care': 'Personal Care',
  Other: 'Other',
};

/** Store-aisle names that differ from the pantry shelf holding the same things. */
const STORE_TO_PANTRY: Partial<Record<ItemCategory, PantryCategory>> = {
  Dairy: 'Dairy & Eggs',
  'Meat & Seafood': 'Proteins',
  Bakery: 'Bread & Bakery',
  Snacks: 'Ready Meals & Snacks',
};

/** A pantry category as a store aisle, for pantry → shopping list. */
export function toStoreCategory(category: string | null | undefined): ItemCategory | null {
  if (!category) return null;
  if ((ITEM_CATEGORIES as readonly string[]).includes(category)) return category as ItemCategory;
  return PANTRY_TO_STORE[category as PantryCategory] ?? null;
}

/**
 * The pantry shelf for a stored value. Items categorized before shelves existed
 * hold store aisles ("Dairy"); they are shown on the matching shelf ("Dairy &
 * Eggs") rather than as a second, near-duplicate group.
 */
export function toPantryCategory(category: string | null | undefined): string | null {
  const c = category?.trim();
  if (!c) return null;
  return STORE_TO_PANTRY[c as ItemCategory] ?? c;
}
