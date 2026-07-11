'use client';

import { useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Package, PackageOpen, Search, X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import type { PantryItem } from '@/db/schema';
import { AddPantryItemDialog } from './add-pantry-item-dialog';
import { PantryItemRow } from './pantry-item-row';

interface PantryViewProps {
  initialItems: PantryItem[];
}

function sortItems(arr: PantryItem[]): PantryItem[] {
  return [...arr].sort((a, b) => {
    if (a.isOut !== b.isOut) return a.isOut ? 1 : -1;
    return a.position - b.position || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

export function PantryView({ initialItems }: PantryViewProps) {
  const [items, setItems] = useState<PantryItem[]>(() => sortItems(initialItems));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      const reordered = sortItems(arrayMove(prev, oldIdx, newIdx));
      void fetch('/api/pantry/items/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
      }).catch(() => toast.error('Could not save order'));
      return reordered;
    });
  }, []);

  const handleAdded = (item: PantryItem) => {
    setItems((prev) => sortItems([...prev, item]));
  };

  const handleUpdated = (updated: PantryItem) => {
    setItems((prev) => sortItems(prev.map((i) => (i.id === updated.id ? updated : i))));
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  const inStockItems = filtered.filter((i) => !i.isOut);
  const outItems = filtered.filter((i) => i.isOut);
  const outCount = items.filter((i) => i.isOut).length;

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (v) setSearchQuery('');
      return !v;
    });
  };

  return (
    <div className="px-3 pb-16 pt-3">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            My pantry
          </h1>
          {outCount > 0 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--error, #ef4444)' }}>
              {outCount} item{outCount !== 1 ? 's' : ''} out
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleSearch}
            aria-label={searchOpen ? 'Close search' : 'Search pantry'}
            className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
            style={{ color: searchOpen ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {searchOpen ? <X size={16} /> : <Search size={16} />}
          </button>
          <AddPantryItemDialog onAdded={handleAdded} />
        </div>
      </div>

      {/* Search bar */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden mb-3"
          >
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pantry…"
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-2 text-center">
          <Package size={32} style={{ color: 'var(--text-hint)' }} />
          <p className="text-base font-medium" style={{ color: 'var(--text)' }}>Pantry is empty</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Add items you keep at home and mark them out when you run low.
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>

              {/* In stock section */}
              {inStockItems.length > 0 && (
                <>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}
                  >
                    <Package size={11} />
                    In stock · {inStockItems.length}
                  </div>
                  <AnimatePresence initial={false}>
                    {inStockItems.map((item) => (
                      <PantryItemRow
                        key={item.id}
                        item={item}
                        onUpdated={handleUpdated}
                        onDeleted={handleDeleted}
                        showHandle={!searchQuery}
                      />
                    ))}
                  </AnimatePresence>
                </>
              )}

              {/* Out section */}
              {outItems.length > 0 && (
                <>
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: 'var(--bg)',
                      borderTop: inStockItems.length > 0 ? '1px solid var(--border)' : undefined,
                      borderBottom: '1px solid var(--border)',
                      color: 'var(--error, #ef4444)',
                    }}
                  >
                    <PackageOpen size={11} />
                    Out · {outItems.length}
                  </div>
                  <AnimatePresence initial={false}>
                    {outItems.map((item) => (
                      <PantryItemRow
                        key={item.id}
                        item={item}
                        onUpdated={handleUpdated}
                        onDeleted={handleDeleted}
                        showHandle={false}
                      />
                    ))}
                  </AnimatePresence>
                </>
              )}

              {filtered.length === 0 && searchQuery && (
                <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  No items match &ldquo;{searchQuery}&rdquo;
                </p>
              )}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
