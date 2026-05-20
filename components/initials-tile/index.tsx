import React from 'react';

const PALETTE = [
  '#D4B896',
  '#A8C5A0',
  '#B8C4D4',
  '#D4B8C4',
  '#C4D4B8',
  '#C8BEB4',
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + (name.charCodeAt(i) ?? 0)) >>> 0;
  }
  return h;
}

interface InitialsTileProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

export function InitialsTile({ name, className, style }: InitialsTileProps) {
  const idx = hashName(name) % PALETTE.length;
  const bg = PALETTE[idx] ?? PALETTE[0]!;
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative flex items-center justify-center select-none ${className ?? ''}`}
      style={{ backgroundColor: bg, ...style }}
      aria-hidden="true"
    >
      <span
        className="font-semibold text-white"
        style={{ fontSize: '2rem', lineHeight: 1 }}
      >
        {initial}
      </span>
      {/* accent corner badge */}
      <span
        className="absolute bottom-2 right-2 size-3 rounded-full"
        style={{ backgroundColor: 'var(--accent)' }}
      />
    </div>
  );
}
