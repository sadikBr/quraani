import type { ReadingPlan } from './types';
import { t } from '@/i18n';
export const remindersSupported = false;
export async function requestPlanReminders(): Promise<void> { throw new Error(t('plans.reminders.phoneOnly')); }
export async function syncPlanReminders(_plans: ReadingPlan[]) {}
export function observePlanNotifications(_open: (id: string) => void) { return () => {}; }
