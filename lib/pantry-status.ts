export const PANTRY_STATUSES = ['IN_STOCK', 'LOW', 'OUT', 'BUY'] as const;

export type PantryStatus = (typeof PANTRY_STATUSES)[number];

/** Sort order: full pantry at the top, the buy list at the bottom. */
export const PANTRY_STATUS_RANK: Record<PantryStatus, number> = {
  IN_STOCK: 0,
  LOW: 1,
  OUT: 2,
  BUY: 3,
};

/**
 * Tapping the stock button advances one step along the depletion cycle
 * (in stock → low → out → in stock). Out is a resting state: being out of
 * something does not imply it needs buying, so the cycle never drifts into
 * BUY on its own — that is only reachable via the explicit "mark to buy"
 * action. From BUY a tap means "bought it" and restocks.
 */
export const NEXT_PANTRY_STATUS: Record<PantryStatus, PantryStatus> = {
  IN_STOCK: 'LOW',
  LOW: 'OUT',
  OUT: 'IN_STOCK',
  BUY: 'IN_STOCK',
};

export const PANTRY_STATUS_LABEL: Record<PantryStatus, string> = {
  IN_STOCK: 'In stock',
  LOW: 'Running low',
  OUT: 'Out',
  BUY: 'To buy',
};

/** Statuses that offer the one-tap "mark to buy" shortcut. */
export function canMarkToBuy(status: PantryStatus): boolean {
  return status === 'LOW' || status === 'OUT';
}
