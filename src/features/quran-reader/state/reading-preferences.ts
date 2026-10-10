import type { CacheStorage } from '@/lib/quranpedia/cache';
import type { Riwayah } from '../riwayat';
import { isReaderAppearance, READER_FONT_DEFAULT, type ReaderAppearance } from '../theme';
import { snapReaderFontSize } from '../utils/reader-typography';
import type { ReaderMode, ReaderTextLayout } from '../types/reader';
import { createPersistedStore } from './persisted-store';

export interface ReadingPreferences {
  riwayah: Riwayah;
  tajweed: boolean;
  appearance: ReaderAppearance;
  mode: ReaderMode;
  textLayout: ReaderTextLayout;
  fontSize: number;
  spacious: boolean;
  /** Quranpedia reciter id chosen for each riwayah; unset uses the default reciter. */
  reciters: Partial<Record<Riwayah, number>>;
  /** Times each ayah is recited before moving on; 0 repeats until stopped. */
  repeat: number;
}

/** Choices offered for repeating each ayah. */
export const REPEAT_CHOICES = [1, 2, 3, 5, 7, 10, 0] as const;

export const defaultReadingPreferences: ReadingPreferences = {
  riwayah: 'warsh', tajweed: false, appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: READER_FONT_DEFAULT, spacious: false,
  reciters: {}, repeat: 1,
};

const reciterId = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined;

export function decodeReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return defaultReadingPreferences;
    return {
      riwayah: value.riwayah === 'hafs' ? 'hafs' : 'warsh',
      tajweed: value.tajweed === true,
      appearance: isReaderAppearance(value.appearance) ? value.appearance : 'system',
      // Preserve the former ayah-by-ayah choice when upgrading saved preferences.
      mode: value.mode === 'text' || value.mode === 'ayah' ? 'text' : 'page',
      textLayout: value.textLayout === 'flowing' ? 'flowing' : 'ayah',
      fontSize: typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
        ? snapReaderFontSize(value.fontSize) : READER_FONT_DEFAULT,
      spacious: value.spacious === true,
      reciters: Object.fromEntries((['warsh', 'hafs'] as const)
        .map((key) => [key, reciterId(value.reciters?.[key])] as const).filter(([, id]) => id !== undefined)),
      repeat: (REPEAT_CHOICES as readonly number[]).includes(value.repeat) ? value.repeat : 1,
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
