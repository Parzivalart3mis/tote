import { describe, it, expect } from 'vitest';
import { normalizeName, planPantryToStore, findRestockCandidate } from '@/lib/pantry-to-store';
import type { PantryItem, Item } from '@/db/schema';

type Src = Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'category'>;
type Existing = Pick<Item, 'id' | 'name' | 'onList'>;

const src = (name: string, extra: Partial<Src> = {}): Src => ({
  name, quantity: null, unit: null, category: null, ...extra,
});
const store = (id: string, name: string, onList = false): Existing => ({ id, name, onList });

describe('normalizeName', () => {
  it('lowercases, trims, and collapses internal whitespace', () => {
    expect(normalizeName('  Basmati   Rice ')).toBe('basmati rice');
    expect(normalizeName('ONION')).toBe('onion');
  });

  it('treats case/space variants as equal', () => {
    expect(normalizeName('Toor Dal')).toBe(normalizeName('toor  dal'));
  });
});

describe('planPantryToStore', () => {
  it('creates a store item when no match exists', () => {
    const plan = planPantryToStore([src('Rice')], []);
    expect(plan.added).toBe(1);
    expect(plan.reused).toBe(0);
    expect(plan.entries[0]).toMatchObject({ kind: 'create' });
  });

  it('reuses an existing store item, matching case-insensitively', () => {
    const plan = planPantryToStore([src('Onion')], [store('s1', 'onion')]);
    expect(plan.reused).toBe(1);
    expect(plan.added).toBe(0);
    expect(plan.entries[0]).toMatchObject({ kind: 'reuse', itemId: 's1', alreadyOnList: false });
  });

  it('flags whether the reused item was already on the list', () => {
    const plan = planPantryToStore([src('Salt')], [store('s1', 'Salt', true)]);
    expect(plan.entries[0]).toMatchObject({ kind: 'reuse', alreadyOnList: true });
  });

  it('carries pantry metadata onto created items', () => {
    const plan = planPantryToStore(
      [src('Rice', { quantity: '2', unit: 'kg', category: 'Snacks' })],
      []
    );
    const entry = plan.entries[0];
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('create');
    if (entry!.kind === 'create') {
      expect(entry!.source).toEqual({ name: 'Rice', quantity: '2', unit: 'kg', category: 'Snacks' });
    }
  });

  it('deduplicates two same-named pantry items within one request', () => {
    const plan = planPantryToStore([src('Rice'), src('  rice ')], []);
    expect(plan.entries).toHaveLength(1);
    expect(plan.added).toBe(1);
  });

  it('handles a mix of reuse and create, preserving counts', () => {
    const plan = planPantryToStore(
      [src('Onion'), src('Rice'), src('Sugar')],
      [store('s1', 'onion'), store('s2', 'SUGAR', true)]
    );
    expect(plan.added).toBe(1);   // Rice
    expect(plan.reused).toBe(2);  // Onion + Sugar
    const kinds = plan.entries.map((e) => e.kind);
    expect(kinds.sort()).toEqual(['create', 'reuse', 'reuse']);
  });

  it('matches names that differ only by internal spacing', () => {
    const plan = planPantryToStore([src('Toor Dal')], [store('s1', 'Toor  Dal')]);
    expect(plan.entries[0]).toMatchObject({ kind: 'reuse', itemId: 's1' });
  });

  it('treats distinct names as separate (Rice vs Basmati Rice)', () => {
    const plan = planPantryToStore([src('Rice')], [store('s1', 'Basmati Rice')]);
    expect(plan.entries[0]).toMatchObject({ kind: 'create' });
  });

  it('returns empty plan for empty input', () => {
    const plan = planPantryToStore([], [store('s1', 'Onion')]);
    expect(plan).toEqual({ entries: [], added: 0, reused: 0 });
  });
});

describe('findRestockCandidate (store → pantry)', () => {
  const cand = (id: string, name: string, status: string) => ({ id, name, status });

  it('matches an OUT pantry item by name', () => {
    const got = findRestockCandidate('Onion', [cand('p1', 'Onion', 'OUT')]);
    expect(got?.id).toBe('p1');
  });

  it('matches a LOW pantry item by name', () => {
    const got = findRestockCandidate('Sugar', [cand('p1', 'Sugar', 'LOW')]);
    expect(got?.id).toBe('p1');
  });

  it('matches a BUY pantry item by name', () => {
    const got = findRestockCandidate('Rice', [cand('p1', 'Rice', 'BUY')]);
    expect(got?.id).toBe('p1');
  });

  it('does NOT match an in-stock pantry item', () => {
    expect(findRestockCandidate('Rice', [cand('p1', 'Rice', 'IN_STOCK')])).toBeNull();
  });

  it('matches case- and spacing-insensitively', () => {
    const got = findRestockCandidate('  toor   DAL ', [cand('p1', 'Toor Dal', 'OUT')]);
    expect(got?.id).toBe('p1');
  });

  it('returns null when no pantry item shares the name', () => {
    expect(findRestockCandidate('Milk', [cand('p1', 'Onion', 'OUT')])).toBeNull();
  });

  it('returns null for an empty candidate list', () => {
    expect(findRestockCandidate('Onion', [])).toBeNull();
  });

  it('picks the low/out match even if an in-stock item shares the name', () => {
    const got = findRestockCandidate('Rice', [
      cand('p1', 'Rice', 'IN_STOCK'),
      cand('p2', 'rice', 'OUT'),
    ]);
    expect(got?.id).toBe('p2');
  });
});
