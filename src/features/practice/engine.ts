import { mergeSpans } from '@/features/plans/memorization';
import type { AyahSpan } from '@/features/plans/types';
import { ayahWords } from '@/features/quran-reader/utils/page-practice';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';

/**
 * Tasmee' (التسميع): a place in the mushaf is shown by its first words (or by the ayah before it),
 * and the rest is recited from memory. This module picks the places and works out each cue; it is
 * pure so it can be tested on its own.
 */

/** "complete": the first words of an ayah are shown. "next": a whole ayah is shown, and what follows is recited. */
export type CueMode = 'complete' | 'next';
/** How far to recite: to the end of the ayah, about three ayahs, or to the end of the page. */
export type Reach = 'ayah' | 'ayahs' | 'page';
export type Grade = 'good' | 'hesitant' | 'wrong';
export const CUE_MODES = ['complete', 'next'] as const satisfies readonly CueMode[];
export const REACHES = ['ayah', 'ayahs', 'page'] as const satisfies readonly Reach[];
export const PLACE_COUNTS = [5, 10, 20] as const;
export const GRADES = ['good', 'hesitant', 'wrong'] as const satisfies readonly Grade[];

export interface PracticeOptions { cue: CueMode; reach: Reach; count: number }

export interface SourceAyah { surahNumber: number; ayahNumber: number; pageNumber: number; text: string }
/** The mushaf in reading order (a goal's PlanIndex fits). */
export interface PracticeSource { ayahs: readonly SourceAyah[] }

export interface PracticePlace {
  /** Saved results are kept by surah and ayah ("2:255"). */
  key: string;
  /** The ayah the cue comes from (its position in the mushaf). */
  ayah: number;
  /** Words of that ayah shown; in "next" mode, all of them. */
  shown: number;
  /** Ayahs shown before it so that it cannot be mistaken for a similar place (0–2). */
  context: number;
  /** Even so the cue repeats in the Quran (a surah's opening letters): the place is named (surah and ayah). */
  surah: boolean;
  /** Where the recitation stops (exclusive). */
  end: number;
}

/** Fewest words shown of an ayah (all of a shorter one). */
const MIN_CUE = 3;
/** Fewest words to recite, when the scope allows. */
const MIN_RECITE = 4;
const MAX_CONTEXT = 2;
/** Opening sequences longer than this are compared word by word instead of looked up. */
const MAX_PREFIX = 16;

interface Corpus { words: string[][]; full: string[]; prefixes: Map<string, number>; fulls: Map<string, number> }
const corpora = new WeakMap<object, Corpus>();

/** Each ayah's words, normalized (marks and spelling variants folded) for comparison. */
function corpus(source: PracticeSource): Corpus {
  const cached = corpora.get(source.ayahs);
  if (cached) return cached;
  const words = source.ayahs.map((a) => ayahWords(a.text).map(normalizeArabicSearch));
  const full = words.map((w) => w.join(' '));
  const prefixes = new Map<string, number>(), fulls = new Map<string, number>();
  words.forEach((w, i) => {
    for (let k = 1; k <= Math.min(w.length, MAX_PREFIX); k++) {
      const key = w.slice(0, k).join(' ');
      prefixes.set(key, (prefixes.get(key) ?? 0) + 1);
    }
    fulls.set(full[i], (fulls.get(full[i]) ?? 0) + 1);
  });
  const result = { words, full, prefixes, fulls };
  corpora.set(source.ayahs, result);
  return result;
}

/** Words of an ayah as shown and revealed (with their marks). */
export const wordCount = (source: PracticeSource, ayah: number) => corpus(source).words[ayah]?.length ?? 0;

const startsWith = (words: string[], prefix: string[]) => words.length >= prefix.length && prefix.every((w, i) => words[i] === w);

/**
 * True when no other place in the mushaf shows the same cue: the same first `shown` words (in
 * "next" mode, the same whole ayah), after the same `context` ayahs.
 */
