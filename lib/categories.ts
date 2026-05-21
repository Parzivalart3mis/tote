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
