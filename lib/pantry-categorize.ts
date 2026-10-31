import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { PANTRY_CATEGORIES, type PantryCategory } from '@/lib/categories';
import { generateJson } from '@/lib/gemini';

/** Upper bound per call; the client calls again while items remain. */
export const CATEGORIZE_BATCH = 150;

export const CATEGORIZE_SYSTEM = `You sort the items in a home pantry into shelves. The pantry belongs to a home cook in the US who cooks a lot of Indian food, so expect Hindi names (dal, chana, sooji, atta, jeera, elaichi, tej patta, achaar…).

Assign every item exactly one category from this list, spelled exactly:
${PANTRY_CATEGORIES.map((c) => `- ${c}`).join('\n')}

Guidance:
- Proteins: meat, fish, tofu, tempeh, soya chunks. Eggs, milk, yogurt, cheese, paneer and ghee go to Dairy & Eggs.
- Lentils & Beans: dals, chana, chole, rajma, beans, peas (vatana).
- Grains & Flours: rice, atta, maida, sooji/rava, besan, sabudana, oats, poha.
- Spices & Masalas: whole and ground spices, masala blends, salt, dried chillies, herbs.
- Oils & Condiments: cooking oils, pickles (achaar), sauces, tahini, vinegar, jams.
- Ready Meals & Snacks: ready-to-cook mixes, instant meals, chips, biscuits.
- Beverages: tea, coffee, drink mixes, juices.
- Household: cleaning, paper goods, laundry, kitchen supplies. Personal Care: toiletries, cosmetics, medicine.
- Use Other only when nothing else fits. Notes in parentheses like "(for Burrito)" are context, not the item.`;

export function categorizeSchema(count: number) {
  return {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        maxItems: count,
        items: {
          type: 'object',
          properties: {
            n: { type: 'integer', minimum: 1, maximum: count, description: 'Item number from the list' },
            category: { type: 'string', enum: [...PANTRY_CATEGORIES] },
          },
          required: ['n', 'category'],
        },
      },
    },
    required: ['results'],
  };
}

export function categorizePrompt(names: string[]): string {
  return `Categorize these ${names.length} pantry items. Return one result per item number.\n${names
    .map((name, i) => `${i + 1}. ${name.trim()}`)
    .join('\n')}`;
}

/** Map the model's numbered answers back to item ids, dropping anything malformed. */
export function matchResults(
  rows: { id: string; name: string }[],
  raw: unknown
): { id: string; category: PantryCategory }[] {
  const results = (raw as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const allowed = new Set<string>(PANTRY_CATEGORIES);
  const seen = new Set<string>();
  const out: { id: string; category: PantryCategory }[] = [];
  for (const r of results as { n?: unknown; category?: unknown }[]) {
    const idx = typeof r?.n === 'number' ? r.n - 1 : -1;
    const row = rows[idx];
    if (!row || seen.has(row.id)) continue;
    if (typeof r.category !== 'string' || !allowed.has(r.category)) continue;
    seen.add(row.id);
    out.push({ id: row.id, category: r.category as PantryCategory });
  }
  return out;
}

/**
 * Give every uncategorized pantry item of `userId` a category with Gemini.
 * Items that already have a category (set by hand or earlier) are never touched.
 */
export async function categorizeUncategorized(
  userId: string,
  opts: { timeoutMs?: number } = {}
): Promise<{ updated: { id: string; category: PantryCategory }[]; remaining: number }> {
  const rows = await db
    .select({ id: pantryItems.id, name: pantryItems.name })
    .from(pantryItems)
    .where(and(eq(pantryItems.userId, userId), isNull(pantryItems.category)))
    .limit(CATEGORIZE_BATCH + 1);
  if (rows.length === 0) return { updated: [], remaining: 0 };

  const batch = rows.slice(0, CATEGORIZE_BATCH);
  const raw = await generateJson<unknown>({
    system: CATEGORIZE_SYSTEM,
    prompt: categorizePrompt(batch.map((r) => r.name)),
    schema: categorizeSchema(batch.length),
    ...(opts.timeoutMs ? { timeoutMs: opts.timeoutMs } : {}),
  });
  const updated = matchResults(batch, raw);

  // `category IS NULL` in the update too: an edit made while the model was
  // thinking wins over the AI's answer.
  await Promise.all(
    updated.map(({ id, category }) =>
      db
        .update(pantryItems)
        .set({ category })
        .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId), isNull(pantryItems.category)))
    )
  );

  return { updated, remaining: rows.length - updated.length };
}
