'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, PackageOpen, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import type { PantryItem } from '@/db/schema';
import { EditPantryItemDialog } from './edit-pantry-item-dialog';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PantryItemRowProps {
  item: PantryItem;
  onUpdated: (item: PantryItem) => void;
  onDeleted: (id: string) => void;
  showHandle: boolean;
}

export function PantryItemRow({ item, onUpdated, onDeleted, showHandle }: PantryItemRowProps) {
  const [loading, setLoading] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
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

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/pantry/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDeleted(item.id);
      toast.success(`${item.name} removed`);
    } catch {
      toast.error('Could not delete item');
    }
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, borderBottom: '1px solid var(--border)' }}
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ layout: { duration: 0.2 }, opacity: { duration: 0.15 } }}
      className="flex items-center gap-2.5 px-3 py-2.5"
    >
      {/* Drag handle */}
      {showHandle && (
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical size={14} style={{ color: 'var(--text-hint)' }} />
        </button>
      )}

      {/* Out toggle */}
      <motion.button
        onClick={() => void patch({ isOut: !item.isOut })}
        disabled={loading}
        whileTap={{ scale: 0.88 }}
        aria-label={item.isOut ? 'Mark as in stock' : 'Mark as out'}
        className="shrink-0 transition-opacity disabled:opacity-40"
        title={item.isOut ? 'Mark as in stock' : 'Mark as out'}
      >
        {item.isOut ? (
          <PackageOpen size={18} style={{ color: 'var(--error, #ef4444)' }} />
        ) : (
          <Package size={18} style={{ color: 'var(--accent)' }} />
        )}
      </motion.button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className="text-sm font-medium"
            style={{
              color: item.isOut ? 'var(--text-muted)' : 'var(--text)',
              textDecoration: item.isOut ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </span>
          {(item.quantity || item.unit) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
            </span>
          )}
          {item.category && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {item.category}
            </span>
          )}
          {item.isOut && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--error, #ef4444)' }}
            >
              out
            </span>
          )}
        </div>
        {item.note && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-hint)' }}>{item.note}</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <EditPantryItemDialog
          key={new Date(item.updatedAt).getTime()}
          item={item}
          onUpdated={onUpdated}
        />
        <motion.button
          onClick={handleDelete}
          aria-label="Delete item"
          whileTap={{ scale: 0.9 }}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-red-50"
        >
          <Trash2 size={13} style={{ color: 'var(--error)' }} />
        </motion.button>
      </div>
    </motion.div>
  );
}
