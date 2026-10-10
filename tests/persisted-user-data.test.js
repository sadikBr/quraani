import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { applyBookmarkChange, createBookmarksStore } from '../src/features/quran-reader/state/bookmarks';
import { createReadingPreferencesStore, READING_PREFERENCES_KEY } from '../src/features/quran-reader/state/reading-preferences';
import { createPersistedStore } from '../src/features/quran-reader/state/persisted-store';
import { decodeBookmarks } from '../src/features/quran-reader/utils/ayah-actions';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
function flaky(failures) {
  const storage = new MemoryCacheStorage();
  const writes = [];
  let reads = 0;
  return { storage, writes, get reads() { return reads; }, wrapped: {
    getItem: async (key) => { reads++; if (failures-- > 0) throw new Error('Storage unavailable'); return storage.getItem(key); },
    setItem: async (key, value) => { writes.push([key, value]); return storage.setItem(key, value); },
    removeItem: (key) => storage.removeItem(key),
  } };
}
const KEY = 'reader:warsh-bookmarks:v1';

describe('bookmarks and preferences are never overwritten after a failed read', () => {
  test('bookmark changes are explicit intents', () => {
    expect(applyBookmarkChange(['4:1:1'], { key: '4:1:1', saved: true })).toEqual(['4:1:1']);
    expect(applyBookmarkChange(['4:1:1', '4:2:1'], { key: '4:1:1', saved: false })).toEqual(['4:2:1']);
    expect(applyBookmarkChange([], { key: '4:2:1', saved: true })).toEqual(['4:2:1']);
  });

  test('a toggle during a failed read is kept, retried and merged with the saved list', async () => {
    const env = flaky(1);
    await env.storage.setItem(KEY, JSON.stringify(['4:1:1', '4:2:5']));
    const store = createBookmarksStore(env.wrapped, KEY);
    const stop = store.start();
    await tick();
    expect(store.getSnapshot()).toMatchObject({ ready: true, loaded: false, error: true, value: [] });
    store.update({ key: '4:2:1', saved: true }); // retries the read immediately
    expect(env.writes).toEqual([]);
    await tick();
    expect(store.getSnapshot()).toMatchObject({ loaded: true, error: false, value: ['4:1:1', '4:2:5', '4:2:1'] });
    expect(JSON.parse(await env.storage.getItem(KEY))).toEqual(['4:1:1', '4:2:5', '4:2:1']);
    store.update({ key: '4:1:1', saved: false });
    await tick();
    expect(JSON.parse(await env.storage.getItem(KEY))).toEqual(['4:2:5', '4:2:1']);
    stop();
  });

  test('a failing read is retried with backoff and nothing is written meanwhile', async () => {
    const env = flaky(2);
    await env.storage.setItem(KEY, JSON.stringify(['4:1:1']));
    const store = createPersisted(env.wrapped);
    const stop = store.start();
    await tick(); await tick(); await tick();
    expect(env.reads).toBe(3);
    expect(store.getSnapshot()).toMatchObject({ loaded: true, value: ['4:1:1'] });
    expect(env.writes).toEqual([]); // No change: nothing to write.
    stop();
  });

  test('stopping cancels retries', async () => {
    const env = flaky(10);
    const store = createPersisted(env.wrapped);
    store.start()();
    await tick(); await tick();
    expect(env.reads).toBe(1);
  });

  test('preferences keep their saved values; session changes apply on top once read', async () => {
    const env = flaky(1);
    await env.storage.setItem(READING_PREFERENCES_KEY, JSON.stringify({ riwayah: 'hafs', mode: 'ayah', fontSize: 40 }));
    const store = createReadingPreferencesStore(env.wrapped);
    const stop = store.start();
    await tick();
    expect(store.getSnapshot()).toMatchObject({ ready: true, loaded: false, value: { riwayah: 'warsh' } });
    store.update({ tajweed: true });
    expect(env.writes).toEqual([]);
    await tick();
    const saved = JSON.parse(await env.storage.getItem(READING_PREFERENCES_KEY));
    expect(saved).toMatchObject({ riwayah: 'hafs', mode: 'text', fontSize: 40, tajweed: true });
    expect(store.getSnapshot().value).toEqual(saved);
    stop();
  });

  test('legacy preferences are migrated on a successful read', async () => {
    const env = flaky(0);
    await env.storage.setItem(READING_PREFERENCES_KEY, JSON.stringify({ mode: 'ayah' }));
    const store = createReadingPreferencesStore(env.wrapped);
    const stop = store.start();
    await tick();
    expect(JSON.parse(await env.storage.getItem(READING_PREFERENCES_KEY)).mode).toBe('text');
    stop();
  });
});

/** Bookmarks store with immediate retries for tests. */
function createPersisted(storage) {
  return createPersistedStore({ storage, key: KEY, fallback: [], decode: decodeBookmarks, apply: applyBookmarkChange, retryDelay: () => 1 });
}
