import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/db';
import { stores, items } from '@/db/schema';
import { ITEM_CATEGORIES } from '@/lib/categories';
import { apiError, apiOk } from '@/lib/api-helpers';
import { requireAuthWithSync } from '@/lib/auth';
import { checkRateLimit } from '@/lib/ratelimit';

type Params = { params: Promise<{ id: string }> };

const categorySet = new Set<string>(ITEM_CATEGORIES);

const SYSTEM_PROMPT = `You are a grocery item categorization expert. Your job is to assign each grocery item exactly one category from the allowed list.

ALLOWED CATEGORIES (use these exact strings, nothing else):
${ITEM_CATEGORIES.map((c) => `- ${c}`).join('\n')}

RULES:
1. Every item MUST be assigned one of the categories above — no exceptions, no custom categories.
2. Use context clues in the item name (e.g. "whole milk" → Dairy, "chicken breast" → Meat & Seafood, "tide pods" → Household).
3. When in doubt between two categories, pick the most specific one (e.g. "orange juice" → Beverages, not Produce).
4. Brand names are fine — categorize by what the product is (e.g. "Heinz ketchup" → Snacks, "Dove soap" → Personal Care).
5. Ambiguous multi-use items: categorize by primary use (e.g. "butter" → Dairy, "olive oil" → Household).`;

const responseSchema = z.record(z.string(), z.string());

export async function POST(_req: Request, { params }: Params) {
  let userId: string;
  try { userId = await requireAuthWithSync(); }
  catch { return apiError('UNAUTHORIZED', 'Not signed in', 401); }

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const { id: storeId } = await params;

  const store = await db
    .select()
    .from(stores)
    .where(and(eq(stores.id, storeId), eq(stores.userId, userId)))
    .get();
  if (!store) return apiError('NOT_FOUND', 'Store not found', 404);

  const uncategorized = await db
    .select({ id: items.id, name: items.name })
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId), isNull(items.category)))
    .all();

  if (uncategorized.length === 0) {
    return apiOk({ categorized: 0, items: [] });
  }

  const apiKey = process.env['GEMINI_API_KEY'];
  if (!apiKey) return apiError('INTERNAL', 'Gemini API key not configured', 500);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0,
    },
  });

  const userMessage = uncategorized
    .map((i) => `{"id": "${i.id}", "name": ${JSON.stringify(i.name)}}`)
    .join('\n');

  let parsed: Record<string, string>;
  try {
    const result = await model.generateContent(
      `Categorize these grocery items and return a JSON object mapping each item's id to its category:\n${userMessage}`
    );
    const text = result.response.text().trim();
    const obj = JSON.parse(text) as Record<string, unknown>;
    parsed = responseSchema.parse(obj) as Record<string, string>;
  } catch {
    return apiError('INTERNAL', 'Failed to get valid response from AI', 502);
  }

  // Validate each category against the allowed list and bulk-update
  const updates: { id: string; category: string }[] = [];
  for (const item of uncategorized) {
    const cat = parsed[item.id];
    if (cat && categorySet.has(cat)) {
      updates.push({ id: item.id, category: cat });
    }
  }

  await Promise.all(
    updates.map(({ id, category }) =>
      db
        .update(items)
        .set({ category })
        .where(and(eq(items.id, id), eq(items.storeId, storeId), eq(items.userId, userId)))
    )
  );

  // Return the updated items so the client can update state
  const updatedItems = await db
    .select()
    .from(items)
    .where(and(eq(items.storeId, storeId), eq(items.userId, userId)))
    .all();

  return apiOk({ categorized: updates.length, items: updatedItems });
}
