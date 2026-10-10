import type { Ayah } from '@/lib/quranpedia/types';
import type { ReaderContent } from '../quran-reader/types/reader';
import { RIWAYAT } from '../quran-reader/riwayat';
import { pageFingerprint } from '../quran-reader/utils/page-fingerprint';
import { addDays, daysBetween, validDate } from './dates';
import { nextMemorizationPortion, recordMemorizationProgress } from './memorization';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, isSequentialPlan, type PlanCycle, type PlanDraft, type PlanSession, type PlanUnit, type ReadingPlan, type SequentialPlan, type RecurringPlan } from './types';
import { nextRecurringPortion, recordRecurringProgress } from './recurring';
import { nextRevisionPortion, recordRevisionProgress } from './revision';
import { resolvePlanStart } from './start-point';
import { t } from '@/i18n';

export interface PlanIndex {
  mushafId: number;
  ayahs: Ayah[];
  corpus: string;
  pages: number[];
  hizbs: number[];
  juzs: number[];
  quarters: number[];
  surahNames: Record<number, string>;
}
export const unitLabels: Record<PlanUnit, string> = { get pages() { return t('plans.units.pages'); }, get hizbs() { return t('plans.units.hizbs'); }, get juzs() { return t('plans.units.juzs'); } };
const indices = new WeakMap<ReaderContent, PlanIndex>();
export function buildPlanIndex(content: ReaderContent): PlanIndex {
  const cached = indices.get(content);
  if (cached) return cached;
  const ayahs = content.quran.surahs.flatMap(s => s.ayahs);
  const positions = new Map(ayahs.map((a, i) => [`${a.surahNumber}:${a.ayahNumber}`, i]));
  const boundaries = (refs: { surahNumber: number; ayahNumber: number }[]) => [...new Set([0, ...refs.map(a => {
    const i = positions.get(`${a.surahNumber}:${a.ayahNumber}`);
    if (i === undefined) throw new Error(t('plans.engine.incompleteBoundaries'));
    return i;
  }), ayahs.length])].sort((a, b) => a - b);
  const result: PlanIndex = {
    mushafId: content.quran.id, ayahs,
    corpus: pageFingerprint(ayahs.map(a => `${a.mushafId}:${a.surahNumber}:${a.ayahNumber}:${a.pageNumber}:${a.hizbQuarter}:${a.juzNumber}`).join('|')),
    pages: boundaries(content.pages.map(p => p.ayahs[0])),
    hizbs: boundaries(content.hizbIndex.map(x => x.start)), juzs: boundaries(content.juzIndex.map(x => x.start)),
    quarters: boundaries(content.quarterHizbIndex.map(x => x.start)),
    surahNames: Object.fromEntries(content.quran.surahs.map(s => [s.number, s.name])),
  };
  indices.set(content, result);
  return result;
}
export function assertPlanIndex(plan: ReadingPlan, index: PlanIndex) {
  if (index.mushafId !== RIWAYAT[plan.riwayah].mushafId || plan.corpus !== index.corpus || plan.totalAyahs !== index.ayahs.length) {
    throw new Error(t('plans.engine.editionMismatch'));
  }
  if (isRecurringPlan(plan) && plan.ranges.some(r => index.ayahs[r.start]?.surahNumber !== r.surah || index.ayahs[r.end - 1]?.surahNumber !== r.surah ||
    index.ayahs[r.start - 1]?.surahNumber === r.surah || index.ayahs[r.end]?.surahNumber === r.surah)) throw new Error(t('plans.engine.surahBoundsMismatch'));
}
function daySequence(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}
/** Preserve real unit boundaries; refine to quarter hizbs, then ayahs for long plans. */
function khatmaEnds(index: PlanIndex, unit: PlanUnit, start: number, count: number): number[] {
  let boundaries = index[unit].filter(x => x > start);
  if (boundaries.length < count && unit !== 'pages') boundaries = index.quarters.filter(x => x > start);
  if (boundaries.length < count) boundaries = Array.from({ length: index.ayahs.length - start }, (_, i) => start + i + 1);
  count = Math.min(count, boundaries.length);
  return Array.from({ length: count }, (_, i) => boundaries[Math.ceil((i + 1) * boundaries.length / count) - 1]);
}
function quotaEnds(index: PlanIndex, unit: PlanUnit, amount: number, start: number): number[] {
  const boundaries = unit === 'pages' ? index.pages : index.quarters;
  const stride = amount * (unit === 'hizbs' ? 4 : unit === 'juzs' ? 8 : 1);
  if (!Number.isInteger(stride) || stride < 1 || stride > boundaries.length - 1) throw new Error(t('plans.engine.invalidWirdAmount'));
  const ends: number[] = [];
  let cursor = start;
  let quantum = stride, remainder = unit === 'hizbs' ? 4 : 8;
  while (remainder) { const next = quantum % remainder; quantum = remainder; remainder = next; }
  while (cursor < index.ayahs.length) {
    const slot = boundaries.findIndex(x => x > cursor);
    const endpoint = unit === 'pages' ? slot + stride - 1 : Math.ceil(slot / quantum) * quantum + stride - quantum;
    cursor = boundaries[Math.min(endpoint, boundaries.length - 1)];
    ends.push(cursor);
  }
  return ends;
}
function sessionsFrom(ends: number[], start: number, date: string): PlanSession[] {
  const dates = daySequence(date, ends.length);
  return ends.map((end, i) => ({ start: i ? ends[i - 1] : start, end, date: dates[i] }));
}
function createCycle(draft: Pick<PlanDraft, 'goal' | 'unit' | 'startDate'>, index: PlanIndex, start = 0, number = 1): PlanCycle {
  const ends = draft.goal.type === 'khatma' ? khatmaEnds(index, draft.unit, start, draft.goal.weeks * 7) : quotaEnds(index, draft.unit, draft.goal.amount, start);
  return { number, start, cursor: start, sessions: sessionsFrom(ends, start, draft.startDate), availableDate: draft.startDate, progress: [] };
}
export function createPlan(draft: PlanDraft, index: PlanIndex, id: string): SequentialPlan {
  if (!draft.name.trim() || draft.name.trim().length > 80 || !validDate(draft.startDate) || !RIWAYAT[draft.riwayah] || index.mushafId !== RIWAYAT[draft.riwayah].mushafId) throw new Error(t('plans.engine.checkDraft'));
  if (draft.goal.type === 'khatma' && (!Number.isInteger(draft.goal.weeks) || draft.goal.weeks < 1 || draft.goal.weeks > 52)) throw new Error(t('plans.engine.khatmaWeeks'));
  const start = resolvePlanStart(index, draft.start);
  if (!Number.isInteger(draft.reminder.hour) || draft.reminder.hour < 0 || draft.reminder.hour > 23 || !Number.isInteger(draft.reminder.minute) || draft.reminder.minute < 0 || draft.reminder.minute > 59) throw new Error(t('plans.engine.invalidReminderTime'));
  return { id, name: draft.name.trim(), riwayah: draft.riwayah, goal: draft.goal, unit: draft.unit, startDate: draft.startDate,
    repeat: draft.repeat, reminder: draft.reminder, status: 'active', weekdays: [0, 1, 2, 3, 4, 5, 6],
    corpus: index.corpus, totalAyahs: index.ayahs.length, cycle: createCycle(draft, index, start), history: [] };
}
export function nextPortion(plan: ReadingPlan, today: string) {
  if (isMemorizationPlan(plan)) return nextMemorizationPortion(plan, today);
  if (isRecurringPlan(plan)) return nextRecurringPortion(plan, today);
  if (isRevisionPlan(plan)) return nextRevisionPortion(plan, today);
  if (plan.status !== 'active') return null;
  const slot = plan.cycle.sessions.findIndex(s => s.end > plan.cycle.cursor);
  if (slot < 0) return null;
  const session = plan.cycle.sessions[slot];
  const date = plan.goal.type === 'wird' ? (plan.cycle.availableDate < today ? today : plan.cycle.availableDate) : session.date;
  return { ...session, start: plan.cycle.cursor, slot, cycle: plan.cycle.number, date, due: date <= today };
}
/** A receipt binds a tap to one portion. Repeated taps cannot complete the next day's reading. */
export function recordProgress(plan: SequentialPlan, receipt: { cycle: number; slot: number; to: number }, today: string): SequentialPlan;
export function recordProgress(plan: RecurringPlan, receipt: { cycle: number; slot: number; to: number }, today: string): RecurringPlan;
export function recordProgress(plan: ReadingPlan, receipt: { cycle: number; slot: number; to: number }, today: string): ReadingPlan;
export function recordProgress(plan: ReadingPlan, receipt: { cycle: number; slot: number; to: number }, today: string): ReadingPlan {
  if (isMemorizationPlan(plan)) return recordMemorizationProgress(plan, receipt, today);
  if (isRecurringPlan(plan)) return recordRecurringProgress(plan, receipt, today);
  if (isRevisionPlan(plan)) return recordRevisionProgress(plan, receipt, today);
  const next = nextPortion(plan, today);
  if (!next || !next.due || receipt.cycle !== next.cycle || receipt.slot !== next.slot || !Number.isInteger(receipt.to) || receipt.to <= next.start || receipt.to > next.end) return plan;
  const completed = receipt.to === plan.totalAyahs;
  return { ...plan, status: completed ? 'completed' : 'active', cycle: { ...plan.cycle, cursor: receipt.to,
    availableDate: receipt.to === next.end ? addDays(today, 1) : plan.cycle.availableDate,
    completedOn: completed ? today : undefined,
    progress: [...plan.cycle.progress, { date: today, from: next.start, to: receipt.to }] } };
}
export function undoProgress(plan: SequentialPlan): SequentialPlan {
  if (plan.status === 'archived') return plan;
  const last = plan.cycle.progress.at(-1);
  if (!last) return plan;
  return { ...plan, status: plan.status === 'paused' ? 'paused' : 'active', cycle: { ...plan.cycle,
    cursor: last.from, completedOn: undefined, availableDate: last.date, progress: plan.cycle.progress.slice(0, -1) } };
}
export function rollCompletedCycle(plan: SequentialPlan, index: PlanIndex, today: string): SequentialPlan {
  assertPlanIndex(plan, index);
  if (plan.status !== 'completed' || !plan.repeat || !plan.cycle.completedOn || today <= plan.cycle.completedOn) return plan;
  // Never date a new cycle in the past: reopening the app late must not start overdue.
  const nextDay = addDays(plan.cycle.completedOn, 1), startDate = nextDay > today ? nextDay : today;
  return { ...plan, status: 'active', cycle: createCycle({ ...plan, startDate }, index, 0, plan.cycle.number + 1),
    history: [...plan.history, { number: plan.cycle.number, startedOn: plan.cycle.sessions[0].date, completedOn: plan.cycle.completedOn, ayahs: plan.totalAyahs - plan.cycle.start }] };
}
export function setPlanPaused<T extends ReadingPlan>(plan: T, paused: boolean, today: string): T {
  if (paused && plan.status === 'active') return { ...plan, status: 'paused', pausedOn: today };
  if (!paused && plan.status === 'paused') {
    if (!isSequentialPlan(plan)) return { ...plan, status: 'active', pausedOn: undefined };
    const shift = Math.max(0, daysBetween(plan.pausedOn ?? today, today));
    return { ...plan, status: 'active', pausedOn: undefined, cycle: { ...plan.cycle,
      availableDate: addDays(plan.cycle.availableDate, shift),
      sessions: plan.cycle.sessions.map(s => s.end > plan.cycle.cursor ? { ...s, date: addDays(s.date, shift) } : s) } };
  }
  return plan;
}
export function reschedulePlan(plan: SequentialPlan, index: PlanIndex, mode: 'extend' | 'redistribute', today: string): SequentialPlan {
  assertPlanIndex(plan, index);
  if (plan.status !== 'active' || plan.goal.type !== 'khatma') return plan;
  const pending = plan.cycle.sessions.filter(s => s.end > plan.cycle.cursor);
  const done = plan.cycle.sessions.filter(s => s.end <= plan.cycle.cursor);
  const days = mode === 'extend' ? pending.length : daysBetween(today, pending.at(-1)!.date) + 1;
  if (days < 1) throw new Error(t('plans.engine.periodEnded'));
  const ends = mode === 'extend' ? pending.map(s => s.end) : khatmaEnds(index, plan.unit, plan.cycle.cursor, days);
  const remaining = sessionsFrom(ends, plan.cycle.cursor, today);
  // Retain the already-read beginning of a partially completed portion, including undo.
  remaining[0].start = pending[0].start;
  return { ...plan, cycle: { ...plan.cycle, sessions: [...done, ...remaining] } };
}
export function rangeLabel(index: PlanIndex, start: number, end: number): string {
  const first = index.ayahs[start], last = index.ayahs[end - 1];
  if (!first || !last) return '';
  return first.pageNumber === last.pageNumber ? t('plans.range.page', { page: first.pageNumber }) : t('plans.range.pages', { first: first.pageNumber, last: last.pageNumber });
}
export function ayahRangeLabel(index: PlanIndex, start: number, end: number): string {
  const a = index.ayahs[start], b = index.ayahs[end - 1];
  return a && b ? t('plans.range.ayahs', { fromSurah: index.surahNames[a.surahNumber], fromAyah: a.ayahNumber, toSurah: index.surahNames[b.surahNumber], toAyah: b.ayahNumber }) : '';
}
