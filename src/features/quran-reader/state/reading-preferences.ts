import type { CacheStorage } from '@/lib/quranpedia/cache';
import type { Riwayah } from '../riwayat';
import { isReaderAppearance, READER_FONT_DEFAULT, type ReaderAppearance } from '../theme';
import { snapReaderFontSize } from '../utils/reader-typography';
import type { ReaderMode, ReaderTextLayout } from '../types/reader';
import type { WarshScript } from '../utils/quran-script';
import { createPersistedStore } from './persisted-store';

/** How a recitation is heard: each ayah's own recording, or a whole surah recorded as one. */
export type ListeningMode = 'ayah' | 'surah';

export interface ReadingPreferences {
  riwayah: Riwayah;
  tajweed: boolean;
  /** A tap on a coloured part of the tajweed text explains its rule (otherwise it shows or hides the tools, like any tap). */
  tajweedRules: boolean;
  appearance: ReaderAppearance;
  mode: ReaderMode;
  textLayout: ReaderTextLayout;
  fontSize: number;
  spacious: boolean;
  /** Quranpedia reciter id chosen for each riwayah; unset uses the default reciter. */
  reciters: Partial<Record<Riwayah, number>>;
  /** Times each ayah is recited before moving on; 0 repeats until stopped. */
  repeat: number;
  /** What the reader's listening plays: ayah by ayah, or whole surahs. */
  listening: ListeningMode;
  /** Whole-surah reciter (Quranpedia id) chosen for each riwayah; unset uses the default. */
  surahReciters: Partial<Record<Riwayah, number>>;
  /** Times each whole surah is recited before the next one; 0 repeats until stopped. */
  surahRepeat: number;
  /** How the Warsh text's letters are drawn (the printed pages stay as printed). */
  warshScript: WarshScript;
  /** Warsh in the text view: a page per thumun (480 of them) instead of the mushaf's 604 pages. */
  thumunPages: boolean;
}

/** Choices offered for repeating each ayah. */
export const REPEAT_CHOICES = [1, 2, 3, 5, 7, 10, 0] as const;

export const defaultReadingPreferences: ReadingPreferences = {
  riwayah: 'warsh', tajweed: false, tajweedRules: true, appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: READER_FONT_DEFAULT, spacious: false,
  reciters: {}, repeat: 1, listening: 'ayah', surahReciters: {}, surahRepeat: 1, warshScript: 'maghribi', thumunPages: false,
};

const reciterId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;
const reciterIds = (value: unknown): Partial<Record<Riwayah, number>> => Object.fromEntries((['warsh', 'hafs'] as const)
  .map((key) => [key, reciterId((value as Record<string, unknown> | undefined)?.[key])] as const).filter(([, id]) => id !== undefined));
const repeatCount = (value: unknown) => (REPEAT_CHOICES as readonly unknown[]).includes(value) ? value as number : 1;

export function decodeReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return defaultReadingPreferences;
    return {
      riwayah: value.riwayah === 'hafs' ? 'hafs' : 'warsh',
      tajweed: value.tajweed === true,
      tajweedRules: value.tajweedRules !== false,
      appearance: isReaderAppearance(value.appearance) ? value.appearance : 'system',
      // Preserve the former ayah-by-ayah choice when upgrading saved preferences.
      mode: value.mode === 'text' || value.mode === 'ayah' ? 'text' : 'page',
      textLayout: value.textLayout === 'flowing' ? 'flowing' : 'ayah',
      fontSize: typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
        ? snapReaderFontSize(value.fontSize) : READER_FONT_DEFAULT,
      spacious: value.spacious === true,
      reciters: reciterIds(value.reciters),
      repeat: repeatCount(value.repeat),
      listening: value.listening === 'surah' ? 'surah' : 'ayah',
      surahReciters: reciterIds(value.surahReciters),
      surahRepeat: repeatCount(value.surahRepeat),
      warshScript: value.warshScript === 'mashriqi' ? 'mashriqi' : 'maghribi',
      thumunPages: value.thumunPages === true,
    };
  } catch {
    return defaultReadingPreferences;
  }
}

export const READING_PREFERENCES_KEY = 'reader:preferences:v1';

/** Saved preferences are never replaced by defaults after a failed read. */
export function createReadingPreferencesStore(storage: CacheStorage) {
  return createPersistedStore<ReadingPreferences, Partial<ReadingPreferences>>({
    storage, key: READING_PREFERENCES_KEY, fallback: defaultReadingPreferences, decode: decodeReadingPreferences,
    apply: (value, changes) => ({ ...value, ...changes }),
    saveOnLoad: true, // Persist migrated legacy values.
  });
}
