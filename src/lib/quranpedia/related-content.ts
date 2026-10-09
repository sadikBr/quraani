import { QuranpediaError } from './errors';
export interface ContentBook { id: number; name: string; author: string }
export interface RelatedText { book: ContentBook; texts: string[]; direction: 'rtl' | 'ltr' }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new QuranpediaError('invalid-response', 'Invalid related content');
  return value as Record<string, unknown>;
}
function book(value: unknown): ContentBook {
  const v = record(value);
  if (!Number.isSafeInteger(v.id) || Number(v.id) <= 0 || typeof v.name !== 'string' || !v.name) throw new QuranpediaError('invalid-response', 'Invalid content source');
  const author = typeof v.author === 'string' ? v.author : v.author ? record(v.author).ar_name : Array.isArray(v.authors) ? v.authors.map((a) => record(a).ar_name).filter((a) => typeof a === 'string').join('، ') : '';
  return { id: Number(v.id), name: v.name, author: typeof author === 'string' ? author : '' };
}
export function decodeBooks(value: unknown): ContentBook[] {
  if (!Array.isArray(value)) throw new QuranpediaError('invalid-response', 'Invalid book catalogue');
  return value.map(book);
}
export function decodeBookContent(value: unknown): RelatedText {
  const v = record(value);
  if (!Array.isArray(v.content)) throw new QuranpediaError('invalid-response', 'Invalid book content');
  const texts = v.content.map((entry) => { const text = record(entry).text; if (typeof text !== 'string') throw new QuranpediaError('invalid-response', 'Invalid book text'); return text; });
  const language = record(record(v.book).language);
  return { book: book(v.book), texts, direction: language.direction === 'ltr' ? 'ltr' : 'rtl' };
}
export function decodeTranslations(value: unknown): RelatedText[] {
  if (!Array.isArray(value)) throw new QuranpediaError('invalid-response', 'Invalid translations');
  return value.map((entry) => { const v = record(entry); const text = v['translation-content']; if (typeof text !== 'string') throw new QuranpediaError('invalid-response', 'Invalid translation text'); return { book: book(v.book), texts: [text], direction: 'ltr' }; });
}
/** Only accompanying prose is converted from HTML to plain text. Quran text is untouched. */
export function relatedPlainText(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<\/(?:p|div|li)>|<br\s*\/?\s*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (all, code: string) => { const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code); return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : all; })
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/g, (_, name: string) => ({ nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" })[name]!).trim();
}
