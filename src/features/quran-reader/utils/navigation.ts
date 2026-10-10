import { printedPageAyah } from './printed-page-ayahs';
import type { AyahReference } from '@/lib/quranpedia/types';
import type { ReaderContent } from '../types/reader';

export interface ReadingPosition {
  mushafId: number;
  pageNumber: number;
  ayah: AyahReference | null;
  scrollY: number;
}

export function parseReaderNumber(value: string): number {
  // eslint-disable-next-line no-restricted-syntax -- Arabic-Indic digits for parsing typed numbers
  const digits = value.trim().replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  return /^\d+$/.test(digits) ? Number(digits) : NaN;
}

export function ayahDestination(content: ReaderContent, surah: number, ayah: number) {
  return content.quran.surahs.find((value) => value.number === surah)?.ayahs.find((value) => value.ayahNumber === ayah);
}

export function restoreReadingPosition(raw: string | null, content: ReaderContent): ReadingPosition {
  const fallback: ReadingPosition = { mushafId: content.quran.id, pageNumber: content.pages[0].number, ayah: null, scrollY: 0 };
  try {
    const saved = JSON.parse(raw ?? 'null');
    if (saved?.mushafId !== content.quran.id || !content.pages.some((page) => page.number === saved.pageNumber)) return fallback;
    const target = saved.ayah?.mushafId === content.quran.id ? ayahDestination(content, saved.ayah.surahNumber, saved.ayah.ayahNumber) : undefined;
    const savedPage = content.pages.find((page) => page.number === saved.pageNumber)!;
    const onSavedPage = target && printedPageAyah(savedPage, target);
    return { mushafId: content.quran.id, pageNumber: onSavedPage ? saved.pageNumber : target?.pageNumber ?? saved.pageNumber,
      ayah: target ? { mushafId: content.quran.id, surahNumber: target.surahNumber, ayahNumber: target.ayahNumber } : null,
      scrollY: Number.isFinite(saved.scrollY) && saved.scrollY >= 0 ? Math.min(saved.scrollY, 100000) : 0 };
  } catch { return fallback; }
}

/** RTL mushaf: moving the page to the right reveals the following page. */
export function swipePageDelta(dx: number, dy: number, vx: number): number {
  if (Math.abs(dx) < Math.abs(dy) * 1.5 || !(Math.abs(dx) >= 50 || (Math.abs(dx) >= 20 && Math.abs(vx) >= 0.5))) return 0;
  return dx > 0 ? 1 : -1;
}

export function nearbyPageNumbers(page: number, total: number): number[] {
  return [page + 1, page - 1, page + 2, page - 2].filter((value) => value >= 1 && value <= total);
}

/** Prepare a runway in the reading direction, retaining a smaller return buffer. */
export function preloadPageNumbers(page: number, total: number, direction: number = 1): number[] {
  const step = direction < 0 ? -1 : 1;
  const numbers = [page];
  for (let distance = 1; distance <= 12; distance++) {
    numbers.push(page + step * distance);
    if (distance <= 4) numbers.push(page - step * distance);
  }
  return numbers.filter((number) => number >= 1 && number <= total);
}
