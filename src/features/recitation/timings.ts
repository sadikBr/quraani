import type { Reciter } from '@/lib/quranpedia/reciters';
import { timingsFromZip, type SurahTimings } from './sources';
import { readTimings, saveTimings } from './downloads';

const memory = new Map<number, Promise<SurahTimings>>();
const TIMEOUT_MS = 20_000;

/** Ayah timings of a surah-file reciter: kept on the device after the first download. */
export function loadTimings(reciter: Reciter): Promise<SurahTimings> {
  const url = reciter.timingUrl;
  if (!url) return Promise.resolve({});
  let pending = memory.get(reciter.id);
  if (!pending) {
    pending = (async () => {
      const saved = readTimings(reciter.id);
      if (saved) return saved;
      // Given up after a while (and asked for again the next time the reciter plays).
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      let bytes: Uint8Array;
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error(`Timings ${response.status}`);
        bytes = new Uint8Array(await response.arrayBuffer());
      } finally { clearTimeout(timer); }
      const timings = timingsFromZip(bytes);
      saveTimings(reciter, timings);
      return timings;
    })();
    memory.set(reciter.id, pending);
    pending.catch(() => memory.delete(reciter.id));
  }
  return pending;
}
