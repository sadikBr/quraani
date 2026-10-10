import { t } from '@/i18n';

export type ReminderIssue = 'permission' | 'unavailable';

export class ReminderSetupError extends Error {
  constructor(readonly issue: ReminderIssue) {
    super(issue === 'permission' ? t('plans.reminders.permissionDenied') : t('plans.reminders.unavailable'));
  }
}

export function savedReminderNotice(issue: ReminderIssue): string {
  return issue === 'permission'
    ? t('plans.reminders.savedWithoutPermission')
    : t('plans.reminders.savedUnavailable');
}

export function reminderFailureMessage(error: unknown): string {
  return error instanceof ReminderSetupError && error.issue === 'permission'
    ? t('plans.reminders.syncPermission')
    : t('plans.reminders.syncFailed');
}
