import { describe, it, expect } from 'vitest';
import { countToBuy, buildReminderPayload, localDayKey } from '@/lib/pantry-reminders';

describe('countToBuy', () => {
  it('tallies BUY only, ignoring every other status', () => {
    expect(countToBuy(['BUY', 'OUT', 'IN_STOCK', 'BUY', 'LOW', 'BUY'])).toBe(3);
  });

  it('does not count Low or Out — being out is not the same as needing to buy', () => {
    expect(countToBuy(['LOW', 'OUT', 'OUT', 'LOW'])).toBe(0);
  });

  it('returns zero for an empty list', () => {
    expect(countToBuy([])).toBe(0);
  });

  it('ignores unknown statuses', () => {
    expect(countToBuy(['IN_STOCK', 'WHATEVER'])).toBe(0);
  });
});

describe('buildReminderPayload', () => {
  it('returns null when nothing is marked to buy', () => {
    expect(buildReminderPayload(0)).toBeNull();
    expect(buildReminderPayload(-1)).toBeNull();
  });

  it('phrases a single item', () => {
    const p = buildReminderPayload(1);
    expect(p?.body).toBe('You have 1 item to buy.');
  });

  it('phrases several items', () => {
    const p = buildReminderPayload(3);
    expect(p?.body).toBe('You have 3 items to buy.');
  });

  it('always targets the pantry with a stable tag', () => {
    const p = buildReminderPayload(2);
    expect(p?.url).toBe('/pantry');
    expect(p?.tag).toBe('pantry-reminder');
    expect(p?.title).toBe('Pantry check');
  });
});

describe('localDayKey', () => {
  it('computes the local calendar day, not the UTC day', () => {
    // 2026-07-02T02:30:00Z is still 2026-07-01 in America/Chicago (UTC-5).
    const d = new Date('2026-07-02T02:30:00Z');
    expect(localDayKey(d, 'America/Chicago')).toBe('2026-07-01');
    expect(localDayKey(d, 'UTC')).toBe('2026-07-02');
  });

  it('falls back to UTC for an invalid timezone', () => {
    const d = new Date('2026-07-02T12:00:00Z');
    expect(localDayKey(d, 'Not/AZone')).toBe('2026-07-02');
  });
});
