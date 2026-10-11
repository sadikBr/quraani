import type { AyahSpan } from '@/features/plans/types';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import { CUE_MODES, GRADES, PLACE_COUNTS, REACHES, type Grade, type PracticeOptions } from './engine';

/** What a session is drawn from: everything memorized, or a chosen selection. */
export type PracticeScope = 'memorized' | 'custom';
export interface PracticeSettings extends PracticeOptions { scope: PracticeScope }

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

export interface RiwayahPractice {
  sessions: number;
  /** By surah and ayah ("2:255"), so the record survives corrections to the edition's pages. */
  places: Record<string, PlaceStat>;
  /** The last chosen selection, as ayah positions in an edition of `total` ayahs. */
  custom: AyahSpan[];
  total: number;
}

export interface PracticeState {
  version: 1;
  settings: PracticeSettings;
  riwayat: Partial<Record<Riwayah, RiwayahPractice>>;
}

export const PRACTICE_KEY = 'practice:v1';
export const defaultSettings: PracticeSettings = { scope: 'memorized', cue: 'complete', reach: 'ayah', count: 10 };
export const defaultPracticeState: PracticeState = { version: 1, settings: defaultSettings, riwayat: {} };
const emptyRiwayah: RiwayahPractice = { sessions: 0, places: {}, custom: [], total: 0 };
/** Saved places are capped; the oldest well-known ones go first. */
const MAX_PLACES = 3000;

const isRiwayah = (value: string): value is Riwayah => Object.prototype.hasOwnProperty.call(RIWAYAT, value);
const isGrade = (value: unknown): value is Grade => GRADES.includes(value as Grade);
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0 ? value as number : null;
const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

function decodeSettings(value: unknown): PracticeSettings {
  const s = (value ?? {}) as Partial<PracticeSettings>;
  return {
    scope: s.scope === 'custom' ? 'custom' : 'memorized',
    cue: CUE_MODES.includes(s.cue as never) ? s.cue! : defaultSettings.cue,
    reach: REACHES.includes(s.reach as never) ? s.reach! : defaultSettings.reach,
    count: PLACE_COUNTS.includes(s.count as never) ? s.count! : defaultSettings.count,
  };
}

function decodeRiwayah(value: unknown): RiwayahPractice | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Partial<RiwayahPractice>;
  const places: Record<string, PlaceStat> = {};
  for (const [key, raw] of Object.entries(r.places ?? {})) {
    const stat = raw as Partial<PlaceStat> | null;
    if (!/^\d{1,3}:\d{1,3}$/.test(key) || !stat || !isGrade(stat.last) || !isDate(stat.date)) continue;
    const seen = count(stat.seen), wrong = count(stat.wrong), hesitant = count(stat.hesitant), session = count(stat.session);
    if (!seen || wrong === null || hesitant === null || session === null || wrong + hesitant > seen) continue;
    places[key] = { seen, wrong, hesitant, last: stat.last, session, date: stat.date };
  }
  const total = count(r.total) ?? 0;
  const custom = Array.isArray(r.custom) ? r.custom.filter((s): s is AyahSpan => !!s && Number.isSafeInteger(s.start) && Number.isSafeInteger(s.end)
    && s.start >= 0 && s.end > s.start && s.end <= total).map((s) => ({ start: s.start, end: s.end })) : [];
  return { sessions: count(r.sessions) ?? 0, places, custom, total };
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
  | { type: 'custom'; riwayah: Riwayah; ranges: AyahSpan[]; total: number }
  /** A session starts: the next session number. */
  | { type: 'begin'; riwayah: Riwayah }
  /** A place is graded; `previous` is its earlier grade in the same session, which this one replaces. */
  | { type: 'grade'; riwayah: Riwayah; key: string; grade: Grade; previous: Grade | null; date: string };

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
  if (change.type === 'custom') next = { ...current, custom: change.ranges.map((s) => ({ start: s.start, end: s.end })), total: change.total };
  else if (change.type === 'begin') next = { ...current, sessions: current.sessions + 1 };
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
