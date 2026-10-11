import type { Quran } from '@/lib/quranpedia/types';
import { playsSingleAyahs, type Reciter } from '@/lib/quranpedia/reciters';
import type { ListeningMode } from '@/features/quran-reader/state/reading-preferences';

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

/**
 * Reciters with recordings of whole surahs in this riwayah, for each reciter and style: the edition
 * with ayah timings (so the page can follow the recitation) covering the most surahs, and an edition
 * without timings only when it covers more surahs than that.
 */
export function surahRecitersFor(all: readonly Reciter[], riwayahId: number): Reciter[] {
  const timed = new Map<string, Reciter>();
  const untimed = new Map<string, Reciter>();
  for (const reciter of all) {
    if (reciter.riwayahId !== riwayahId || reciter.mode !== 'surah') continue;
    const key = `${sortKey(reciter)}|${reciter.style}|${reciter.path ?? ''}`;
    const best = reciter.timingUrl !== null ? timed : untimed;
    const current = best.get(key);
    if (!current || reciter.surahs.length > current.surahs.length) best.set(key, reciter);
  }
  const list = [...timed.values()];
  for (const [key, reciter] of untimed) {
    const followed = timed.get(key);
    if (!followed || reciter.surahs.length > followed.surahs.length) list.push(reciter);
  }
  // Same name: the edition that follows the ayahs first.
  return list.sort((a, b) => sortKey(a).localeCompare(sortKey(b), 'ar') || Number(b.timingUrl !== null) - Number(a.timingUrl !== null));
}

/** The reciters offered for a way of listening: ayah by ayah, or whole surahs. */
export const recitersOf = (all: readonly Reciter[], riwayahId: number, listening: ListeningMode) =>
  listening === 'surah' ? surahRecitersFor(all, riwayahId) : recitersFor(all, riwayahId);

/** Whole surahs default to Al-Husary too, in an edition the page can follow when there is one. */
// eslint-disable-next-line no-restricted-syntax -- Matched against Quranpedia's reciter names, not shown.
const SURAH_DEFAULT_NAME = 'الحصري';

/** The chosen reciter when still available, otherwise the riwayah's default, otherwise the first one. */
export function chooseReciter(reciters: readonly Reciter[], riwayahId: number, chosen?: number, listening: ListeningMode = 'ayah'): Reciter | null {
  const picked = reciters.find((r) => r.id === chosen);
  if (picked) return picked;
  if (listening === 'surah') {
    const followed = reciters.filter((r) => r.timingUrl !== null);
    return [...followed, ...reciters].find((r) => r.name.includes(SURAH_DEFAULT_NAME)) ?? followed[0] ?? reciters[0] ?? null;
  }
  return (DEFAULTS[riwayahId] ?? []).map((id) => reciters.find((r) => r.id === id)).find(Boolean)
    ?? reciters[0] ?? null;
}

/**
 * The reciter to play now: the chosen one, or the riwayah's default, from the reciter list; from the
 * downloaded reciters when the list cannot be loaded. Throws when it cannot be loaded and nothing is
 * downloaded; null when the riwayah has no reciter.
 */
export async function pickReciter(load: () => Promise<Reciter[]>, downloaded: () => Reciter[], riwayahId: number, chosen?: number, listening: ListeningMode = 'ayah'): Promise<Reciter | null> {
  let reciters: Reciter[];
  try { reciters = recitersOf(await load(), riwayahId, listening); } catch (error) {
    reciters = recitersOf(downloaded(), riwayahId, listening);
    if (!reciters.length) throw error;
  }
  return chooseReciter(reciters, riwayahId, chosen, listening);
}
