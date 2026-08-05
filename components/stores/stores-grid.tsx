'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [stores, setStores] = useState<StoreRow[]>(initialStores);
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    if (typeof window === 'undefined') return 'name-asc';
    const saved = localStorage.getItem('tote:stores:sort') as SortMode | null;
    return saved && SORT_MODES.includes(saved) ? saved : 'name-asc';
  });

  // Sync with fresh server data whenever parent re-renders (covers router.refresh())
  useEffect(() => {
    setStores(initialStores);
  }, [initialStores]);

  // Auto-refresh on every mount so item counts are always current
  useEffect(() => {
    router.refresh();
  }, [router]);

  const sorted = useMemo(() => sortStores(stores, sortMode), [stores, sortMode]);

  const cycleSortMode = () => {
    setSortMode((prev) => {
      const next = SORT_MODES[(SORT_MODES.indexOf(prev) + 1) % SORT_MODES.length]!;
      localStorage.setItem('tote:stores:sort', next);
      return next;
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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.1 }}
          className="mt-14 flex flex-col items-center gap-1 text-center"
        >
          <div className="relative mb-3 flex size-24 items-center justify-center">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ backgroundColor: 'var(--accent-soft)', opacity: 0.7 }}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              className="relative"
            >
              <ShoppingCart size={40} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
            </motion.div>
            <motion.span
              className="absolute right-2 top-3 size-1.5 rounded-full"
              style={{ backgroundColor: 'var(--highlight)' }}
              animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            />
            <motion.span
              className="absolute bottom-4 left-2 size-1 rounded-full"
              style={{ backgroundColor: 'var(--accent)' }}
              animate={{ y: [0, -4, 0], opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
          </div>
          <p className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            No stores yet
          </p>
          <p className="max-w-56 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Create a list for each store you shop at and keep your groceries organized.
          </p>
          <div className="mt-4">
            <AddStoreSheet onAdded={handleAdded} variant="cta" />
          </div>
        </motion.div>
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
