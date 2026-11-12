import type { Riwayah } from '@/features/quran-reader/riwayat';
import type { AyahSpan } from '@/features/plans/types';
import { coversSpan, mergeSpans } from '@/features/plans/memorization';
import { addDays, validDate } from '@/features/plans/dates';
import { t } from '@/i18n';

/**
 * A teacher's halaqat, kept on the teacher's phone: each halaqa's students and its sessions, in
 * which each student recites their new portion and their revision, is graded, and is given the
 * next portion (their lawh).
 *
 * Portions are kept by surah and ayah, not by their place in an edition, so that they stay right
 * when an edition's page data is corrected. A halaqa reads one riwayah, which fixes how its ayahs
 * are counted.
 */

export const HALAQAT_KEY = 'halaqat:v1';

export interface AyahRef { surah: number; ayah: number }
/** From one ayah to another, both included, in the mushaf's order. */
export interface Portion { from: AyahRef; to: AyahRef }
/** The order new portions follow from one surah to the next: from Al-Fatiha on, or from An-Nas back. */
export type Direction = 'forward' | 'backward';
export const DIRECTIONS = ['backward', 'forward'] as const satisfies readonly Direction[];
export const GRADES = ['excellent', 'good', 'fair', 'repeat'] as const;
export type Grade = typeof GRADES[number];
export const ATTENDANCE = ['present', 'late', 'excused', 'absent'] as const;
export type Attendance = typeof ATTENDANCE[number];
export type MarkKind = 'mistake' | 'hesitation';
/** One mistake, or one prompt from the teacher, at an ayah when it was marked on the text. */
export interface Mark { kind: MarkKind; at?: AyahRef }
export type RecitationKind = 'new' | 'revision';
export const RECITATION_KINDS = ['new', 'revision'] as const satisfies readonly RecitationKind[];
export interface Recitation { kind: RecitationKind; portion: Portion; grade: Grade; marks: Mark[] }
/** What a student is to recite next time. */
export interface Assignment { new?: Portion; revision?: Portion }
/** A student in one session: whether they came, what they recited, what they are to recite next. */
export interface Entry { student: string; attendance: Attendance; recitations: Recitation[]; next?: Assignment; note?: string }
export interface HalaqaSession { id: string; date: string; entries: Entry[] }
export interface Student {
  id: string;
  name: string;
  joinedOn: string;
  direction: Direction;
  /** What they had memorized before joining. */
  known: Portion[];
  /** Their first portions, given when they joined. */
  first?: Assignment;
  /** They left the halaqa: kept, with their history, and can come back. */
  leftOn?: string;
  /**
   * The phone's owner (one per halaqa at most): what they memorize is the app's own record
   * (محفوظك), and the new portions they pass here are added to it.
   */
  me?: true;
  /**
   * The account of the teacher this participant is (kept with the account, so that they are `me`
   * on each of their phones and on no one else's).
   */
  account?: string;
}
export interface Halaqa {
  id: string;
  name: string;
  riwayah: Riwayah;
  /** The days it meets (Sunday = 0). */
  weekdays: number[];
  /** When it meets on those days, if at a set time. */
  time?: Clock;
  /** A notification before each session, `before` minutes ahead (needs `time`). */
  reminder?: { before: ReminderLead };
  createdOn: string;
  students: Student[];
  sessions: HalaqaSession[];
}
export interface Clock { hour: number; minute: number }
/** How long before a session its reminder comes, in minutes. */
export const REMINDER_LEADS = [0, 15, 30, 60, 120] as const;
export type ReminderLead = typeof REMINDER_LEADS[number];
export interface HalaqatState { version: 1; halaqat: Halaqa[] }
export const defaultHalaqatState: HalaqatState = { version: 1, halaqat: [] };

export const NAME_LIMIT = 60;
export const NOTE_LIMIT = 500;
/** Marks on one recitation, at most. */
export const MARK_LIMIT = 500;

/** A name trimmed and cut to fit (`NAME_LIMIT` UTF-16 units, never half a character). */
export function clampName(name: string) {
  let out = '';
  for (const char of name.trim()) {
    if (out.length + char.length > NAME_LIMIT) break;
    out += char;
  }
  return out.trim();
}

