export interface CacheStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryCacheStorage implements CacheStorage {
  private values = new Map<string, string>();
  async getItem(key: string) { return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) { this.values.set(key, value); }
  async removeItem(key: string) { this.values.delete(key); }
}

export const CACHE_VERSION = 1;
export const CONTENT_TTL_MS = 24 * 60 * 60 * 1000;

export interface CacheEntry {
  version: typeof CACHE_VERSION;
  fetchedAt: number;
  payload: unknown;
}

export function decodeCacheEntry(value: string | null): CacheEntry | null {
  if (value === null) return null;
  try {
    const entry = JSON.parse(value);
    if (entry && entry.version === CACHE_VERSION && Number.isFinite(entry.fetchedAt) &&
      entry.fetchedAt > 0 && Object.hasOwn(entry, 'payload')) return entry;
  } catch { /* Corrupt caches are replaced by a validated network response. */ }
  return null;
}
