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
}

export const defaultReadingPreferences: ReadingPreferences = {
  riwayah: 'warsh', tajweed: false, appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: READER_FONT_DEFAULT, spacious: false,
};

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
