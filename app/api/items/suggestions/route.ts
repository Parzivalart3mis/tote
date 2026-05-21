import { auth } from '@clerk/nextjs/server';
import { eq, like, asc } from 'drizzle-orm';
import { db } from '@/db';
import { items } from '@/db/schema';
import { apiError, apiOk } from '@/lib/api-helpers';

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim() ?? '';
  if (!q) return apiOk({ suggestions: [] });

  const rows = await db
    .select({
      name: items.name,
      quantity: items.quantity,
      unit: items.unit,
      price: items.price,
      priceUnit: items.priceUnit,
      category: items.category,
    })
    .from(items)
    .where(eq(items.userId, userId))
    .orderBy(asc(items.name))
    .all();

  // Deduplicate by name, keep the most recent occurrence, filter by query
  const seen = new Set<string>();
  const suggestions: typeof rows = [];
  for (const row of rows) {
    const lower = row.name.toLowerCase();
    if (!lower.startsWith(q.toLowerCase())) continue;
    if (seen.has(lower)) continue;
    seen.add(lower);
    suggestions.push(row);
    if (suggestions.length >= 8) break;
  }

  return apiOk({ suggestions });
}
