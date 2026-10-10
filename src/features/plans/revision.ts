import { RIWAYAT } from '../quran-reader/riwayat';
import { addDays, validDate } from './dates';
import type { PlanIndex } from './engine';
import { mergeSpans, spanCount, validateSpans } from './memorization';
import { calendarWeekday, nextScheduledDate } from './recurring';
import type { AyahSpan, RevisionDraft, RevisionPlan, RevisionUndo } from './types';

/**
 * A portion that would leave less than this share of a day's amount at the end
 * of a pass takes it along, so a pass never ends with a two-ayah day.
 */
const TAIL_SHARE = 0.25;
export const REVISION_MAX_QUARTERS = 240;

/** Weight of each ayah as its share of the quarter it belongs to. */
function weigher(quarters: number[]) {
  let q = 0;
  return (ordinal: number) => {
    if (ordinal < quarters[q]) q = 0;
    while (q < quarters.length - 2 && ordinal >= quarters[q + 1]) q++;
    return 1 / (quarters[q + 1] - quarters[q]);
  };
}

/** Clip spans to ordinals at or after `from`. */
function from(spans: AyahSpan[], start: number): AyahSpan[] {
  return spans.flatMap(r => r.end <= start ? [] : [{ start: Math.max(r.start, start), end: r.end }]);
}

export function revisionWeight(quarters: number[], spans: AyahSpan[]) {
  const weight = weigher(quarters);
  let total = 0;
  for (const r of mergeSpans(spans)) for (let i = r.start; i < r.end; i++) total += weight(i);
  return total;
}

/**
 * The spans of the portion that starts at `portionStart`: memorized ayahs in
 * mushaf order until the day's amount, ending on the whole ayah closest to it.
 * It never runs past the last memorized ayah; the next portion starts a new pass.
 */
export function portionSpans(plan: Pick<RevisionPlan, 'memorized' | 'quarters' | 'portionStart' | 'goal'>): AyahSpan[] {
  const ahead = from(mergeSpans(plan.memorized), plan.portionStart);
  if (!ahead.length) return [];
  const weight = weigher(plan.quarters), target = plan.goal.dailyQuarters;
  const ordinals: number[] = [];
  const cumulative = [0];
  // An ayah weighs at most one quarter, so past 2·target + 2 the tail rule can
  // no longer apply; stop there instead of weighing everything memorized.
  const horizon = target * 2 + 2;
  let truncated = false;
  scan: for (const r of ahead) for (let i = r.start; i < r.end; i++) {
    if (cumulative.at(-1)! > horizon) { truncated = true; break scan; }
    ordinals.push(i); cumulative.push(cumulative.at(-1)! + weight(i));
  }
  const total = cumulative.at(-1)!;
  let end = 1;
  while (end < ordinals.length && cumulative[end] < target) end++;
  if (end > 1 && Math.abs(cumulative[end - 1] - target) < Math.abs(cumulative[end] - target)) end--;
  if (!truncated && total - cumulative[end] < target * TAIL_SHARE) end = ordinals.length;
  return mergeSpans(ordinals.slice(0, end).map(start => ({ start, end: start + 1 })));
}

/**
 * Bring the stored position in line with the memorized record, which can grow
 * or shrink between visits: start a new pass after the last memorized ayah,
 * and move past a portion whose remaining ayahs are no longer memorized.
 */
export function normalizeRevision(plan: RevisionPlan): RevisionPlan {
  const memorized = mergeSpans(plan.memorized);
  if (!memorized.length) return plan;
  let next = plan;
  for (let guard = 0; guard < 3; guard++) {
    if (!from(memorized, next.portionStart).length) {
      next = { ...next, pass: next.pass + 1, portionStart: memorized[0].start, cursor: memorized[0].start };
      continue;
    }
    const spans = portionSpans(next);
    const cursor = Math.max(next.cursor, next.portionStart);
    if (from(spans, cursor).length) return cursor === next.cursor ? next : { ...next, cursor };
    // The unread rest of this portion is no longer memorized: continue after it.
    const end = spans.at(-1)!.end;
    next = { ...next, portionStart: end, cursor: end };
  }
  return next;
}

export interface RevisionDay {
  date: string;
  due: boolean;
  pass: number;
  /** All spans of the current portion (a portion can skip non-memorized gaps). */
  spans: AyahSpan[];
  /** Spans not yet revised. */
  remaining: AyahSpan[];
}

/** The current portion and the day it is due. Missed days do not pile up. */
export function revisionDay(plan: RevisionPlan, today: string): RevisionDay | null {
  if (plan.status !== 'active') return null;
  const state = normalizeRevision(plan);
  const spans = portionSpans(state);
  const remaining = from(spans, state.cursor);
  if (!remaining.length) return null;
  const date = nextScheduledDate(plan, state.availableDate > today ? state.availableDate : today);
  return { date, due: date === today, pass: state.pass, spans, remaining };
}

