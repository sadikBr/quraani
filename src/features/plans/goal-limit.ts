import type { PlanGoal, ReadingPlan } from './types';

export const isCurrentGoal = (goal: ReadingPlan) => goal.status === 'active' || goal.status === 'paused';
export function currentGoal(plans: ReadingPlan[], exceptId?: string) {
  return plans.find(p => p.id !== exceptId && isCurrentGoal(p));
}

export class DuplicateGoalError extends Error {
  constructor(readonly goalId: string, type: PlanGoal['type']) {
    super(`${type === 'khatma' ? 'لديك ختمة جارية بالفعل.' : 'لديك ورد يومي جارٍ بالفعل.'} أكمل هدفك الحالي أو أرشفه قبل بدء هدف قراءة جديد.`);
  }
}

/** Apply inside the serialized write, including restore, undo and repeat edits.
 * Existing duplicates remain readable/editable; never delete old progress. */
export function enforceGoalLimit(previous: ReadingPlan[], next: ReadingPlan[]): ReadingPlan[] {
  for (const goal of next) {
    const before = previous.find(p => p.id === goal.id);
    const claimsSlot = isCurrentGoal(goal) && (!before || !isCurrentGoal(before) || before.goal.type !== goal.goal.type);
    const enablesRepeat = goal.status === 'completed' && goal.repeat && before?.status === 'completed' && !before.repeat;
    if (claimsSlot || enablesRepeat) {
      const conflict = currentGoal(next, goal.id);
      if (conflict) throw new DuplicateGoalError(conflict.id, conflict.goal.type);
    }
  }
  // A new/current goal supersedes automatic repetition of an already finished
  // reading goal. Its completed cycle and history remain untouched.
  return next.map(goal => goal.status === 'completed' && goal.repeat && currentGoal(next, goal.id)
    ? { ...goal, repeat: false } : goal);
}
