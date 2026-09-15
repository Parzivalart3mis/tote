import { describe, it, expect } from 'vitest';
import {
  PANTRY_STATUSES,
  PANTRY_STATUS_RANK,
  PANTRY_STATUS_LABEL,
  NEXT_PANTRY_STATUS,
  canMarkToBuy,
} from '@/lib/pantry-status';

describe('pantry status model', () => {
  it('orders sections in stock → low → out → to buy', () => {
    const byRank = [...PANTRY_STATUSES].sort((a, b) => PANTRY_STATUS_RANK[a] - PANTRY_STATUS_RANK[b]);
    expect(byRank).toEqual(['IN_STOCK', 'LOW', 'OUT', 'BUY']);
  });

  it('labels every status', () => {
    for (const s of PANTRY_STATUSES) expect(PANTRY_STATUS_LABEL[s]).toBeTruthy();
    expect(PANTRY_STATUS_LABEL.BUY).toBe('To buy');
  });

  it('the stock button cycles in stock → low → out → in stock without entering BUY', () => {
    expect(NEXT_PANTRY_STATUS.IN_STOCK).toBe('LOW');
    expect(NEXT_PANTRY_STATUS.LOW).toBe('OUT');
    expect(NEXT_PANTRY_STATUS.OUT).toBe('IN_STOCK');
    expect(Object.values(NEXT_PANTRY_STATUS)).not.toContain('BUY');
  });

  it('a tap on a BUY item restocks it', () => {
    expect(NEXT_PANTRY_STATUS.BUY).toBe('IN_STOCK');
  });

  it('offers the mark-to-buy shortcut on Low and Out rows only', () => {
    expect(canMarkToBuy('LOW')).toBe(true);
    expect(canMarkToBuy('OUT')).toBe(true);
    expect(canMarkToBuy('IN_STOCK')).toBe(false);
    expect(canMarkToBuy('BUY')).toBe(false);
  });
});
