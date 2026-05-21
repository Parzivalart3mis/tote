'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createStoreSchema, type CreateStoreInput } from '@/lib/schemas/store';
import { StoreCard } from './store-card';

interface AddStoreSheetProps {
  onAdded: (store: { id: string; name: string; coverImageUrl: string | null }) => void;
}

export function AddStoreSheet({ onAdded }: AddStoreSheetProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
  });

  const watchName = watch('name', '');
  const watchUrl = watch('coverImageUrl', '');

  const onSubmit = async (data: CreateStoreInput) => {
    setLoading(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as {
        store?: { id: string; name: string; coverImageUrl: string | null };
      };
      if (!res.ok) throw new Error('Failed to create store');
      onAdded(json.store!);
      reset();
      setPreviewUrl('');
      setOpen(false);
      toast.success(`${data.name} added`);
    } catch {
      toast.error('Could not add store');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors"
        style={{ backgroundColor: 'var(--accent)' }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--accent)')
        }
      >
        <Plus size={16} />
        Add store
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl"
        style={{ backgroundColor: 'var(--surface)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <SheetHeader className="mb-4">
          <SheetTitle style={{ color: 'var(--text)' }}>Add a store</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" style={{ color: 'var(--text-muted)' }}>
              Store name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Trader Joe's"
              autoFocus
              {...register('name')}
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.name && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="coverImageUrl" style={{ color: 'var(--text-muted)' }}>
              Cover image URL (optional)
            </Label>
            <Input
              id="coverImageUrl"
              placeholder="https://…"
              {...register('coverImageUrl', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  setPreviewUrl(e.target.value),
              })}
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
            {errors.coverImageUrl && (
              <p className="text-xs" style={{ color: 'var(--error)' }}>
                {errors.coverImageUrl.message}
              </p>
            )}
          </div>

          {(watchName || watchUrl) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-[180px]"
            >
              <p className="mb-2 text-xs" style={{ color: 'var(--text-hint)' }}>
                Preview
              </p>
              <StoreCard
                id="preview"
                name={watchName || 'Store'}
                coverImageUrl={watchUrl || null}
                uncheckedCount={0}
                index={0}
                onDeleted={() => undefined}
              />
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {loading ? 'Adding…' : 'Add store'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
