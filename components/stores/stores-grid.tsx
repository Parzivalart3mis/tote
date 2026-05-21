'use client';

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, ArrowUpAZ, ArrowDownAZ, ListFilter } from 'lucide-react';
import { StoreCard } from './store-card';
import { AddStoreSheet } from './add-store-sheet';

type StoreRow = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  uncheckedCount: number;
  position: number;
};

type SortMode = 'name-asc' | 'name-desc' | 'items-desc';

const SORT_MODES: SortMode[] = ['name-asc', 'name-desc', 'items-desc'];

function sortLabel(mode: SortMode) {
  if (mode === 'name-asc') return 'A–Z';
  if (mode === 'name-desc') return 'Z–A';
  return 'Most items';
}

function sortStores(stores: StoreRow[], mode: SortMode): StoreRow[] {
  return [...stores].sort((a, b) => {
    if (mode === 'name-asc') return a.name.localeCompare(b.name);
    if (mode === 'name-desc') return b.name.localeCompare(a.name);
    return b.uncheckedCount - a.uncheckedCount;
  });
}

interface StoresGridProps {
  initialStores: StoreRow[];
}

export function StoresGrid({ initialStores }: StoresGridProps) {
  const [stores, setStores] = useState<StoreRow[]>(initialStores);
  const [sortMode, setSortMode] = useState<SortMode>('name-asc');

  // Sync with fresh server data when router.refresh() re-renders the parent
  useEffect(() => {
    setStores(initialStores);
  }, [initialStores]);

  const sorted = useMemo(() => sortStores(stores, sortMode), [stores, sortMode]);

  const cycleSortMode = () => {
    setSortMode((prev) => {
      const idx = SORT_MODES.indexOf(prev);
      return SORT_MODES[(idx + 1) % SORT_MODES.length]!;
    });
  };

  const handleAdded = (store: { id: string; name: string; coverImageUrl: string | null }) => {
    setStores((prev) => [...prev, { ...store, uncheckedCount: 0, position: prev.length }]);
  };

  const handleDeleted = (id: string) => {
    setStores((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="px-3 pb-16 pt-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          My stores
        </h1>
        <div className="flex items-center gap-2">
          {stores.length > 1 && (
            <button
              onClick={cycleSortMode}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              aria-label="Change sort order"
            >
              {sortMode === 'name-asc' && <ArrowUpAZ size={13} />}
              {sortMode === 'name-desc' && <ArrowDownAZ size={13} />}
              {sortMode === 'items-desc' && <ListFilter size={13} />}
              {sortLabel(sortMode)}
            </button>
          )}
          <AddStoreSheet onAdded={handleAdded} />
        </div>
      </div>

      {stores.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center">
          <ShoppingCart size={32} style={{ color: 'var(--text-hint)' }} />
          <p className="text-base font-medium" style={{ color: 'var(--text)' }}>No stores yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Add your first store to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {sorted.map((store, i) => (
            <StoreCard
              key={store.id}
              id={store.id}
              name={store.name}
              coverImageUrl={store.coverImageUrl}
              uncheckedCount={store.uncheckedCount}
              index={i}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
