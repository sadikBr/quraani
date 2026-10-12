import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import type { ReadingPreferences } from '../state/reading-preferences';
import type { QuranPage, ReaderContent, ReaderPaging } from '../types/reader';
import { eighthInHizb, WARSH_EIGHTH_STARTS, warshEighthOf } from './warsh-eighths';
import { t } from '@/i18n';

/**
 * How the reader pages: by the mushaf's pages, or a page per thumun when chosen for Warsh in the
 * text view (the printed pages are the mushaf's own). A goal's reading keeps the mushaf's pages,
 * which its portions are counted in.
 */
export function readerPaging(preferences: Pick<ReadingPreferences, 'riwayah' | 'mode' | 'thumunPages'>, inGoal: boolean): ReaderPaging {
  return !inGoal && preferences.riwayah === 'warsh' && preferences.mode === 'text' && preferences.thumunPages ? 'thumun' : 'mushaf';
}

const paged = new WeakMap<ReaderContent, ReaderContent>();

/**
 * The Warsh content as the reader pages it by thumun: page n is the nth eighth (480 in all), and
 * each ayah's `pageNumber` is its eighth, so the reader's navigation (jumps, the saved position,
 * the index) finds its page as it does a mushaf page. Pages hold whole ayahs, so none continues
 * from the page before. The content itself, used everywhere else, is unchanged.
 */
export function paginateByThumun(content: ReaderContent): ReaderContent {
  const cached = paged.get(content);
  if (cached) return cached;
  const groups = new Map<number, Ayah[]>();
  const surahs = content.quran.surahs.map((surah) => ({
    ...surah,
    ayahs: surah.ayahs.map((ayah) => {
      const eighth = warshEighthOf(ayah.surahNumber, ayah.ayahNumber);
      const moved = { ...ayah, pageNumber: eighth };
      const group = groups.get(eighth) ?? [];
      group.push(moved);
      groups.set(eighth, group);
      return moved;
    }),
  }));
  const pages: QuranPage[] = [...groups].sort(([a], [b]) => a - b).map(([number, ayahs]) => ({ mushafId: content.quran.id, number, ayahs }));
  const relocate = <T extends { start: AyahReference; pageNumber: number }>(entry: T): T =>
    ({ ...entry, pageNumber: warshEighthOf(entry.start.surahNumber, entry.start.ayahNumber) });
  const result: ReaderContent = {
    quran: { ...content.quran, surahs },
    pages,
    juzIndex: content.juzIndex.map(relocate),
    hizbIndex: content.hizbIndex.map(relocate),
    quarterHizbIndex: content.quarterHizbIndex.map(relocate),
    paging: 'thumun',
  };
  paged.set(content, result);
  return result;
}

/** A thumun page's name: «الحزب ٢ · الثمن ١». */
export const thumunName = (page: number) => t('reader.thumun.position', eighthInHizb(page));

/** The first ayah of a page in the given paging, to carry a reading position to the other. */
export function pageStartAyah(content: ReaderContent, paging: ReaderPaging, page: number): AyahReference | undefined {
  if (paging === 'thumun') {
    const start = WARSH_EIGHTH_STARTS[page - 1];
    return start ? { mushafId: content.quran.id, surahNumber: start[0], ayahNumber: start[1] } : undefined;
  }
  const first = content.pages.find((value) => value.number === page)?.ayahs[0];
  return first ? { mushafId: first.mushafId, surahNumber: first.surahNumber, ayahNumber: first.ayahNumber } : undefined;
}
