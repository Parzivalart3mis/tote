'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import type { Item } from '@/db/schema';

interface AddItemInputProps {
  storeId: string;
  onAdded: (item: Item) => void;
}

export function AddItemInput({ storeId, onAdded }: AddItemInputProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const name = value.trim();
    if (!name) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json() as { item?: Item };
      if (!res.ok) throw new Error();
      onAdded(json.item!);
      setValue('');
      // autofocus stays in input
      inputRef.current?.focus();
    } catch {
      toast.error('Could not add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="safe-bottom safe-x border-t px-4 py-3"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div
        className="flex items-center gap-2 rounded-xl border px-3 py-2"
        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
      >
        <Plus size={16} style={{ color: 'var(--text-hint)' }} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Add an item…"
          autoFocus
          disabled={loading}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[color:var(--text-hint)]"
          style={{ color: 'var(--text)' }}
          aria-label="Add item"
        />
        {value.trim() && (
          <button
            onClick={() => void submit()}
            disabled={loading}
            aria-label="Submit item"
            className="rounded-lg px-2 py-1 text-xs font-semibold transition-colors"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
}
