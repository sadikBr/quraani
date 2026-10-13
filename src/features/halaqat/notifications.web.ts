import type { HalaqatState } from './model';

export const remindersSupported = false;
export class HalaqaReminderError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') { super(issue); }
}
export async function requestHalaqaReminders(): Promise<void> { throw new HalaqaReminderError('unavailable'); }
export async function syncHalaqaReminders(_state: HalaqatState) {}
export function observeHalaqaNotifications(_open: (halaqa: string, date: string) => void) { return () => {}; }
