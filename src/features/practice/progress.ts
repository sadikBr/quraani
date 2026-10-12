import type { AyahSpan } from '@/features/plans/types';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import { CUE_MODES, EXAM_COUNTS, GRADES, PLACE_COUNTS, REACHES, type Grade, type PracticeOptions } from './engine';

export interface PracticeSettings extends PracticeOptions {
  /** What starting a portion starts: a tasmee' (false), or «اختبار الحفظ». */
  exam: boolean;
  examCount: number;
  /** Listening to someone else recite: the text is shown to follow, and nothing is recorded. */
  helper: boolean;
}

/** How one place went over time. */
export interface PlaceStat {
  seen: number;
  wrong: number;
  hesitant: number;
  last: Grade;
  /** The session it was last graded in (sessions are numbered per riwayah). */
  session: number;
  /** Local date (YYYY-MM-DD) it was last graded. */
  date: string;
}

/** One exam taken: when, and how its questions went. */
export interface ExamResult { date: string; total: number; good: number; hesitant: number; wrong: number }

/** The marks a saved selection can be drawn with (see `Emblem` in `components/craft/art.tsx`). */
export const EMBLEMS = ['star', 'crescent', 'arch', 'lantern', 'drop', 'leaf', 'sun', 'knot'] as const;
export type Emblem = typeof EMBLEMS[number];
/** A selection kept under a name («مختاراتك»): a portion one recites, or someone one listens to. */
export interface PracticePick { id: string; name: string; emblem: Emblem; ranges: AyahSpan[] }
/** Saved selections kept per riwayah, and the longest name. */
export const MAX_PICKS = 12;
export const MAX_PICK_NAME = 40;

export interface RiwayahPractice {
  sessions: number;
  /** By surah and ayah ("2:255"), so the record survives corrections to the edition's pages. */
  places: Record<string, PlaceStat>;
  /** Saved selections, newest last, as ayah positions in an edition of `total` ayahs. */
  picks: PracticePick[];
  total: number;
  /** Exams taken, oldest first (the last `MAX_EXAMS`). */
  exams: ExamResult[];
}

export interface PracticeState {
  version: 1;
  settings: PracticeSettings;
  riwayat: Partial<Record<Riwayah, RiwayahPractice>>;
}

export const PRACTICE_KEY = 'practice:v1';
export const defaultSettings: PracticeSettings = { cue: 'complete', reach: 'ayah', count: 10, exam: false, examCount: 10, helper: false };
export const defaultPracticeState: PracticeState = { version: 1, settings: defaultSettings, riwayat: {} };
const emptyRiwayah: RiwayahPractice = { sessions: 0, places: {}, picks: [], total: 0, exams: [] };
/** Saved places are capped; the oldest well-known ones go first. */
const MAX_PLACES = 3000;
/** Exams kept, the latest. */
const MAX_EXAMS = 30;

const isRiwayah = (value: string): value is Riwayah => Object.prototype.hasOwnProperty.call(RIWAYAT, value);
const isGrade = (value: unknown): value is Grade => GRADES.includes(value as Grade);
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function decodeSettings(value: unknown): PracticeSettings {
  const s = (value ?? {}) as Partial<PracticeSettings>;
  return {
    cue: CUE_MODES.includes(s.cue as never) ? s.cue! : defaultSettings.cue,
    reach: REACHES.includes(s.reach as never) ? s.reach! : defaultSettings.reach,
    count: PLACE_COUNTS.includes(s.count as never) ? s.count! : defaultSettings.count,
    exam: s.exam === true,
    examCount: EXAM_COUNTS.includes(s.examCount as never) ? s.examCount! : defaultSettings.examCount,
    helper: s.helper === true,
  };
}

function decodeExam(value: unknown): ExamResult | null {
  const e = (value ?? {}) as Partial<ExamResult>;
  const total = count(e.total), good = count(e.good), hesitant = count(e.hesitant), wrong = count(e.wrong);
  if (!isDate(e.date) || !total || good === null || hesitant === null || wrong === null || good + hesitant + wrong > total) return null;
  return { date: e.date, total, good, hesitant, wrong };
}

