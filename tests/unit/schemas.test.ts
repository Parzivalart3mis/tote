import { describe, it, expect } from 'vitest';
import { createStoreSchema, updateStoreSchema } from '@/lib/schemas/store';
import { createItemSchema, updateItemSchema } from '@/lib/schemas/item';

describe('createStoreSchema', () => {
  it('accepts valid name', () => {
    const r = createStoreSchema.safeParse({ name: "Trader Joe's" });
    expect(r.success).toBe(true);
  });

  it('rejects missing name', () => {
    const r = createStoreSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejects name over 120 chars', () => {
    const r = createStoreSchema.safeParse({ name: 'A'.repeat(121) });
    expect(r.success).toBe(false);
  });

  it('accepts valid http coverImageUrl', () => {
    const r = createStoreSchema.safeParse({ name: 'Test', coverImageUrl: 'https://example.com/img.jpg' });
    expect(r.success).toBe(true);
  });

  it('rejects non-http coverImageUrl', () => {
    const r = createStoreSchema.safeParse({ name: 'Test', coverImageUrl: 'ftp://example.com/img.jpg' });
    expect(r.success).toBe(false);
  });

  it('accepts empty coverImageUrl', () => {
    const r = createStoreSchema.safeParse({ name: 'Test', coverImageUrl: '' });
    expect(r.success).toBe(true);
  });
});

describe('createItemSchema', () => {
  it('accepts minimal item', () => {
    const r = createItemSchema.safeParse({ name: 'Milk' });
    expect(r.success).toBe(true);
  });

  it('accepts full item', () => {
    const r = createItemSchema.safeParse({ name: 'Milk', quantity: '2', unit: 'liters', note: 'whole milk' });
    expect(r.success).toBe(true);
  });

  it('rejects empty name', () => {
    const r = createItemSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejects unit over 20 chars', () => {
    const r = createItemSchema.safeParse({ name: 'Milk', unit: 'x'.repeat(21) });
    expect(r.success).toBe(false);
  });

  it('rejects note over 500 chars', () => {
    const r = createItemSchema.safeParse({ name: 'Milk', note: 'x'.repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe('updateItemSchema', () => {
  it('accepts partial updates', () => {
    const r = updateItemSchema.safeParse({ checked: true });
    expect(r.success).toBe(true);
  });

  it('accepts all fields', () => {
    const r = updateItemSchema.safeParse({
      name: 'New name',
      checked: false,
      favorite: true,
      runningLow: false,
      position: 3,
    });
    expect(r.success).toBe(true);
  });

  it('rejects extra fields', () => {
    const r = updateItemSchema.safeParse({ name: 'ok', unknownField: true });
    expect(r.success).toBe(false);
  });
});
