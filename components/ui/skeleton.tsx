import { cn } from '@/lib/utils';

/** Shimmering placeholder block. Style with width/height/rounded via className. */
export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('skeleton', className)} style={style} aria-hidden="true" />;
}
