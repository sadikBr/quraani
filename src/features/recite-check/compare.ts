/**
 * Compares what the speech recognition heard with the ayahs it should have heard, word by word, and
 * says which words were recited, which were said differently, which were left out and what was
 * added. Pure (no React Native), so it can be tested.
 *
 * It writes what it hears in ordinary Arabic spelling, with or without diacritics; the
 * mushaf is in the Uthmani script of its riwayah. So both are reduced to their letters first
 * (`normalizeWord`), and a word counts as recited when it is close enough letter by letter
 * (`similarity`), which absorbs spelling differences (الصلوة / الصلاة) but not a changed word
 * (قال / قل). Tajweed is not judged: only words.
 */

/** Letters as compared: marks dropped, letter variants unified, alef kept (قال is not قل). */
/* eslint-disable no-restricted-syntax -- letters mapped for comparison, not interface text */
export function normalizeWord(word: string): string {
  return word
    // Quranic and diacritic marks, tatweel and invisible joiners, but not the dagger alef yet.
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u08D3-\u08FF\u0640\u200C-\u200F]/g, '')
    // A dagger alef over a yeh or waw is a reading mark there (عَلَىٰ، الصلوٰة); elsewhere it is an alef (ذَٰلِكَ).
    .replace(/([\u0649\u064A\u06CC\u06D2\u0648])\u0670/g, '$1')
    .replace(/\u0670/g, '\u0627')
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627')
    .replace(/[\u0649\u06CC\u06D2\u0626]/g, '\u064A')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0629/g, '\u0647')
    .replace(/\u06A9/g, '\u0643')
    .replace(/\u06A2/g, '\u0641')
    .replace(/[\u06A7\u066F]/g, '\u0642')
    .replace(/\u06BA/g, '\u0646')
    .replace(/\u066E/g, '\u0628')
    // Whatever is left that is not a letter (the hamza on the line, symbols, digits, punctuation).
    .replace(/[^\u0627-\u064A]/g, '');
}
/* eslint-enable no-restricted-syntax */

