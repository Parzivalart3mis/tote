'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package, PackageMinus, PackageOpen, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { PantryItem } from '@/db/schema';
import { EditPantryItemDialog } from './edit-pantry-item-dialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  NEXT_PANTRY_STATUS,
  PANTRY_STATUS_LABEL,
  type PantryStatus,
} from '@/lib/pantry-status';

/** Per-status visuals for the stock button, badge and text treatment. */
const STATUS_STYLE: Record<PantryStatus, {
  color: string;
  soft: string;
  Icon: typeof Package;
  badge: string | null;
}> = {
  IN_STOCK: { color: 'var(--accent)', soft: 'var(--accent-soft)', Icon: Package, badge: null },
  LOW: { color: 'var(--warning)', soft: 'rgba(249,115,22,0.14)', Icon: PackageMinus, badge: 'low' },
  OUT: { color: 'var(--error)', soft: 'rgba(220,38,38,0.1)', Icon: PackageOpen, badge: 'out' },
};

interface PantryItemRowProps {
  item: PantryItem;
  onUpdated: (item: PantryItem) => void;
  onDeleted: (id: string) => void;
  showHandle: boolean;
  entryDelay?: number;
  isNew?: boolean;
  /** Play the fade-up entrance. Only safe on first paint: entering AnimatePresence
      with both `layout` and an initial animation while siblings layout-shift makes
      framer-motion swallow the enter animation, leaving the row stuck invisible. */
  animateEntry?: boolean;
}

export function PantryItemRow({ item, onUpdated, onDeleted, showHandle, entryDelay = 0, isNew, animateEntry = false }: PantryItemRowProps) {
  const [loading, setLoading] = useState(false);
  // Increments on each toggle press so the pulse ring re-fires exactly once per interaction
  const [pulseKey, setPulseKey] = useState(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setNodeRef(node);
    nodeRef.current = node;
  }, [setNodeRef]);

  // Newly added item: bring it into view
  useEffect(() => {
    if (!isNew || !nodeRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodeRef.current.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
  }, [isNew]);

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : undefined,
    zIndex: isDragging ? 10 : undefined,
    boxShadow: isDragging ? '0 8px 24px -6px rgba(0,0,0,0.18)' : undefined,
  };

  const patch = async (updates: Partial<PantryItem>) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pantry/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json() as { item?: PantryItem };
      if (!res.ok) throw new Error();
      onUpdated(json.item!);
    } catch {
      toast.error('Could not update item');
    } finally {
      setLoading(false);
    }
  };

  // One tap advances along the depletion cycle: in stock → low → out → in stock
  const handleCycleStatus = () => {
    setPulseKey((k) => k + 1);
    void patch({ status: NEXT_PANTRY_STATUS[item.status] });
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/pantry/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDeleted(item.id);
    } catch {
      toast.error('Could not delete item');
    }
  };

  const style = STATUS_STYLE[item.status];
  const StatusIcon = style.Icon;
  const nextStatus = NEXT_PANTRY_STATUS[item.status];
  const isOut = item.status === 'OUT';

  return (
    <motion.div
      ref={setRefs}
      style={{ ...dragStyle, position: 'relative' }}
      layout
      initial={animateEntry ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 420, damping: 32, delay: entryDelay }}
      className="group flex items-center gap-2.5 border-b px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
    >
      {/* Flash highlight for a just-added item */}
      {isNew && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: 'var(--accent-soft)' }}
          initial={{ opacity: 0.6 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
        />
      )}

      {/* Drag handle */}
      {showHandle && (
        <button
          {...attributes}
          {...listeners}
          className="relative shrink-0 cursor-grab touch-none opacity-60 transition-opacity hover:opacity-100 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} style={{ color: 'var(--text-hint)' }} />
        </button>
      )}

      {/* Stock cycle button — icon morph + pulse ring */}
      <motion.button
        onClick={handleCycleStatus}
        disabled={loading}
        whileTap={{ scale: 0.82 }}
        aria-label={`${PANTRY_STATUS_LABEL[item.status]}. Tap to mark ${PANTRY_STATUS_LABEL[nextStatus].toLowerCase()}`}
        title={`Tap to mark ${PANTRY_STATUS_LABEL[nextStatus].toLowerCase()}`}
        className="relative flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-40"
        style={{ backgroundColor: style.soft }}
      >
        {pulseKey > 0 && (
          <motion.span
            key={pulseKey}
            aria-hidden
            className="absolute inset-0 rounded-full border-2"
            style={{ borderColor: style.color }}
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.7, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        )}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={item.status}
            initial={{ scale: 0.4, rotate: -50, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            exit={{ scale: 0.4, rotate: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
            className="flex"
          >
            <StatusIcon size={16} style={{ color: style.color }} />
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* Content */}
      <div className="relative min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span
            className="relative text-sm font-medium transition-colors duration-300"
            style={{ color: isOut ? 'var(--text-muted)' : 'var(--text)' }}
          >
            {item.name}
            {/* Strike-through draws itself across when the item runs out */}
            <motion.span
              aria-hidden
              className="absolute left-0 top-1/2 h-[1.5px] -translate-y-1/2 rounded-full"
              style={{ backgroundColor: 'var(--text-muted)' }}
              initial={false}
              animate={{ width: isOut ? '100%' : '0%' }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
            />
          </span>
          {(item.quantity || item.unit) && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
            </span>
          )}
          {item.category && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <span className="size-1 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
              {item.category}
            </span>
          )}
          <AnimatePresence mode="popLayout" initial={false}>
            {style.badge && (
              <motion.span
                key={item.status}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7 }}
                transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ backgroundColor: style.soft, color: style.color }}
              >
                {style.badge}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        {item.note && (
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-hint)' }}>{item.note}</p>
        )}
      </div>

      {/* Actions */}
      <div className="relative flex shrink-0 items-center gap-0.5">
        <EditPantryItemDialog
          key={new Date(item.updatedAt).getTime()}
          item={item}
          onUpdated={onUpdated}
        />
        <motion.button
          onClick={handleDelete}
          aria-label="Delete item"
          whileTap={{ scale: 0.85 }}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-red-500/10"
        >
          <Trash2 size={13} style={{ color: 'var(--error)' }} />
        </motion.button>
      </div>
    </motion.div>
  );
}
