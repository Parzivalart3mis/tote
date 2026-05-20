'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { StoreCard } from './store-card';
import { AddStoreSheet } from './add-store-sheet';

type StoreRow = {
  id: string;
  name: string;
  coverImageUrl: string | null;
  uncheckedCount: number;
  position: number;
};

interface StoresGridProps {
  initialStores: StoreRow[];
}

export function StoresGrid({ initialStores }: StoresGridProps) {
  const [stores, setStores] = useState<StoreRow[]>(initialStores);

  const handleAdded = (store: { id: string; name: string; coverImageUrl: string | null }) => {
    setStores((prev) => [
      ...prev,
      { ...store, uncheckedCount: 0, position: prev.length },
    ]);
  };

  return (
    <div className="px-4 pb-24 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
          My stores
        </h1>
        <AddStoreSheet onAdded={handleAdded} />
      </div>

      {stores.length === 0 ? (
        <div className="mt-20 flex flex-col items-center gap-3 text-center">
          <ShoppingCart size={40} style={{ color: 'var(--text-hint)' }} />
          <p className="text-base font-medium" style={{ color: 'var(--text)' }}>No stores yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Add your first store to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stores.map((store, i) => (
            <StoreCard
              key={store.id}
              id={store.id}
              name={store.name}
              coverImageUrl={store.coverImageUrl}
              uncheckedCount={store.uncheckedCount}
              index={i}
            />
          ))}
        </div>
      )}
    </div>
  );
}
