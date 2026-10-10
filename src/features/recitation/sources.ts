import { strFromU8, unzipSync } from 'fflate';
import type { Reciter } from '@/lib/quranpedia/reciters';

const pad = (n: number) => String(n).padStart(3, '0');

/** Ayah files are named `SSSAAA.mp3`; a surah's basmala is `SSS000.mp3`; surah files are `SSS.mp3`. */
export const ayahFileName = (surah: number, ayah: number) => `${pad(surah)}${pad(ayah)}.mp3`;
export const surahFileName = (surah: number) => `${pad(surah)}.mp3`;
export const ayahUrl = (reciter: Reciter, surah: number, ayah: number) => `${reciter.server}/${ayahFileName(surah, ayah)}`;
export const surahUrl = (reciter: Reciter, surah: number) => `${reciter.server}/${surahFileName(surah)}`;

/**
 * The basmala is recited before every surah except At-Tawbah. In riwayat that count it as the
 * first ayah of Al-Fatiha (Hafs), it is already ayah 1 there and needs no separate recitation.
 */
export const needsBasmala = (surah: number, fatihaCountsBasmala: boolean) => surah !== 9 && (surah !== 1 || !fatihaCountsBasmala);

/** One ayah's place in a surah file, in milliseconds. */
export interface AyahTiming { ayah: number; start: number; end: number }
export type SurahTimings = Record<number, AyahTiming[]>;

/** Quranpedia timing files: `{ "<surah>": [{ ayah, start, end }] }` in milliseconds. */
export function parseTimings(value: unknown): SurahTimings {
  const timings: SurahTimings = {};
  if (!value || typeof value !== 'object') return timings;
  for (const [key, list] of Object.entries(value as Record<string, unknown>)) {
    const surah = Number(key);
    if (!Number.isInteger(surah) || surah < 1 || surah > 114 || !Array.isArray(list)) continue;
    const entries = list.flatMap((item) => {
      const { ayah, start, end } = (item ?? {}) as Record<string, unknown>;
      return typeof ayah === 'number' && typeof start === 'number' && typeof end === 'number' && Number.isInteger(ayah) && ayah > 0
        && start >= 0 && end > start ? [{ ayah, start, end }] : [];
    }).sort((a, b) => a.ayah - b.ayah);
    if (entries.length) timings[surah] = entries;
  }
  return timings;
}

/** Quranpedia ships each reciter's timings as a zip holding one `<id>.json`. */
export function timingsFromZip(bytes: Uint8Array): SurahTimings {
  const files = unzipSync(bytes, { filter: (file) => file.name.endsWith('.json') });
  const first = Object.values(files)[0];
  if (!first) throw new Error('Empty timing archive');
  return parseTimings(JSON.parse(strFromU8(first)));
}

/** A stretch of audio to play: a whole file, or part of a surah file. */
export interface Segment {
  /** File name within the reciter's folder and the server. */
  file: string;
  /** Milliseconds; absent for whole files. */
  start?: number;
  end?: number;
}

/**
 * Where the basmala (`ayah` 0) or an ayah is found for a reciter. Returns null when it cannot be
 * played on its own: the reciter lacks the surah, or its surah files have no timing for the ayah.
 */
export function segmentFor(reciter: Reciter, surah: number, ayah: number, timings: SurahTimings | null): Segment | null {
  if (!reciter.surahs.includes(surah)) return null;
  if (reciter.mode === 'ayah') return { file: ayahFileName(surah, ayah) };
  const list = timings?.[surah];
  if (!list?.length) return null;
  // The surah file opens with the basmala (and any opening words) before ayah 1.
  if (ayah === 0) return list[0].start > 300 ? { file: surahFileName(surah), start: 0, end: list[0].start } : null;
  const timing = list.find((entry) => entry.ayah === ayah);
  return timing ? { file: surahFileName(surah), start: ayah === 1 && list[0].start <= 300 ? 0 : timing.start, end: timing.end } : null;
}
