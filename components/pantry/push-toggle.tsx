'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, BellRing, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const VAPID_PUBLIC_KEY = process.env['NEXT_PUBLIC_VAPID_PUBLIC_KEY'];

/** base64url VAPID key → Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

type State = 'unsupported' | 'off' | 'on' | 'busy' | 'blocked';

export function PushToggle() {
  const [state, setState] = useState<State>('off');

  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY;

  // Reflect the current subscription/permission on mount. All state writes live
  // inside the async callback so none run synchronously during effect commit.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supported) { if (!cancelled) setState('unsupported'); return; }
      if (Notification.permission === 'denied') { if (!cancelled) setState('blocked'); return; }
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (!cancelled) setState(sub ? 'on' : 'off');
      } catch {
        if (!cancelled) setState('off');
      }
    })();
    return () => { cancelled = true; };
  }, [supported]);

  const enable = useCallback(async () => {
    // iOS: request permission synchronously inside the gesture, before awaiting.
    let permission: NotificationPermission;
    try {
      permission = await Notification.requestPermission();
    } catch {
      toast.error('Could not request permission');
      return;
    }
    if (permission !== 'granted') {
      setState(permission === 'denied' ? 'blocked' : 'off');
      if (permission === 'denied') toast.error('Notifications are blocked in your browser settings');
      return;
    }

    setState('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource,
      });
      const json = sub.toJSON();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys, timezone }),
      });
      if (!res.ok) throw new Error();
      setState('on');
      toast.success('Reminders on — 10 AM & 5 PM when items run low');
    } catch {
      setState('off');
      toast.error('Could not enable reminders');
    }
  }, []);

  const disable = useCallback(async () => {
    setState('busy');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
      setState('off');
      toast.success('Reminders off');
    } catch {
      setState('on');
      toast.error('Could not turn off reminders');
    }
  }, []);

  if (state === 'unsupported') return null;

  const onClick = () => {
    if (state === 'busy') return;
    if (state === 'blocked') {
      toast.error('Notifications are blocked — enable them in your browser settings');
      return;
    }
    void (state === 'on' ? disable() : enable());
  };

  const isOn = state === 'on';
  const Icon = state === 'busy' ? Loader2 : state === 'blocked' ? BellOff : isOn ? BellRing : Bell;

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.88 }}
      aria-label={isOn ? 'Turn off pantry reminders' : 'Turn on pantry reminders'}
      aria-pressed={isOn}
      title={isOn ? 'Reminders on' : 'Reminders off'}
      className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        color: isOn ? 'var(--accent)' : 'var(--text-muted)',
        backgroundColor: isOn ? 'var(--accent-soft)' : undefined,
      }}
    >
      <Icon size={16} className={state === 'busy' ? 'animate-spin' : undefined} />
    </motion.button>
  );
}
