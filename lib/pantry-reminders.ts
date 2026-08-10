import type { PushPayload } from '@/lib/push';

export interface LowOutCounts {
  low: number;
  out: number;
}

/** Tally Low/Out pantry statuses from a list of status strings. */
export function countLowOut(statuses: string[]): LowOutCounts {
  let low = 0;
  let out = 0;
  for (const s of statuses) {
    if (s === 'LOW') low++;
    else if (s === 'OUT') out++;
  }
  return { low, out };
}

function phrase(low: number, out: number): string {
  const parts: string[] = [];
  if (out > 0) parts.push(`${out} out of stock`);
  if (low > 0) parts.push(`${low} running low`);
  return parts.join(' and ');
}

/**
 * Build the reminder push for a user's pantry, or null when there is nothing to
 * remind about (no Low/Out items). Pure so it can be unit tested without a DB.
 */
export function buildReminderPayload(counts: LowOutCounts): PushPayload | null {
  const { low, out } = counts;
  const total = low + out;
  if (total <= 0) return null;

  return {
    title: 'Pantry check',
    body: `You have ${phrase(low, out)} — time to restock.`,
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
