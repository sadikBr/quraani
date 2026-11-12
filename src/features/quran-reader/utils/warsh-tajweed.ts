import type { Ayah, Surah } from '@/lib/quranpedia/types';
import { pageFingerprint } from './page-fingerprint';
import type { TajweedRun, TajweedSurah } from './tajweed';

export interface WarshTajweedData {
  version: number;
  mushafId: number;
  rules: string[];
  ayahs: Record<string, [string, [number, number, number][]]>;
}

/** The ayah's coloured runs, or none if the colours were not made for this text. */
function colourAyah(ayah: Ayah, entry: [string, [number, number, number][]] | undefined, rules: string[]): TajweedRun[] | undefined {
  if (!entry || entry[0] !== pageFingerprint(ayah.text)) return;
  let offset = 0;
  const runs: TajweedRun[] = [];
  for (const [start, end, rule] of entry[1]) {
    if (![start, end, rule].every(Number.isInteger) || start < offset || end <= start || end > ayah.text.length || !rules[rule]) {
      throw new Error('Invalid Warsh color span');
    }
    if (start > offset) runs.push({ text: ayah.text.slice(offset, start) });
    runs.push({ text: ayah.text.slice(start, end), rule: rules[rule] });
    offset = end;
  }
  if (offset < ayah.text.length) runs.push({ text: ayah.text.slice(offset) });
  return runs;
}

/**
 * Offline spans belong to this exact edition and spelling: the text bundled with the app, which
 * they are generated from (tests/bundled-quran.test.js checks every ayah). Each ayah is checked
 * by its fingerprint all the same: one that reads otherwise stays in plain ink rather than take
 * shifted colours, and a surah where no ayah matches is an error.
 */
export function decodeWarshTajweed(surah: Surah, data: WarshTajweedData): TajweedSurah {
  if (data.version !== 1 || data.mushafId !== 4) throw new Error('Unsupported Warsh colors');
  const result: TajweedSurah = {};
  let coloured = 0;
  for (const ayah of surah.ayahs) {
    if (ayah.mushafId !== 4 || ayah.surahNumber !== surah.number) throw new Error('Warsh colors do not match the original ayah');
    const runs = colourAyah(ayah, data.ayahs[`${surah.number}:${ayah.ayahNumber}`], data.rules);
    if (runs) coloured++;
    result[ayah.ayahNumber] = runs ?? [{ text: ayah.text }];
  }
  if (!coloured) throw new Error('Warsh colors do not match the original ayah');
  return result;
}
