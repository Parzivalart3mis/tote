'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import {
  Package, PackageMinus, PackageOpen, Search, X, SearchX,
} from 'lucide-react';
import { PANTRY_STATUS_RANK, type PantryStatus } from '@/lib/pantry-status';
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
    const rank = PANTRY_STATUS_RANK[a.status] - PANTRY_STATUS_RANK[b.status];
    if (rank !== 0) return rank;
    return a.position - b.position || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** Section chrome per status, in render order. */
const SECTIONS: { status: PantryStatus; label: string; color: string; soft: string; Icon: typeof Package }[] = [
  { status: 'IN_STOCK', label: 'In stock', color: 'var(--text-muted)', soft: 'var(--accent-soft)', Icon: Package },
  { status: 'LOW', label: 'Running low', color: 'var(--warning)', soft: 'rgba(249,115,22,0.14)', Icon: PackageMinus },
  { status: 'OUT', label: 'Out', color: 'var(--error)', soft: 'rgba(220,38,38,0.1)', Icon: PackageOpen },
];

/* Soft drifting color fields behind the content — transforms only, GPU-composited */
function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <motion.div
        className="absolute -right-24 -top-16 size-80 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--accent-soft) 0%, transparent 70%)', opacity: 0.55 }}
        animate={{ x: [0, -24, 12, 0], y: [0, 28, -14, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -left-28 top-1/3 size-96 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(251,191,36,0.14) 0%, transparent 70%)' }}
        animate={{ x: [0, 20, -12, 0], y: [0, -22, 12, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

/* Number that slides vertically when its value changes */
function AnimatedCount({ value }: { value: number }) {
  return (
    <span className="relative inline-flex h-[1.1em] items-center overflow-hidden">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 34 }}
          className="tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function PantryView({ initialItems }: PantryViewProps) {
  const [items, setItems] = useState<PantryItem[]>(() => sortItems(initialItems));
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newItemId, setNewItemId] = useState<string | null>(null);

  // Stagger row entrances only on the very first paint
  const firstMount = useRef(true);
  useEffect(() => { firstMount.current = false; }, []);

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
    setNewItemId(item.id);
    setTimeout(() => setNewItemId(null), 1600);
  };

  const handleUpdated = (updated: PantryItem) => {
    setItems((prev) => sortItems(prev.map((i) => (i.id === updated.id ? updated : i))));
  };

  // Delete with undo — restores the item (and its out status) if tapped in time
  const handleDeleted = (id: string) => {
    const deleted = items.find((i) => i.id === id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (!deleted) return;
    toast.success(`${deleted.name} removed`, {
      action: {
        label: 'Undo',
        onClick: () => {
          void (async () => {
            try {
              const res = await fetch('/api/pantry/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: deleted.name,
                  quantity: deleted.quantity ?? undefined,
                  unit: deleted.unit ?? undefined,
                  note: deleted.note ?? undefined,
                  category: deleted.category ?? undefined,
                }),
              });
              const json = await res.json() as { item?: PantryItem };
              if (!res.ok || !json.item) throw new Error();
              let restored = json.item;
              if (deleted.status !== 'IN_STOCK') {
                const patchRes = await fetch(`/api/pantry/items/${restored.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ status: deleted.status }),
                });
                const patchJson = await patchRes.json() as { item?: PantryItem };
                if (patchRes.ok && patchJson.item) restored = patchJson.item;
              }
              setItems((prev) => sortItems([...prev, restored]));
            } catch {
              toast.error('Could not restore item');
            }
          })();
        },
      },
    });
  };

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, searchQuery]);

  // Non-empty sections in render order, each carrying its offset into the flat
  // row list so entrance stagger stays continuous across section boundaries.
  const visibleSections = useMemo(() => {
    let seen = 0;
    return SECTIONS.map((section) => {
      const rows = filtered.filter((i) => i.status === section.status);
      const start = seen;
      seen += rows.length;
      return { ...section, rows, start };
    }).filter((s) => s.rows.length > 0);
  }, [filtered]);

  const countOf = (status: PantryStatus) => items.filter((i) => i.status === status).length;

  const inStockCount = countOf('IN_STOCK');
  const lowCount = countOf('LOW');
  const outCount = countOf('OUT');
  const total = items.length || 1;
  const pct = (n: number) => (n / total) * 100;

  const toggleSearch = () => {
    setSearchOpen((v) => {
      if (v) setSearchQuery('');
      return !v;
    });
  };

  const entryDelay = (index: number) =>
    firstMount.current ? Math.min(index, 8) * 0.045 : 0;

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-[calc(100dvh-2.75rem)] overflow-x-clip">
        <AmbientBackground />

        <div className="relative z-10 px-3 pb-16 pt-3">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="mb-3"
          >
            <div className="flex items-center justify-between">
              <h1 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
                My pantry
              </h1>
              <div className="flex items-center gap-1.5">
                <motion.button
                  onClick={toggleSearch}
                  whileTap={{ scale: 0.88 }}
                  aria-label={searchOpen ? 'Close search' : 'Search pantry'}
                  className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                  style={{
                    color: searchOpen ? 'var(--accent)' : 'var(--text-muted)',
                    backgroundColor: searchOpen ? 'var(--accent-soft)' : undefined,
                  }}
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={searchOpen ? 'close' : 'search'}
                      initial={{ scale: 0.5, rotate: -45, opacity: 0 }}
                      animate={{ scale: 1, rotate: 0, opacity: 1 }}
                      exit={{ scale: 0.5, rotate: 45, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 600, damping: 32 }}
                      className="flex"
                    >
                      {searchOpen ? <X size={15} /> : <Search size={15} />}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
                <AddPantryItemDialog onAdded={handleAdded} />
              </div>
            </div>

            {/* Stat chips + stock health bar */}
            {items.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="mt-2.5 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    <Package size={10} />
                    <AnimatedCount value={inStockCount} />
                    in stock
                  </span>
                  <AnimatePresence mode="popLayout">
                    {lowCount > 0 && (
                      <motion.span
                        key="low-chip"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{ backgroundColor: 'rgba(249,115,22,0.14)', color: 'var(--warning)' }}
                      >
                        <PackageMinus size={10} />
                        <AnimatedCount value={lowCount} />
                        low
                      </motion.span>
                    )}
                    {outCount > 0 && (
                      <motion.span
                        key="out-chip"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{ backgroundColor: 'rgba(220,38,38,0.1)', color: 'var(--error)' }}
                      >
                        <PackageOpen size={10} />
                        <AnimatedCount value={outCount} />
                        out
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                {/* Segmented health bar: green / amber / red in proportion */}
                <div
                  className="flex h-1 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--border)' }}
                  role="img"
                  aria-label={`Pantry stock: ${inStockCount} in stock, ${lowCount} running low, ${outCount} out`}
                >
                  {([
                    { key: 'in', n: inStockCount, bg: 'linear-gradient(90deg, var(--accent), #4ADE80)' },
                    { key: 'low', n: lowCount, bg: 'var(--warning)' },
                    { key: 'out', n: outCount, bg: 'var(--error)' },
                  ] as const).map((seg) => (
                    <motion.div
                      key={seg.key}
                      className="h-full"
                      style={{ background: seg.bg }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct(seg.n)}%` }}
                      transition={{ type: 'spring', stiffness: 120, damping: 24, delay: 0.15 }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Search bar */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                className="mb-3 overflow-hidden"
              >
                <div className="relative">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-hint)' }}
                  />
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pantry…"
                    className="w-full rounded-xl border py-2 pl-9 pr-9 text-sm outline-none transition-shadow focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                    style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text)' }}
                  />
                  <AnimatePresence>
                    {searchQuery && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.6 }}
                        whileTap={{ scale: 0.8 }}
                        onClick={() => setSearchQuery('')}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full"
                        style={{ backgroundColor: 'var(--border)', color: 'var(--text-muted)' }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {items.length === 0 ? (
            /* Empty state — floating illustration + inviting CTA */
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
                  <Package size={40} style={{ color: 'var(--accent)' }} strokeWidth={1.5} />
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
                Your pantry awaits
              </p>
              <p className="max-w-56 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Keep track of what you have at home and never run out unexpectedly.
              </p>
              <div className="mt-4">
                <AddPantryItemDialog onAdded={handleAdded} variant="cta" />
              </div>
            </motion.div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.05 }}
                  className="overflow-hidden rounded-2xl border shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_16px_-4px_rgba(0,0,0,0.06)]"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                >
                  {/* One AnimatePresence across all sections: an item whose status changes
                      keeps its key and glides to its new section via layout animation instead
                      of unmounting/remounting (which desyncs presence + duplicate sortable ids) */}
                  <AnimatePresence mode="popLayout">
                    {visibleSections.flatMap((section) => [
                      <motion.div
                        key={`header-${section.status}`}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-1.5 border-b px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em]"
                        style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)', color: section.color }}
                      >
                        <section.Icon size={11} />
                        {section.label}
                        <span
                          className="ml-auto rounded-full px-1.5 py-px tabular-nums"
                          style={{
                            backgroundColor: section.soft,
                            color: section.status === 'IN_STOCK' ? 'var(--accent)' : section.color,
                          }}
                        >
                          <AnimatedCount value={section.rows.length} />
                        </span>
                      </motion.div>,
                      ...section.rows.map((item, idx) => (
                        <PantryItemRow
                          key={item.id}
                          item={item}
                          onUpdated={handleUpdated}
                          onDeleted={handleDeleted}
                          showHandle={section.status !== 'OUT' && !searchQuery}
                          entryDelay={entryDelay(section.start + idx)}
                          isNew={item.id === newItemId}
                          animateEntry={firstMount.current}
                        />
                      )),
                    ])}

                    {filtered.length === 0 && searchQuery && (
                      <motion.div
                        key="no-match"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2 px-3 py-10 text-center"
                      >
                        <motion.div
                          animate={{ rotate: [0, -8, 8, 0] }}
                          transition={{ duration: 0.5, delay: 0.15 }}
                        >
                          <SearchX size={24} style={{ color: 'var(--text-hint)' }} />
                        </motion.div>
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                          No items match &ldquo;{searchQuery}&rdquo;
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
