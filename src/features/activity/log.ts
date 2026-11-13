import { addDays, daysBetween, validDate } from '@/features/plans/dates';
import { isMemorizationPlan, isRecurringPlan, isRevisionPlan, type ReadingPlan } from '@/features/plans/types';

/**
 * The days the user read, memorized or revised: for each calendar day, how many times progress
 * was recorded in a goal (taken from the goals as they change and kept apart from them, so a day
 * stays in it after its goal is finished, archived or deleted), and the days read in the mushaf
 * without a goal.
 */
export interface ActivityState {
  version: 1;
  days: Record<string, number>;
  /** Days spent reading in the mushaf itself, outside any goal (a few minutes at least): they count too. */
  read?: string[];
}
/** How long the mushaf is to be open, in a day, for the day to count without a goal (seconds). */
export const READING_SECONDS = 180;
export const ACTIVITY_KEY = 'activity:v1';
export const defaultActivityState: ActivityState = { version: 1, days: {} };
/** The most a day counts (a bound on saved data, far above a real day). */
const DAY_LIMIT = 999;

/** Reads saved data, keeping whatever is valid. */
export function decodeActivity(raw: string | null): ActivityState {
  if (raw === null) return defaultActivityState;
  let saved: Partial<ActivityState> | null;
  try { saved = JSON.parse(raw); } catch { return defaultActivityState; }
  if (!saved || saved.version !== 1 || !saved.days || typeof saved.days !== 'object' || Array.isArray(saved.days)) return defaultActivityState;
  const days = Object.entries(saved.days).filter(([date, count]) => validDate(date) && Number.isInteger(count) && count > 0 && count <= DAY_LIMIT);
  const read = Array.isArray(saved.read) ? [...new Set(saved.read.filter(validDate))].sort() : [];
  return { version: 1, days: Object.fromEntries(days.sort(([a], [b]) => a.localeCompare(b))), ...(read.length ? { read } : {}) };
}

/**
 * What the goals themselves say of each day: every progress recorded in a khatma or daily wird, a
 * memorization or a revision, on its date; a recurring reading on the day of its occurrence (it
 * can only be recorded on that day).
 */
export function activityOf(plans: readonly ReadingPlan[]): Record<string, number> {
  const days: Record<string, number> = {};
  const add = (date: string) => { days[date] = Math.min(DAY_LIMIT, (days[date] ?? 0) + 1); };
  for (const plan of plans) {
    if (isMemorizationPlan(plan)) plan.progress.forEach((log) => add(log.date));
    else if (isRevisionPlan(plan)) plan.log.forEach((log) => add(log.date));
    else if (isRecurringPlan(plan)) plan.occurrences.forEach((o) => { if (o.progress.length) add(o.date); });
    else plan.cycle.progress.forEach((log) => add(log.date));
  }
  return days;
}

/**
 * Takes in what the goals say. Today follows them exactly (an undo takes the day back out); an
 * earlier day only ever gains, since the goal that held it may be gone. The same state when
 * nothing changes.
 */
export function mergeActivity(state: ActivityState, fromGoals: Record<string, number>, today: string): ActivityState {
  const days = { ...state.days };
  let changed = false;
  for (const [date, count] of Object.entries(fromGoals)) {
    // Nothing is read tomorrow: a date ahead of the phone's (its clock was wrong) is left out.
    if (!validDate(date) || date >= today || count <= (days[date] ?? 0)) continue;
    days[date] = count; changed = true;
  }
  const now = fromGoals[today] ?? 0;
  if (now !== (days[today] ?? 0)) {
    if (now) days[today] = now; else delete days[today];
    changed = true;
  }
  return changed ? { ...state, days: Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b))) } : state;
}

/** Notes a day read in the mushaf. The same state when it is noted already. */
export function markRead(state: ActivityState, day: string): ActivityState {
  if (!validDate(day) || state.read?.includes(day)) return state;
  return { ...state, read: [...(state.read ?? []), day].sort() };
}

/** Every day that counts: those the goals recorded, and those read in the mushaf (as one). */
export function countedDays(state: ActivityState): Record<string, number> {
  if (!state.read?.length) return state.days;
  const days = { ...state.days };
  for (const day of state.read) days[day] ??= 1;
  return Object.fromEntries(Object.entries(days).sort(([a], [b]) => a.localeCompare(b)));
}

export interface Streak {
  /** Days in a row up to today, or up to yesterday while today is still to come. */
  current: number;
  /** The longest run of days ever. */
  best: number;
  /** Whether today is already one of them. */
  today: boolean;
  /** Every day with something recorded. */
  total: number;
}

/** The run of days the user is on, and the longest one they had. */
export function streakOf(days: Record<string, number>, today: string): Streak {
  const dates = Object.keys(days).filter((date) => days[date] > 0 && date <= today).sort();
  let best = 0, run = 0, previous: string | undefined;
  for (const date of dates) {
    run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  }
  const done = !!days[today];
  let current = 0;
  for (let date = done ? today : addDays(today, -1); days[date]; date = addDays(date, -1)) current++;
  return { current, best, today: done, total: dates.length };
}

/** The last `count` days, oldest first, each with whether something was recorded on it. */
export function recentDays(days: Record<string, number>, today: string, count = 7): { date: string; done: boolean }[] {
  return Array.from({ length: count }, (_, i) => { const date = addDays(today, i - count + 1); return { date, done: !!days[date] }; });
}

/** A month as weeks from Monday to Sunday (as Morocco's calendars): each cell a date of the month, or null outside it. */
export function monthWeeks(month: string): (string | null)[][] {
  const first = `${month}-01`;
  if (!validDate(first)) return [];
  // Monday 0 … Sunday 6.
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let date = first; date.startsWith(month); date = addDays(date, 1)) cells.push(date);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** The month before or after `month` (`YYYY-MM`). */
export function shiftMonth(month: string, delta: 1 | -1): string {
  const [year, number] = month.split('-').map(Number);
  const at = year * 12 + (number - 1) + delta;
  return `${Math.floor(at / 12)}-${String((at % 12) + 1).padStart(2, '0')}`;
}