const isEmblem = (value: unknown): value is Emblem => EMBLEMS.includes(value as Emblem);
const pickName = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, MAX_PICK_NAME) : '';

/** A saved selection, kept when its spans fit the edition; its spans merged and in order. */
function decodePick(value: unknown, total: number): PracticePick | null {
  const pick = (value ?? {}) as Partial<PracticePick>;
  if (typeof pick.id !== 'string' || !/^[\w-]{1,40}$/.test(pick.id)) return null;
  const ranges = spansIn(pick.ranges, total);
  return ranges.length ? { id: pick.id, name: pickName(pick.name), emblem: isEmblem(pick.emblem) ? pick.emblem : EMBLEMS[0], ranges } : null;
}

function spansIn(list: unknown, total: number): AyahSpan[] {
  if (!Array.isArray(list)) return [];
  const spans = list.filter((s): s is AyahSpan => !!s && Number.isSafeInteger(s.start) && Number.isSafeInteger(s.end) && s.start >= 0 && s.end > s.start && s.end <= total)
    .map((s) => ({ start: s.start, end: s.end })).sort((a, b) => a.start - b.start);
  const merged: AyahSpan[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) last.end = Math.max(last.end, span.end); else merged.push(span);
  }
  return merged;
}

function decodeRiwayah(value: unknown): RiwayahPractice | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<RiwayahPractice> & { custom?: unknown; helperCustom?: unknown };
  const places: Record<string, PlaceStat> = {};
  for (const [key, raw] of Object.entries(r.places ?? {})) {
    const stat = raw as Partial<PlaceStat> | null;
    if (!/^\d{1,3}:\d{1,3}$/.test(key) || !stat || !isGrade(stat.last) || !isDate(stat.date)) continue;
    const seen = count(stat.seen), wrong = count(stat.wrong), hesitant = count(stat.hesitant), session = count(stat.session);
    if (!seen || wrong === null || hesitant === null || session === null || wrong + hesitant > seen) continue;
    places[key] = { seen, wrong, hesitant, last: stat.last, session, date: stat.date };
  }
  const total = count(r.total) ?? 0;
  // Before saved selections, one selection was kept for oneself and one to listen to someone
  // else: they become the first saved ones, unnamed (they show by what they hold).
  const legacy: PracticePick[] = [
    { id: 'mine', name: '', emblem: 'star' as const, ranges: spansIn(r.custom, total) },
    { id: 'listening', name: '', emblem: 'crescent' as const, ranges: spansIn(r.helperCustom, total) },
  ].filter((pick) => pick.ranges.length);
  const seen = new Set<string>();
  const picks = Array.isArray(r.picks)
    ? r.picks.map((pick) => decodePick(pick, total)).filter((pick): pick is PracticePick => !!pick && !seen.has(pick.id) && !!seen.add(pick.id)).slice(0, MAX_PICKS)
    : legacy;
  const exams = Array.isArray(r.exams) ? r.exams.map(decodeExam).filter((e): e is ExamResult => !!e).slice(-MAX_EXAMS) : [];
  return { sessions: count(r.sessions) ?? 0, places, picks, total, exams };
}

/** Reads saved data, keeping whatever is valid. */
export function decodePractice(raw: string | null): PracticeState {
  if (raw === null) return defaultPracticeState;
  let saved: Partial<PracticeState> | null;
  try { saved = JSON.parse(raw); } catch { return defaultPracticeState; }
  if (!saved || saved.version !== 1) return defaultPracticeState;
  const riwayat: PracticeState['riwayat'] = {};
  for (const [id, value] of Object.entries(saved.riwayat ?? {})) {
    if (!isRiwayah(id)) continue;
    const decoded = decodeRiwayah(value);
    if (decoded) riwayat[id] = decoded;
  }
  return { version: 1, settings: decodeSettings(saved.settings), riwayat };
}

