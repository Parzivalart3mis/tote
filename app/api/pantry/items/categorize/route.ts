export const runtime = 'nodejs';
export const maxDuration = 60;

import { apiError, apiOk } from '@/lib/api-helpers';
import { categorizeErrorResponse } from '@/lib/ai-categorize';
import { requireAuthWithSync } from '@/lib/auth';
import { geminiConfigured } from '@/lib/gemini';
import { categorizeUncategorized } from '@/lib/pantry-categorize';
import { checkRateLimit } from '@/lib/ratelimit';

/**
 * Sort the signed-in user's uncategorized pantry items into shelves with
 * Gemini. Returns only what changed: `{ updated: [{ id, category }], remaining }`.
 */
export async function POST() {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  if (!geminiConfigured()) return apiError('INTERNAL', 'Gemini API key not configured', 503);

  try {
    return apiOk(await categorizeUncategorized(userId));
  } catch (err) {
    return categorizeErrorResponse('pantry/categorize', err);
  }
}
