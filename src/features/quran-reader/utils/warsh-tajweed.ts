import type { Ayah, Surah } from '@/lib/quranpedia/types';
import { pageFingerprint } from './page-fingerprint';
import type { TajweedRun, TajweedSurah } from './tajweed';

export interface WarshTajweedData {
  version: number;
  mushafId: number;
  rules: string[];
  ayahs: Record<string, [string, [number, number, number][]]>;
}

/** One place where the text the colours were made for may be spelt otherwise. */
interface Site { at: number; length: number; options: string[] }
/** A spelling of the ayah, and for each of its offsets (and its end) the offset in the ayah. */
interface Spelling { text: string; offsets: number[] }

/* eslint-disable no-restricted-syntax -- Quran letters, for aligning Quran text. */
const TATWEEL = 'ـ';
/** Shadda before or after its vowel: the same letter, which Quranpedia has written both ways. */
const SHADDA_ORDERS = [
  (text: string) => text,
  (text: string) => text.replace(/([\u064B-\u0650\u0656\u0657\u065E])\u0651/g, '\u0651$1'),
  (text: string) => text.replace(/\u0651([\u064B-\u0650\u0656\u0657\u065E])/g, '$1\u0651'),
];
/** Most places respelt at once. On 2026-11-12 no ayah needed more than two (25 needed two). */
const MAX_CHANGES = 4;

/**
 * Places where the 2026-10 Warsh text could be spelt otherwise for the same reading: the length
 * of a tatweel (presentation only), a tatweel before a small yeh, ئ or ي with hamza above, آ
 * composed or not, and a no-break space after ۞.
 */
function sites(text: string): Site[] {
  const found: Site[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === TATWEEL) {
      let end = i + 1;
      while (text[end] === TATWEEL) end++;
      const length = end - i;
      found.push({ at: i, length, options: [TATWEEL.repeat(length), TATWEEL.repeat(length + 1), TATWEEL.repeat(length - 1)] });
      i = end - 1;
    } else if (char === '\u06E7' && text[i - 1] !== TATWEEL) found.push({ at: i, length: 0, options: ['', TATWEEL] });
    else if (char === '\u0626') found.push({ at: i, length: 1, options: [char, '\u064A\u0654'] });
    else if (char === '\u0622') found.push({ at: i, length: 1, options: [char, '\u0627\u0653'] });
    else if (char === '\u0627' && text[i + 1] === '\u0653') found.push({ at: i, length: 2, options: ['\u0627\u0653', '\u0622'] });
    else if (char === ' ' && text[i - 1] === '\u06DE') found.push({ at: i, length: 1, options: [' ', '\u00A0'] });
  }
  return found;
}

/* eslint-enable no-restricted-syntax */

/** `ordered` with the chosen places respelt, and where each of its offsets falls in it. */
function respell(ordered: string, places: Site[], chosen: Map<Site, string>): Spelling {
  let spelt = '', from = 0;
  const offsets: number[] = [];
  const copy = (to: number) => { for (let i = from; i < to; i++) offsets.push(i); spelt += ordered.slice(from, to); };
  for (const [site, option] of [...chosen].sort((x, y) => x[0].at - y[0].at)) {
    copy(site.at);
    // A respelt place maps onto the ayah's own spelling of it, which colours never split.
    for (let i = 0; i < option.length; i++) offsets.push(site.at + Math.min(i, site.length));
    spelt += option;
    from = site.at + site.length;
  }
  copy(ordered.length);
  offsets.push(ordered.length);
  return { text: spelt, offsets };
}

/**
 * Spellings of the ayah, fewest changes first, of the target length only (the fingerprint starts
 * with it), so a long ayah with many places is still searched quickly.
 */
function* spellings(text: string, length: number): Generator<Spelling> {
  for (const order of SHADDA_ORDERS) {
    const ordered = order(text);
    if (order !== SHADDA_ORDERS[0] && ordered === text) continue;
    const places = sites(ordered);
    const chosen = new Map<Site, string>();
    function* choose(from: number, changes: number, delta: number): Generator<Spelling> {
      if (changes === 0) {
        if (ordered.length + delta === length) yield respell(ordered, places, chosen);
        return;
      }
      for (let i = from; i < places.length; i++) {
        const site = places[i];
        for (const option of site.options.slice(1)) {
          chosen.set(site, option);
          yield* choose(i + 1, changes - 1, delta + option.length - site.length);
          chosen.delete(site);
        }
      }
    }
    for (let changes = 0; changes <= MAX_CHANGES; changes++) yield* choose(0, changes, 0);
  }
}

/** The ayah as the colours were made for it (by its fingerprint), or none if it reads otherwise. */
export function matchWarshSpelling(text: string, fingerprint: string): Spelling | undefined {
  const length = Number(fingerprint.split('-')[0]);
  for (const spelling of spellings(text, length)) if (pageFingerprint(spelling.text) === fingerprint) return spelling;
}

/** The ayah's coloured runs, or none if the colours do not fit its text. */
function colourAyah(ayah: Ayah, entry: [string, [number, number, number][]] | undefined, rules: string[]): TajweedRun[] | undefined {
  const spelling = entry && matchWarshSpelling(ayah.text, entry[0]);
  if (!spelling) return;
  let offset = 0, previous = 0;
  const runs: TajweedRun[] = [];
  for (const [start, end, rule] of entry[1]) {
    if (![start, end, rule].every(Number.isInteger) || start < previous || end <= start || end > spelling.text.length || !rules[rule]) {
      throw new Error('Invalid Warsh color span');
    }
    previous = end;
    const from = Math.max(offset, spelling.offsets[start]), to = spelling.offsets[end];
    if (to <= from) continue;
    if (from > offset) runs.push({ text: ayah.text.slice(offset, from) });
    runs.push({ text: ayah.text.slice(from, to), rule: rules[rule] });
    offset = to;
  }
  if (offset < ayah.text.length) runs.push({ text: ayah.text.slice(offset) });
  return runs;
}

/**
 * Offline spans belong to this edition's 2026-10 spelling and are checked ayah by ayah. An ayah
 * that now reads otherwise (Quranpedia changed a sign or a letter) stays in plain ink rather than
 * take shifted colours; a surah where no ayah matches is an error.
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
