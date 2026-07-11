import { auth } from '@clerk/nextjs/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { pantryItems } from '@/db/schema';
import { checkRateLimit } from '@/lib/ratelimit';
import { apiError, apiOk } from '@/lib/api-helpers';

const reorderSchema = z.object({ ids: z.array(z.string()).min(1).max(500) }).strict();

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return apiError('UNAUTHORIZED', 'Not signed in', 401);

  const { ok } = await checkRateLimit(userId);
  if (!ok) return apiError('RATE_LIMITED', 'Too many requests', 429);

  const body = await req.json().catch(() => null);
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input', 422);
  }

  await Promise.all(
    parsed.data.ids.map((id, position) =>
      db
        .update(pantryItems)
        .set({ position })
        .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    )
  );

  return apiOk({ ok: true });
}
