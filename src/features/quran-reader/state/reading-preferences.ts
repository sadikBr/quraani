import { isReaderAppearance, READER_FONT_DEFAULT, READER_FONT_MAX, READER_FONT_MIN, type ReaderAppearance } from '../theme';
import type { ReaderMode, ReaderTextLayout } from '../types/reader';

export interface ReadingPreferences {
  appearance: ReaderAppearance;
  mode: ReaderMode;
  textLayout: ReaderTextLayout;
  fontSize: number;
  spacious: boolean;
}

export const defaultReadingPreferences: ReadingPreferences = {
  appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: READER_FONT_DEFAULT, spacious: false,
};

export function decodeReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return defaultReadingPreferences;
    return {
      appearance: isReaderAppearance(value.appearance) ? value.appearance : 'system',
      // Preserve the former ayah-by-ayah choice when upgrading saved preferences.
      mode: value.mode === 'text' || value.mode === 'ayah' ? 'text' : 'page',
      textLayout: value.textLayout === 'flowing' ? 'flowing' : 'ayah',
      fontSize: typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
        ? Math.max(READER_FONT_MIN, Math.min(READER_FONT_MAX, value.fontSize)) : READER_FONT_DEFAULT,
      spacious: value.spacious === true,
    };
  } catch {
    return defaultReadingPreferences;
  }
}
