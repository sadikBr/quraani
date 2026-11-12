import { formatList, t } from '@/i18n';
import { RIWAYAT } from '../quran-reader/riwayat';
import { addDays, validDate } from './dates';
import type { PlanIndex } from './engine';
import type { RecurringDraft, RecurringPlan } from './types';

/** Monday first. Labels are read from the catalog when used, so they follow the language. */
export const WEEKDAYS = ([1, 2, 3, 4, 5, 6, 0] as const).map(value => ({
  value,
  get label() { return t(`common.weekdays.long.${value}`); },
  get short() { return t(`common.weekdays.letter.${value}`); },
}));
export const RECURRING_PRESETS = {
  kahf: { get name() { return t('recurring.presets.kahf.name'); }, surahs: [18], weekdays: [5], hour: 9, minute: 0, get description() { return t('recurring.presets.kahf.description'); }, icon: 'sun' },
  mulk: { get name() { return t('recurring.presets.mulk.name'); }, surahs: [67], weekdays: [0, 1, 2, 3, 4, 5, 6], hour: 21, minute: 0, get description() { return t('recurring.presets.mulk.description'); }, icon: 'moon' },
} as const;
export type RecurringPreset = keyof typeof RECURRING_PRESETS;
export function weekdaysLabel(days: number[]) {
  return days.length === 7 ? t('common.weekdays.everyDay') : formatList(WEEKDAYS.filter(d => days.includes(d.value)).map(d => d.label));
}
export function calendarWeekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function scheduledOn(plan: Pick<RecurringPlan, 'weekdays' | 'startDate'>, date: string) {
  return validDate(date) && date >= plan.startDate && plan.weekdays.includes(calendarWeekday(date));
}
export function nextScheduledDate(plan: Pick<RecurringPlan, 'weekdays' | 'startDate'>, from: string) {
  const first = from < plan.startDate ? plan.startDate : from;
  for (let i = 0; i < 7; i++) { const date = addDays(first, i); if (scheduledOn(plan, date)) return date; }
  throw new Error(t('recurring.errors.weekdays'));
}
export function occurrenceProgress(plan: RecurringPlan, date: string) {
  const logs = plan.occurrences.find(o => o.date === date)?.progress ?? [];
  const cursors = plan.ranges.map((range, slot) => logs.findLast(log => log.range === slot)?.to ?? range.start);
  const completed = plan.ranges.filter((range, slot) => cursors[slot] === range.end).length;
  const read = cursors.reduce((sum, cursor, slot) => sum + cursor - plan.ranges[slot].start, 0);
  const total = plan.ranges.reduce((sum, range) => sum + range.end - range.start, 0);
  return { logs, cursors, completed, read, total, done: completed === plan.ranges.length };
}
export function createRecurringPlan(draft: RecurringDraft, index: PlanIndex, id: string): RecurringPlan {
  if (!draft.name.trim() || draft.name.trim().length > 80 || !validDate(draft.startDate) || !RIWAYAT[draft.riwayah] || index.mushafId !== RIWAYAT[draft.riwayah].mushafId) throw new Error(t('recurring.errors.draft'));
  const weekdays = [...new Set(draft.weekdays)].sort((a, b) => a - b);
  if (!weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error(t('recurring.errors.weekdays'));
  const surahs = [...new Set(draft.surahs)].sort((a, b) => a - b);
  if (!surahs.length || surahs.some(s => !Number.isInteger(s) || s < 1 || s > 114)) throw new Error(t('recurring.errors.surahs'));
  const ranges = surahs.map(surah => {
    const start = index.ayahs.findIndex(a => a.surahNumber === surah);
    const end = index.ayahs.findLastIndex(a => a.surahNumber === surah) + 1;
    if (start < 0 || end <= start) throw new Error(t('recurring.errors.surahNotFound'));
    return { surah, start, end };
  });
  const { hour, minute } = draft.reminder;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error(t('recurring.errors.reminderTime'));
  return { id, name: draft.name.trim(), riwayah: draft.riwayah, goal: { type: 'recurring', surahs }, startDate: draft.startDate,
    status: 'active', weekdays, reminder: { ...draft.reminder }, corpus: index.corpus, totalAyahs: index.ayahs.length, ranges, occurrences: [] };
}
/** Each date is independent. An unfinished occurrence never creates missed-day debt. */
export function nextRecurringPortion(plan: RecurringPlan, today: string) {
  if (plan.status !== 'active') return null;
  let date = nextScheduledDate(plan, today);
  while (occurrenceProgress(plan, date).done) date = nextScheduledDate(plan, addDays(date, 1));
  const progress = occurrenceProgress(plan, date);
  const slot = plan.ranges.findIndex((range, i) => progress.cursors[i] < range.end);
  const range = plan.ranges[slot];
  return { start: progress.cursors[slot], end: range.end, slot, cycle: Number(date.replaceAll('-', '')), date, due: date === today };
}
export function recordRecurringProgress(plan: RecurringPlan, receipt: { cycle: number; slot: number; to: number }, today: string): RecurringPlan {
  const next = nextRecurringPortion(plan, today);
  if (!next?.due || receipt.cycle !== next.cycle || receipt.slot !== next.slot || !Number.isInteger(receipt.to) || receipt.to <= next.start || receipt.to > next.end) return plan;
  const occurrence = plan.occurrences.find(o => o.date === today) ?? { date: today, progress: [] };
  const updated = { ...occurrence, progress: [...occurrence.progress, { range: next.slot, from: next.start, to: receipt.to }] };
  return { ...plan, occurrences: [...plan.occurrences.filter(o => o.date !== today), updated].sort((a, b) => a.date.localeCompare(b.date)) };
}
/** Only the last thing recorded today, once (see `canUndoProgress` in engine.ts). */
export function canUndoRecurringProgress(plan: RecurringPlan, today: string): boolean {
  const occurrence = plan.occurrences.find(o => o.date === today);
  return plan.status !== 'archived' && !!occurrence?.progress.length && occurrence.undoneAt !== occurrence.progress.length;
}
export function undoRecurringProgress(plan: RecurringPlan, today: string): RecurringPlan {
  if (!canUndoRecurringProgress(plan, today)) return plan;
  return { ...plan, occurrences: plan.occurrences.map(o => {
    if (o.date !== today) return o;
    const progress = o.progress.slice(0, -1);
    return { ...o, progress, undoneAt: progress.length };
  }).filter(o => o.progress.length) };
}
export function completedOccurrences(plan: RecurringPlan) {
  const last = plan.ranges.length - 1;
  return plan.occurrences.filter(o => o.progress.at(-1)?.range === last && o.progress.at(-1)?.to === plan.ranges[last].end).length;
}

/** Validate persisted ranges and ordered progress before publishing any saved data. */
export function validateRecurringPlan(plan: RecurringPlan) {
  const invalid = () => { throw new Error(t('recurring.errors.invalidData')); };
  if (plan.status === 'completed' || !Array.isArray(plan.goal.surahs) || !plan.goal.surahs.length || plan.goal.surahs.length > 114 ||
    !Array.isArray(plan.ranges) || plan.ranges.length !== plan.goal.surahs.length || !Array.isArray(plan.occurrences) ||
    new Set(plan.weekdays).size !== plan.weekdays.length) invalid();
  let lastSurah = 0, lastEnd = 0;
  for (const [slot, range] of plan.ranges.entries()) {
    if (!range || !Number.isInteger(range.surah) || range.surah <= lastSurah || range.surah > 114 || plan.goal.surahs[slot] !== range.surah ||
      !Number.isInteger(range.start) || range.start < lastEnd || !Number.isInteger(range.end) || range.end <= range.start || range.end > plan.totalAyahs) invalid();
    lastSurah = range.surah; lastEnd = range.end;
  }
  let previousDate = '';
  for (const occurrence of plan.occurrences) {
    if (!occurrence || !validDate(occurrence.date) || occurrence.date < plan.startDate || occurrence.date <= previousDate || !Array.isArray(occurrence.progress) || !occurrence.progress.length ||
      (occurrence.undoneAt !== undefined && (!Number.isInteger(occurrence.undoneAt) || occurrence.undoneAt < 0))) invalid();
    previousDate = occurrence.date;
    let slot = 0, cursor = plan.ranges[0].start;
    for (const log of occurrence.progress) {
      const range = plan.ranges[slot];
      if (!log || !range || log.range !== slot || log.from !== cursor || !Number.isInteger(log.to) || log.to <= cursor || log.to > range.end) invalid();
      cursor = log.to;
      if (cursor === range.end) { slot++; cursor = plan.ranges[slot]?.start ?? cursor; }
    }
  }
}
