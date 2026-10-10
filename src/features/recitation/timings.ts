import type { Reciter } from '@/lib/quranpedia/reciters';
import { timingsFromZip, type SurahTimings } from './sources';
import { readTimings, saveTimings } from './downloads';

const memory = new Map<number, Promise<SurahTimings>>();

/** Ayah timings of a surah-file reciter: kept on the device after the first download. */
export function loadTimings(reciter: Reciter): Promise<SurahTimings> {
  const url = reciter.timingUrl;
  if (!url) return Promise.resolve({});
  let pending = memory.get(reciter.id);
  if (!pending) {
    pending = (async () => {
      const saved = readTimings(reciter.id);
      if (saved) return saved;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Timings ${response.status}`);
      const timings = timingsFromZip(new Uint8Array(await response.arrayBuffer()));
      saveTimings(reciter, timings);
      return timings;
    })();
    memory.set(reciter.id, pending);
    pending.catch(() => memory.delete(reciter.id));
  }
  return pending;
}
