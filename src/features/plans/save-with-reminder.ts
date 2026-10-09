import type { ReadingPlan } from './types';
import { ReminderSetupError, type ReminderIssue } from './reminder-errors';

/** Reminder setup is optional; storage failures must still reject the save. */
export async function saveWithReminder(
  plan: ReadingPlan,
  persist: (saved: ReadingPlan) => Promise<void>,
  request?: () => Promise<void>,
): Promise<ReminderIssue | undefined> {
  let issue: ReminderIssue | undefined;
  if (plan.reminder.enabled && request) {
    try { await request(); }
    catch (error) {
      issue = error instanceof ReminderSetupError ? error.issue : 'unavailable';
      plan = { ...plan, reminder: { ...plan.reminder, enabled: false } };
    }
  }
  await persist(plan);
  return issue;
}
