import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors StoreDetailView: cover banner, action toolbar, and the item list. */
export default function StoreDetailLoading() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Cover banner */}
      <div className="relative">
        <Skeleton className="h-40 w-full rounded-none" />
        <div className="safe-top absolute inset-x-0 top-0 flex items-center justify-between p-3">
          <Skeleton className="size-9 rounded-full" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="absolute bottom-3 left-4">
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      {/* Action toolbar */}
      <div
        className="flex items-center gap-3 border-b px-4 py-2.5"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
      >
        <Skeleton className="size-7 rounded-lg" />
        <Skeleton className="h-6 w-24 rounded-lg" />
        <div className="ml-auto flex items-center gap-3">
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="size-7 rounded-lg" />
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>
      </div>

      {/* Item rows */}
      <div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 border-b px-3.5 py-2.5" style={{ borderColor: 'var(--border)' }}>
            <Skeleton className="size-5 shrink-0 rounded-full" />
            <Skeleton className="h-4" style={{ width: `${40 + ((i * 17) % 40)}%` }} />
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
