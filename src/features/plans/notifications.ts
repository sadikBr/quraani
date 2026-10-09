import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from './local-notifications';
import type { ReadingPlan } from './types';
import { planReminderQueue, REMINDER_PREFIX } from './reminder-schedule';
import { ReminderSetupError } from './reminder-errors';

export const remindersSupported = true;
Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });
let channelResult: Promise<string | undefined> | undefined;
async function channel(): Promise<string | undefined> {
  // Expo Go's SDK 57 channel manager can lack its scoped provider. Omitting
  // channelId uses Expo's built-in fallback channel instead of that manager.
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return undefined;
  channelResult ??= Notifications.setNotificationChannelAsync('reading-plans', { name: 'تذكيرات الأهداف', importance: Notifications.AndroidImportance.DEFAULT })
    .then(result => result ? 'reading-plans' : undefined)
    .catch(error => {
      if (error instanceof Error && /NotificationsChannelsProvider/.test(error.message)) return undefined;
      channelResult = undefined;
      throw new ReminderSetupError('unavailable');
    });
  return channelResult;
}
export async function requestPlanReminders(): Promise<void> {
  try {
    await channel();
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted && permission.ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL) throw new ReminderSetupError('permission');
  } catch (error) {
    throw error instanceof ReminderSetupError ? error : new ReminderSetupError('unavailable');
  }
}
let queue: Promise<unknown> = Promise.resolve();
const reminderBody = 'حان وقت وردك. افتح هدفك لمتابعة القراءة.';
export function syncPlanReminders(plans: ReadingPlan[]) {
  const task = queue.catch(() => {}).then(async () => {
    const permission = await Notifications.getPermissionsAsync();
    const allowed = permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    const wanted = allowed ? planReminderQueue(plans, new Date()) : [];
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter(n => n.identifier.startsWith(REMINDER_PREFIX));
    const keep = new Set(wanted.map(n => n.id));
    for (const n of existing) if (!keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const channelId = wanted.length ? await channel() : undefined;
    for (const n of wanted) if (!existing.some(x => {
      const previousChannel = x.trigger && 'channelId' in x.trigger ? x.trigger.channelId : undefined;
      return x.identifier === n.id && x.content.title === n.title && x.content.body === reminderBody && previousChannel === channelId;
    })) {
      await Notifications.scheduleNotificationAsync({ identifier: n.id,
        content: { title: n.title, body: reminderBody, data: { planId: n.planId } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, ...(channelId ? { channelId } : {}) } });
    }
    if (!allowed && plans.some(p => p.reminder.enabled && p.status === 'active')) throw new ReminderSetupError('permission');
  });
  queue = task;
  return task;
}
export function observePlanNotifications(open: (id: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.planId;
    if (typeof id === 'string' && /^plan-[a-z0-9-]+$/.test(id)) { open(id); Notifications.clearLastNotificationResponse(); }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  handle(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
