'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Item } from '@/db/schema';
import { ITEM_CATEGORIES } from '@/lib/categories';

const addSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  price: z.string().max(20).optional(),
  priceUnit: z.enum(['lb', 'oz', 'piece']).optional(),
  category: z.string().optional(),
});

type AddForm = z.infer<typeof addSchema>;

type Suggestion = {
  name: string;
  quantity: string | null;
  unit: string | null;
  price: string | null;
  priceUnit: string | null;
  category: string | null;
};

interface AddItemDialogProps {
  storeId: string;
  disabled?: boolean;
  onAdded: (item: Item) => void;
}

export function AddItemDialog({ storeId, disabled, onAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '', price: '', priceUnit: 'piece', category: '' },
  });

  const nameValue = watch('name');
  const priceValue = watch('price');
  const showPriceUnit = !!priceValue?.trim();

  useEffect(() => {
    if (suggestDebounce.current) clearTimeout(suggestDebounce.current);
    if (!nameValue?.trim() || nameValue.length < 1) {
      setSuggestions([]);
      return;
    }
    suggestDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/items/suggestions?q=${encodeURIComponent(nameValue)}`);
        const json = await res.json() as { suggestions?: Suggestion[] };
        setSuggestions(json.suggestions ?? []);
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 200);
  }, [nameValue]);

  const applySuggestion = (s: Suggestion) => {
    setValue('name', s.name);
    setValue('price', s.price ?? '');
    setValue('priceUnit', (s.priceUnit as 'lb' | 'oz' | 'piece' | undefined) ?? 'piece');
    setValue('category', s.category ?? '');
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const onSubmit = async (data: AddForm) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${storeId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          price: data.price?.trim() || undefined,
          priceUnit: data.price?.trim() ? (data.priceUnit ?? 'piece') : undefined,
          category: data.category?.trim() || undefined,
        }),
      });
      const json = (await res.json()) as { item?: Item };
      if (!res.ok) throw new Error();
      onAdded(json.item!);
      reset();
      setOpen(false);
      toast.success(`${data.name} added`);
    } catch {
      toast.error('Could not add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setSuggestions([]); } }}>
      <DialogTrigger
        disabled={disabled}
        className="flex items-center gap-1.5"
        style={{ color: disabled ? 'var(--text-hint)' : 'var(--accent)' }}
        aria-label="Add item"
      >
        <Plus size={15} />
        <span className="text-sm font-medium">Add item</span>
      </DialogTrigger>

      <DialogContent style={{ backgroundColor: 'var(--surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Add item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Name + suggestions */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Name</Label>
            <div className="relative">
              <Input
                {...register('name')}
                placeholder="e.g. Whole milk"
                autoFocus
                autoComplete="off"
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul
                  className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border shadow-lg"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                >
                  {suggestions.map((s) => (
                    <li key={s.name}>
                      <button
                        type="button"
                        onMouseDown={() => applySuggestion(s)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-black/5"
                        style={{ color: 'var(--text)' }}
                      >
                        <span>{s.name}</span>
                        {s.price && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            ${s.price}{s.priceUnit ? `/${s.priceUnit}` : ''}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Category (optional)</Label>
            <select
              {...register('category')}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="">— None —</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Price (optional)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  $
                </span>
                <Input
                  {...register('price')}
                  placeholder="0.00"
                  inputMode="decimal"
                  className="pl-7"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
                />
              </div>
              {showPriceUnit && (
                <select
                  {...register('priceUnit')}
                  className="rounded-xl border px-3 py-2 text-sm outline-none"
                  style={{
                    borderColor: 'var(--border)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                >
                  <option value="piece">/ piece</option>
                  <option value="lb">/ lb</option>
                  <option value="oz">/ oz</option>
                </select>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? 'Adding…' : 'Add item'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
