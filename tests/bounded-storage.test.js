import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { CACHE_INDEX_KEY, createBoundedStorage, isCacheKey, estimateBytes } from '../src/features/quran-reader/storage/bounded-storage';

class KeyedMemory extends MemoryCacheStorage {
  constructor() { super(); this.map = new Map(); }
  async getItem(key) { return this.map.get(key) ?? null; }
  async setItem(key, value) { this.map.set(key, value); }
  async removeItem(key) { this.map.delete(key); }
  async getAllKeys() { return [...this.map.keys()]; }
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
function setup(budget = 100, base = new KeyedMemory()) {
  let now = 1000;
  const errors = [];
  const storage = createBoundedStorage(base, { budget, now: () => now++, flushDelayMs: 1, reconcileDelayMs: 0, onError: (e) => errors.push(e) });
  return { base, storage, errors };
}
const page = (n) => `warsh-printed-v2-${n}`;

describe('bounded content storage', () => {
  test('separates re-downloadable cache keys from user data', () => {
    for (const key of ['quranpedia:v1:/mushafs/4', 'quranpedia:tajweed-font:v4:3', 'quranpedia:tajweed-uthmani:e1:v1:2', page(3), 'hafs-printed-v1-604']) expect(isCacheKey(key)).toBe(true);
    for (const key of ['reader:preferences:v1', 'reader:warsh-bookmarks:v1', 'warsh:reading-position:v1', 'hafs:reading-position:v1', 'plans:v1', CACHE_INDEX_KEY]) expect(isCacheKey(key)).toBe(false);
  });

  test('evicts least recently used cache entries beyond the budget, never user data', async () => {
    const { base, storage } = setup(150); // Evicts down to 90% of the budget.
    await storage.setItem('plans:v1', 'x'.repeat(500));
    for (const n of [1, 2, 3]) await storage.setItem(page(n), 'x'.repeat(40));
    await tick();
    await storage.getItem(page(1)); // page 2 is now the least recently used
    await storage.setItem(page(4), 'x'.repeat(40));
    await tick(); await storage.flush();
    expect(await base.getItem(page(2))).toBeNull();
    for (const n of [1, 3, 4]) expect(await base.getItem(page(n))).not.toBeNull();
    expect(await base.getItem('plans:v1')).toHaveLength(500);
    expect(await storage.usage()).toEqual({ bytes: 120, entries: 3 });
  });

  test('persists the index and tracks caches written before it existed', async () => {
    const base = new KeyedMemory();
    await base.setItem(page(1), 'x'.repeat(60));
    await base.setItem('reader:preferences:v1', '{}');
    const first = setup(10_000_000, base);
    await first.storage.setItem(page(2), 'x'.repeat(30));
    await tick(); await first.storage.flush();
    // Legacy entries are estimated by key (not read into memory) until next read.
    expect(await first.storage.usage()).toEqual({ bytes: estimateBytes(page(1)) + 30, entries: 2 });
    expect(JSON.parse(await base.getItem(CACHE_INDEX_KEY)).entries).toHaveLength(2);
    // A new session with a smaller budget evicts the untracked legacy page first.
    const second = setup(50, base);
    await second.storage.getItem(page(2));
    await tick(); await tick(); await second.storage.flush();
    expect(await base.getItem(page(1))).toBeNull();
    expect(await base.getItem(page(2))).not.toBeNull();
    expect(await base.getItem('reader:preferences:v1')).toBe('{}');
  });

  test('a corrupt index or failing eviction never breaks reading', async () => {
    const base = new KeyedMemory();
    await base.setItem(CACHE_INDEX_KEY, '{corrupt');
    await base.setItem(page(1), 'x'.repeat(80));
    base.removeItem = async () => { throw new Error('Disk busy'); };
    const { storage, errors } = setup(50, base);
    expect(await storage.getItem(page(1))).toHaveLength(80);
    await storage.setItem(page(2), 'x'.repeat(10));
    await tick(); await tick();
    expect(await storage.getItem(page(2))).toHaveLength(10);
    expect(errors.length).toBeGreaterThan(0);
    const broken = createBoundedStorage({ ...base, getItem: async (key) => { if (key === CACHE_INDEX_KEY) throw new Error('Unavailable'); return base.getItem(key); },
      setItem: (k, v) => base.setItem(k, v), removeItem: async () => {} }, { budget: 10, reconcileDelayMs: 0, onError: () => {} });
    expect(await broken.getItem(page(1))).toHaveLength(80);
    await broken.setItem('reader:preferences:v1', '{"a":1}');
    expect(await base.getItem('reader:preferences:v1')).toBe('{"a":1}');
  });

  test('drops index entries whose data has disappeared', async () => {
    const { base, storage } = setup(1000);
    await storage.setItem(page(1), 'x'.repeat(10));
    await tick(); await storage.flush();
    base.map.delete(page(1));
    expect(await storage.getItem(page(1))).toBeNull();
    await tick();
    expect(await storage.usage()).toEqual({ bytes: 0, entries: 0 });
  });
});
