import type { CacheStorage } from '@/lib/quranpedia/cache';

/** A key-value store that can also list its keys (expo-sqlite kv-store, IndexedDB). */
export interface KeyedStorage extends CacheStorage {
  getAllKeys?(): Promise<readonly string[]>;
}

export interface BoundedStorage extends CacheStorage {
  /** Persist pending index changes now (normally debounced). */
  flush(): Promise<void>;
  /** Tracked cache size; for diagnostics and tests. */
  usage(): Promise<{ bytes: number; entries: number }>;
}

export const CACHE_INDEX_KEY = 'storage:cache-index:v1';

/**
 * Re-downloadable content only: Quranpedia responses, tajweed sources/fonts and
 * printed page artwork. Everything else (preferences, bookmarks, plans, reading
 * positions) is user data: never tracked, never evicted.
 */
const CACHE_KEYS = [/^quranpedia:/, /^(?:warsh|hafs)-printed-v\d+-\d+$/];
export function isCacheKey(key: string) {
  return key !== CACHE_INDEX_KEY && CACHE_KEYS.some((pattern) => pattern.test(key));
}

interface Entry { bytes: number; at: number }
interface Options {
  /** Approximate budget, measured in stored string length. */
  budget: number;
  now?: () => number;
  flushDelayMs?: number;
  /** Delay before scanning for untracked entries (e.g. caches written by older versions). */
  reconcileDelayMs?: number;
  onError?: (error: unknown) => void;
}

/**
 * LRU eviction for cache keys in a single key-value store. The index is one
 * JSON value (replaced atomically), written after the data it describes, so a
 * crash can only leave untracked data (found by the next reconcile) or entries
 * for missing data (dropped by reconcile or the next read). Index and eviction
 * failures are reported to onError and never fail a read or write.
 */
