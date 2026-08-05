import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors StoresGrid: header row + a 2/3-column grid of store cards. */
export default function StoresLoading() {
  return (
    <div className="px-3 pb-16 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
          >
            <div className="p-2">
              <Skeleton className="aspect-[3/2] w-full rounded-lg" />
            </div>
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="size-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
