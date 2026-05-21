'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { InitialsTile } from '@/components/initials-tile';
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

interface StoreCardProps {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  uncheckedCount: number;
  index: number;
  onDeleted: (id: string) => void;
}

export function StoreCard({ id, name, coverImageUrl, uncheckedCount, index, onDeleted }: StoreCardProps) {
  const [imgError, setImgError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const proxyUrl = coverImageUrl
    ? `/api/img?u=${encodeURIComponent(coverImageUrl)}`
    : null;
  const showImage = proxyUrl && !imgError;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      onDeleted(id);
      toast.success(`${name} deleted`);
    } catch {
      toast.error('Could not delete store');
      setDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-md"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {/* Cover image — the clickable link area */}
        <Link href={`/stores/${id}`} className="block">
          <div
            className="aspect-[3/2] w-full p-2"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <div className="relative size-full overflow-hidden rounded-lg">
              {showImage ? (
                <Image
                  src={proxyUrl}
                  alt={name}
                  fill
                  unoptimized
                  className="object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <InitialsTile name={name} className="size-full" />
              )}
            </div>
          </div>
        </Link>

        {/* Card footer */}
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <Link href={`/stores/${id}`} className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
              {name}
            </span>
          </Link>
          <div className="ml-1.5 flex shrink-0 items-center gap-1.5">
            {uncheckedCount > 0 && (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {uncheckedCount}
              </span>
            )}
            <AlertDialog>
              <AlertDialogTrigger
                disabled={deleting}
                aria-label={`Delete ${name}`}
                className="flex size-6 items-center justify-center rounded-md transition-colors hover:bg-red-50"
              >
                <Trash2 size={12} style={{ color: 'var(--error)' }} />
              </AlertDialogTrigger>
              <AlertDialogContent style={{ backgroundColor: 'var(--surface)' }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                  <AlertDialogDescription style={{ color: 'var(--text-muted)' }}>
                    This will permanently delete the store and all its items. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDelete()}
                    style={{ backgroundColor: 'var(--error)', color: '#fff' }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
