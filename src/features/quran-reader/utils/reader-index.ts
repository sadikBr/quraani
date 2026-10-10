import type { AyahReference } from '@/lib/quranpedia/types';
import type { ReaderContent } from '../types/reader';
import { normalizeArabicSearch, searchSurahs } from './search';
import { ayahDestination, parseReaderNumber } from './navigation';
import { t } from '@/i18n';

export type IndexKind = 'surah' | 'juz' | 'hizb';
export interface ReaderIndexItem {
  number: number;
  title: string;
  detail: string;
  pageNumber: number;
  start: AyahReference;
}

export function readerIndexItems(content: ReaderContent, kind: IndexKind, query = ''): ReaderIndexItem[] {
  if (kind === 'surah') return searchSurahs(content.quran, query).flatMap((surah) => {
    const first = surah.ayahs.find((ayah) => ayah.ayahNumber === 1) ?? surah.ayahs[0];
    return first ? [{ number: surah.number, title: surah.name, detail: t('reader.index.ayahCount', { count: surah.ayahs.length }),
      pageNumber: first.pageNumber, start: { mushafId: content.quran.id, surahNumber: surah.number, ayahNumber: first.ayahNumber } }] : [];
  });
  const entries = kind === 'juz' ? content.juzIndex : content.hizbIndex;
  // Number tokens (Arabic-Indic or Latin) select the division exactly: "الحزب 5" is not 50–59.
  const tokens = normalizeArabicSearch(query).match(/\d+|[^\s\d]+/g) ?? [];
  return entries.map((entry) => ({ ...entry, title: kind === 'juz' ? t('reader.divisions.juz', { juz: entry.number }) : t('reader.divisions.hizb', { hizb: entry.number }),
    detail: t('reader.ayah.reference', { surah: content.quran.surahs.find((surah) => surah.number === entry.start.surahNumber)?.name ?? t('reader.surahNumber', { surah: entry.start.surahNumber }), ayah: entry.start.ayahNumber }) }))
    .filter((item) => {
      const words = normalizeArabicSearch(`${item.title} ${item.detail}`).replace(/\d+/g, ' ');
      return tokens.every((token) => /^\d+$/.test(token) ? Number(token) === item.number : words.includes(token));
    });
}

/** Route input is validated against the selected edition before jumping. */
export function indexRouteDestination(content: ReaderContent, surah: unknown, ayah: unknown) {
  if (typeof surah !== 'string' || typeof ayah !== 'string') return undefined;
  return ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
}