export function createBoundedStorage(base: KeyedStorage, options: Options): BoundedStorage {
  const { budget, now = Date.now, flushDelayMs = 2000, reconcileDelayMs = 10_000 } = options;
  const report = (error: unknown) => { try { options.onError?.(error); } catch { /* Diagnostics only. */ } };
  let index: Promise<Map<string, Entry>> | undefined;
  let dirty = false;
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let flushing = Promise.resolve();
  let evicting: Promise<void> | undefined;
  let evictAgain = false;
  const writing = new Set<string>();

  const load = () => index ??= (async () => {
    const entries = new Map<string, Entry>();
    try {
      const saved = JSON.parse(await base.getItem(CACHE_INDEX_KEY) ?? 'null');
      if (saved?.version === 1 && Array.isArray(saved.entries)) {
        for (const value of saved.entries) {
          if (!Array.isArray(value)) continue;
          const [key, bytes, at] = value;
          if (typeof key === 'string' && isCacheKey(key) && Number.isFinite(bytes) && bytes >= 0 && Number.isFinite(at)) entries.set(key, { bytes, at });
        }
      }
    } catch (error) { report(error); /* A corrupt index is rebuilt by reconcile. */ }
    setTimeout(() => void reconcile(entries).catch(report), reconcileDelayMs);
    return entries;
  })();

  let flushAt = Infinity;
  /** Additions/removals flush soon; access-time updates alone can wait (LRU order is approximate). */
  const changed = (touchOnly = false) => {
    dirty = true;
    const at = Date.now() + (touchOnly ? flushDelayMs * 15 : flushDelayMs);
    if (flushTimer && flushAt <= at) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushAt = at;
    flushTimer = setTimeout(() => { flushTimer = undefined; flushAt = Infinity; void flush(); }, at - Date.now());
  };
  const flush = async () => {
    if (flushTimer) { clearTimeout(flushTimer); flushTimer = undefined; flushAt = Infinity; }
    if (!index) return;
    const entries = await index;
    if (dirty) {
      dirty = false;
      const raw = JSON.stringify({ version: 1, entries: [...entries].map(([key, e]) => [key, e.bytes, e.at]) });
      flushing = flushing.then(() => base.setItem(CACHE_INDEX_KEY, raw)).catch((error) => { dirty = true; report(error); });
    }
    await flushing;
  };
  // Index bookkeeping runs after the data operation and never rejects.
  const update = (action: (entries: Map<string, Entry>) => void) => {
    void load().then(action).catch(report);
  };

  const evict = (): Promise<void> => {
    if (evicting) { evictAgain = true; return evicting; }
    evicting = (async () => {
      const entries = await load();
      let total = 0;
      for (const entry of entries.values()) total += entry.bytes;
      if (total <= budget) return;
      // Evict to 90% so a full cache does not evict on every write.
      const target = budget * 0.9;
      const oldest = [...entries].map(([key, entry]) => [key, entry, entry.at] as const).sort((a, b) => a[2] - b[2]);
      for (const [key, entry, at] of oldest) {
        if (total <= target) break;
        // Skip entries being rewritten, replaced or read since the sort.
        if (writing.has(key) || entries.get(key) !== entry || entry.at !== at) continue;
        try { await base.removeItem(key); } catch (error) { report(error); break; }
        // A concurrent rewrite replaced the entry object; keep tracking the new data.
        if (entries.get(key) === entry) entries.delete(key);
        total -= entry.bytes;
        dirty = true;
      }
      await flush();
    })().catch(report).finally(() => {
      evicting = undefined;
      if (evictAgain) { evictAgain = false; void evict(); }
    });
    return evicting;
  };

  const reconcile = async (entries: Map<string, Entry>) => {
    if (!base.getAllKeys) return;
    const started = now();
    const keys = new Set(await base.getAllKeys());
    for (const [key, entry] of entries) {
      // Entries recorded after the key listing may be missing from it.
      if (!keys.has(key) && entry.at < started && !writing.has(key)) { entries.delete(key); dirty = true; }
    }
    for (const key of keys) {
      if (!isCacheKey(key) || entries.has(key)) continue;
      // Untracked data predates the index, so it is the least recently used.
      // Estimate its size from the key instead of reading every value into
      // memory; the real size is recorded the next time the entry is read.
      if (!entries.has(key)) { entries.set(key, { bytes: estimateBytes(key), at: 0 }); dirty = true; }
    }
    if (dirty) changed();
    await evict();
  };

  return {
    async getItem(key) {
      const value = await base.getItem(key);
      if (isCacheKey(key)) update((entries) => {
        const entry = entries.get(key);
        if (value === null) { if (entry && !writing.has(key)) { entries.delete(key); changed(); } }
        else if (entry) { const resized = entry.bytes !== value.length; entry.at = now(); entry.bytes = value.length; changed(!resized); if (resized) void evict(); }
        else { entries.set(key, { bytes: value.length, at: now() }); changed(); void evict(); }
      });
      return value;
    },
    async setItem(key, value) {
      if (!isCacheKey(key)) return base.setItem(key, value);
      writing.add(key);
      try { await base.setItem(key, value); } finally { writing.delete(key); }
      update((entries) => { entries.set(key, { bytes: value.length, at: now() }); changed(); void evict(); });
    },
    async removeItem(key) {
      await base.removeItem(key);
      if (isCacheKey(key)) update((entries) => { if (entries.delete(key)) changed(); });
    },
    flush,
    async usage() {
      const entries = await load();
      let bytes = 0;
      for (const entry of entries.values()) bytes += entry.bytes;
      return { bytes, entries: entries.size };
    },
  };
}

/** Rough sizes for entries written before the index existed. */
export function estimateBytes(key: string) {
  if (/^quranpedia:.*mushafs\/\d+$/.test(key) || /:mushaf:/.test(key)) return 6_000_000;
  if (/printed|page|font/i.test(key)) return 250_000;
  return 50_000;
}