function unique(c: Corpus, ayah: number, shown: number, context: number, mode: CueMode) {
  const words = c.words[ayah];
  const whole = mode === 'next';
  if (!context) {
    if (whole) return c.fulls.get(c.full[ayah]) === 1;
    if (shown <= MAX_PREFIX) return c.prefixes.get(words.slice(0, shown).join(' ')) === 1;
  }
  const cue = words.slice(0, shown);
  for (let j = 0; j < c.words.length; j++) {
    if (j === ayah) continue;
    if (whole ? c.full[j] !== c.full[ayah] : !startsWith(c.words[j], cue)) continue;
    let same = true;
    for (let m = 1; m <= context && same; m++) same = j - m >= 0 && c.full[j - m] === c.full[ayah - m];
    if (same) return false;
  }
  return true;
}

/** Shown context stays inside the ayah's own surah (before its first ayah, the surah is named instead). */
const contextAvailable = (source: PracticeSource, ayah: number, context: number) =>
  context === 0 || (ayah - context >= 0 && source.ayahs[ayah - context].surahNumber === source.ayahs[ayah].surahNumber);

/**
 * The cue for a place: the fewest words that point to it alone, else the same after the fewest
 * ayahs before it (in its surah). When even that repeats (a surah's opening letters, an ayah that
 * begins the next one), the place itself is named: its surah and ayah number are shown.
 */
export function cueFor(source: PracticeSource, ayah: number, mode: CueMode): Pick<PracticePlace, 'shown' | 'context' | 'surah'> {
  const c = corpus(source);
  const length = c.words[ayah].length;
  const first = mode === 'next' ? length : Math.min(length, MIN_CUE);
  for (let context = 0; context <= MAX_CONTEXT && contextAvailable(source, ayah, context); context++) {
    for (let shown = first; shown <= length; shown++) {
      if (unique(c, ayah, shown, context, mode)) return { shown, context, surah: false };
    }
  }
  return { shown: first, context: 0, surah: true };
}

/** Words recited from a place up to `end`: the rest of the cue's ayah, then whole ayahs. */
function recited(c: Corpus, ayah: number, shown: number, end: number) {
  let n = c.words[ayah].length - shown;
  for (let j = ayah + 1; j < end; j++) n += c.words[j].length;
  return n;
}

/** Where the recitation of a place stops, inside its span of the scope; null when nothing is left to recite. */
export function endFor(source: PracticeSource, ayah: number, shown: number, reach: Reach, span: AyahSpan): number | null {
  const c = corpus(source);
  const whole = shown >= c.words[ayah].length;
  const from = whole ? ayah + 1 : ayah;
  if (from >= span.end) return null;
  let end: number;
  if (reach === 'page') {
    const page = source.ayahs[from].pageNumber;
    end = from + 1;
    while (end < span.end && source.ayahs[end].pageNumber === page) end++;
  } else end = from + (reach === 'ayah' ? 1 : 3);
  end = Math.min(end, span.end);
  while (end < span.end && recited(c, ayah, shown, end) < MIN_RECITE) end++;
  return recited(c, ayah, shown, end) >= 2 ? end : null;
}

const spanOf = (spans: AyahSpan[], ayah: number) => spans.find((s) => ayah >= s.start && ayah < s.end);

/** The whole place for an ayah of the scope, or null when it cannot be one (e.g. the last ayah in "next" mode). */
export function placeFor(source: PracticeSource, ayah: number, options: Pick<PracticeOptions, 'cue' | 'reach'>, spans: AyahSpan[]): PracticePlace | null {
  const span = spanOf(spans, ayah);
  if (!span) return null;
  const cue = cueFor(source, ayah, options.cue);
  const end = endFor(source, ayah, cue.shown, options.reach, span);
  if (end === null) return null;
  const a = source.ayahs[ayah];
  return { key: `${a.surahNumber}:${a.ayahNumber}`, ayah, ...cue, end };
}

