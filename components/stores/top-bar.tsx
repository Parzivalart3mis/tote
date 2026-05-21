'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search, RotateCcw } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export function TopBar() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  return (
    <header
      className="safe-top safe-x sticky top-0 z-40 border-b"
      style={{
        backgroundColor: 'var(--bg)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="flex h-11 items-center justify-between px-4">
        <Link href="/stores" className="flex items-center gap-2">
          <Image src="/icons/icon-192.png" alt="Tote" width={28} height={28} className="rounded-md" />
          <span className="text-lg font-semibold" style={{ color: 'var(--text)' }}>
            Tote
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => router.refresh()}
            aria-label="Refresh"
            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <RotateCcw size={17} style={{ color: 'var(--text-muted)' }} />
          </button>
          <Link
            href="/search"
            aria-label="Search"
            className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/5"
          >
            <Search size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
          <UserButton />
        </div>
      </div>
    </header>
  );
}
