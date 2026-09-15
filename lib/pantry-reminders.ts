import type { PushPayload } from '@/lib/push';

/** Count how many pantry statuses are marked To buy. */
export function countToBuy(statuses: string[]): number {
  let n = 0;
  for (const s of statuses) if (s === 'BUY') n++;
  return n;
}

/**
 * Build the reminder push for a user's pantry, or null when there is nothing to
 * remind about (no items marked To buy). Low/Out items are deliberately not
 * counted: being out of something is not the same as needing to buy it.
 * Pure so it can be unit tested without a DB.
 */
export function buildReminderPayload(toBuy: number): PushPayload | null {
  if (toBuy <= 0) return null;

  return {
    title: 'Pantry check',
    body: `You have ${toBuy} item${toBuy === 1 ? '' : 's'} to buy.`,
    url: '/pantry',
    tag: 'pantry-reminder',
  };
}

/**
 * Local calendar-day key (YYYY-MM-DD) for a given instant in a timezone.
 * Uses Intl rather than getUTCDate so an evening run never lands on the wrong
 * day. Retained for callers that need per-user local-day logic.
 */
export function localDayKey(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}