/** Ayahs of the scope that can open a place. */
export function candidates(source: PracticeSource, ranges: AyahSpan[], mode: CueMode): number[] {
  const c = corpus(source);
  const list: number[] = [];
  for (const span of mergeSpans(ranges)) {
    for (let i = Math.max(0, span.start); i < Math.min(span.end, c.words.length); i++) {
      // In "next" mode something must follow; otherwise a long enough ayah can be completed on its own.
      if (i < span.end - 1 || (mode === 'complete' && c.words[i].length > MIN_CUE + 1)) list.push(i);
    }
  }
  return list;
}

/** A small seeded generator, so sessions can be replayed in tests. */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted(items: number[], weight: (ayah: number) => number, random: () => number) {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(random() * items.length);
  let target = random() * total;
  for (let i = 0; i < items.length; i++) { target -= weights[i]; if (target < 0) return i; }
  return items.length - 1;
}

const overlaps = (a: PracticePlace, b: PracticePlace) => a.ayah - a.context < b.end && b.ayah - b.context < a.end;

/**
 * Places for a session, spread over the scope: it is cut into as many parts as places (by the
 * amount of text), and one place is drawn from each part. `weight` favours some ayahs (those
 * missed before) and keeps others back (those just practised). The order is shuffled.
 */
export function choosePlaces(source: PracticeSource, ranges: AyahSpan[], options: PracticeOptions,
  weight: (ayah: number) => number = () => 1, random: () => number = Math.random): PracticePlace[] {
  const spans = mergeSpans(ranges);
  const list = candidates(source, spans, options.cue);
  const count = Math.min(options.count, list.length);
  if (!count) return [];
  const sizes = list.map((i) => Math.max(1, wordCount(source, i)));
  const total = sizes.reduce((a, b) => a + b, 0);
  const buckets: number[][] = Array.from({ length: count }, () => []);
  let position = 0;
  list.forEach((ayah, i) => {
    buckets[Math.min(count - 1, Math.floor(((position + sizes[i] / 2) / total) * count))].push(ayah);
    position += sizes[i];
  });
  const chosen: PracticePlace[] = [];
  const tried = new Set<number>();
  const draw = (pool: number[]) => {
    const items = pool.filter((i) => !tried.has(i));
    while (items.length) {
      const at = pickWeighted(items, weight, random);
      const [ayah] = items.splice(at, 1);
      tried.add(ayah);
      const place = placeFor(source, ayah, options, spans);
      if (place && !chosen.some((other) => overlaps(other, place))) { chosen.push(place); return true; }
    }
    return false;
  };
  for (const bucket of buckets) draw(bucket);
  // A part with no usable place leaves room for another from anywhere in the scope.
  while (chosen.length < count && draw(list));
  for (let i = chosen.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [chosen[i], chosen[j]] = [chosen[j], chosen[i]];
  }
  return chosen;
}

/** The ayah's position from its key ("2:255"), or -1. */
export function ayahOf(source: PracticeSource, key: string) {
  const [surah, ayah] = key.split(':').map(Number);
  return source.ayahs.findIndex((a) => a.surahNumber === surah && a.ayahNumber === ayah);
}

/** Places for given ayahs (the ones to review), each recited within the whole mushaf; one inside another's text is left out. */
export function placesAt(source: PracticeSource, ayahs: number[], options: Pick<PracticeOptions, 'cue' | 'reach'>): PracticePlace[] {
  const all = [{ start: 0, end: source.ayahs.length }];
  const places: PracticePlace[] = [];
  for (const ayah of ayahs) {
    const place = ayah >= 0 ? placeFor(source, ayah, options, all) : null;
    if (place && !places.some((other) => overlaps(other, place))) places.push(place);
  }
  return places;
}

/** What a session reports: how many of each grade. */
export function tally(grades: readonly (Grade | null)[]) {
  return { good: grades.filter((g) => g === 'good').length, hesitant: grades.filter((g) => g === 'hesitant').length,
    wrong: grades.filter((g) => g === 'wrong').length, graded: grades.filter(Boolean).length };
}
