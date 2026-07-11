'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import type { PantryItem } from '@/db/schema';
import { createPantryItemSchema, type CreatePantryItemInput } from '@/lib/schemas/pantry';
import { ITEM_CATEGORIES } from '@/lib/categories';

interface AddPantryItemDialogProps {
  onAdded: (item: PantryItem) => void;
}

export function AddPantryItemDialog({ onAdded }: AddPantryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePantryItemInput>({
    resolver: zodResolver(createPantryItemSchema),
    defaultValues: { name: '', quantity: '', unit: '', note: '', category: undefined },
  });

  const onSubmit = async (data: CreatePantryItemInput) => {
    setLoading(true);
    try {
      const res = await fetch('/api/pantry/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          quantity: data.quantity?.trim() || undefined,
          unit: data.unit?.trim() || undefined,
          note: data.note?.trim() || undefined,
          category: data.category || undefined,
        }),
      });
      const json = (await res.json()) as { item?: PantryItem };
      if (!res.ok) throw new Error();
      onAdded(json.item!);
      reset();
      setOpen(false);
      toast.success(`${data.name} added to pantry`);
    } catch {
      toast.error('Could not add item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ color: 'var(--accent)' }}
        aria-label="Add pantry item"
      >
        <Plus size={20} />
      </DialogTrigger>

      <DialogContent style={{ backgroundColor: 'var(--surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Add pantry item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Name</Label>
            <Input
              {...register('name')}
              placeholder="e.g. Olive oil"
              autoFocus
              autoComplete="off"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>{errors.name.message}</p>
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label style={{ color: 'var(--text-muted)' }}>Quantity</Label>
              <Input
                {...register('quantity')}
                placeholder="2"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label style={{ color: 'var(--text-muted)' }}>Unit</Label>
              <Input
                {...register('unit')}
                placeholder="bottles"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Category (optional)</Label>
            <select
              {...register('category', { setValueAs: (v: string) => v || undefined })}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
            >
              <option value="">— None —</option>
              {ITEM_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Note (optional)</Label>
            <Input
              {...register('note')}
              placeholder="Any note…"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? 'Adding…' : 'Add to pantry'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
