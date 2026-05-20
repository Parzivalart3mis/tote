'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden, show after event

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDismissed(true);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {!dismissed && deferredPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="safe-bottom fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 shadow-lg"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Download size={18} className="shrink-0" style={{ color: 'var(--accent)' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              Add Tote to home screen
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              For the best experience
            </p>
          </div>
          <button
            onClick={() => void handleInstall()}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss install prompt"
            className="ml-1 flex size-7 items-center justify-center rounded-lg hover:bg-black/5"
          >
            <X size={14} style={{ color: 'var(--text-hint)' }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
