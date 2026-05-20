'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateStoreSchema, type UpdateStoreInput } from '@/lib/schemas/store';

interface EditStoreDialogProps {
  store: { id: string; name: string; coverImageUrl?: string | null };
  onUpdated: (store: { id: string; name: string; coverImageUrl: string | null }) => void;
  onDeleted: (id: string) => void;
}

export function EditStoreDialog({ store, onUpdated, onDeleted }: EditStoreDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateStoreInput>({
    resolver: zodResolver(updateStoreSchema),
    defaultValues: {
      name: store.name,
      coverImageUrl: store.coverImageUrl ?? '',
    },
  });

  const onSubmit = async (data: UpdateStoreInput) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as {
        store?: { id: string; name: string; coverImageUrl: string | null };
      };
      if (!res.ok) throw new Error();
      onUpdated(json.store!);
      setOpen(false);
      toast.success('Store updated');
    } catch {
      toast.error('Could not update store');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/stores/${store.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDeleted(store.id);
      toast.success('Store deleted');
    } catch {
      toast.error('Could not delete store');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label="Edit store"
        className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-black/10"
      >
        <Pencil size={15} style={{ color: 'var(--text-muted)' }} />
      </DialogTrigger>
      <DialogContent style={{ backgroundColor: 'var(--surface)' }}>
        <DialogHeader>
          <DialogTitle style={{ color: 'var(--text)' }}>Edit store</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label style={{ color: 'var(--text-muted)' }}>Store name</Label>
            <Input
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
            <Label style={{ color: 'var(--text-muted)' }}>Cover image URL</Label>
            <Input
              {...register('coverImageUrl')}
              placeholder="https://…"
              style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              {loading ? 'Saving…' : 'Save'}
            </button>
            <AlertDialog>
              <AlertDialogTrigger
                className="rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-red-50"
                style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
              >
                <Trash2 size={16} />
              </AlertDialogTrigger>
              <AlertDialogContent style={{ backgroundColor: 'var(--surface)' }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete store?</AlertDialogTitle>
                  <AlertDialogDescription style={{ color: 'var(--text-muted)' }}>
                    This will delete {store.name} and all its items. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    style={{ backgroundColor: 'var(--error)', color: '#fff' }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
