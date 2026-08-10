import 'server-only';
import webpush from 'web-push';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';

let configured = false;

/** Lazily configure web-push with the VAPID env. Returns false if keys are absent. */
export function isPushConfigured(): boolean {
  // The public key is identical on both vars; fall back to the NEXT_PUBLIC one so
  // it only has to be set once (it is present in the server runtime too).
  const publicKey = process.env['VAPID_PUBLIC_KEY'] || process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];
  const privateKey = process.env['VAPID_PRIVATE_KEY'];
  const subject = process.env['VAPID_SUBJECT'] || 'mailto:admin@example.com';
  if (!publicKey || !privateKey) return false;
  if (!configured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface SendResult {
  sent: number;
  pruned: number;
}

/**
 * Send a push to every subscription belonging to `userId`. Dead subscriptions
 * (404/410 from the push service) are pruned. Never throws — returns counts so
 * callers (notably the cron endpoint) can stay idempotent and return 200.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<SendResult> {
  if (!isPushConfigured()) return { sent: 0, pruned: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .all();

  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;
  let pruned = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          // Subscription is gone — remove it so we stop trying.
          await db
            .delete(pushSubscriptions)
            .where(and(eq(pushSubscriptions.id, sub.id), eq(pushSubscriptions.userId, userId)));
          pruned++;
        }
        // Other errors (network, 5xx) are swallowed; the run stays successful.
      }
    })
  );

  return { sent, pruned };
}
