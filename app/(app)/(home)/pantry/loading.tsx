import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors PantryView: header + stat chips + health bar + a grouped list card. */
export default function PantryLoading() {
  return (
    <div className="px-3 pb-16 pt-3">
      {/* Header */}
      <div className="mb-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </div>
        {/* Stat chips + health bar */}
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-1 w-full rounded-full" />
        </div>
      </div>

      {/* List card */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
      >
        <div className="border-b px-3.5 py-2" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
          <Skeleton className="h-3 w-24" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--border)' }}>
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <Skeleton className="h-4" style={{ width: `${45 + ((i * 13) % 35)}%` }} />
            <div className="ml-auto flex gap-1">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
