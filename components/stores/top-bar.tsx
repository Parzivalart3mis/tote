'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ShoppingCart, Package } from 'lucide-react';

import { UserButton } from '@clerk/nextjs';
import { useEffect } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';

export function TopBar() {
  const router = useRouter();
  const pathname = usePathname();

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

  const isPantry = pathname.startsWith('/pantry');
  const isStores = !isPantry;

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

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 rounded-xl p-0.5" style={{ backgroundColor: 'var(--surface)' }}>
          <Link
            href="/stores"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
            style={
              isStores
                ? { backgroundColor: 'var(--accent)', color: 'white' }
                : { color: 'var(--text-muted)' }
            }
          >
            <ShoppingCart size={12} />
            Stores
          </Link>
          <Link
            href="/pantry"
            className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium transition-colors"
            style={
              isPantry
                ? { backgroundColor: 'var(--accent)', color: 'white' }
                : { color: 'var(--text-muted)' }
            }
          >
            <Package size={12} />
            Pantry
          </Link>
        </nav>

        <div className="flex items-center gap-1">
          <ThemeToggle />
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
