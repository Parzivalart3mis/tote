'use client';

import { useEffect, useState } from 'react';

/**
 * Branded startup splash. Rendered once in the root layout so it is part of the
 * SSR'd HTML and paints with the first frame (no hydration flash), then removes
 * itself after a short minimum hold. It overlays the already-loading app rather
 * than gating it, so it never delays startup.
 *
 * Timings (ms). Kept small so the splash reads as a polished beat, not a stall.
 */
const MIN_HOLD = 750;   // how long the logo stays before it starts leaving
const EXIT_MS = 440;    // must match the CSS opacity transition on .splash-root

/** The Tote mark, inlined from public/icons/icon.svg so it scales crisply and animates. */
function ToteMark({ size = 96 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden="true">
      <rect
        x="120" y="196" width="272" height="228" rx="28" ry="28"
        fill="none" stroke="var(--accent)" strokeWidth="28" strokeLinejoin="round"
      />
      <path
        d="M168 196 C168 140 216 104 256 104 C296 104 344 140 344 196"
        fill="none" stroke="var(--accent)" strokeWidth="28" strokeLinecap="round"
      />
      <ellipse cx="256" cy="290" rx="46" ry="22" transform="rotate(-15 256 290)" fill="var(--accent)" />
      <line x1="232" y1="302" x2="280" y2="278" stroke="var(--bg)" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hold = reduce ? 250 : MIN_HOLD;

    const startExit = setTimeout(() => setExiting(true), hold);
    const remove = setTimeout(() => setVisible(false), hold + EXIT_MS);
    return () => { clearTimeout(startExit); clearTimeout(remove); };
  }, []);

  if (!visible) return null;

  return (
    <div className="splash-root" data-exiting={exiting} role="status" aria-label="Loading Tote">
      <div className="relative flex items-center justify-center">
        <span className="splash-glow" aria-hidden="true" />
        <div className="splash-logo relative">
          <ToteMark size={96} />
        </div>
      </div>

      <div className="splash-track relative h-[3px] w-28 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--border)' }}>
        <span
          className="splash-shimmer absolute inset-y-0 left-0 w-1/3 rounded-full"
          style={{ backgroundColor: 'var(--accent)' }}
          aria-hidden="true"
        />
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