export const newId = (kind: 'halaqa' | 'student' | 'session') => `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

// The mushaf's shape: how many ayahs each surah has in a riwayah.

export interface QuranShape { counts: readonly number[] }
const shapes = new WeakMap<object, QuranShape>();
/** The shape of an edition's ayahs (any list of ayahs in the mushaf's order, as a plan index has). */
export function shapeOf(index: { ayahs: readonly { surahNumber: number }[] }): QuranShape {
  const cached = shapes.get(index);
  if (cached) return cached;
  const counts = Array.from({ length: 114 }, () => 0);
  for (const ayah of index.ayahs) counts[ayah.surahNumber - 1]++;
  const shape = { counts };
  shapes.set(index, shape);
  return shape;
}
const starts = new WeakMap<QuranShape, number[]>();
/** Where each surah starts, in ayahs from the start of the mushaf. */
function surahStarts(shape: QuranShape) {
  let result = starts.get(shape);
  if (!result) {
    result = [0];
    for (const count of shape.counts) result.push(result[result.length - 1] + count);
    starts.set(shape, result);
  }
  return result;
}
export const totalAyahs = (shape: QuranShape) => surahStarts(shape)[shape.counts.length];
export const validRef = (shape: QuranShape, ref: AyahRef) => !!ref && Number.isInteger(ref.surah) && ref.surah >= 1 && ref.surah <= shape.counts.length &&
  Number.isInteger(ref.ayah) && ref.ayah >= 1 && ref.ayah <= shape.counts[ref.surah - 1];
/** An ayah's place in the mushaf, from 0. */
export const ordinal = (shape: QuranShape, ref: AyahRef) => surahStarts(shape)[ref.surah - 1] + ref.ayah - 1;
export function refAt(shape: QuranShape, position: number): AyahRef {
  const at = surahStarts(shape);
  let surah = 1;
  while (surah < shape.counts.length && at[surah] <= position) surah++;
  return { surah, ayah: position - at[surah - 1] + 1 };
}
export const validPortion = (shape: QuranShape, portion: Portion | undefined): portion is Portion =>
  !!portion && validRef(shape, portion.from) && validRef(shape, portion.to) && ordinal(shape, portion.from) <= ordinal(shape, portion.to);
export const spanOf = (shape: QuranShape, portion: Portion): AyahSpan => ({ start: ordinal(shape, portion.from), end: ordinal(shape, portion.to) + 1 });
export const portionOf = (shape: QuranShape, span: AyahSpan): Portion => ({ from: refAt(shape, span.start), to: refAt(shape, span.end - 1) });
export const portionAyahs = (shape: QuranShape, portion: Portion) => ordinal(shape, portion.to) - ordinal(shape, portion.from) + 1;
export const samePortion = (a: Portion | undefined, b: Portion | undefined) => a === b || (!!a && !!b &&
  a.from.surah === b.from.surah && a.from.ayah === b.from.ayah && a.to.surah === b.to.surah && a.to.ayah === b.to.ayah);
/** A whole surah. */
export const surahPortion = (shape: QuranShape, surah: number): Portion => ({ from: { surah, ayah: 1 }, to: { surah, ayah: shape.counts[surah - 1] } });

/**
 * The new portion after `last`, `size` ayahs long (as long as `last` by default), within one surah:
 * the rest of its surah, then the next surah in the student's order that is not already memorized.
 * None after the last surah.
 */
export function nextNew(shape: QuranShape, last: Portion, direction: Direction, size = portionAyahs(shape, last), memorized: AyahSpan[] = []): Portion | undefined {
  const length = Math.max(1, size);
  let start: AyahRef;
  if (last.to.ayah < shape.counts[last.to.surah - 1]) start = { surah: last.to.surah, ayah: last.to.ayah + 1 };
  else {
    // From An-Nas back, the surah before the first one recited; otherwise the one after the last.
    const step = direction === 'backward' ? -1 : 1;
    let surah = direction === 'backward' ? last.from.surah - 1 : last.to.surah + 1;
    while (surah >= 1 && surah <= shape.counts.length && coversSpan(memorized, spanOf(shape, surahPortion(shape, surah)))) surah += step;
    if (surah < 1 || surah > shape.counts.length) return undefined;
    start = { surah, ayah: 1 };
  }
  return { from: start, to: { surah: start.surah, ayah: Math.min(shape.counts[start.surah - 1], start.ayah + length - 1) } };
}
/** A portion that ends where its surah ends, which may have cut it short. */
const endsSurah = (shape: QuranShape, portion: Portion) => portion.to.ayah === shape.counts[portion.to.surah - 1];

/** The default length of a revision, in ayahs, when there is none to follow. */
export const REVISION_AYAHS = 20;
/**
 * The revision after `last`, `size` ayahs long (as long as `last` by default), through what is
 * memorized in the mushaf's order, starting again from the first memorized ayah after the last;
 * one stretch of memorized ayahs at a time.
 */
export function nextRevision(shape: QuranShape, memorized: AyahSpan[], last: Portion | undefined, size = last ? portionAyahs(shape, last) : REVISION_AYAHS): Portion | undefined {
  const spans = mergeSpans(memorized);
  if (!spans.length) return undefined;
  size = Math.max(1, size);
  const after = last ? ordinal(shape, last.to) + 1 : spans[0].start;
  const span = spans.find((s) => s.end > after) ?? spans[0];
  const start = span.end > after && span.start <= after ? after : span.start;
  return portionOf(shape, { start, end: Math.min(span.end, start + size) });
}

export const markCount = (marks: readonly Mark[], kind: MarkKind) => marks.reduce((n, mark) => n + (mark.kind === kind ? 1 : 0), 0);
/** A grade from the mistakes and prompts, which the teacher can change. */
export function suggestGrade(marks: readonly Mark[]): Grade {
  const mistakes = markCount(marks, 'mistake'), prompts = markCount(marks, 'hesitation');
  if (!mistakes && prompts <= 1) return 'excellent';
  if (mistakes <= 1 && prompts <= 3) return 'good';
  if (mistakes <= 3) return 'fair';
  return 'repeat';
}

// A halaqa's students and history.

export const activeStudents = (halaqa: Halaqa) => halaqa.students.filter((s) => !s.leftOn);
const byDate = (a: HalaqaSession, b: HalaqaSession) => a.date.localeCompare(b.date);
export const sessionOn = (halaqa: Halaqa, date: string) => halaqa.sessions.find((s) => s.date === date);
export const entryOf = (session: HalaqaSession | undefined, student: string) => session?.entries.find((e) => e.student === student);

/** What a student is to recite at a session on `date`: what the last session before it gave them, or their first portions. */
export function assignmentFor(halaqa: Halaqa, student: Student, date: string): Assignment {
  const earlier = halaqa.sessions.filter((s) => s.date < date).sort(byDate);
  for (let i = earlier.length - 1; i >= 0; i--) {
    const next = entryOf(earlier[i], student.id)?.next;
    if (next) return next;
  }
  return student.first ?? {};
}

/** What a student is on now: what their last session gave them, today's included. */
export const currentAssignment = (halaqa: Halaqa, student: Student) => assignmentFor(halaqa, student, '9999-12-31');

/** What a student has memorized: what they knew when they joined, and every new portion they recited and passed. */
export function memorizedBy(shape: QuranShape, halaqa: Halaqa, student: Student, extra: Recitation[] = []): AyahSpan[] {
  const passed = [...halaqa.sessions.flatMap((s) => entryOf(s, student.id)?.recitations ?? []), ...extra]
    .filter((r) => r.kind === 'new' && r.grade !== 'repeat' && validPortion(shape, r.portion)).map((r) => spanOf(shape, r.portion));
  return mergeSpans([...student.known.filter((p) => validPortion(shape, p)).map((p) => spanOf(shape, p)), ...passed]);
}

/**
 * The portions to give a student after a session, from what they recited in it: what follows a
 * portion they passed, the same portion again when it is to be repeated, and what they had been
 * given when they did not recite it.
 */
export function suggestNext(shape: QuranShape, halaqa: Halaqa, student: Student, date: string, recitations: Recitation[]): Assignment {
  const assigned = assignmentFor(halaqa, student, date);
  const recited = (kind: RecitationKind) => recitations.find((r) => r.kind === kind && validPortion(shape, r.portion));
  // What was memorized by the end of this session: the sessions before it, and this one's recitations.
  const before = halaqa.sessions.filter((s) => s.date < date);
  const memorized = memorizedBy(shape, { ...halaqa, sessions: before }, student, recitations);
  const fresh = recited('new'), revised = recited('revision');
  // How long the student's portions are: the latest one not cut short where a surah (or a memorized
  // stretch) ended, so that one short surah does not make every later portion short.
  const earlier = (kind: RecitationKind) => [...before].sort(byDate).reverse()
    .flatMap((s) => entryOf(s, student.id)?.recitations.filter((r) => r.kind === kind && validPortion(shape, r.portion)).map((r) => r.portion) ?? []).slice(0, 6);
  const pace = (portions: Portion[], cut: (portion: Portion) => boolean, fallback: number) =>
    portions.find((portion) => !cut(portion)) ? portionAyahs(shape, portions.find((portion) => !cut(portion))!) : Math.max(fallback, ...portions.map((portion) => portionAyahs(shape, portion)));
  const spans = mergeSpans(memorized);
  const endsStretch = (portion: Portion) => spans.some((span) => span.end === ordinal(shape, portion.to) + 1);
  const next: Assignment = {
    new: fresh ? (fresh.grade === 'repeat' ? fresh.portion
      : nextNew(shape, fresh.portion, student.direction, pace([fresh.portion, ...earlier('new')], (portion) => endsSurah(shape, portion), 1), memorized)) : assigned.new,
    revision: revised ? (revised.grade === 'repeat' ? revised.portion
      : nextRevision(shape, memorized, revised.portion, pace([revised.portion, ...earlier('revision')], endsStretch, 1))) : assigned.revision,
  };
  return clean(next);
}
const clean = (assignment: Assignment): Assignment => ({ ...(assignment.new ? { new: assignment.new } : {}), ...(assignment.revision ? { revision: assignment.revision } : {}) });

/** A student's sessions, latest first, with what they did in each. */
export function historyOf(halaqa: Halaqa, student: string) {
  return [...halaqa.sessions].sort(byDate).reverse().flatMap((session) => {
    const entry = entryOf(session, student);
    return entry ? [{ session, entry }] : [];
  });
}
export function attendanceOf(halaqa: Halaqa, student: string): Record<Attendance, number> {
  const counts = { present: 0, late: 0, excused: 0, absent: 0 };
  for (const session of halaqa.sessions) {
    const entry = entryOf(session, student);
    if (entry) counts[entry.attendance]++;
  }
  return counts;
}
/** The halaqa's next meeting day from `today` (today included). */
export function nextMeeting(halaqa: Halaqa, today: string): string | undefined {
  if (!halaqa.weekdays.length) return undefined;
  for (let i = 0; i < 7; i++) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + i);
    if (halaqa.weekdays.includes(date.getUTCDay())) return date.toISOString().slice(0, 10);
  }
  return undefined;
}
// Points, for the scoreboard: attendance, and each recitation by its grade. The account counts them
// the same way for members' phones (supabase/migrations/…_joining_halaqat.sql, `entry_points`).

export const POINTS = {
  attendance: { present: 2, late: 1, excused: 0, absent: 0 },
  new: { excellent: 6, good: 4, fair: 2, repeat: 0 },
  revision: { excellent: 3, good: 2, fair: 1, repeat: 0 },
} as const satisfies { attendance: Record<Attendance, number> } & Record<RecitationKind, Record<Grade, number>>;

export const entryPoints = (entry: Pick<Entry, 'attendance' | 'recitations'>) =>
  (POINTS.attendance[entry.attendance] ?? 0) + entry.recitations.reduce((n, r) => n + (POINTS[r.kind]?.[r.grade] ?? 0), 0);

export interface Score { student: string; total: number; recent: number }
/** Each participant's points (those who left aside): in all, and on the days from `from`. */
export function scoresOf(halaqa: Halaqa, from: string): Score[] {
  return activeStudents(halaqa).map((student) => {
    let total = 0, recent = 0;
    for (const session of halaqa.sessions) {
      const entry = entryOf(session, student.id);
      if (!entry) continue;
      const points = entryPoints(entry);
      total += points;
      if (session.date >= from) recent += points;
    }
    return { student: student.id, total, recent };
  });
}
/** The first day of the month of `date` (YYYY-MM-DD). */
export const monthStart = (date: string) => `${date.slice(0, 8)}01`;

export const HALAQA_REMINDER_PREFIX = 'quranni-halaqa:';
/** How many reminders are scheduled at most, all halaqat together (a phone keeps a limited number). */
const REMINDER_LIMIT = 24;
export interface HalaqaReminder {
  id: string; halaqa: string; name: string; date: Date; day: string; time: Clock; before: ReminderLead;
  /** About a halaqa the user is a member of (opened as they see it, and worded for them). */
  member?: boolean;
}
/** A halaqa the user is a member of, and the reminder they chose for it on their phone. */
export interface MemberReminder { halaqa: Halaqa; before: ReminderLead }
const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
/**
 * The reminders to schedule for the coming days: one before each session of a halaqa with a
 * reminder, on its days, in local time; none for a halaqa without participants, nor for a session
 * whose every participant has already been heard or marked away. The halaqat the user is a member
 * of (`members`) are reminded as they chose on their phone, and a session where they have been
 * heard (or marked away) is done for them.
 */
export function halaqaReminderQueue(state: HalaqatState, now: Date, days = 14, members: MemberReminder[] = []): HalaqaReminder[] {
  const reminders: HalaqaReminder[] = [];
  const sources = [
    ...state.halaqat.map((halaqa) => ({ halaqa, before: halaqa.reminder?.before, member: false })),
    ...members.map(({ halaqa, before }) => ({ halaqa, before, member: true })),
  ];
  for (const { halaqa, before, member } of sources) {
    const { time } = halaqa;
    const students = activeStudents(halaqa);
    if (!time || before === undefined || !halaqa.weekdays.length || !students.length) continue;
    for (let offset = 0; offset < days; offset++) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, time.hour, time.minute);
      if (!halaqa.weekdays.includes(start.getDay())) continue;
      const date = new Date(start.getTime() - before * 60_000);
      if (date.getTime() <= now.getTime()) continue;
      const day = localDay(start), session = sessionOn(halaqa, day);
      if (session && students.every((s) => heard(entryOf(session, s.id)) || absent(entryOf(session, s.id)))) continue;
      const clock = `${String(time.hour).padStart(2, '0')}${String(time.minute).padStart(2, '0')}`;
      reminders.push({ id: `${HALAQA_REMINDER_PREFIX}${halaqa.id}:${day}:${clock}:${before}`, halaqa: halaqa.id, name: halaqa.name, date, day, time, before, ...(member ? { member: true } : {}) });
    }
  }
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)).slice(0, REMINDER_LIMIT);
}

/** An entry's state for the session's list: absent, recited (with its grades), or still to hear. */
/** How long a session stays open to changes, from its day. */
export const SESSION_OPEN_DAYS = 7;
/**
 * A session is closed a week after its day: what was recorded in it (attendance, recitations,
 * the portions given) then stands, as the points and the portions after it were counted from it.
 */
export const sessionClosed = (date: string, today: string) => addDays(date, SESSION_OPEN_DAYS) <= today;
export const heard = (entry: Entry | undefined) => !!entry && entry.recitations.length > 0;
export const absent = (entry: Entry | undefined) => entry?.attendance === 'absent' || entry?.attendance === 'excused';

// Changes, applied in order on the saved state.

export type HalaqatChange =
  | { type: 'saveHalaqa'; halaqa: Omit<Halaqa, 'students' | 'sessions'> }
  | { type: 'deleteHalaqa'; halaqa: string }
  | { type: 'saveStudent'; halaqa: string; student: Student }
  | { type: 'deleteStudent'; halaqa: string; student: string }
  | { type: 'saveEntries'; halaqa: string; date: string; session: string; entries: Entry[] }
  | { type: 'deleteSession'; halaqa: string; date: string };

export function applyHalaqat(state: HalaqatState, change: HalaqatChange): HalaqatState {
  const update = (id: string, fn: (halaqa: Halaqa) => Halaqa) => ({ ...state, halaqat: state.halaqat.map((h) => h.id === id ? fn(h) : h) });
  switch (change.type) {
    case 'saveHalaqa': {
      const existing = state.halaqat.find((h) => h.id === change.halaqa.id);
      if (!existing) return { ...state, halaqat: [...state.halaqat, { ...change.halaqa, students: [], sessions: [] }] };
      // A halaqa's riwayah counts its ayahs: it is kept once anything has been recorded by it.
      const locked = existing.sessions.length > 0 || existing.students.some((s) => s.known.length || s.first);
      // The settings are replaced as given (a time or a reminder left out is turned off).
      return update(existing.id, (h) => ({ ...change.halaqa, riwayah: locked ? h.riwayah : change.halaqa.riwayah, createdOn: h.createdOn, students: h.students, sessions: h.sessions }));
    }
    case 'deleteHalaqa': return { ...state, halaqat: state.halaqat.filter((h) => h.id !== change.halaqa) };
    case 'saveStudent': return update(change.halaqa, (h) => {
      // One participant is the phone's owner: naming another moves it.
      const others = change.student.me ? h.students.map((s) => s.me && s.id !== change.student.id ? withoutMe(s) : s) : h.students;
      return others.some((s) => s.id === change.student.id)
        ? { ...h, students: others.map((s) => s.id === change.student.id ? change.student : s) }
        : { ...h, students: [...others, change.student] };
    });
    case 'deleteStudent': return update(change.halaqa, (h) => ({
      ...h, students: h.students.filter((s) => s.id !== change.student),
      sessions: h.sessions.map((s) => ({ ...s, entries: s.entries.filter((e) => e.student !== change.student) })).filter((s) => s.entries.length),
    }));
    case 'saveEntries': return update(change.halaqa, (h) => {
      const existing = sessionOn(h, change.date);
      const merge = (entries: Entry[]) => [...entries.filter((e) => !change.entries.some((x) => x.student === e.student)), ...change.entries];
      const sessions = existing ? h.sessions.map((s) => s === existing ? { ...s, entries: merge(s.entries) } : s)
        : [...h.sessions, { id: change.session, date: change.date, entries: merge([]) }];
      return { ...h, sessions: sessions.sort(byDate) };
    });
    case 'deleteSession': return update(change.halaqa, (h) => ({ ...h, sessions: h.sessions.filter((s) => s.date !== change.date) }));
  }
}

const withoutMe = ({ me: _me, ...student }: Student): Student => student;

// Reading the saved state: anything malformed is refused rather than half read.

const fail = (): never => { throw new Error(t('halaqat.storage.invalid')); };
const isId = (value: unknown, kind: string) => typeof value === 'string' && new RegExp(`^${kind}-[a-z0-9-]+$`).test(value);
const isName = (value: unknown) => typeof value === 'string' && !!value.trim() && value.length <= NAME_LIMIT;
const isRef = (ref: unknown): ref is AyahRef => {
  const r = ref as AyahRef;
  return !!r && Number.isInteger(r.surah) && r.surah >= 1 && r.surah <= 114 && Number.isInteger(r.ayah) && r.ayah >= 1 && r.ayah <= 300;
};
const isPortion = (portion: unknown): portion is Portion => {
  const p = portion as Portion;
  return !!p && isRef(p.from) && isRef(p.to) && (p.from.surah < p.to.surah || (p.from.surah === p.to.surah && p.from.ayah <= p.to.ayah));
};
const isClock = (value: unknown) => {
  const c = value as Clock;
  return !!c && Number.isInteger(c.hour) && c.hour >= 0 && c.hour <= 23 && Number.isInteger(c.minute) && c.minute >= 0 && c.minute <= 59;
};
const isAssignment = (value: unknown) => {
  const a = value as Assignment;
  return !!a && typeof a === 'object' && (a.new === undefined || isPortion(a.new)) && (a.revision === undefined || isPortion(a.revision));
};
function checkEntry(entry: Entry, students: Set<string>) {
  if (!entry || !students.has(entry.student) || !(ATTENDANCE as readonly string[]).includes(entry.attendance) || !Array.isArray(entry.recitations) ||
    entry.recitations.length > RECITATION_KINDS.length || (entry.next !== undefined && !isAssignment(entry.next)) ||
    (entry.note !== undefined && (typeof entry.note !== 'string' || entry.note.length > NOTE_LIMIT))) fail();
  for (const r of entry.recitations) {
    if (!r || !(RECITATION_KINDS as readonly string[]).includes(r.kind) || !isPortion(r.portion) || !(GRADES as readonly string[]).includes(r.grade) ||
      !Array.isArray(r.marks) || r.marks.length > MARK_LIMIT || r.marks.some((m) => !m || !['mistake', 'hesitation'].includes(m.kind) || (m.at !== undefined && !isRef(m.at)))) fail();
  }
  if (new Set(entry.recitations.map((r) => r.kind)).size !== entry.recitations.length) fail();
}
export function decodeHalaqat(raw: string | null): HalaqatState {
  if (raw === null) return defaultHalaqatState;
  const saved = JSON.parse(raw) as HalaqatState;
  if (saved?.version !== 1 || !Array.isArray(saved.halaqat)) throw new Error(t('halaqat.storage.unsupportedVersion'));
  const halaqat = new Set<string>();
  for (const h of saved.halaqat) {
    if (!h || !isId(h.id, 'halaqa') || halaqat.has(h.id) || !isName(h.name) || !['warsh', 'hafs'].includes(h.riwayah) || !validDate(h.createdOn) ||
      !Array.isArray(h.weekdays) || new Set(h.weekdays).size !== h.weekdays.length || h.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6) ||
      !Array.isArray(h.students) || !Array.isArray(h.sessions) ||
      (h.time !== undefined && !isClock(h.time)) || (h.reminder !== undefined && (!h.time || !(REMINDER_LEADS as readonly number[]).includes(h.reminder?.before)))) fail();
    halaqat.add(h.id);
    const students = new Set<string>();
    for (const s of h.students) {
      if (!s || !isId(s.id, 'student') || students.has(s.id) || !isName(s.name) || !validDate(s.joinedOn) || !(DIRECTIONS as readonly string[]).includes(s.direction) ||
        !Array.isArray(s.known) || s.known.some((p) => !isPortion(p)) || (s.first !== undefined && !isAssignment(s.first)) ||
        (s.leftOn !== undefined && !validDate(s.leftOn)) || (s.me !== undefined && s.me !== true) ||
        (s.account !== undefined && (typeof s.account !== 'string' || !s.account || s.account.length > 64))) fail();
      students.add(s.id);
    }
    if (h.students.filter((s) => s.me).length > 1) fail();
    const sessions = new Set<string>(), dates = new Set<string>();
    for (const session of h.sessions) {
      if (!session || !isId(session.id, 'session') || sessions.has(session.id) || !validDate(session.date) || dates.has(session.date) ||
        !Array.isArray(session.entries) || new Set(session.entries.map((e) => e?.student)).size !== session.entries.length) fail();
      sessions.add(session.id); dates.add(session.date);
      for (const entry of session.entries) checkEntry(entry, students);
    }
  }
  return saved;
}

/** A time as it is written: «17:30». */
export const clockText = (time: Clock) => `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
/** When a reminder `lead` minutes before `time` comes (the evening before, for a session just after midnight). */
export function arrivalOf(time: Clock, lead: number): Clock {
  const minutes = (((time.hour * 60 + time.minute - lead) % 1440) + 1440) % 1440;
  return { hour: Math.floor(minutes / 60), minute: minutes % 60 };
}
