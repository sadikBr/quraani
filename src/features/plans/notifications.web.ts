import type { ReadingPlan } from './types';
export const remindersSupported = false;
export async function requestPlanReminders(): Promise<void> { throw new Error('التذكيرات متاحة في تطبيق الهاتف.'); }
export async function syncPlanReminders(_plans: ReadingPlan[]) {}
export function observePlanNotifications(_open: (id: string) => void) { return () => {}; }
