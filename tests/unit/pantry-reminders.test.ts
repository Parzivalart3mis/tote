import { describe, it, expect } from 'vitest';
import { countLowOut, buildReminderPayload, localDayKey } from '@/lib/pantry-reminders';

describe('countLowOut', () => {
  it('tallies LOW and OUT, ignoring IN_STOCK', () => {
    expect(countLowOut(['LOW', 'OUT', 'IN_STOCK', 'OUT', 'LOW', 'LOW'])).toEqual({ low: 3, out: 2 });
  });

  it('returns zeroes for an empty list', () => {
    expect(countLowOut([])).toEqual({ low: 0, out: 0 });
  });

  it('ignores unknown statuses', () => {
    expect(countLowOut(['IN_STOCK', 'WHATEVER'])).toEqual({ low: 0, out: 0 });
  });
});

describe('buildReminderPayload', () => {
  it('returns null when nothing is low or out', () => {
    expect(buildReminderPayload({ low: 0, out: 0 })).toBeNull();
  });

  it('phrases out-only', () => {
    const p = buildReminderPayload({ low: 0, out: 2 });
    expect(p?.body).toBe('You have 2 out of stock — time to restock.');
    expect(p?.url).toBe('/pantry');
  });

  it('phrases low-only', () => {
    const p = buildReminderPayload({ low: 3, out: 0 });
    expect(p?.body).toBe('You have 3 running low — time to restock.');
  });

  it('phrases both, out first', () => {
    const p = buildReminderPayload({ low: 3, out: 2 });
    expect(p?.body).toBe('You have 2 out of stock and 3 running low — time to restock.');
  });

  it('always targets the pantry with a stable tag', () => {
    const p = buildReminderPayload({ low: 1, out: 0 });
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
