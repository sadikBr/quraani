import type { Surah } from '@/lib/quranpedia/types';
import { pageFingerprint } from './page-fingerprint';
import type { TajweedRun, TajweedSurah } from './tajweed';

export interface WarshTajweedData {
  version: number;
  mushafId: number;
  rules: string[];
  ayahs: Record<string, [string, [number, number, number][]]>;
}

/** Offline spans belong to this exact edition and spelling. A newer corpus
 * must fail safely to plain text instead of reusing shifted character offsets. */
export function decodeWarshTajweed(surah: Surah, data: WarshTajweedData): TajweedSurah {
  if (data.version !== 1 || data.mushafId !== 4) throw new Error('Unsupported Warsh colors');
  const result: TajweedSurah = {};
  for (const ayah of surah.ayahs) {
    const entry = data.ayahs[`${surah.number}:${ayah.ayahNumber}`];
    if (ayah.mushafId !== 4 || ayah.surahNumber !== surah.number || !entry || entry[0] !== pageFingerprint(ayah.text)) {
      throw new Error('Warsh colors do not match the original ayah');
    }
    let offset = 0;
    const runs: TajweedRun[] = [];
    for (const [start, end, rule] of entry[1]) {
      if (![start, end, rule].every(Number.isInteger) || start < offset || end <= start || end > ayah.text.length || !data.rules[rule]) {
        throw new Error('Invalid Warsh color span');
      }
      if (start > offset) runs.push({ text: ayah.text.slice(offset, start) });
      runs.push({ text: ayah.text.slice(start, end), rule: data.rules[rule] });
      offset = end;
    }
    if (offset < ayah.text.length) runs.push({ text: ayah.text.slice(offset) });
    result[ayah.ayahNumber] = runs;
  }
  return result;
}
