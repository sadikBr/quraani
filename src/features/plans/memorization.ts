import { RIWAYAT } from '../quran-reader/riwayat';
import { addDays, validDate } from './dates';
import type { PlanIndex } from './engine';
import { calendarWeekday, nextScheduledDate } from './recurring';
import type { AyahSpan, MemorizationDraft, MemorizationPlan, MemorizationRecord, MemorizationSession } from './types';
import { formatNumber, t } from '@/i18n';

export function mergeSpans(ranges: AyahSpan[]): AyahSpan[] {
  const result: AyahSpan[] = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    // Copy only the bounds: callers pass list rows ({ label, number, start, end })
    // and stray keys must never reach storage or span comparisons.
    else result.push({ start: range.start, end: range.end });
  }
  return result;
}
export function subtractSpans(source: AyahSpan[], excluded: AyahSpan[]): AyahSpan[] {
  const cuts = mergeSpans(excluded);
  return mergeSpans(source).flatMap(range => {
    const result: AyahSpan[] = [];
    let cursor = range.start;
    for (const cut of cuts) {
      if (cut.end <= cursor) continue;
      if (cut.start >= range.end) break;
      if (cut.start > cursor) result.push({ start: cursor, end: cut.start });
      cursor = Math.max(cursor, cut.end);
      if (cursor >= range.end) break;
    }
    if (cursor < range.end) result.push({ start: cursor, end: range.end });
    return result;
  });
}
/** Compare spans by value, ignoring key order and any extra fields. */
export const sameSpans = (a: AyahSpan[], b: AyahSpan[]) => {
  const x = mergeSpans(a), y = mergeSpans(b);
  return x.length === y.length && x.every((r, i) => r.start === y[i].start && r.end === y[i].end);
};
export const spanCount = (ranges: AyahSpan[]) => ranges.reduce((n, r) => n + r.end - r.start, 0);
export const coversSpan = (ranges: AyahSpan[], range: AyahSpan) => subtractSpans([range], ranges).length === 0;
export function validateSpans(ranges: AyahSpan[], total: number) {
  if (!Array.isArray(ranges) || ranges.length > total) throw new Error(t('memorization.errors.invalidSegments'));
  let end = -1;
  for (const r of ranges) {
    if (!r || !Number.isInteger(r.start) || !Number.isInteger(r.end) || r.start < 0 || r.start < end || r.end <= r.start || r.end > total) throw new Error(t('memorization.errors.invalidBounds'));
    end = r.end;
  }
}
export function memoryFor(records: MemorizationRecord[], riwayah: MemorizationRecord['riwayah'], index: PlanIndex) {
  const record = records.find(r => r.riwayah === riwayah);
  if (record && (record.corpus !== index.corpus || record.totalAyahs !== index.ayahs.length)) throw new Error(t('memorization.errors.recordMismatch'));
  return record?.ranges ?? [];
}
/** Measure each ayah as its share of its real quarter; no fixed pages-per-hizb assumption. */
export function quarterAmount(index: PlanIndex, ranges: AyahSpan[]) {
  return mergeSpans(ranges).reduce((sum, range) => sum + index.quarters.slice(0, -1).reduce((n, start, i) => {
    const end = index.quarters[i + 1];
    return n + Math.max(0, Math.min(end, range.end) - Math.max(start, range.start)) / (end - start);
  }, 0), 0);
}
export function quarterLabel(amount: number) {
  if (amount === 1) return t('memorization.quarterAmount.quarter');
  if (amount === 2) return t('memorization.quarterAmount.half');
  if (amount === 3) return t('memorization.quarterAmount.threeQuarters');
  if (amount === 4) return t('memorization.quarterAmount.oneHizb');
  if (amount === 8) return t('memorization.quarterAmount.oneJuz');
  return t('memorization.quarterAmount.hizbs', { amount: formatNumber(amount / 4, { maximumFractionDigits: 2 }) });
}
function validateSettings(weeklyQuarters: number, weekdays: number[]) {
  if (!Number.isInteger(weeklyQuarters) || weeklyQuarters < 1 || weeklyQuarters > 240) throw new Error(t('memorization.errors.weeklyAmount'));
  if (!Array.isArray(weekdays) || !weekdays.length || new Set(weekdays).size !== weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error(t('memorization.errors.weekdays'));
}
function validateClock(reminder: MemorizationDraft['reminder']) {
  if (typeof reminder.enabled !== 'boolean' || !Number.isInteger(reminder.hour) || reminder.hour < 0 || reminder.hour > 23 || !Number.isInteger(reminder.minute) || reminder.minute < 0 || reminder.minute > 59) throw new Error(t('memorization.errors.reminderTime'));
}
/** Round cumulative targets, not each day independently, so rounding never compounds. */
export function buildMemorizationSchedule(index: PlanIndex, memorized: AyahSpan[], weeklyQuarters: number, weekdays: number[], startDate: string): MemorizationSession[] {
  validateSettings(weeklyQuarters, weekdays);
  validateSpans(memorized, index.ayahs.length);
  if (!validDate(startDate)) throw new Error(t('memorization.errors.startDate'));
  const remaining = subtractSpans([{ start: 0, end: index.ayahs.length }], memorized);
  const ordinals = remaining.flatMap(r => Array.from({ length: r.end - r.start }, (_, i) => r.start + i));
  const cumulative = [0];
  let quarter = 0;
  for (const ordinal of ordinals) {
    while (ordinal >= index.quarters[quarter + 1]) quarter++;
    cumulative.push(cumulative.at(-1)! + 1 / (index.quarters[quarter + 1] - index.quarters[quarter]));
  }
  const sessions: MemorizationSession[] = [], quota = weeklyQuarters / weekdays.length;
  let cursor = 0, target = quota, date = nextScheduledDate({ weekdays, startDate }, startDate);
  while (cursor < ordinals.length) {
    let end = cursor;
    while (end < ordinals.length && cumulative[end] < target) end++;
    if (end > cursor && Math.abs(cumulative[end - 1] - target) < Math.abs(cumulative[end] - target)) end--;
    if (end > cursor) sessions.push({ date, ranges: mergeSpans(ordinals.slice(cursor, end).map(start => ({ start, end: start + 1 }))) });
    cursor = end; target += quota;
    date = nextScheduledDate({ weekdays, startDate }, addDays(date, 1));
  }
  return sessions;
}
export function createMemorizationPlan(draft: MemorizationDraft, index: PlanIndex, id: string): MemorizationPlan {
  if (!draft.name.trim() || draft.name.trim().length > 80 || !RIWAYAT[draft.riwayah] || index.mushafId !== RIWAYAT[draft.riwayah].mushafId) throw new Error(t('memorization.errors.nameAndRiwayah'));
  validateClock(draft.reminder);
  const memorized = mergeSpans(draft.memorized);
  const sessions = buildMemorizationSchedule(index, memorized, draft.weeklyQuarters, draft.weekdays, draft.startDate);
  return { id, name: draft.name.trim(), riwayah: draft.riwayah, goal: { type: 'memorization', weeklyQuarters: draft.weeklyQuarters }, weekdays: [...draft.weekdays].sort((a, b) => a - b),
    startDate: draft.startDate, status: sessions.length ? 'active' : 'completed', reminder: { ...draft.reminder }, corpus: index.corpus, totalAyahs: index.ayahs.length,
    memorized, initialRecord: mergeSpans(draft.initialRecord ?? []), sessions, revision: 1, progress: [], undoable: false };
}
/** Re-plan from tomorrow when a session was already finished today, so a
 * restore or settings change never assigns a second session on the same day. */
export function memorizationReplanDate(plan: MemorizationPlan, today: string) {
  return plan.progress.some(log => log.date === today && log.finished) ? addDays(today, 1) : today;
}
/** Missed content is retained, with at most one assignment per selected day. */
export function memorizationSchedule(plan: MemorizationPlan, today: string): MemorizationSession[] {
  let date = '';
  return plan.sessions.map((session, i) => {
    if (!i) date = nextScheduledDate(plan, session.date > today ? session.date : today);
    else {
      // Preserve empty quota slots when a whole ayah is larger than a day's share.
      let original = plan.sessions[i - 1].date;
      do { original = nextScheduledDate(plan, addDays(original, 1)); date = nextScheduledDate(plan, addDays(date, 1)); } while (original < session.date);
    }
    return { ...session, date };
  });
}
export function nextMemorizationPortion(plan: MemorizationPlan, today: string) {
  if (plan.status !== 'active' || !plan.sessions.length) return null;
  const first = plan.sessions[0], range = first.ranges[0];
  const date = nextScheduledDate(plan, first.date > today ? first.date : today);
  return { ...range, slot: 0, cycle: plan.revision, date, due: date === today };
}
export function recordMemorizationProgress(plan: MemorizationPlan, receipt: { cycle: number; slot: number; to: number }, today: string): MemorizationPlan {
  const next = nextMemorizationPortion(plan, today);
  if (!next?.due || next.cycle !== receipt.cycle || next.slot !== receipt.slot || !Number.isInteger(receipt.to) || receipt.to <= next.start || receipt.to > next.end) return plan;
  const sessions = memorizationSchedule(plan, today);
  const first = sessions[0], ranges = first.ranges.slice(1);
  if (receipt.to < next.end) ranges.unshift({ start: receipt.to, end: next.end });
  const finished = !ranges.length;
  if (finished) sessions.shift(); else sessions[0] = { ...first, ranges };
  return { ...plan, sessions, status: sessions.length ? 'active' : 'completed', revision: plan.revision + 1, undoable: true, undoSession: first,
    memorized: mergeSpans([...plan.memorized, { start: next.start, end: receipt.to }]),
    progress: [...plan.progress, { date: today, from: next.start, to: receipt.to, finished }] };
}
export function reviseMemorization(plan: MemorizationPlan, index: PlanIndex, memorized: AyahSpan[], today: string, settings = { weeklyQuarters: plan.goal.weeklyQuarters, weekdays: plan.weekdays }): MemorizationPlan {
  if (plan.corpus !== index.corpus || index.mushafId !== RIWAYAT[plan.riwayah].mushafId || plan.totalAyahs !== index.ayahs.length) throw new Error(t('memorization.errors.mushafMismatch'));
  const ranges = mergeSpans(memorized);
  const sessions = buildMemorizationSchedule(index, ranges, settings.weeklyQuarters, settings.weekdays, today < plan.startDate ? plan.startDate : today);
  return { ...plan, goal: { type: 'memorization', weeklyQuarters: settings.weeklyQuarters }, weekdays: [...settings.weekdays].sort((a, b) => a - b),
    memorized: ranges, sessions, revision: plan.revision + 1, undoable: false, undoSession: undefined,
    status: plan.status === 'archived' ? 'archived' : !sessions.length ? 'completed' : plan.status === 'paused' ? 'paused' : 'active' };
}
export function undoMemorizationProgress(plan: MemorizationPlan, index: PlanIndex, today: string): MemorizationPlan {
  const last = plan.progress.at(-1);
  if (plan.status === 'archived' || !plan.undoable || !last || !plan.undoSession) return plan;
  if (plan.corpus !== index.corpus || plan.totalAyahs !== index.ayahs.length || index.mushafId !== RIWAYAT[plan.riwayah].mushafId || !validDate(today)) throw new Error(t('memorization.errors.undoMismatch'));
  return { ...plan, status: plan.status === 'paused' ? 'paused' : 'active', revision: plan.revision + 1,
    memorized: subtractSpans(plan.memorized, [{ start: last.from, end: last.to }]),
    sessions: [plan.undoSession, ...plan.sessions.slice(last.finished ? 0 : 1)],
    progress: plan.progress.slice(0, -1), undoable: false, undoSession: undefined };
}
export function validateMemorizationPlan(plan: MemorizationPlan) {
  validateSettings(plan.goal.weeklyQuarters, plan.weekdays);
  validateSpans(plan.memorized, plan.totalAyahs);
  validateSpans(plan.initialRecord, plan.totalAyahs);
  if (!Number.isInteger(plan.revision) || plan.revision < 1 || typeof plan.undoable !== 'boolean' || !Array.isArray(plan.sessions) || plan.sessions.length > plan.totalAyahs || !Array.isArray(plan.progress)) throw new Error(t('memorization.errors.invalidSchedule'));
  let date = '', end = -1;
  const pending: AyahSpan[] = [];
  for (const session of plan.sessions) {
    if (!session || !validDate(session.date) || session.date < plan.startDate || session.date <= date || !plan.weekdays.includes(calendarWeekday(session.date)) || !session.ranges?.length) throw new Error(t('memorization.errors.invalidDates'));
    validateSpans(session.ranges, plan.totalAyahs);
    for (const range of session.ranges) {
      if (range.start < end) throw new Error(t('memorization.errors.overlapping'));
      end = range.end; pending.push(range);
    }
    date = session.date;
  }
  const complement = subtractSpans([{ start: 0, end: plan.totalAyahs }], plan.memorized);
  if (JSON.stringify(mergeSpans(pending)) !== JSON.stringify(complement) || (plan.status === 'completed' && pending.length) || (plan.status === 'active' && !pending.length)) throw new Error(t('memorization.errors.scheduleMismatch'));
  for (const log of plan.progress) if (!log || !validDate(log.date) || log.date < plan.startDate || !Number.isInteger(log.from) || !Number.isInteger(log.to) || log.from < 0 || log.to <= log.from || log.to > plan.totalAyahs || typeof log.finished !== 'boolean') throw new Error(t('memorization.errors.invalidLog'));
  if (plan.undoSession) {
    if (!validDate(plan.undoSession.date)) throw new Error(t('memorization.errors.invalidUndoDate'));
    validateSpans(plan.undoSession.ranges, plan.totalAyahs);
  }
  if (plan.undoable && (!plan.undoSession || !validDate(plan.undoSession.date) || !plan.undoSession.ranges?.length || !plan.progress.length || !coversSpan(plan.memorized, { start: plan.progress.at(-1)!.from, end: plan.progress.at(-1)!.to }))) throw new Error(t('memorization.errors.invalidLastEntry'));
}
