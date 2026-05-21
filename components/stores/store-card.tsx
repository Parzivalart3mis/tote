'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { InitialsTile } from '@/components/initials-tile';

interface StoreCardProps {
  id: string;
  name: string;
  coverImageUrl?: string | null;
  uncheckedCount: number;
  index: number;
}

export function StoreCard({ id, name, coverImageUrl, uncheckedCount, index }: StoreCardProps) {
  const [imgError, setImgError] = useState(false);
  const proxyUrl = coverImageUrl
    ? `/api/img?u=${encodeURIComponent(coverImageUrl)}`
    : null;
  const showImage = proxyUrl && !imgError;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link href={`/stores/${id}`} className="group block">
        <div
          className="overflow-hidden rounded-xl shadow-sm transition-shadow group-hover:shadow-md"
          style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* Cover image / initials tile */}
          <div
            className="relative aspect-[3/2] w-full overflow-hidden"
            style={{ backgroundColor: 'var(--surface)' }}
          >
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
          {/* Card footer */}
          <div className="flex items-center justify-between px-2.5 py-2">
            <span className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
              {name}
            </span>
            {uncheckedCount > 0 && (
              <span
                className="ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {uncheckedCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
