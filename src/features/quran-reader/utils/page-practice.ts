import type { Ayah } from '@/lib/quranpedia/types';
import type { QuranPage } from '../types/reader';
import { ayahKey } from './references';
import { precedingPageAyah } from './printed-page-ayahs';

export interface PracticeAyah {
  ayah: Ayah;
  words: string[];
  start: number;
  end: number;
}

export interface PagePractice {
  page: QuranPage;
  pageNumber: number;
  ayahs: PracticeAyah[];
  totalWords: number;
}

/** Keep every source character and vowel mark; standalone ornaments are not words. */
export function ayahWords(text: string): string[] {
  const words: string[] = [];
  let prefix = '';
  for (const part of text.match(/\s+|\S+/gu) ?? []) {
    if (/[\p{L}\p{N}]/u.test(part)) {
      words.push(prefix + part);
      prefix = '';
    } else if (words.length) words[words.length - 1] += part;
    else prefix += part;
  }
  if (prefix) words.push(prefix);
  return words;
}

export function createPagePractice(page: QuranPage, printedRegions?: readonly { surah: number; ayah: number }[]): PagePractice {
  const previous = precedingPageAyah(page);
  const continues = previous && printedRegions?.some((region) => region.surah === previous.surahNumber && region.ayah === previous.ayahNumber);
  const sourceAyahs = continues && !page.ayahs.some((ayah) => ayahKey(ayah) === ayahKey(previous)) ? [previous, ...page.ayahs] : page.ayahs;
  let totalWords = 0;
  const ayahs = sourceAyahs.map((ayah) => {
    const words = ayahWords(ayah.text);
    const start = totalWords;
    totalWords += words.length;
    return { ayah, words, start, end: totalWords };
  });
  return { page: { ...page, ayahs: sourceAyahs }, pageNumber: page.number, ayahs, totalWords };
}

export function revealNext(plan: PagePractice, revealed: number, unit: 'word' | 'ayah'): number {
  const count = Math.max(0, Math.min(plan.totalWords, Math.floor(revealed)));
  if (unit === 'word') return Math.min(plan.totalWords, count + 1);
  return plan.ayahs.find((entry) => entry.end > count)?.end ?? plan.totalWords;
}

export function practiceVisibility(plan: PagePractice, revealed: number): ReadonlyMap<string, number> {
  return new Map(plan.ayahs.map((entry) => [ayahKey(entry.ayah), Math.max(0, Math.min(entry.words.length, revealed - entry.start))]));
}
