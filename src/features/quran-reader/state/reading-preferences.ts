import { isReaderAppearance, READER_FONT_DEFAULT, READER_FONT_MAX, READER_FONT_MIN, type ReaderAppearance } from '../theme';
import type { ReaderMode } from '../types/reader';

export interface ReadingPreferences {
  appearance: ReaderAppearance;
  mode: ReaderMode;
  fontSize: number;
  spacious: boolean;
}

export const defaultReadingPreferences: ReadingPreferences = {
  appearance: 'system', mode: 'page', fontSize: READER_FONT_DEFAULT, spacious: false,
};

export function decodeReadingPreferences(raw: string | null): ReadingPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return defaultReadingPreferences;
    return {
      appearance: isReaderAppearance(value.appearance) ? value.appearance : 'system',
      mode: value.mode === 'ayah' ? 'ayah' : 'page',
      fontSize: typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
        ? Math.max(READER_FONT_MIN, Math.min(READER_FONT_MAX, value.fontSize)) : READER_FONT_DEFAULT,
      spacious: value.spacious === true,
    };
  } catch {
    return defaultReadingPreferences;
  }
}
