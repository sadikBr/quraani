import { isMemorizationPlan, isRevisionPlan, isSequentialPlan, type SequentialGoal, type SequentialPlan, type ReadingPlan } from './types';
import { t } from '@/i18n';

export const isCurrentGoal = (goal: ReadingPlan) => goal.status === 'active' || goal.status === 'paused';
export function currentGoal(plans: ReadingPlan[], exceptId?: string) {
  return plans.find((p): p is SequentialPlan => isSequentialPlan(p) && p.id !== exceptId && isCurrentGoal(p));
}

export function currentMemorizationGoal(plans: ReadingPlan[], exceptId?: string) {
  return plans.find(p => isMemorizationPlan(p) && p.id !== exceptId && isCurrentGoal(p));
}

/** One revision cycle per edition: two would split the same memorized ayahs. */
export function currentRevisionGoal(plans: ReadingPlan[], riwayah: ReadingPlan['riwayah'], exceptId?: string) {
  return plans.find(p => isRevisionPlan(p) && p.riwayah === riwayah && p.id !== exceptId && isCurrentGoal(p));
}

export class DuplicateGoalError extends Error {
  constructor(readonly goalId: string, type: SequentialGoal['type']) {
    super(type === 'khatma' ? t('plans.limit.duplicateKhatma') : t('plans.limit.duplicateWird'));
  }
}

/** Apply inside the serialized write, including restore, undo and repeat edits.
 * Existing duplicates remain readable/editable; never delete old progress. */
export function enforceGoalLimit(previous: ReadingPlan[], next: ReadingPlan[]): ReadingPlan[] {
  for (const goal of next) {
    if (isMemorizationPlan(goal)) {
      const before = previous.find(p => p.id === goal.id);
      if (isCurrentGoal(goal) && (!before || !isCurrentGoal(before))) {
        const conflict = currentMemorizationGoal(next, goal.id);
        if (conflict) throw new Error(t('plans.limit.duplicateMemorization'));
      }
    }
    if (isRevisionPlan(goal)) {
      const before = previous.find(p => p.id === goal.id);
      if (isCurrentGoal(goal) && (!before || !isCurrentGoal(before)) && currentRevisionGoal(next, goal.riwayah, goal.id)) throw new Error(t('plans.limit.duplicateRevision'));
    }
    if (!isSequentialPlan(goal)) continue;
    const before = previous.find(p => p.id === goal.id);
    const claimsSlot = isCurrentGoal(goal) && (!before || !isCurrentGoal(before) || before.goal.type !== goal.goal.type);
    const enablesRepeat = goal.status === 'completed' && goal.repeat && before?.status === 'completed' && isSequentialPlan(before) && !before.repeat;
    if (claimsSlot || enablesRepeat) {
      const conflict = currentGoal(next, goal.id);
      if (conflict) throw new DuplicateGoalError(conflict.id, conflict.goal.type);
    }
  }
  // A new/current goal supersedes automatic repetition of an already finished
  // reading goal. Its completed cycle and history remain untouched.
  return next.map(goal => isSequentialPlan(goal) && goal.status === 'completed' && goal.repeat && currentGoal(next, goal.id)
    ? { ...goal, repeat: false } : goal);
}