/** Levenshtein distance between two short strings. */
function distance(a: string, b: string): number {
  if (a === b) return 0;
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

/** How alike two normalized words are, from 0 to 1. */
export function similarity(a: string, b: string): number {
  if (!a.length || !b.length) return a === b ? 1 : 0;
  return 1 - distance(a, b) / Math.max(a.length, b.length);
}

/** The least similarity for a word to count as recited; words of one or two letters must match. */
const ALIKE = 0.7;
export const alike = (a: string, b: string) => Math.max(a.length, b.length) <= 2 ? a === b : similarity(a, b) >= ALIKE;

export interface ExpectedAyah { surahNumber: number; ayahNumber: number; text: string }
export type WordStatus = 'ok' | 'wrong' | 'missed';
export interface CheckedWord {
  /** Index of the ayah in the list given, and of the word in the ayah as written. */
  ayah: number; word: number;
  /** The word as in the mushaf (with any pause mark that follows it). */
  text: string;
  status: WordStatus;
  /** For a word said differently: what was heard instead. */
  heard?: string;
}
export interface ExtraWord {
  /** Heard after this word of the mushaf (null: before the first one). */
  after: { ayah: number; word: number } | null;
  text: string;
}
export interface RecitationCheck {
  /** The words up to where the recitation stopped, each with how it was recited. */
  words: CheckedWord[];
  /** Words heard that are not in the text. */
  extras: ExtraWord[];
  /** Index of the last ayah recited (-1: none recognised). */
  reached: number;
  counts: { ok: number; wrong: number; missed: number; extra: number };
}

interface Token { norm: string; ayah: number; word: number; text: string }

/**
 * An ayah's words as written and as numbered in a `CheckedWord`: a pause mark standing alone goes
 * with the word before it.
 */
export function writtenWords(text: string): string[] {
  const words: string[] = [];
  for (const piece of text.split(/\s+/).filter(Boolean)) {
    if (!normalizeWord(piece) && words.length) words[words.length - 1] += ` ${piece}`;
    else if (normalizeWord(piece)) words.push(piece);
  }
  return words;
}

function expectedTokens(ayahs: ExpectedAyah[]): Token[] {
  return ayahs.flatMap((ayah, a) => writtenWords(ayah.text).map((text, word) => ({ norm: normalizeWord(text), ayah: a, word, text })));
}

/* eslint-disable no-restricted-syntax -- phrases recited around a recitation, not interface text */
const ISTIADHA = ['اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم'];
const BASMALA = ['بسم', 'الله', 'الرحمن', 'الرحيم'];
const SADAQA = ['صدق', 'الله', 'العظيم'];
/* eslint-enable no-restricted-syntax */

/** Whether `words` starting at `at` say `phrase` (each word near enough). */
const says = (words: string[], at: number, phrase: string[]) =>
  at >= 0 && at + phrase.length <= words.length && phrase.every((p, i) => similarity(normalizeWord(p), words[at + i]) >= 0.6);

/** Cost of each step of the alignment: a word left out, a word added, a word said differently. */
const MISSED = 1, EXTRA = 1, WRONG = 1, JOINED = 0.05;
type Step = 'match' | 'missed' | 'extra' | 'heardTwo' | 'writtenTwo';

/**
 * Aligns what was heard with the ayahs. The recitation may start with the isti'adha and the
 * basmala and end with «صدق الله العظيم» (left out of the comparison), and may stop anywhere: the
 * words after where it stopped are not counted as left out. A word heard split or joined
 * differently (يا أيها / يَٰٓأَيُّهَا) still counts as recited.
 */
export function checkRecitation(ayahs: ExpectedAyah[], heardText: string): RecitationCheck {
  const expected = expectedTokens(ayahs);
  const raw = heardText.split(/\s+/).filter(Boolean);
  let heard = raw.map(normalizeWord);
  let shown = raw;
  const keep = heard.map((h) => !!h);
  heard = heard.filter((_, i) => keep[i]); shown = shown.filter((_, i) => keep[i]);
  // Openings and closing said around the recitation, unless the text itself starts with the basmala.
  const startsWithBasmala = says(expected.map((e) => e.norm), 0, BASMALA);
  let start = 0;
  if (says(heard, start, ISTIADHA)) start += ISTIADHA.length;
  if (!startsWithBasmala && says(heard, start, BASMALA)) start += BASMALA.length;
  let end = heard.length;
  if (says(heard, end - SADAQA.length, SADAQA) && end - SADAQA.length >= start) end -= SADAQA.length;
  heard = heard.slice(start, end); shown = shown.slice(start, end);

  const n = expected.length, m = heard.length;
  const cost: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(Infinity));
  const step: Step[][] = Array.from({ length: n + 1 }, () => new Array<Step>(m + 1).fill('match'));
  const pairCost = (e: string, h: string) => alike(e, h) ? (1 - similarity(e, h)) * 0.2 : WRONG;
  cost[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (!i && !j) continue;
      let best = Infinity, how: Step = 'match';
      const consider = (value: number, kind: Step) => { if (value < best) { best = value; how = kind; } };
      // On a tie (a word that recurs, like «الناس»), the earlier occurrence is the one recited:
      // read back from the end, a word left out or added is preferred to a match.
      if (i) consider(cost[i - 1][j] + MISSED, 'missed');
      if (j) consider(cost[i][j - 1] + EXTRA, 'extra');
      if (i && j) consider(cost[i - 1][j - 1] + pairCost(expected[i - 1].norm, heard[j - 1]), 'match');
      if (i && j >= 2) {
        const joined = heard[j - 2] + heard[j - 1];
        if (alike(expected[i - 1].norm, joined)) consider(cost[i - 1][j - 2] + (1 - similarity(expected[i - 1].norm, joined)) * 0.2 + JOINED, 'heardTwo');
      }
      if (i >= 2 && j && expected[i - 2].ayah === expected[i - 1].ayah) {
        const joined = expected[i - 2].norm + expected[i - 1].norm;
        if (alike(joined, heard[j - 1])) consider(cost[i - 2][j - 1] + (1 - similarity(joined, heard[j - 1])) * 0.2 + JOINED, 'writtenTwo');
      }
      cost[i][j] = best; step[i][j] = how;
    }
  }
  // The recitation may stop anywhere: end where everything heard is placed at least cost.
  let stop = 0;
  for (let i = 1; i <= n; i++) if (cost[i][m] < cost[stop][m] - 1e-9) stop = i;

  const words: CheckedWord[] = [];
  const extras: ExtraWord[] = [];
  const extraAt: { before: number; text: string }[] = [];
  let i = stop, j = m;
  while (i > 0 || j > 0) {
    const how = step[i][j];
    if (how === 'match') {
      const e = expected[i - 1];
      const ok = alike(e.norm, heard[j - 1]);
      words.push({ ayah: e.ayah, word: e.word, text: e.text, status: ok ? 'ok' : 'wrong', ...(ok ? {} : { heard: shown[j - 1] }) });
      i--; j--;
    } else if (how === 'missed') {
      const e = expected[i - 1];
      words.push({ ayah: e.ayah, word: e.word, text: e.text, status: 'missed' });
      i--;
    } else if (how === 'extra') {
      extraAt.push({ before: i, text: shown[j - 1] });
      j--;
    } else if (how === 'heardTwo') {
      const e = expected[i - 1];
      words.push({ ayah: e.ayah, word: e.word, text: e.text, status: 'ok' });
      i--; j -= 2;
    } else {
      for (const e of [expected[i - 1], expected[i - 2]]) words.push({ ayah: e.ayah, word: e.word, text: e.text, status: 'ok' });
      i -= 2; j--;
    }
  }
  words.reverse();
  for (const extra of extraAt.reverse()) {
    const after = extra.before > 0 ? expected[extra.before - 1] : null;
    extras.push({ after: after ? { ayah: after.ayah, word: after.word } : null, text: extra.text });
  }
  const counts = { ok: 0, wrong: 0, missed: 0, extra: extras.length };
  for (const word of words) counts[word.status]++;
  return { words, extras, reached: stop ? expected[stop - 1].ayah : -1, counts };
}

/**
 * The ayahs to compare a recitation with: from the starting ayah on, enough of them to cover what
 * was heard (with room to spare), so a long surah is not compared whole.
 */
export function ayahsToCompare<T extends { text: string }>(from: readonly T[], heardWords: number): T[] {
  const enough = Math.max(60, Math.round(heardWords * 1.6) + 40);
  const out: T[] = [];
  let words = 0;
  for (const ayah of from) {
    if (words >= enough) break;
    out.push(ayah);
    words += ayah.text.split(/\s+/).filter(Boolean).length;
  }
  return out;
}
