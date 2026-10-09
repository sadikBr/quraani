import type { AyahReference } from '@/lib/quranpedia/types';
import type { ReaderContent } from '../types/reader';
import { searchSurahs } from './search';
import { ayahDestination, parseReaderNumber } from './navigation';

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
    return first ? [{ number: surah.number, title: surah.name, detail: `${surah.ayahs.length} آيات`,
      pageNumber: first.pageNumber, start: { mushafId: content.quran.id, surahNumber: surah.number, ayahNumber: first.ayahNumber } }] : [];
  });
  const entries = kind === 'juz' ? content.juzIndex : content.hizbIndex;
  return entries.map((entry) => ({ ...entry, title: `${kind === 'juz' ? 'الجزء' : 'الحزب'} ${entry.number}`,
    detail: `${content.quran.surahs.find((surah) => surah.number === entry.start.surahNumber)?.name ?? `السورة ${entry.start.surahNumber}`} · الآية ${entry.start.ayahNumber}` }));
}

/** Route input is validated against the selected edition before jumping. */
export function indexRouteDestination(content: ReaderContent, surah: unknown, ayah: unknown) {
  if (typeof surah !== 'string' || typeof ayah !== 'string') return undefined;
  return ayahDestination(content, parseReaderNumber(surah), parseReaderNumber(ayah));
}
