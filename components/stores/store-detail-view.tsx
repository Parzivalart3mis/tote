'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Store, Item } from '@/db/schema';
import { InitialsTile } from '@/components/initials-tile';
import { ItemRow } from '@/components/items/item-row';
import { EditStoreDialog } from './edit-store-dialog';
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

  // Inline add state
  const [addingItem, setAddingItem] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  // Multiselect state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (addingItem) addInputRef.current?.focus();
  }, [addingItem]);

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

  // Inline add submit
  const submitAdd = async () => {
    const name = addValue.trim();
    if (!name) return;
    setAddLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeData.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { item?: Item };
      if (!res.ok) throw new Error();
      handleItemAdded(json.item!);
      setAddValue('');
      addInputRef.current?.focus();
    } catch {
      toast.error('Could not add item');
    } finally {
      setAddLoading(false);
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
            {/* Blurred backdrop fills the frame */}
            <Image
              src={proxyUrl}
              alt=""
              fill
              unoptimized
              aria-hidden
              className="object-cover scale-110 blur-xl brightness-75"
            />
            {/* Sharp logo / photo centred on top */}
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

      {/* Action row: inline add + select toggle */}
      <div
        className="flex items-center border-b px-3 py-2"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {addingItem ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              ref={addInputRef}
              type="text"
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); void submitAdd(); }
                if (e.key === 'Escape') { setAddingItem(false); setAddValue(''); }
              }}
              placeholder="Item name…"
              disabled={addLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--text-hint)]"
              style={{ color: 'var(--text)' }}
              aria-label="New item name"
            />
            {addValue.trim() && (
              <button
                onClick={() => void submitAdd()}
                disabled={addLoading}
                className="rounded-lg px-2 py-1 text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                Add
              </button>
            )}
            <button
              onClick={() => { setAddingItem(false); setAddValue(''); }}
              aria-label="Cancel"
              className="flex size-6 items-center justify-center rounded-lg"
            >
              <X size={15} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { if (!selectMode) setAddingItem(true); }}
              disabled={selectMode}
              className="flex items-center gap-1.5"
              style={{ color: selectMode ? 'var(--text-hint)' : 'var(--accent)' }}
              aria-label="Add item"
            >
              <Plus size={15} />
              <span className="text-sm font-medium">Add item</span>
            </button>
            <button
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className="ml-auto text-sm font-medium"
              style={{ color: 'var(--text-muted)' }}
            >
              {selectMode ? 'Done' : 'Select'}
            </button>
          </>
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

      {/* Item list */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--surface)' }}>
        {items.length === 0 ? (
          <div className="mt-10 flex flex-col items-center gap-1.5 text-center px-4">
            <p className="text-base font-medium" style={{ color: 'var(--text)' }}>No items yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tap + Add item to get started.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onUpdated={handleItemUpdated}
                onDeleted={handleItemDeleted}
                selectMode={selectMode}
                selected={selectedIds.has(item.id)}
                onSelect={toggleSelect}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Multiselect bottom action bar */}
      <AnimatePresence>
        {selectMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80 }}
            animate={{ y: 0 }}
            exit={{ y: 80 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="safe-bottom flex items-center justify-between border-t px-4 py-2.5"
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
