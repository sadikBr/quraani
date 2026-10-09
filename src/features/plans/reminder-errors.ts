export type ReminderIssue = 'permission' | 'unavailable';

export class ReminderSetupError extends Error {
  constructor(readonly issue: ReminderIssue) {
    super(issue === 'permission' ? 'لم يُسمح بالإشعارات. يمكنك تفعيلها من إعدادات الهاتف.' : 'تعذر تشغيل التذكيرات على هذا الجهاز.');
  }
}

export function savedReminderNotice(issue: ReminderIssue): string {
  return issue === 'permission'
    ? 'تم حفظ الهدف دون تذكير. اسمح بالإشعارات من إعدادات الهاتف، ثم فعّل التذكير من إعدادات الهدف.'
    : 'تم حفظ الهدف، لكن تعذر تشغيل التذكيرات. يمكنك المحاولة لاحقًا من إعدادات الهدف.';
}

export function reminderFailureMessage(error: unknown): string {
  return error instanceof ReminderSetupError && error.issue === 'permission'
    ? 'التذكيرات موقوفة في إعدادات الهاتف. أهدافك وتقدمك محفوظان.'
    : 'تعذر تحديث التذكيرات. أهدافك وتقدمك محفوظان. أعد المحاولة من إعدادات الهدف.';
}
