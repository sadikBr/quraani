import { nextPortion } from './engine';
import { isMemorizationPlan, isRecurringPlan, type ReadingPlan } from './types';
import { occurrenceProgress } from './recurring';

export type GoalsView = 'today' | 'all' | 'archived';

export function goalsOverview(plans: ReadingPlan[], today: string) {
  const all = plans.filter(p => p.status !== 'archived');
  const archived = plans.filter(p => p.status === 'archived');
  const due = all.filter(p => nextPortion(p, today)?.due);
  // Count completed portions, including catch-up reading, without counting
  // partially read portions or goals that have been archived.
  const completedToday = all.reduce((count, p) => count + (isMemorizationPlan(p) ? p.progress.filter(log => log.date === today && log.finished).length : isRecurringPlan(p) ? Number(occurrenceProgress(p, today).done) : p.cycle.sessions.filter(s =>
    s.end <= p.cycle.cursor && p.cycle.progress.some(log => log.date === today && log.to === s.end)).length), 0);
  return { all, archived, due, completedToday };
}
