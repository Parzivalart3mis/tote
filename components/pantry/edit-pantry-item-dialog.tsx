'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Pencil, Check, Loader2, ChevronDown } from 'lucide-react';
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

const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--bg)' } as const;
const inputFocusClass = 'transition-shadow focus:shadow-[0_0_0_3px_var(--accent-soft)]';

export function EditPantryItemDialog({ item, onUpdated }: EditPantryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      toast.success('Item updated');
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 450);
    } catch {
      toast.error('Could not update item');
    } finally {
      setLoading(false);
    }
  };

  const buttonState = success ? 'success' : loading ? 'loading' : 'idle';

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSuccess(false); }}>
      <DialogTrigger
        aria-label="Edit pantry item"
        className="flex size-7 items-center justify-center rounded-lg transition-all hover:scale-110 hover:bg-black/5 active:scale-90 dark:hover:bg-white/5"
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
              className={inputFocusClass}
              style={inputStyle}
            />
            <AnimatePresence>
              {errors.name && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-xs"
                  style={{ color: 'var(--error)' }}
                >
                  {errors.name.message}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 space-y-1.5">
              <Label style={{ color: 'var(--text-muted)' }}>Quantity</Label>
              <Input
                {...register('quantity')}
                placeholder="2"
                className={inputFocusClass}
                style={inputStyle}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <Label style={{ color: 'var(--text-muted)' }}>Unit</Label>
              <Input
                {...register('unit')}
                placeholder="bottles"
                className={inputFocusClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Category (optional)</Label>
            <div className="relative">
              <select
                {...register('category', { setValueAs: (v: string) => v || undefined })}
                className={`w-full appearance-none rounded-xl border px-3 py-2 pr-8 text-sm outline-none ${inputFocusClass}`}
                style={{ ...inputStyle, color: 'var(--text)' }}
              >
                <option value="">— None —</option>
                {ITEM_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-hint)' }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Note (optional)</Label>
            <Input
              {...register('note')}
              placeholder="Any note…"
              className={inputFocusClass}
              style={inputStyle}
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading || success}
            whileTap={{ scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium text-white transition-colors disabled:opacity-90"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {buttonState === 'success' ? (
                <motion.span
                  key="success"
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                  className="flex items-center gap-1.5"
                >
                  <Check size={15} strokeWidth={3} />
                  Saved
                </motion.span>
              ) : buttonState === 'loading' ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Save
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
