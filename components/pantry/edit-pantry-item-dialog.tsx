'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
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
import { updatePantryItemSchema, type UpdatePantryItemInput } from '@/lib/schemas/pantry';
import { ITEM_CATEGORIES } from '@/lib/categories';

interface EditPantryItemDialogProps {
  item: PantryItem;
  onUpdated: (item: PantryItem) => void;
}

export function EditPantryItemDialog({ item, onUpdated }: EditPantryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePantryItemInput>({
    resolver: zodResolver(updatePantryItemSchema),
    defaultValues: {
      name: item.name,
      quantity: item.quantity ?? '',
      unit: item.unit ?? '',
      note: item.note ?? '',
      category: (item.category as UpdatePantryItemInput['category']) ?? undefined,
    },
  });

  const onSubmit = async (data: UpdatePantryItemInput) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pantry/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          quantity: data.quantity?.trim() || null,
          unit: data.unit?.trim() || null,
          note: data.note?.trim() || null,
          category: data.category?.trim() || null,
        }),
      });
      const json = (await res.json()) as { item?: PantryItem };
      if (!res.ok) throw new Error();
      onUpdated(json.item!);
      setOpen(false);
      toast.success('Item updated');
    } catch {
      toast.error('Could not update item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Edit pantry item"
        className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
      >
        <Pencil size={13} style={{ color: 'var(--text-hint)' }} />
      </DialogTrigger>
      <DialogContent style={{ backgroundColor: 'var(--surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Edit pantry item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Name</Label>
            <Input
              {...register('name')}
              autoFocus
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
            className="w-full rounded-xl py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? 'Saving…' : 'Save'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
