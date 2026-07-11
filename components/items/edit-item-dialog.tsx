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
import { Textarea } from '@/components/ui/textarea';
import type { Item } from '@/db/schema';
import { updateItemSchema, type UpdateItemInput } from '@/lib/schemas/item';
import { ITEM_CATEGORIES } from '@/lib/categories';

interface EditItemDialogProps {
  item: Item;
  onUpdated: (item: Item) => void;
  onDeleted: (id: string) => void;
}

export function EditItemDialog({ item, onUpdated }: EditItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdateItemInput>({
    resolver: zodResolver(updateItemSchema),
    defaultValues: {
      name: item.name,
      quantity: item.quantity ?? '',
      unit: item.unit ?? '',
      note: item.note ?? '',
      price: item.price ?? '',
      priceUnit: (item.priceUnit as 'lb' | 'oz' | 'piece' | undefined) ?? 'piece',
      category: item.category ?? '',
    },
  });

  const priceValue = watch('price');
  const showPriceUnit = !!priceValue?.trim();

  const onSubmit = async (data: UpdateItemInput) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          price: data.price?.trim() || null,
          priceUnit: data.price?.trim() ? (data.priceUnit ?? 'piece') : null,
          category: data.category?.trim() || null,
        }),
      });
      const json = (await res.json()) as { item?: Item };
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
        aria-label="Edit item"
        className="flex size-7 items-center justify-center rounded-lg transition-colors hover:bg-black/5"
      >
        <Pencil size={13} style={{ color: 'var(--text-hint)' }} />
      </DialogTrigger>
      <DialogContent style={{ backgroundColor: 'var(--surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Edit item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          {/* Name */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Name</Label>
            <Input
              {...register('name')}
              autoFocus
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Quantity + Unit */}
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
                placeholder="lbs"
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
              />
            </div>
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

          {/* Note */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Note</Label>
            <Textarea
              {...register('note')}
              rows={2}
              placeholder="Any note…"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
          </div>

          {/* Category */}
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
