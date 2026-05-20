'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Store, Item } from '@/db/schema';

type SearchResult = {
  store: Store;
  items: Item[];
};

export function SearchView() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<{ results: SearchResult[] }>)
      .then((data) => {
        setResults(data.results ?? []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
    return () => controller.abort();
  }, [q]);

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Search bar */}
      <div
        className="safe-top flex items-center gap-3 border-b px-4 py-3"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="shrink-0"
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-muted)' }} />
        </button>
        <div
          className="flex flex-1 items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--bg)' }}
        >
          <Search size={16} style={{ color: 'var(--text-hint)' }} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stores and items…"
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text)' }}
            aria-label="Search"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search">
              <X size={14} style={{ color: 'var(--text-hint)' }} />
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex justify-center pt-8">
            <div
              className="size-5 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--accent)' }}
            />
          </div>
        )}

        {!loading && q.trim() && results.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              No results for &ldquo;{q}&rdquo;
            </p>
          </div>
        )}

        <AnimatePresence>
          {results.map(({ store, items }) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Link
                href={`/stores/${store.id}`}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="font-semibold text-sm" style={{ color: 'var(--text)' }}>
                  {store.name}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-hint)' }}>
                  {items.length} match{items.length !== 1 ? 'es' : ''}
                </span>
              </Link>
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/stores/${store.id}`}
                  className="flex items-center gap-3 px-8 py-2.5"
                  style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}
                >
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text)', opacity: item.checked ? 0.5 : 1 }}>
                      {item.name}
                    </p>
                    {item.note && (
                      <p className="text-xs" style={{ color: 'var(--text-hint)' }}>{item.note}</p>
                    )}
                  </div>
                </Link>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
