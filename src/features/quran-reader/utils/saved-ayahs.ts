import type { Quran } from '@/lib/quranpedia/types';
import { ayahKey } from './references';
import { createArabicMatcher, normalizeArabicSearch, searchableArabic, type QuranSearchResult } from './search';

export type SavedAyahOrder = 'quran' | 'recent';
/** Bookmark order is the existing saved insertion order; no new storage format. */
export function savedAyahs(quran: Quran, keys: string[]): QuranSearchResult[] {
  const wanted = new Set(keys);
  const found = new Map<string, QuranSearchResult>();
  for (const surah of quran.surahs) for (const ayah of surah.ayahs) {
    const key = ayahKey(ayah);
    if (wanted.has(key)) found.set(key, { reference: ayah, pageNumber: ayah.pageNumber, text: ayah.text, surahName: surah.name });
  }
  return [...wanted].flatMap(key => { const item = found.get(key); return item ? [item] : []; });
}
export function filterSavedAyahs(items: QuranSearchResult[], query: string, order: SavedAyahOrder) {
  const normalized = normalizeArabicSearch(query);
  const reference = /^(\d+)\s*[:：]\s*(\d+)$/.exec(normalized);
  const matches = createArabicMatcher(query);
  const filtered = items.filter(item => !normalized || (reference
    ? item.reference.surahNumber === Number(reference[1]) && item.reference.ayahNumber === Number(reference[2])
    : (matches ? matches(searchableArabic(`${item.surahName} ${item.text}`)) : normalizeArabicSearch(`${item.surahName} ${item.text}`).includes(normalized)) || String(item.reference.surahNumber) === normalized));
  return order === 'recent' ? filtered.reverse() : filtered.sort((a, b) => a.reference.surahNumber - b.reference.surahNumber || a.reference.ayahNumber - b.reference.ayahNumber);
}
