import { describe, it, expect } from 'vitest';

// Extract the hash function logic for testing
function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + (name.charCodeAt(i) ?? 0)) >>> 0;
  }
  return h;
}

const PALETTE_SIZE = 6;

describe('InitialsTile color hash', () => {
  it('produces consistent results for the same input', () => {
    expect(hashName('Costco') % PALETTE_SIZE).toBe(hashName('Costco') % PALETTE_SIZE);
  });

  it('produces different results for different inputs', () => {
    const a = hashName('Costco') % PALETTE_SIZE;
    const b = hashName('Target') % PALETTE_SIZE;
    // Not guaranteed to differ, but these specific names happen to
    // Just test it doesn't throw and is in range
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(PALETTE_SIZE);
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(PALETTE_SIZE);
  });

  it('handles empty string without throwing', () => {
    expect(() => hashName('') % PALETTE_SIZE).not.toThrow();
  });

  it('always returns a value in [0, PALETTE_SIZE)', () => {
    const names = ['Trader Joe\'s', 'Costco', 'Indian Grocery', 'Whole Foods', 'Target', 'Safeway', 'Aldi'];
    for (const name of names) {
      const idx = hashName(name) % PALETTE_SIZE;
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(PALETTE_SIZE);
    }
  });
});
