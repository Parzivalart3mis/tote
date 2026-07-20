export const PANTRY_STATUSES = ['IN_STOCK', 'LOW', 'OUT'] as const;

export type PantryStatus = (typeof PANTRY_STATUSES)[number];

/** Sort order: full pantry at the top, empty at the bottom. */
export const PANTRY_STATUS_RANK: Record<PantryStatus, number> = {
  IN_STOCK: 0,
  LOW: 1,
  OUT: 2,
};

/** Tapping the stock button advances one step along the depletion cycle. */
export const NEXT_PANTRY_STATUS: Record<PantryStatus, PantryStatus> = {
  IN_STOCK: 'LOW',
  LOW: 'OUT',
  OUT: 'IN_STOCK',
};

export const PANTRY_STATUS_LABEL: Record<PantryStatus, string> = {
  IN_STOCK: 'In stock',
  LOW: 'Running low',
  OUT: 'Out',
};
