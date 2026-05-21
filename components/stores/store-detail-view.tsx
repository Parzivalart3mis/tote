'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Trash2, ShoppingCart, X, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
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
import type { Store, Item } from '@/db/schema';
import { InitialsTile } from '@/components/initials-tile';
import { SortableItemRow } from '@/components/items/sortable-item-row';
import { AddItemDialog } from '@/components/items/add-item-dialog';
import { EditStoreDialog } from './edit-store-dialog';
import { ITEM_CATEGORIES } from '@/lib/categories';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface StoreDetailViewProps {
  store: Store;
  initialItems: Item[];
}

function sortItems(arr: Item[]): Item[] {
  return [...arr].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    return a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime();
  });
}

export function StoreDetailView({ store, initialItems }: StoreDetailViewProps) {
  const router = useRouter();
  const [storeData, setStoreData] = useState(store);
  const [items, setItems] = useState<Item[]>(sortItems(initialItems));
  const [imgError, setImgError] = useState(false);

  // Shopping mode
  const [shoppingMode, setShoppingMode] = useState(false);

  // AI categorize
  const [categorizing, setCategorizing] = useState(false);
  const uncategorizedCount = items.filter((i) => !i.category).length;

  const handleCategorize = async () => {
    setCategorizing(true);
    try {
      const res = await fetch(`/api/stores/${storeData.id}/items/categorize`, { method: 'POST' });
      const json = await res.json() as { categorized?: number; items?: Item[] };
      if (!res.ok) throw new Error();
      if (json.items) setItems(sortItems(json.items));
      toast.success(`${json.categorized ?? 0} item${json.categorized === 1 ? '' : 's'} categorized`);
    } catch {
      toast.error('Could not categorize items');
    } finally {
      setCategorizing(false);
    }
  };

  // Category filter
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const usedCategories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];

  // Drag to reorder
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIdx = prev.findIndex((i) => i.id === active.id);
      const newIdx = prev.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      void fetch(`/api/stores/${storeData.id}/items/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: reordered.map((i) => i.id) }),
      }).catch(() => toast.error('Could not save order'));
      return reordered;
    });
  }, [storeData.id]);

  // Multiselect state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const proxyUrl = storeData.coverImageUrl
    ? `/api/img?u=${encodeURIComponent(storeData.coverImageUrl)}`
    : null;
  const showImage = proxyUrl && !imgError;

  const handleItemUpdated = (updated: Item) => {
    setItems((prev) => sortItems(prev.map((i) => (i.id === updated.id ? updated : i))));
  };

  const handleItemDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemAdded = (item: Item) => {
    setItems((prev) => sortItems([...prev, item]));
  };

  const handleStoreUpdated = (updated: { id: string; name: string; coverImageUrl: string | null }) => {
    setStoreData((prev) => ({ ...prev, ...updated }));
    setImgError(false);
  };

  const handleStoreDeleted = () => {
    router.push('/stores');
  };

  const checkedCount = items.filter((i) => i.checked).length;

  const estimatedTotal = items
    .filter((i) => !i.checked && i.price)
    .reduce((sum, i) => {
      const qty = parseFloat(i.quantity ?? '1') || 1;
      const price = parseFloat(i.price!) || 0;
      return sum + qty * price;
    }, 0);

  const clearChecked = async () => {
    try {
      const res = await fetch(`/api/stores/${storeData.id}/clear-checked`, { method: 'POST' });
      const json = await res.json() as { deleted?: number };
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => !i.checked));
      toast.success(`${json.deleted ?? 0} item${json.deleted === 1 ? '' : 's'} cleared`);
    } catch {
      toast.error('Could not clear items');
    }
  };

  // Multiselect helpers
  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const allSelectedChecked =
    selectedIds.size > 0 &&
    [...selectedIds].every((id) => items.find((i) => i.id === id)?.checked);

  const handleBulkCheck = async () => {
    const ids = [...selectedIds];
    const checked = !allSelectedChecked;
    try {
      const res = await fetch(`/api/stores/${storeData.id}/items/bulk`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, checked }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => sortItems(prev.map((i) => (selectedIds.has(i.id) ? { ...i, checked } : i))));
      exitSelectMode();
    } catch {
      toast.error('Could not update items');
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    try {
      const res = await fetch(`/api/stores/${storeData.id}/items/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error();
      setItems((prev) => prev.filter((i) => !selectedIds.has(i.id)));
      toast.success(`${count} item${count !== 1 ? 's' : ''} deleted`);
      exitSelectMode();
    } catch {
      toast.error('Could not delete items');
    }
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Cover banner */}
      <div className="relative h-40 w-full shrink-0 overflow-hidden">
        {showImage ? (
          <>
            <Image
              src={proxyUrl}
              alt=""
              fill
              unoptimized
              aria-hidden
              className="object-cover scale-110 blur-xl brightness-75"
            />
            <Image
              src={proxyUrl}
              alt={storeData.name}
              fill
              unoptimized
              className="object-contain"
              onError={() => setImgError(true)}
              priority
            />
          </>
        ) : (
          <InitialsTile name={storeData.name} className="size-full" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <Link
          href="/stores"
          className="safe-top absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
          aria-label="Back to stores"
        >
          <ArrowLeft size={18} color="#fff" />
        </Link>
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <div className="rounded-full bg-black/30 backdrop-blur-sm p-1">
            <EditStoreDialog
              store={storeData}
              onUpdated={handleStoreUpdated}
              onDeleted={handleStoreDeleted}
            />
          </div>
        </div>
        <div className="absolute bottom-2 left-4 right-4">
          <h1 className="text-lg font-bold text-white drop-shadow">{storeData.name}</h1>
          <p className="text-xs text-white/80">
            {items.filter((i) => !i.checked).length} item{items.filter((i) => !i.checked).length !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>

      {/* Shopping mode banner */}
      {shoppingMode && (
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart size={15} />
            <span className="text-sm font-semibold">Shopping mode</span>
          </div>
          <button
            onClick={() => setShoppingMode(false)}
            aria-label="Exit shopping mode"
            className="flex size-7 items-center justify-center rounded-full bg-white/20"
          >
            <X size={14} color="#fff" />
          </button>
        </div>
      )}

      {/* Action row */}
      <div
        className="flex items-center border-b px-3 py-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <AddItemDialog
          storeId={storeData.id}
          disabled={selectMode}
          onAdded={handleItemAdded}
        />
        {estimatedTotal > 0 && !selectMode && (
          <span
            className="ml-3 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            Est. ${estimatedTotal.toFixed(2)}
          </span>
        )}
        {selectMode ? (
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            <button
              onClick={exitSelectMode}
              className="text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-3">
            {uncategorizedCount > 0 && !shoppingMode && (
              <button
                onClick={() => void handleCategorize()}
                disabled={categorizing}
                className="flex items-center gap-1 text-sm font-medium disabled:opacity-60"
                style={{ color: 'var(--accent)' }}
              >
                {categorizing
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Sparkles size={14} />}
                {categorizing ? 'Categorizing…' : 'Categorize'}
              </button>
            )}
            {!shoppingMode && (
              <button
                onClick={() => setShoppingMode(true)}
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: 'var(--accent)' }}
              >
                <ShoppingCart size={14} />
                Shop
              </button>
            )}
            <button
              onClick={() => setSelectMode(true)}
              className="text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              Select
            </button>
          </div>
        )}
      </div>

      {/* Clear checked bar — hidden in select mode */}
      {checkedCount > 0 && !selectMode && (
        <div
          className="flex items-center justify-between px-4 py-1.5"
          style={{ backgroundColor: 'var(--accent-soft)', borderBottom: '1px solid var(--border)' }}
        >
          <span className="text-sm" style={{ color: 'var(--accent)' }}>
            {checkedCount} checked
          </span>
          <AlertDialog>
            <AlertDialogTrigger
              className="flex items-center gap-1.5 text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              <Trash2 size={14} />
              Clear
            </AlertDialogTrigger>
            <AlertDialogContent style={{ backgroundColor: 'var(--surface)' }}>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear checked items?</AlertDialogTitle>
                <AlertDialogDescription style={{ color: 'var(--text-muted)' }}>
                  This will remove {checkedCount} checked item{checkedCount !== 1 ? 's' : ''} from {storeData.name}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={clearChecked}
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Category filter chips */}
      {usedCategories.length > 0 && !selectMode && (
        <div
          className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none"
          style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
        >
          <button
            onClick={() => setActiveCategory(null)}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeCategory === null ? 'var(--accent)' : 'var(--accent-soft)',
              color: activeCategory === null ? '#fff' : 'var(--accent)',
            }}
          >
            All
          </button>
          {usedCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: activeCategory === cat ? 'var(--accent)' : 'var(--accent-soft)',
                color: activeCategory === cat ? '#fff' : 'var(--accent)',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Item list — add bottom padding when multiselect bar is visible */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: 'var(--surface)',
          paddingBottom: selectMode && selectedIds.size > 0 ? '4rem' : 0,
        }}
      >
        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-1.5 text-center px-4">
            <p className="text-base font-medium" style={{ color: 'var(--text)' }}>No items yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tap + Add item to get started.
            </p>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <AnimatePresence initial={false}>
                {items
                  .filter((i) => !shoppingMode || !i.checked)
                  .filter((i) => !activeCategory || i.category === activeCategory)
                  .map((item) => (
                    <SortableItemRow
                      key={item.id}
                      item={item}
                      onUpdated={handleItemUpdated}
                      onDeleted={handleItemDeleted}
                      selectMode={selectMode}
                      selected={selectedIds.has(item.id)}
                      onSelect={toggleSelect}
                      shoppingMode={shoppingMode}
                    />
                  ))}
              </AnimatePresence>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Multiselect bottom action bar — fixed to viewport bottom */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="safe-bottom fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between border-t px-4 py-2.5"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {selectedIds.size} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => void handleBulkCheck()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Check size={13} />
                {allSelectedChecked ? 'Uncheck' : 'Check'}
              </button>
              <button
                onClick={() => void handleBulkDelete()}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--error)' }}
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
