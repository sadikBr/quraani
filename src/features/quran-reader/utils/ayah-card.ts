import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';

export const ayahCardThemes = {
  emerald: { label: 'زمردي', background: '#103C32', surface: '#16483C', text: '#FAF4DF', muted: '#B6C9BB', accent: '#D7B875', border: '#48705B' },
  paper: { label: 'ورقي', background: '#F5EEDC', surface: '#FCF8EC', text: '#303D32', muted: '#69705C', accent: '#8C672F', border: '#D8C7A3' },
  night: { label: 'ليلي', background: '#17202D', surface: '#202C3D', text: '#F6F0E2', muted: '#AEBCCB', accent: '#CDAF78', border: '#475368' },
} as const;
export type AyahCardColors = { background: string; surface: string; text: string; muted: string; accent: string; border: string };
/** 'app' follows whatever reader theme is in use, so the card matches the screen it came from. */
export type AyahCardTheme = keyof typeof ayahCardThemes | 'app';
export function appCardColors(palette: { background: string; card: string; foreground: string; mutedForeground: string; ornament: string; border: string }): AyahCardColors {
  return { background: palette.background, surface: palette.card, text: palette.foreground, muted: palette.mutedForeground, accent: palette.ornament, border: palette.border };
}
export function cardColors(theme: AyahCardTheme, palette: Parameters<typeof appCardColors>[0]): AyahCardColors {
  return theme === 'app' ? appCardColors(palette) : ayahCardThemes[theme];
}
export type AyahCardFormat = 'status' | 'square';
export type CardTranslation = { text: string; source: string; bookId: number };

/** Keep one source across every parallel Hafs ayah; never mix translators. */
export function cardTranslation(rows: RelatedText[][]): CardTranslation | null {
  if (!rows.length) return null;
  const source = rows[0].find((candidate) => rows.every((row) => row.some((item) => item.book.id === candidate.book.id && item.texts.some((text) => relatedPlainText(text)))));
  if (!source) return null;
  return {
    bookId: source.book.id,
    source: source.book.name,
    text: rows.map((row) => row.find((item) => item.book.id === source.book.id)!.texts.map(relatedPlainText).filter(Boolean).join('\n')).join('\n'),
  };
}

/** Diacritics don't occupy a separate letter width. This only sizes the font;
 * the original Quran text is always rendered unchanged, without a line limit. */
export function cardQuranFontSize(text: string, translated: boolean, format: AyahCardFormat): number {
  const length = text.replace(/\p{M}/gu, '').length;
  if (format === 'square') return length > 160 || translated ? 22 : 28;
  if (length > 320) return 22;
  if (length > 160) return 26;
  if (translated) return 28;
  return length > 70 ? 30 : 36;
}

export function cardMinimumHeight(width: number, format: AyahCardFormat): number {
  return format === 'status' ? width * 16 / 9 : width;
}
