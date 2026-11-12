import { describe, expect, it } from 'vitest';
import { resolveIconKey } from './CategoryIcon.jsx';

describe('resolveIconKey', () => {
  it('keeps a stored built-in icon', () => {
    expect(resolveIconKey({ icon: 'crab', slug: 'freshwater-fish' })).toBe('crab');
  });

  it('maps the seeded slugs when a category has no icon yet', () => {
    expect(resolveIconKey({ icon: '', slug: 'freshwater-fish' })).toBe('freshwater');
    expect(resolveIconKey({ slug: 'saltwater-fish' })).toBe('saltwater');
    expect(resolveIconKey({ slug: 'popular-fish' })).toBe('popular');
    expect(resolveIconKey({ slug: 'premium-seafood' })).toBe('seafood');
    expect(resolveIconKey({ slug: 'frozen-fish' })).toBe('frozen');
    expect(resolveIconKey({ slug: 'padma-meghna' })).toBe('river');
  });

  it('falls back to the plain fish for an unknown aisle', () => {
    expect(resolveIconKey({ slug: 'new-aisle', icon: 'not-a-real-icon' })).toBe('fish');
    expect(resolveIconKey({})).toBe('fish');
  });

  it('keeps grocery icons available for a future aisle', () => {
    for (const key of ['meat', 'vegetables', 'fruits', 'grocery', 'dairy', 'essentials']) {
      expect(resolveIconKey({ icon: key })).toBe(key);
    }
  });
});
