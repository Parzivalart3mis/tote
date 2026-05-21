'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/db/schema';
import { EditItemDialog } from './edit-item-dialog';

interface ItemRowProps {
  item: Item;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
}

export function ItemRow({ item, onUpdated, onDeleted }: ItemRowProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const patch = async (updates: Partial<Item>) => {
    const key = Object.keys(updates)[0] ?? 'update';
    setLoading(key);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json() as { item?: Item };
      if (!res.ok) throw new Error();
      onUpdated(json.item!);
    } catch {
      toast.error('Could not update item');
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/items/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDeleted(item.id);
    } catch {
      toast.error('Could not delete item');
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: item.checked ? 0.45 : 1, x: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ layout: { duration: 0.2 }, opacity: { duration: 0.2 } }}
      className="flex items-start gap-2.5 px-3 py-2"
      style={{
        borderBottom: '1px solid var(--border)',
        backgroundColor: item.favorite
          ? 'rgba(251,191,36,0.06)'
          : item.runningLow
          ? 'rgba(249,115,22,0.04)'
          : 'transparent',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={() => patch({ checked: !item.checked })}
        disabled={loading === 'checked'}
        aria-label={item.checked ? 'Uncheck item' : 'Check item'}
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
        style={{
          borderColor: item.checked ? 'var(--accent)' : 'var(--border)',
          backgroundColor: item.checked ? 'var(--accent)' : 'transparent',
        }}
      >
        {item.checked && <Check size={11} color="#fff" strokeWidth={3} />}
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className="text-sm font-medium"
            style={{
              color: 'var(--text)',
              textDecoration: item.checked ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </span>
          {(item.quantity || item.unit) && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {[item.quantity, item.unit].filter(Boolean).join(' ')}
            </span>
          )}
          {item.runningLow && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: 'rgba(249,115,22,0.15)', color: 'var(--warning)' }}
            >
              low
            </span>
          )}
        </div>
        {item.note && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-hint)' }}>
            {item.note}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <motion.button
          onClick={() => patch({ favorite: !item.favorite })}
          aria-label={item.favorite ? 'Remove favorite' : 'Mark favorite'}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: item.favorite ? [1, 1.1, 1] : 1 }}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
        >
          <Star
            size={14}
            fill={item.favorite ? 'var(--highlight)' : 'none'}
            style={{ color: item.favorite ? 'var(--highlight)' : 'var(--text-hint)' }}
          />
        </motion.button>
        <motion.button
          onClick={() => patch({ runningLow: !item.runningLow })}
          aria-label={item.runningLow ? 'Clear running low' : 'Mark running low'}
          whileTap={{ scale: 0.9 }}
          animate={{ scale: item.runningLow ? [1, 1.1, 1] : 1 }}
          className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
        >
          <AlertTriangle
            size={14}
            fill={item.runningLow ? 'var(--warning)' : 'none'}
            style={{ color: item.runningLow ? 'var(--warning)' : 'var(--text-hint)' }}
          />
        </motion.button>
        <EditItemDialog item={item} onUpdated={onUpdated} onDeleted={onDeleted} />
      </div>
    </motion.div>
  );
}
