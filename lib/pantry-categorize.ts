import { and, eq, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { PANTRY_CATEGORIES, type PantryCategory } from '@/lib/categories';
import { CATEGORIZE_BATCH, categorizeWithAi } from '@/lib/ai-categorize';

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

  const updated = await categorizeWithAi(rows.slice(0, CATEGORIZE_BATCH), {
    system: CATEGORIZE_SYSTEM,
    categories: PANTRY_CATEGORIES,
    ...opts,
  });

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
