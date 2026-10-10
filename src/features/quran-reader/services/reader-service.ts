import { CORPUS_TTL_MS } from '@/lib/quranpedia/cache';
import { QuranpediaClient, type ContentResult, type RequestOptions } from '@/lib/quranpedia/client';
import { QuranpediaError } from '@/lib/quranpedia/errors';
import type { Quran } from '@/lib/quranpedia/types';
import { RIWAYAT, type Riwayah } from '../riwayat';
import { contentStorage } from '../storage/content-storage';
import { prepareReaderContent } from '../utils/content';
import type { ReaderContent } from '../types/reader';

export const quranpedia = new QuranpediaClient({ storage: contentStorage });

const RETRY_MS = 5 * 60_000;
const memory = new Map<Riwayah, ContentResult<ReaderContent>>();
const pending = new Map<string, Promise<ContentResult<ReaderContent>>>();
const retryAt = new Map<Riwayah, number>();

function prepare(riwayah: Riwayah, result: ContentResult<Quran>): ContentResult<ReaderContent> {
  const edition = RIWAYAT[riwayah];
  // The client already rejects a mismatched payload before caching it; this
  // also covers a request joined from a caller without that expectation.
  if (result.data.id !== edition.mushafId || result.data.riwayah.name !== edition.name) {
    throw new QuranpediaError('invalid-response', 'The selected riwayah does not match the source');
  }
  const { revalidated, ...rest } = result;
  const prepared = { ...rest, data: prepareReaderContent(result.data) };
  memory.set(riwayah, prepared);
  if (revalidated) {
    // The client refreshes expired cache in the background; adopt the result.
    retryAt.set(riwayah, Date.now() + RETRY_MS);
    void revalidated.then((fresh) => { if (fresh) prepare(riwayah, fresh); }).catch(() => {});
  }
  return prepared;
}

function request(riwayah: Riwayah, options: RequestOptions) {
  // A manual refresh never joins a request that may be answered from cache.
  const id = `${riwayah}:${options.forceRefresh ? 'force' : 'load'}:${options.allowStale ?? true}`;
  const existing = pending.get(id);
  if (existing) return existing;
  const edition = RIWAYAT[riwayah];
  const task = quranpedia.getMushaf(edition.mushafId, options, { riwayahName: edition.name })
    .then((result) => prepare(riwayah, result))
    .finally(() => { if (pending.get(id) === task) pending.delete(id); });
  pending.set(id, task);
  return task;
}

/**
 * Returns prepared content from memory or cache immediately when available,
 * refreshing expired content in the background with backoff. forceRefresh
 * waits for the network; a failure then returns cache with refreshError.
 */
export async function loadReaderContent(options: RequestOptions = {}, riwayah: Riwayah = 'warsh') {
  const cached = memory.get(riwayah);
  const usable = cached && (options.allowStale !== false || (!cached.stale && Date.now() - cached.fetchedAt < CORPUS_TTL_MS));
  if (!options.forceRefresh && cached && usable) {
    const expired = cached.stale || !(Date.now() - cached.fetchedAt < CORPUS_TTL_MS);
    if (expired && (retryAt.get(riwayah) ?? 0) <= Date.now()) {
      retryAt.set(riwayah, Date.now() + RETRY_MS);
      // Network only: the cached copy is already in memory.
      void request(riwayah, { forceRefresh: true, allowStale: false }).catch(() => {});
    }
    return cached;
  }
  return request(riwayah, options);
}
