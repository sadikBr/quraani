import type { Ayah, Quran, Surah } from '@/lib/quranpedia/types';

/** A stretch of the Quran within a dhikr, by Hafs ayah numbers; the mushaf maps them to its riwayah. */
export interface QuranPassage { surah: number; from: number; to: number }

/** A dhikr that is a Quran reading: what is said before it, then its passages. */
export interface QuranReading {
  /** Said before it, set as a dhikr (the isti'adha before Ayat al-Kursi). */
  before?: string;
  passages: QuranPassage[];
}

/** A whole surah, opened with its name and the basmala. */
const surah = (number: number): QuranPassage => ({ surah: number, from: 1, to: Infinity });
const KURSI: QuranPassage = { surah: 2, from: 255, to: 255 };
const QULS = [surah(112), surah(113), surah(114)];
// eslint-disable-next-line no-restricted-syntax -- Recited text, as in Hisn al-Muslim.
const ISTIADHA = 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ';

/**
 * Hisn al-Muslim's Quran adhkar, by its dhikr id. The book spells them simply (and runs the basmala
 * and the surahs together); they are read from the mushaf instead, in the chosen riwayah and its
 * script, each ayah with its number.
 */
export const quranReadings: Record<string, QuranReading> = {
  // Morning and evening.
  75: { before: ISTIADHA, passages: [KURSI] },
  76: { passages: QULS },
  // After each prayer.
  70: { passages: QULS },
  71: { passages: [KURSI] },
  // Before sleeping: the three Quls, Ayat al-Kursi, and the last two ayahs of Al-Baqarah.
  99: { passages: QULS },
  100: { passages: [KURSI] },
  101: { passages: [{ surah: 2, from: 285, to: 286 }] },
  // On waking: the end of Aal Imran.
  4: { passages: [{ surah: 3, from: 190, to: 200 }] },
};

export interface ResolvedPassage {
  surah: Surah;
  ayahs: Ayah[];
  /** The whole surah: it opens with its name and (but for At-Tawbah) the basmala. */
  whole: boolean;
}

/**
 * The passages' ayahs in this mushaf, by their Hafs numbers (an ayah of another count that covers
 * part of the stretch is included). Null when the mushaf lacks one of them.
 */
export function resolveReading(quran: Quran, reading: QuranReading): ResolvedPassage[] | null {
  const resolved: ResolvedPassage[] = [];
  for (const passage of reading.passages) {
    const found = quran.surahs.find((s) => s.number === passage.surah);
    const ayahs = found?.ayahs.filter((a) => a.hafsAyahNumbers.some((n) => n >= passage.from && n <= passage.to)) ?? [];
    if (!found || !ayahs.length) return null;
    resolved.push({ surah: found, ayahs, whole: passage.from === 1 && passage.to === Infinity });
  }
  return resolved;
}

/** The length of the passages' text, to size it like the other adhkar. */
export const readingLength = (passages: readonly ResolvedPassage[]) =>
  passages.reduce((sum, p) => sum + p.ayahs.reduce((n, a) => n + a.text.length + 2, 0), 0);