export function nextRevisionPortion(plan: RevisionPlan, today: string) {
  const day = revisionDay(plan, today);
  if (!day) return null;
  const range = day.remaining[0];
  const slot = day.spans.findIndex(span => span.end > range.start);
  return { start: range.start, end: range.end, slot, cycle: plan.revision, date: day.date, due: day.due };
}

export function recordRevisionProgress(plan: RevisionPlan, receipt: { cycle: number; slot: number; to: number }, today: string): RevisionPlan {
  const next = nextRevisionPortion(plan, today);
  if (!next?.due || next.cycle !== receipt.cycle || next.slot !== receipt.slot || !Number.isInteger(receipt.to) || receipt.to <= next.start || receipt.to > next.end) return plan;
  const state = normalizeRevision(plan);
  const undo = { date: today, portionStart: state.portionStart, cursor: state.cursor, pass: state.pass, availableDate: state.availableDate, logLength: state.log.length };
  const spans = portionSpans(state);
  const rest = from(spans, receipt.to);
  if (rest.length) return { ...state, cursor: rest[0].start, revision: plan.revision + 1, undo };
  // The day's portion is finished: log it and move to the next one.
  const end = spans.at(-1)!.end;
  return normalizeRevision({ ...state, portionStart: end, cursor: end, availableDate: addDays(today, 1), revision: plan.revision + 1, undo,
    log: [...state.log, { date: today, from: state.portionStart, to: end, pass: state.pass }] });
}

/** Mark every remaining part of today's portion as revised. One undo restores the whole day. */
export function finishRevisionDay(plan: RevisionPlan, today: string): RevisionPlan {
  let next = plan, undo: RevisionUndo | undefined;
  for (let guard = 0; guard < 10000; guard++) {
    const portion = nextRevisionPortion(next, today);
    if (!portion?.due) break;
    const recorded = recordRevisionProgress(next, { cycle: portion.cycle, slot: portion.slot, to: portion.end }, today);
    if (recorded === next) break;
    undo ??= recorded.undo;
    const finished = recorded.log.length > next.log.length;
    next = recorded;
    if (finished) break;
  }
  return next === plan ? plan : { ...next, undo };
}

/** Undo the last recorded progress, on the same day only. */
export function undoRevisionProgress(plan: RevisionPlan, today: string): RevisionPlan {
  const undo = plan.undo;
  if (!undo || undo.date !== today || plan.status === 'archived') return plan;
  return { ...plan, portionStart: undo.portionStart, cursor: undo.cursor, pass: undo.pass, availableDate: undo.availableDate,
    log: plan.log.slice(0, undo.logLength), revision: plan.revision + 1, undo: undefined };
}

/** Changing the amount or days keeps the place in the pass; only future portions change. */
export function reviseRevisionSettings(plan: RevisionPlan, settings: { dailyQuarters: number; weekdays: number[] }, today: string): RevisionPlan {
  validateSettings(settings.dailyQuarters, settings.weekdays);
  const state = normalizeRevision(plan);
  const next: RevisionPlan = { ...state, goal: { type: 'revision', dailyQuarters: settings.dailyQuarters }, weekdays: [...settings.weekdays].sort((a, b) => a - b),
    revision: plan.revision + 1, undo: undefined };
  if (!state.memorized.length || from(portionSpans(next), next.cursor).length) return next;
  // A smaller amount than what is already read today: the day is done.
  return normalizeRevision({ ...next, portionStart: next.cursor, availableDate: addDays(today, 1),
    log: [...next.log, { date: today, from: next.portionStart, to: next.cursor, pass: next.pass }] });
}

/** Upcoming portions as if each were finished on its day. */
export function upcomingRevisionDays(plan: RevisionPlan, today: string, count: number): RevisionDay[] {
  const days: RevisionDay[] = [];
  let state = plan;
  for (let i = 0; i < count; i++) {
    const day = revisionDay(state, today);
    if (!day) break;
    days.push(day);
    const end = day.spans.at(-1)!.end;
    state = normalizeRevision({ ...normalizeRevision(state), portionStart: end, cursor: end, availableDate: addDays(day.date, 1) });
  }
  return days;
}

/** The days left in the current pass, the current portion first. */
export function remainingPassDays(plan: RevisionPlan, today: string, limit = 500): RevisionDay[] {
  const days: RevisionDay[] = [];
  let state = plan;
  for (let i = 0; i < limit; i++) {
    const day = revisionDay(state, today);
    if (!day || (days.length && day.pass !== days[0].pass)) break;
    days.push(day);
    const end = day.spans.at(-1)!.end;
    state = normalizeRevision({ ...normalizeRevision(state), portionStart: end, cursor: end, availableDate: addDays(day.date, 1) });
  }
  return days;
}

/** How many revision days one full pass takes at the current amount. */
export function revisionPassLength(plan: Pick<RevisionPlan, 'memorized' | 'quarters' | 'goal'>): number {
  const memorized = mergeSpans(plan.memorized);
  if (!memorized.length) return 0;
  let start = memorized[0].start, days = 0;
  const last = memorized.at(-1)!.end;
  while (start < last && days < 10000) {
    const spans = portionSpans({ ...plan, portionStart: start });
    if (!spans.length) break;
    start = spans.at(-1)!.end; days++;
  }
  return days;
}

