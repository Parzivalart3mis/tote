import { apiError } from '@/lib/api-helpers';
import { ITEM_CATEGORIES } from '@/lib/categories';
import { generateJson, isAiQuotaError, isAiTimeout } from '@/lib/gemini';

/** Upper bound per call; callers ask again while items remain. */
export const CATEGORIZE_BATCH = 150;

/** Store aisles for shopping-list items (the pantry's shelf prompt lives in pantry-categorize). */
export const STORE_CATEGORIZE_SYSTEM = `You sort a shopping list into store aisles. The shopper is a home cook in the US who cooks a lot of Indian food, so expect Hindi names (dal, atta, sooji, jeera, achaar…).

Assign every item exactly one aisle from this list, spelled exactly:
${ITEM_CATEGORIES.map((c) => `- ${c}`).join('\n')}

Guidance:
- Dairy: milk, yogurt, cheese, butter, ghee, paneer, eggs. Meat & Seafood: meat, poultry, fish.
- Lentils & Beans: dals, chana, rajma, dried or canned beans. Grains & Flours: rice, atta, maida, sooji, besan, oats, poha.
- Spices & Masalas: whole and ground spices, masala blends, salt, dried herbs.
- Oils & Condiments: cooking oils, ketchup, sauces, pickles, vinegar, jams.
- Snacks: chips, biscuits, namkeen. Beverages: tea, coffee, juices, soda.
- Household: cleaning, paper goods, laundry, trash bags, foil. Personal Care: toiletries, cosmetics, medicine.
- Brand names are fine: categorize by what the product is ("Heinz ketchup" → Oils & Condiments, "Dove soap" → Personal Care).
- Use Other only when nothing else fits.`;

/**
 * Sort named things (pantry items, store items) into a fixed category list with
 * Gemini. Items go to the model as a numbered list and come back as
 * `{ n, category }`: ids never leave the server, and structured output keeps
 * every category inside `categories`.
 *
 * Keep the schema minimal: Gemini rejects the whole request ("Request contains
 * an invalid argument") once `maxItems` reaches ~30, i.e. any real pantry.
 * Bounds on `n` are enforced by `matchResults` instead.
 */
export function categorizeSchema(categories: readonly string[]) {
  return {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            n: { type: 'integer', description: 'Item number from the list' },
            category: { type: 'string', enum: [...categories] },
          },
          required: ['n', 'category'],
        },
      },
    },
    required: ['results'],
  };
}

export function categorizePrompt(names: string[]): string {
  return `Categorize these ${names.length} items. Return one result per item number.\n${names
    .map((name, i) => `${i + 1}. ${name.trim()}`)
    .join('\n')}`;
}

/** Map the model's numbered answers back to item ids, dropping anything malformed. */
export function matchResults<C extends string>(
  rows: { id: string; name: string }[],
  raw: unknown,
  categories: readonly C[]
): { id: string; category: C }[] {
  const results = (raw as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const allowed = new Set<string>(categories);
  const seen = new Set<string>();
  const out: { id: string; category: C }[] = [];
  for (const r of results as { n?: unknown; category?: unknown }[]) {
    const idx = typeof r?.n === 'number' ? r.n - 1 : -1;
    const row = rows[idx];
    if (!row || seen.has(row.id)) continue;
    if (typeof r.category !== 'string' || !allowed.has(r.category)) continue;
    seen.add(row.id);
    out.push({ id: row.id, category: r.category as C });
  }
  return out;
}

export async function categorizeWithAi<C extends string>(
  rows: { id: string; name: string }[],
  opts: { system: string; categories: readonly C[]; timeoutMs?: number }
): Promise<{ id: string; category: C }[]> {
  if (rows.length === 0) return [];
  const raw = await generateJson<unknown>({
    system: opts.system,
    prompt: categorizePrompt(rows.map((r) => r.name)),
    schema: categorizeSchema(opts.categories),
    ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
  });
  return matchResults(rows, raw, opts.categories);
}

/** The route response for a failed categorize call; the real error goes to the logs. */
export function categorizeErrorResponse(tag: string, err: unknown) {
  console.error(`[${tag}] failed`, err);
  if (isAiQuotaError(err)) return apiError('RATE_LIMITED', 'AI quota reached, try again in a minute', 429);
  if (isAiTimeout(err)) return apiError('INTERNAL', 'AI took too long, try again', 504);
  return apiError('INTERNAL', 'Could not categorize with AI', 502);
}
