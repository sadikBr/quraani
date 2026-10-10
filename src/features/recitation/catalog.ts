import type { Quran } from '@/lib/quranpedia/types';
import { playsSingleAyahs, type Reciter } from '@/lib/quranpedia/reciters';

/** Reciters offered when nothing has been chosen yet, by Quranpedia rawi id: Al-Husary for Warsh (2) and Hafs (10). */
const DEFAULTS: Record<number, number[]> = { 2: [261, 265, 262], 10: [35, 38, 32] };

/** Al-Fatiha counts the basmala as its first ayah in some riwayat (Hafs) and not in others (Warsh). */
export const fatihaCountsBasmala = (quran: Quran) => quran.surahs[0]?.ayahs[0]?.hafsAyahNumbers.length === 1;

const sortKey = (reciter: Reciter) => reciter.name.replace(/\s+/g, '');

/**
 * Reciters who can recite single ayahs in this riwayah, one entry per reciter and style:
 * an edition with ayah files is preferred over surah files with timings.
 */
export function recitersFor(all: readonly Reciter[], riwayahId: number): Reciter[] {
  const best = new Map<string, Reciter>();
  for (const reciter of all) {
    if (reciter.riwayahId !== riwayahId || !playsSingleAyahs(reciter)) continue;
    const key = `${sortKey(reciter)}|${reciter.style}|${reciter.path ?? ''}`;
    const current = best.get(key);
    const better = !current
      || (reciter.mode === 'ayah' && current.mode !== 'ayah')
      || (reciter.mode === current.mode && reciter.surahs.length > current.surahs.length);
    if (better) best.set(key, reciter);
  }
  return [...best.values()].sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ar'));
}

/** The chosen reciter when still available, otherwise the riwayah's default, otherwise the first one. */
export function chooseReciter(reciters: readonly Reciter[], riwayahId: number, chosen?: number): Reciter | null {
  return reciters.find((r) => r.id === chosen)
    ?? (DEFAULTS[riwayahId] ?? []).map((id) => reciters.find((r) => r.id === id)).find(Boolean)
    ?? reciters[0] ?? null;
}

/**
 * The reciter to play now: the chosen one, or the riwayah's default, from the reciter list; from the
 * downloaded reciters when the list cannot be loaded. Throws when it cannot be loaded and nothing is
 * downloaded; null when the riwayah has no reciter.
 */
export async function pickReciter(load: () => Promise<Reciter[]>, downloaded: () => Reciter[], riwayahId: number, chosen?: number): Promise<Reciter | null> {
  let reciters: Reciter[];
  try { reciters = recitersFor(await load(), riwayahId); } catch (error) {
    reciters = recitersFor(downloaded(), riwayahId);
    if (!reciters.length) throw error;
  }
  return chooseReciter(reciters, riwayahId, chosen);
}
