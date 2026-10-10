import { addDays, validDate } from './dates';
import { isMemorizationPlan, isSequentialPlan, type ReadingPlan } from './types';

export const ARCHIVE_RETENTION_DAYS = 14;
export function archiveDeletionDate(plan: ReadingPlan): string | undefined {
  return plan.status === 'archived' && plan.archivedOn ? addDays(plan.archivedOn, ARCHIVE_RETENTION_DAYS) : undefined;
}

/** Old archives get a full grace period on first load. Never infer their age
 * from their start/completion dates, which describe reading, not archiving. */
export function maintainArchives(plans: ReadingPlan[], today: string): ReadingPlan[] {
  if (!validDate(today)) throw new Error('تاريخ غير صالح');
  let changed = false;
  const next = plans.flatMap(plan => {
    if (plan.status !== 'archived') {
      if (plan.archivedOn === undefined) return [plan];
      changed = true;
      const { archivedOn: _archivedOn, ...rest } = plan;
      return [rest];
    }
    if (!plan.archivedOn) { changed = true; return [{ ...plan, archivedOn: today }]; }
    if (archiveDeletionDate(plan)! <= today) { changed = true; return []; }
    return [plan];
  });
  return changed ? next : plans;
}

/** The repository owns archive dates. Editing an archive cannot extend its life. */
export function stampArchiveTransitions(previous: ReadingPlan[], next: ReadingPlan[], today: string): ReadingPlan[] {
  let changed = false;
  const result = next.map(plan => {
    if (plan.status !== 'archived') return plan;
    const before = previous.find(item => item.id === plan.id);
    const archivedOn = before?.status === 'archived' ? before.archivedOn ?? today : today;
    if (plan.archivedOn === archivedOn) return plan;
    changed = true;
    return { ...plan, archivedOn };
  });
  return changed ? result : next;
}

export function restoreArchivedGoal<T extends ReadingPlan>(plan: T): T {
  if (plan.status !== 'archived') return plan;
  const { archivedOn: _archivedOn, pausedOn, ...rest } = plan;
  if ((isSequentialPlan(plan) && plan.cycle.completedOn) || (isMemorizationPlan(plan) && !plan.sessions.length)) return { ...rest, status: 'completed' } as T;
  // A goal archived while paused comes back paused, so resuming shifts its
  // pending dates by the real pause instead of restoring a backlog.
  return (pausedOn ? { ...rest, status: 'paused', pausedOn } : { ...rest, status: 'active' }) as T;
}

/** Recheck inside the serialized write: a stale delete must not remove a goal
 * that has since been restored. Missing goals are an idempotent no-op. */
export function deleteArchivedGoal(plans: ReadingPlan[], id: string): ReadingPlan[] {
  const plan = plans.find(p => p.id === id);
  if (!plan) return plans;
  if (plan.status !== 'archived') throw new Error('تمت استعادة هذا الهدف. لا يمكن حذفه إلا من الأرشيف.');
  return plans.filter(p => p.id !== id);
}
