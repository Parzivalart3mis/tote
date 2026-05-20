import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env['UPSTASH_REDIS_REST_URL'];
  const token = process.env['UPSTASH_REDIS_REST_TOKEN'];
  if (!url || !token) return null;
  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'tote:rl',
  });
  return ratelimit;
}

export async function checkRateLimit(userId: string): Promise<{ ok: boolean; reset?: number }> {
  const rl = getRatelimit();
  if (!rl) return { ok: true };
  const { success, reset } = await rl.limit(userId);
  return { ok: success, reset };
}