export type PracticeChange =
  | { type: 'settings'; settings: PracticeSettings }
  /** A selection is saved under its id (added, or replacing the one saved with that id). */
  | { type: 'pick'; riwayah: Riwayah; pick: PracticePick; total: number }
  /** A saved selection is removed. */
  | { type: 'unpick'; riwayah: Riwayah; id: string }
  /** A session starts: the next session number. */
  | { type: 'begin'; riwayah: Riwayah }
  /** A place is graded; `previous` is its earlier grade in the same session, which this one replaces. */
  | { type: 'grade'; riwayah: Riwayah; key: string; grade: Grade; previous: Grade | null; date: string }
  /** An exam is finished. */
  | { type: 'exam'; riwayah: Riwayah; result: ExamResult };

export const riwayahPractice = (state: PracticeState, riwayah: Riwayah) => state.riwayat[riwayah] ?? emptyRiwayah;

function prune(places: Record<string, PlaceStat>) {
  const keys = Object.keys(places);
  if (keys.length <= MAX_PLACES) return places;
  const rest = { ...places };
  const old = keys.filter((k) => places[k].last === 'good').sort((a, b) => places[a].session - places[b].session);
  for (const key of old.slice(0, keys.length - MAX_PLACES)) delete rest[key];
  return rest;
}

export function applyPractice(state: PracticeState, change: PracticeChange): PracticeState {
  if (change.type === 'settings') return { ...state, settings: decodeSettings(change.settings) };
  const current = riwayahPractice(state, change.riwayah);
  let next: RiwayahPractice;
  if (change.type === 'pick') {
    const pick = decodePick(change.pick, change.total);
    if (!pick) return state;
    // A new edition (another total) leaves the other selections pointing nowhere: they are dropped.
    const others = change.total === current.total ? current.picks : [];
    const at = others.findIndex((p) => p.id === pick.id);
    if (at < 0 && others.length >= MAX_PICKS) return state;
    next = { ...current, picks: at < 0 ? [...others, pick] : others.map((p, i) => i === at ? pick : p), total: change.total };
  }
  else if (change.type === 'unpick') next = { ...current, picks: current.picks.filter((p) => p.id !== change.id) };
  else if (change.type === 'begin') next = { ...current, sessions: current.sessions + 1 };
  else if (change.type === 'exam') {
    const result = decodeExam(change.result);
    if (!result) return state;
    next = { ...current, exams: [...current.exams, result].slice(-MAX_EXAMS) };
  }
  else {
    const before = current.places[change.key];
    const undo = change.previous && before ? change.previous : null;
    const base = before ?? { seen: 0, wrong: 0, hesitant: 0 };
    const stat: PlaceStat = {
      seen: base.seen + (undo ? 0 : 1),
      wrong: Math.max(0, base.wrong - (undo === 'wrong' ? 1 : 0)) + (change.grade === 'wrong' ? 1 : 0),
      hesitant: Math.max(0, base.hesitant - (undo === 'hesitant' ? 1 : 0)) + (change.grade === 'hesitant' ? 1 : 0),
      last: change.grade, session: current.sessions, date: change.date,
    };
    next = { ...current, places: prune({ ...current.places, [change.key]: stat }) };
  }
  return { ...state, riwayat: { ...state.riwayat, [change.riwayah]: next } };
}

/**
 * How likely an ayah is to be drawn: places missed last time come back more often, and places
 * known in the last two sessions are mostly left for later.
 */
export function placeWeight(stat: PlaceStat | undefined, sessions: number) {
  if (!stat) return 1;
  if (stat.last === 'wrong') return 4;
  if (stat.last === 'hesitant') return 2.5;
  return sessions - stat.session < 2 ? 0.15 : 1;
}

/** Places whose last grade was not "good", the missed ones first, then the most recent. */
export function placesToReview(practice: RiwayahPractice) {
  return Object.entries(practice.places).filter(([, s]) => s.last !== 'good')
    .sort(([, a], [, b]) => (a.last === b.last ? 0 : a.last === 'wrong' ? -1 : 1) || b.session - a.session || b.wrong - a.wrong)
    .map(([key, stat]) => ({ key, stat }));
}