/** Share (0–1) of the current pass already revised, by quarter weight. */
export function revisionPassProgress(plan: RevisionPlan): number {
  const memorized = mergeSpans(plan.memorized);
  const total = revisionWeight(plan.quarters, memorized);
  if (!total) return 0;
  const state = normalizeRevision(plan);
  const done = memorized.flatMap(r => r.start >= state.cursor ? [] : [{ start: r.start, end: Math.min(r.end, state.cursor) }]);
  return Math.min(1, revisionWeight(plan.quarters, done) / total);
}

function validateSettings(dailyQuarters: number, weekdays: number[]) {
  if (!Number.isInteger(dailyQuarters) || dailyQuarters < 1 || dailyQuarters > REVISION_MAX_QUARTERS) throw new Error('اختر مقدارًا يوميًا من ربع حزب إلى القرآن كاملًا.');
  if (!Array.isArray(weekdays) || !weekdays.length || new Set(weekdays).size !== weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('اختر يومًا واحدًا على الأقل للمراجعة.');
}

/** `allowEmpty`: a running memorization goal owns the record, and what it adds joins later. */
export function createRevisionPlan(draft: RevisionDraft, index: PlanIndex, id: string, { allowEmpty = false } = {}): RevisionPlan {
  if (!draft.name.trim() || draft.name.trim().length > 80 || !RIWAYAT[draft.riwayah] || index.mushafId !== RIWAYAT[draft.riwayah].mushafId) throw new Error('راجع اسم الهدف وروايته.');
  if (!validDate(draft.startDate)) throw new Error('تاريخ البداية غير صالح.');
  validateSettings(draft.dailyQuarters, draft.weekdays);
  const { hour, minute, enabled } = draft.reminder;
  if (typeof enabled !== 'boolean' || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('وقت التذكير غير صالح.');
  const memorized = mergeSpans(draft.memorized);
  validateSpans(memorized, index.ayahs.length);
  if (!spanCount(memorized) && !allowEmpty) throw new Error('حدد ما تحفظه أولًا؛ المراجعة تدور على محفوظك.');
  const start = memorized[0]?.start ?? 0;
  return { id, name: draft.name.trim(), riwayah: draft.riwayah, goal: { type: 'revision', dailyQuarters: draft.dailyQuarters },
    weekdays: [...draft.weekdays].sort((a, b) => a - b), startDate: draft.startDate, status: 'active', reminder: { ...draft.reminder },
    corpus: index.corpus, totalAyahs: index.ayahs.length, memorized, quarters: [...index.quarters],
    pass: 1, portionStart: start, cursor: start, availableDate: draft.startDate, revision: 1, log: [] };
}

export function validateRevisionPlan(plan: RevisionPlan) {
  const invalid = (what: string) => { throw new Error(`بيانات المراجعة غير صالحة (${what})`); };
  if (plan.status === 'completed') invalid('status');
  validateSettings(plan.goal?.dailyQuarters, plan.weekdays);
  validateSpans(plan.memorized, plan.totalAyahs);
  const q = plan.quarters;
  if (!Array.isArray(q) || q.length < 2 || q[0] !== 0 || q.at(-1) !== plan.totalAyahs || q.some((x, i) => !Number.isInteger(x) || (i && x <= q[i - 1]))) invalid('quarters');
  for (const key of ['portionStart', 'cursor'] as const) if (!Number.isInteger(plan[key]) || plan[key] < 0 || plan[key] > plan.totalAyahs) invalid(key);
  if (!Number.isInteger(plan.pass) || plan.pass < 1 || !Number.isInteger(plan.revision) || plan.revision < 1 || !validDate(plan.availableDate) || !Array.isArray(plan.log)) invalid('state');
  let date = '';
  for (const log of plan.log) {
    if (!log || !validDate(log.date) || log.date < date || !Number.isInteger(log.from) || !Number.isInteger(log.to) || log.from < 0 || log.to <= log.from || log.to > plan.totalAyahs || !Number.isInteger(log.pass) || log.pass < 1) invalid('log');
    date = log.date;
  }
  if (plan.undo) {
    const u = plan.undo;
    if (!validDate(u.date) || !validDate(u.availableDate) || !Number.isInteger(u.portionStart) || !Number.isInteger(u.cursor) || !Number.isInteger(u.pass) || u.pass < 1 ||
      !Number.isInteger(u.logLength) || u.logLength < 0 || u.logLength > plan.log.length) invalid('undo');
  }
}

/** Scheduled revision days in [from, to) on which a portion would be due. */
export function revisionReminderDays(plan: RevisionPlan, today: string, days: number): string[] {
  if (plan.status !== 'active' || !plan.reminder.enabled || !plan.memorized.length) return [];
  const first = [plan.startDate, plan.availableDate, today].sort().at(-1)!;
  return Array.from({ length: days }, (_, i) => addDays(today, i)).filter(day => day >= first && plan.weekdays.includes(calendarWeekday(day)));
}
