'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { Store, Item } from '@/db/schema';
import { InitialsTile } from '@/components/initials-tile';
import { ItemRow } from '@/components/items/item-row';
import { AddItemInput } from '@/components/items/add-item-input';
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

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Cover banner */}
      <div className="relative h-44 w-full shrink-0">
        {showImage ? (
          <Image
            src={proxyUrl}
            alt={storeData.name}
            fill
            className="object-cover"
            onError={() => setImgError(true)}
            priority
          />
        ) : (
          <InitialsTile name={storeData.name} className="size-full" />
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        {/* Back button */}
        <Link
          href="/stores"
          className="safe-top absolute left-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm"
          aria-label="Back to stores"
        >
          <ArrowLeft size={18} color="#fff" />
        </Link>
        {/* Edit button */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <div className="rounded-full bg-black/30 backdrop-blur-sm p-1">
            <EditStoreDialog
              store={storeData}
              onUpdated={handleStoreUpdated}
              onDeleted={handleStoreDeleted}
            />
          </div>
        </div>
        {/* Store name */}
        <div className="absolute bottom-3 left-4 right-4">
          <h1 className="text-xl font-bold text-white drop-shadow">{storeData.name}</h1>
          <p className="text-sm text-white/80">
            {items.filter((i) => !i.checked).length} item{items.filter((i) => !i.checked).length !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>

      {/* Clear checked bar */}
      {checkedCount > 0 && (
        <div
          className="flex items-center justify-between px-4 py-2"
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
          <div className="mt-16 flex flex-col items-center gap-2 text-center px-4">
            <p className="text-base font-medium" style={{ color: 'var(--text)' }}>No items yet</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Type below to add your first item.
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
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Add item — pinned bottom */}
      <AddItemInput storeId={storeData.id} onAdded={handleItemAdded} />
    </div>
  );
}
