import { QuranpediaClient, type ContentResult, type RequestOptions } from '@/lib/quranpedia/client';
import { RIWAYAT, type Riwayah } from '../riwayat';
import { contentStorage } from '../storage/content-storage';
import { prepareReaderContent } from '../utils/content';
import type { ReaderContent } from '../types/reader';

export const quranpedia = new QuranpediaClient({ storage: contentStorage });
const memory = new Map<Riwayah, ContentResult<ReaderContent>>();
const pending = new Map<Riwayah, Promise<ContentResult<ReaderContent>>>();
export async function loadReaderContent(options?: RequestOptions, riwayah: Riwayah = 'warsh') {
  const cached = memory.get(riwayah);
  if (!options?.forceRefresh && cached && Date.now() - cached.fetchedAt < 86400000) return cached;
  const existing = pending.get(riwayah);
  if (existing) return existing;
  const edition = RIWAYAT[riwayah];
  const request = quranpedia.getMushaf(edition.mushafId, options).then((result) => {
    if (result.data.riwayah.name !== edition.name) throw new Error('The selected riwayah does not match the source');
    const prepared = { ...result, data: prepareReaderContent(result.data) };
    memory.set(riwayah, prepared);
    return prepared;
  }).finally(() => pending.delete(riwayah));
  pending.set(riwayah, request);
  return request;
}
