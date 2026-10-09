import { RIWAYAT } from '../quran-reader/riwayat';
import { addDays, validDate } from './dates';
import type { PlanIndex } from './engine';
import type { RecurringDraft, RecurringPlan } from './types';

export const WEEKDAYS = [
  { value: 1, label: 'الإثنين', short: 'ن' }, { value: 2, label: 'الثلاثاء', short: 'ث' },
  { value: 3, label: 'الأربعاء', short: 'ر' }, { value: 4, label: 'الخميس', short: 'خ' },
  { value: 5, label: 'الجمعة', short: 'ج' }, { value: 6, label: 'السبت', short: 'س' },
  { value: 0, label: 'الأحد', short: 'ح' },
] as const;
export const RECURRING_PRESETS = {
  kahf: { name: 'الكهف كل جمعة', surahs: [18], weekdays: [5], hour: 9, minute: 0, description: 'موعد أسبوعي مع سورة الكهف', icon: 'sun' },
  mulk: { name: 'الملك كل ليلة', surahs: [67], weekdays: [0, 1, 2, 3, 4, 5, 6], hour: 21, minute: 0, description: 'سورة الملك في ختام يومك', icon: 'moon' },
} as const;
export type RecurringPreset = keyof typeof RECURRING_PRESETS;
export function weekdaysLabel(days: number[]) {
  return days.length === 7 ? 'كل يوم' : WEEKDAYS.filter(d => days.includes(d.value)).map(d => d.label).join('، ');
}
export function calendarWeekday(date: string) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function scheduledOn(plan: Pick<RecurringPlan, 'weekdays' | 'startDate'>, date: string) {
  return validDate(date) && date >= plan.startDate && plan.weekdays.includes(calendarWeekday(date));
}
export function nextScheduledDate(plan: Pick<RecurringPlan, 'weekdays' | 'startDate'>, from: string) {
  const first = from < plan.startDate ? plan.startDate : from;
  for (let i = 0; i < 7; i++) { const date = addDays(first, i); if (scheduledOn(plan, date)) return date; }
  throw new Error('اختر يومًا واحدًا على الأقل للقراءة.');
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
  if (!draft.name.trim() || draft.name.trim().length > 80 || !validDate(draft.startDate) || !RIWAYAT[draft.riwayah] || index.mushafId !== RIWAYAT[draft.riwayah].mushafId) throw new Error('راجع اسم الهدف وتاريخه وروايته.');
  const weekdays = [...new Set(draft.weekdays)].sort((a, b) => a - b);
  if (!weekdays.length || weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) throw new Error('اختر يومًا واحدًا على الأقل للقراءة.');
  const surahs = [...new Set(draft.surahs)].sort((a, b) => a - b);
  if (!surahs.length || surahs.some(s => !Number.isInteger(s) || s < 1 || s > 114)) throw new Error('اختر سورة واحدة على الأقل.');
  const ranges = surahs.map(surah => {
    const start = index.ayahs.findIndex(a => a.surahNumber === surah);
    const end = index.ayahs.findLastIndex(a => a.surahNumber === surah) + 1;
    if (start < 0 || end <= start) throw new Error('تعذر العثور على السورة في هذه الرواية.');
    return { surah, start, end };
  });
  const { hour, minute } = draft.reminder;
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) throw new Error('وقت التذكير غير صالح.');
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
export function undoRecurringProgress(plan: RecurringPlan, today: string): RecurringPlan {
  if (plan.status === 'archived') return plan;
  const occurrence = plan.occurrences.find(o => o.date === today);
  if (!occurrence?.progress.length) return plan;
  return { ...plan, occurrences: plan.occurrences.map(o => o.date === today ? { ...o, progress: o.progress.slice(0, -1) } : o).filter(o => o.progress.length) };
}
export function completedOccurrences(plan: RecurringPlan) {
  const last = plan.ranges.length - 1;
  return plan.occurrences.filter(o => o.progress.at(-1)?.range === last && o.progress.at(-1)?.to === plan.ranges[last].end).length;
}

/** Validate persisted ranges and ordered progress before publishing any saved data. */
export function validateRecurringPlan(plan: RecurringPlan) {
  const invalid = () => { throw new Error('بيانات القراءة المتكررة غير صالحة'); };
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
    if (!occurrence || !validDate(occurrence.date) || occurrence.date < plan.startDate || occurrence.date <= previousDate || !Array.isArray(occurrence.progress) || !occurrence.progress.length) invalid();
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
