import type { CollectionId } from './content';
import type { AdhkarState } from './progress';

export const remindersSupported = false;
export class AdhkarReminderError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') { super(issue); }
}
export async function requestAdhkarReminders(): Promise<void> { throw new AdhkarReminderError('unavailable'); }
export async function syncAdhkarReminders(_state: AdhkarState) {}
export function observeAdhkarNotifications(_open: (id: CollectionId) => void) { return () => {}; }
