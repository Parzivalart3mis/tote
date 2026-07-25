'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Store as StoreIcon, ChevronRight, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

export interface PickerStore {
  id: string;
  name: string;
}

const LAST_STORE_KEY = 'tote:pantry:laststore';

const TILE_PALETTE = ['#D4B896', '#A8C5A0', '#B8C4D4', '#D4B8C4', '#C4D4B8', '#C8BEB4'];
function tileColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return TILE_PALETTE[h % TILE_PALETTE.length]!;
}

function StoreTile({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white"
      style={{ backgroundColor: tileColor(name) }}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  );
}

export function readLastStore(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(LAST_STORE_KEY);
}

interface StorePickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: PickerStore[];
  /** How many items this pick will add — shown in the sheet copy. */
  count: number;
  busyStoreId: string | null;
  onPick: (store: PickerStore) => void;
}

export function StorePickerSheet({
  open, onOpenChange, stores, count, busyStoreId, onPick,
}: StorePickerSheetProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stores;
    return stores.filter((s) => s.name.toLowerCase().includes(q));
  }, [stores, query]);

  const lastStoreId = readLastStore();

  // Surface the last-used store at the top so the common pick is one tap away.
  const ordered = useMemo(() => {
    if (!lastStoreId) return filtered;
    const last = filtered.find((s) => s.id === lastStoreId);
    if (!last) return filtered;
    return [last, ...filtered.filter((s) => s.id !== lastStoreId)];
  }, [filtered, lastStoreId]);

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setQuery(''); }}>
      <SheetContent side="bottom" className="max-h-[80vh] rounded-t-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        <SheetHeader className="pb-2">
          <SheetTitle style={{ color: 'var(--text)' }}>Add to which store?</SheetTitle>
          <SheetDescription style={{ color: 'var(--text-muted)' }}>
            {count === 1 ? '1 item' : `${count} items`} will be added to that store&rsquo;s shopping list.
          </SheetDescription>
        </SheetHeader>

        {stores.length === 0 ? (
          <div className="px-4 pb-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            You have no stores yet. Add a store first to build a shopping list.
          </div>
        ) : (
          <>
            {stores.length > 6 && (
              <div className="px-4">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter stores…"
                  aria-label="Filter stores"
                  className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                />
              </div>
            )}

            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {ordered.map((store) => {
                const isLast = store.id === lastStoreId;
                const busy = busyStoreId === store.id;
                return (
                  <li key={store.id}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      disabled={!!busyStoreId}
                      onClick={() => onPick(store)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-black/[0.03] disabled:opacity-50 dark:hover:bg-white/[0.04]"
                    >
                      <StoreTile name={store.name} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                          {store.name}
                        </span>
                        {isLast && (
                          <span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                            Last used
                          </span>
                        )}
                      </span>
                      {busy
                        ? <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />
                        : <ChevronRight size={16} style={{ color: 'var(--text-hint)' }} />}
                    </motion.button>
                  </li>
                );
              })}
              {ordered.length === 0 && (
                <li className="flex flex-col items-center gap-2 py-8 text-center">
                  <StoreIcon size={22} style={{ color: 'var(--text-hint)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>No stores match &ldquo;{query}&rdquo;</span>
                </li>
              )}
            </ul>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function writeLastStore(id: string) {
  if (typeof window !== 'undefined') localStorage.setItem(LAST_STORE_KEY, id);
}
