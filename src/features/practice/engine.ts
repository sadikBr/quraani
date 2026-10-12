import { mergeSpans } from '@/features/plans/memorization';
import type { AyahSpan } from '@/features/plans/types';
import { ayahWords } from '@/features/quran-reader/utils/page-practice';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';

/**
 * Tasmee' (التسميع): a place in the mushaf is shown by its first words (or by a whole ayah), and
 * what goes with it is recited from memory: the rest, what follows, or what comes before. Or the
 * ayah is shown and its surah is asked. An exam mixes them all. This module picks the places and
 * works out each cue; it is pure so it can be tested on its own.
 */

/**
 * What is asked at a place. "complete": the first words of an ayah are shown, and the rest is
 * recited. "next": a whole ayah is shown, and what follows is recited. "previous": a whole ayah
 * is shown, and what comes before it is recited. "surah": a whole ayah is shown, and its surah is
 * chosen among a few.
 */
export type CueMode = 'complete' | 'next' | 'previous' | 'surah';
/** How far to recite: to the end of the ayah, about three ayahs, or to the end of the page. */
export type Reach = 'ayah' | 'ayahs' | 'page';
export type Grade = 'good' | 'hesitant' | 'wrong';
export const CUE_MODES = ['complete', 'next', 'previous', 'surah'] as const satisfies readonly CueMode[];
/** Kinds where a passage is recited from memory (the surah question is answered by choosing). */
export const recites = (kind: CueMode) => kind !== 'surah';
export const REACHES = ['ayah', 'ayahs', 'page'] as const satisfies readonly Reach[];
export const PLACE_COUNTS = [5, 10, 20] as const;
/** Questions in an exam. */
export const EXAM_COUNTS = [10, 20] as const;
/** Surahs offered in a surah question (fewer when the mushaf has fewer). */
export const SURAH_CHOICES = 4;
export const GRADES = ['good', 'hesitant', 'wrong'] as const satisfies readonly Grade[];

export interface PracticeOptions { cue: CueMode; reach: Reach; count: number }

export interface SourceAyah { surahNumber: number; ayahNumber: number; pageNumber: number; text: string }
/** The mushaf in reading order (a goal's PlanIndex fits). */
export interface PracticeSource { ayahs: readonly SourceAyah[] }

