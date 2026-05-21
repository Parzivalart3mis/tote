'use client';

import { useState } from 'react';
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

const addSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  price: z.string().max(20).optional(),
  priceUnit: z.enum(['lb', 'oz', 'piece']).optional(),
});

type AddForm = z.infer<typeof addSchema>;

interface AddItemDialogProps {
  storeId: string;
  disabled?: boolean;
  onAdded: (item: Item) => void;
}

export function AddItemDialog({ storeId, disabled, onAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { name: '', price: '', priceUnit: 'piece' },
  });

  const priceValue = watch('price');
  const showPriceUnit = !!priceValue?.trim();

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
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
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
          {/* Name */}
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Name</Label>
            <Input
              {...register('name')}
              placeholder="e.g. Whole milk"
              autoFocus
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {errors.name.message}
              </p>
            )}
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
