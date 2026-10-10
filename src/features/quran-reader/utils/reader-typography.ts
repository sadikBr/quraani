import { READER_FONT_DEFAULT } from '../theme';
import { SURAH_NAME_FONT_FAMILY } from '../config';
import type { TextStyle } from 'react-native';
import { t } from '@/i18n';

export const readerFontSteps = [24, 28, 32, 36, 40, 44, 48] as const;
const readerFontStepNames = ['smallest', 'small', 'normal', 'medium', 'large', 'larger', 'largest'] as const;
/** The name of a font-size step (0–6), e.g. "عادي". */
export const readerFontLabel = (step: number) => t(`settings.fontSize.steps.${readerFontStepNames[step]}`);

export function readerFontStep(fontSize: number): number {
  const size = Number.isFinite(fontSize) ? fontSize : READER_FONT_DEFAULT;
  return Math.max(0, Math.min(6, Math.round((size - readerFontSteps[0]) / 4)));
}

export function snapReaderFontSize(fontSize: number): number {
  return readerFontSteps[readerFontStep(fontSize)];
}

export function readerTextLineHeight(fontSize: number, spacious: boolean): number {
  return Math.ceil(fontSize * (spacious ? 2.25 : 1.9));
}

// eslint-disable-next-line no-restricted-syntax -- digit glyphs of the surah-name font, not interface text
export const surahNameGlyph = (number: number) => String(number).replace(/[0-9]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'[Number(digit)]);

/** Shared optical scale: this font's complete calligraphy has different metrics
 * from the Quran body font. Leave room for the widest title and the basmala. */
export function openingTypography(bodySize: number, width = Infinity) {
  const available = Math.max(1, width - 32);
  return {
    title: Math.min(bodySize * 2, available / 3.5),
    basmala: Math.min(bodySize * 1.7, available / 4.21),
    gap: Math.round(bodySize * 0.22),
    after: Math.round(bodySize * 0.4),
  };
}

export function calligraphyStyle(fontSize: number): TextStyle {
  return {
    fontFamily: SURAH_NAME_FONT_FAMILY, fontWeight: '400', fontSize,
    lineHeight: Math.ceil(fontSize * 1.12), writingDirection: 'rtl', includeFontPadding: false,
  };
}