export interface PracticePlace {
  /** Saved results are kept by surah and ayah ("2:255"). */
  key: string;
  /** What is asked here. */
  kind: CueMode;
  /** The ayah the cue comes from (its position in the mushaf). */
  ayah: number;
  /** Words of that ayah shown; all of them but in "complete". */
  shown: number;
  /**
   * Ayahs shown with it so that it cannot be mistaken for a similar place (0–2): before it, or
   * after it in "previous" (where the ayahs before it are the answer).
   */
  context: number;
  /** Even so the cue repeats in the Quran (a surah's opening letters): the place is named (surah and ayah). */
  surah: boolean;
  /** Where the recitation stops (exclusive); in "previous" and "surah", after the cue and its context. */
  end: number;
  /** "previous": the first ayah recited; the recitation runs from it up to the cue. */
  from?: number;
  /** "surah": the surah numbers offered, in the order shown, the ayah's own among them. */
  choices?: number[];
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
 * True when no other place in the mushaf shows the same cue: the same first `shown` words (a whole
 * ayah but in "complete"), with the same `context` ayahs before it (after it in "previous").
 */
function unique(c: Corpus, ayah: number, shown: number, context: number, mode: CueMode) {
  const words = c.words[ayah];
  const whole = mode !== 'complete';
  if (!context) {
    if (whole) return c.fulls.get(c.full[ayah]) === 1;
    if (shown <= MAX_PREFIX) return c.prefixes.get(words.slice(0, shown).join(' ')) === 1;
  }
  const cue = words.slice(0, shown);
  const step = mode === 'previous' ? 1 : -1;
  for (let j = 0; j < c.words.length; j++) {
    if (j === ayah) continue;
    if (whole ? c.full[j] !== c.full[ayah] : !startsWith(c.words[j], cue)) continue;
    let same = true;
    for (let m = 1; m <= context && same; m++) same = c.full[j + m * step] !== undefined && c.full[j + m * step] === c.full[ayah + m * step];
    if (same) return false;
  }
  return true;
}

/**
 * Shown context stays inside the ayah's own surah: before it, or after it in "previous" (at the
 * surah's edge, the surah is named instead).
 */
function contextAvailable(source: PracticeSource, ayah: number, context: number, mode: CueMode) {
  const other = source.ayahs[mode === 'previous' ? ayah + context : ayah - context];
  return context === 0 || (!!other && other.surahNumber === source.ayahs[ayah].surahNumber);
}

/** True when the ayah's words are found in its own surah only (a refrain within one surah still names it). */
function inOneSurah(source: PracticeSource, c: Corpus, ayah: number) {
  if (c.fulls.get(c.full[ayah]) === 1) return true;
  const surah = source.ayahs[ayah].surahNumber;
  return c.full.every((text, j) => text !== c.full[ayah] || source.ayahs[j].surahNumber === surah);
}

/**
 * The cue for a place: the fewest words that point to it alone, else the same after the fewest
 * ayahs before it (in its surah). When even that repeats (a surah's opening letters, an ayah that
 * begins the next one), the place itself is named: its surah and ayah number are shown.
 */
export function cueFor(source: PracticeSource, ayah: number, mode: CueMode): Pick<PracticePlace, 'shown' | 'context' | 'surah'> {
  const c = corpus(source);
  const length = c.words[ayah].length;
  // The surah question shows the ayah alone: it is asked only of ayahs found in one surah.
  if (mode === 'surah') return { shown: length, context: 0, surah: false };
  const first = mode === 'complete' ? Math.min(length, MIN_CUE) : length;
  for (let context = 0; context <= MAX_CONTEXT && contextAvailable(source, ayah, context, mode); context++) {
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

/**
 * "previous": where the recitation starts, so that it runs up to the cue: the ayah before it, about
 * three, or the start of the page of the one before it. It stays in the cue's surah and span, and
 * takes in more ayahs when too few words would be recited; null when there is nothing before.
 */
export function startFor(source: PracticeSource, ayah: number, reach: Reach, span: AyahSpan): number | null {
  const c = corpus(source);
  const surah = source.ayahs[ayah].surahNumber;
  let floor = ayah;
  while (floor > span.start && source.ayahs[floor - 1].surahNumber === surah) floor--;
  if (ayah - 1 < floor) return null;
  let from = ayah - 1;
  if (reach === 'page') {
    const page = source.ayahs[from].pageNumber;
    while (from > floor && source.ayahs[from - 1].pageNumber === page) from--;
  } else from = Math.max(floor, ayah - (reach === 'ayah' ? 1 : 3));
  const words = (start: number) => { let n = 0; for (let j = start; j < ayah; j++) n += c.words[j].length; return n; };
  while (from > floor && words(from) < MIN_RECITE) from--;
  return words(from) >= 2 ? from : null;
}

const spanOf = (spans: AyahSpan[], ayah: number) => spans.find((s) => ayah >= s.start && ayah < s.end);

/** Fewest words of an ayah asked about in a surah question (a word or two is a riddle, not a question). */
const MIN_SURAH_WORDS = 3;
/**
 * Most words of an ayah shown whole in a surah question, and in an exam's «ما بعدها» and
 * «ما قبلها»: a longer one (a page of Al-Baqarah) is asked to be completed instead.
 */
export const MAX_WHOLE_CUE = 40;

/**
 * The whole place for an ayah of the scope, or null when it cannot be one (the last ayah in
 * "next", the first of a surah in "previous", an ayah shared by several surahs in "surah"). A
 * surah question has its choices added by the caller (`withChoices`).
 */
export function placeFor(source: PracticeSource, ayah: number, options: Pick<PracticeOptions, 'cue' | 'reach'>, spans: AyahSpan[]): PracticePlace | null {
  const span = spanOf(spans, ayah);
  if (!span) return null;
  const kind = options.cue;
  const a = source.ayahs[ayah];
  const key = `${a.surahNumber}:${a.ayahNumber}`;
  const cue = cueFor(source, ayah, kind);
  if (kind === 'surah') {
    const c = corpus(source);
    if (c.words[ayah].length < MIN_SURAH_WORDS || c.words[ayah].length > MAX_WHOLE_CUE || !inOneSurah(source, c, ayah)) return null;
    return { key, kind, ayah, ...cue, end: ayah + 1 };
  }
  if (kind === 'previous') {
    const from = startFor(source, ayah, options.reach, span);
    if (from === null) return null;
    return { key, kind, ayah, ...cue, end: ayah + 1 + cue.context, from };
  }
  const end = endFor(source, ayah, cue.shown, options.reach, span);
  if (end === null) return null;
  return { key, kind, ayah, ...cue, end };
}

/** Ayahs of the scope that can open a place. */
export function candidates(source: PracticeSource, ranges: AyahSpan[], mode: CueMode): number[] {
  const c = corpus(source);
  const list: number[] = [];
  for (const span of mergeSpans(ranges)) {
    for (let i = Math.max(0, span.start); i < Math.min(span.end, c.words.length); i++) {
      // In "next" mode something must follow, in "previous" something must come before (in the
      // same surah); a long enough ayah can be completed on its own, or asked about.
      const usable = mode === 'previous' ? i > span.start && source.ayahs[i - 1].surahNumber === source.ayahs[i].surahNumber
        : mode === 'surah' ? c.words[i].length >= MIN_SURAH_WORDS && c.words[i].length <= MAX_WHOLE_CUE
          : i < span.end - 1 || (mode === 'complete' && c.words[i].length > MIN_CUE + 1);
      if (usable) list.push(i);
    }
  }
  return list;
}

/**
 * Surahs to offer for an ayah: its own and up to three others, those of the scope first (the
 * nearest ones likelier), then neighbours in the mushaf; in random order.
 */
export function surahChoices(source: PracticeSource, ayah: number, scopeSurahs: readonly number[], random: () => number = Math.random): number[] {
  const own = source.ayahs[ayah].surahNumber;
  const all = [...new Set(source.ayahs.map((a) => a.surahNumber))];
  const pick = (pool: number[], n: number) => {
    const chosen: number[] = [];
    const items = [...pool];
    while (chosen.length < n && items.length) {
      const at = pickWeighted(items, (surah) => 1 / (1 + Math.abs(surah - own)), random);
      chosen.push(...items.splice(at, 1));
    }
    return chosen;
  };
  const others = pick([...new Set(scopeSurahs)].filter((n) => n !== own), SURAH_CHOICES - 1);
  // Not enough in the scope: the surahs around it in the mushaf.
  if (others.length < SURAH_CHOICES - 1) {
    const near = all.filter((n) => n !== own && !others.includes(n)).sort((a, b) => Math.abs(a - own) - Math.abs(b - own) || a - b);
    others.push(...pick(near.slice(0, 8), SURAH_CHOICES - 1 - others.length));
  }
  const choices = [own, ...others];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

/**
 * Fewest surahs a scope needs for the surah question: with one or two, the answer is known before
 * the ayah is read.
 */
export const SURAH_QUESTION_SCOPE = 3;
export const surahQuestionFits = (source: PracticeSource, ranges: AyahSpan[]) => surahsOf(source, ranges).length >= SURAH_QUESTION_SCOPE;

/** The same places, surah choices in a new order (asked again just after the answer was shown). */
export function reshuffled(places: PracticePlace[], random: () => number = Math.random) {
  return places.map((place) => {
    if (!place.choices) return place;
    const choices = [...place.choices];
    for (let i = choices.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [choices[i], choices[j]] = [choices[j], choices[i]]; }
    return { ...place, choices };
  });
}

/** Surah questions given their choices, the other surahs drawn from `scopeSurahs`. */
export const withChoices = (source: PracticeSource, places: PracticePlace[], scopeSurahs: readonly number[], random: () => number = Math.random) =>
  places.map((place) => place.kind === 'surah' ? { ...place, choices: surahChoices(source, place.ayah, scopeSurahs, random) } : place);

/** The surah numbers a selection touches. */
export function surahsOf(source: PracticeSource, ranges: AyahSpan[]) {
  const surahs = new Set<number>();
  for (const span of mergeSpans(ranges)) for (let i = span.start; i < Math.min(span.end, source.ayahs.length); i++) surahs.add(source.ayahs[i].surahNumber);
  return [...surahs];
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

function pickWeighted(items: number[], weight: (item: number) => number, random: () => number) {
  const weights = items.map(weight);
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.floor(random() * items.length);
  let target = random() * total;
  for (let i = 0; i < items.length; i++) { target -= weights[i]; if (target < 0) return i; }
  return items.length - 1;
}

/** The ayahs a place shows or asks for, from the first to the last (exclusive). */
const extent = (place: PracticePlace) => [place.kind === 'previous' ? place.from! : place.ayah - place.context, place.end] as const;
const overlaps = (a: PracticePlace, b: PracticePlace) => { const [a0, a1] = extent(a), [b0, b1] = extent(b); return a0 < b1 && b0 < a1; };

/**
 * Places for a session, spread over the scope: it is cut into as many parts as places (by the
 * amount of text), and one place is drawn from each part. `weight` favours some ayahs (those
 * missed before) and keeps others back (those just practised). The order is shuffled. Surah
 * questions are offered surahs of the scope.
 */
export function choosePlaces(source: PracticeSource, ranges: AyahSpan[], options: PracticeOptions,
  weight: (ayah: number) => number = () => 1, random: () => number = Math.random): PracticePlace[] {
  const spans = mergeSpans(ranges);
  const places = spread(source, spans, candidates(source, spans, options.cue), options.count, () => [options.cue], options.reach, weight, random);
  return withChoices(source, places, surahsOf(source, spans), random);
}

/** The kinds of question an exam asks, in turn. */
export const EXAM_KINDS = ['complete', 'next', 'previous', 'surah'] as const satisfies readonly CueMode[];

/**
 * An exam: `count` places over the scope, as `choosePlaces`, each asking one kind of question,
 * the kinds taking turns so that each comes up about as often (one that cannot be asked at an
 * ayah gives way to another). Recitation runs to the end of an ayah or so. The surah question is
 * left out of a scope of fewer than `SURAH_QUESTION_SCOPE` surahs.
 */
export function chooseExam(source: PracticeSource, ranges: AyahSpan[], count: number,
  weight: (ayah: number) => number = () => 1, random: () => number = Math.random): PracticePlace[] {
  const spans = mergeSpans(ranges);
  const list: number[] = [];
  for (const span of spans) for (let i = Math.max(0, span.start); i < Math.min(span.end, source.ayahs.length); i++) list.push(i);
  const order: CueMode[] = EXAM_KINDS.filter((kind) => kind !== 'surah' || surahQuestionFits(source, spans));
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  let turn = 0;
  const kinds = () => { const first = turn++ % order.length; return order.map((_, i) => order[(first + i) % order.length]); };
  const places = spread(source, spans, list, count, kinds, 'ayah', weight, random, MAX_WHOLE_CUE);
  return withChoices(source, places, surahsOf(source, spans), random);
}

/**
 * Draws up to `wanted` places from the candidate ayahs `list`, one from each of as many parts of
 * the scope; `kinds` gives, for each place drawn, the kinds to try at an ayah, in order.
 */
function spread(source: PracticeSource, spans: AyahSpan[], list: number[], wanted: number, kinds: () => CueMode[], reach: Reach,
  weight: (ayah: number) => number, random: () => number, wholeLimit = Infinity): PracticePlace[] {
  const count = Math.min(wanted, list.length);
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
    const tries = kinds();
    while (items.length) {
      const at = pickWeighted(items, weight, random);
      const [ayah] = items.splice(at, 1);
      tried.add(ayah);
      for (const cue of tries) {
        if (cue !== 'complete' && wordCount(source, ayah) > wholeLimit) continue;
        const place = placeFor(source, ayah, { cue, reach }, spans);
        if (place && !chosen.some((other) => overlaps(other, place))) { chosen.push(place); return true; }
      }
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

/**
 * Places for given ayahs (the ones to review), each within the whole mushaf; one inside another's
 * text is left out. An ayah that cannot be asked that way (the first of a surah in "previous")
 * is asked to be completed instead. Surah questions are offered the surahs of the others.
 */
export function placesAt(source: PracticeSource, ayahs: number[], options: Pick<PracticeOptions, 'cue' | 'reach'>, random: () => number = Math.random): PracticePlace[] {
  const all = [{ start: 0, end: source.ayahs.length }];
  const places: PracticePlace[] = [];
  for (const ayah of ayahs) {
    const place = ayah >= 0 ? placeFor(source, ayah, options, all) ?? placeFor(source, ayah, { ...options, cue: 'complete' }, all) : null;
    if (place && !places.some((other) => overlaps(other, place))) places.push(place);
  }
  return withChoices(source, places, places.map((p) => source.ayahs[p.ayah].surahNumber), random);
}

/** What a session reports: how many of each grade. */
export function tally(grades: readonly (Grade | null)[]) {
  return { good: grades.filter((g) => g === 'good').length, hesitant: grades.filter((g) => g === 'hesitant').length,
    wrong: grades.filter((g) => g === 'wrong').length, graded: grades.filter(Boolean).length };
}

/** An exam's grade, as a teacher gives it, from its share of points (a hesitation counts half). */
export type ExamGrade = 'excellent' | 'veryGood' | 'good' | 'pass' | 'review';
export function examScore(counts: { good: number; hesitant: number }, total: number) {
  const points = counts.good + counts.hesitant / 2;
  const share = total ? points / total : 0;
  const grade: ExamGrade = share >= 0.9 ? 'excellent' : share >= 0.75 ? 'veryGood' : share >= 0.6 ? 'good' : share >= 0.5 ? 'pass' : 'review';
  return { points, share, grade };
}
