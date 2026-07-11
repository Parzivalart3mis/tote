'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Plus, Check, Loader2, ChevronDown, Sparkles } from 'lucide-react';
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
  /** 'icon' — compact round button for the header; 'cta' — inviting pill for the empty state */
  variant?: 'icon' | 'cta';
}

const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--bg)' } as const;
const inputFocusClass = 'transition-shadow focus:shadow-[0_0_0_3px_var(--accent-soft)]';

export function AddPantryItemDialog({ onAdded, variant = 'icon' }: AddPantryItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
      setSuccess(true);
      toast.success(`${data.name} added to pantry`);
      // Let the checkmark land before closing
      setTimeout(() => {
        reset();
        setOpen(false);
        setSuccess(false);
      }, 550);
    } catch {
      toast.error('Could not add item');
    } finally {
      setLoading(false);
    }
  };

  const buttonState = success ? 'success' : loading ? 'loading' : 'idle';

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setSuccess(false); } }}>
      {variant === 'cta' ? (
        <DialogTrigger
          className="group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-150 hover:scale-[1.03] active:scale-95"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 8px 20px -6px rgba(22,163,74,0.45)' }}
          aria-label="Add your first pantry item"
        >
          <Sparkles size={15} className="transition-transform duration-300 group-hover:rotate-12" />
          Add your first item
        </DialogTrigger>
      ) : (
        <DialogTrigger
          className="group flex size-8 items-center justify-center rounded-full text-white shadow-md transition-transform duration-150 hover:scale-105 active:scale-90"
          style={{ backgroundColor: 'var(--accent)', boxShadow: '0 4px 12px -3px rgba(22,163,74,0.4)' }}
          aria-label="Add pantry item"
        >
          <Plus size={17} strokeWidth={2.5} className="transition-transform duration-200 group-hover:rotate-90" />
        </DialogTrigger>
      )}

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
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-90"
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
                  <Check size={16} strokeWidth={3} />
                  Added
                </motion.span>
              ) : buttonState === 'loading' ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Loader2 size={15} className="animate-spin" />
                  Adding…
                </motion.span>
              ) : (
                <motion.span
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Add to pantry
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
