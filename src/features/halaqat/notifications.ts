import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from '@/features/plans/local-notifications';
import { validDate } from '@/features/plans/dates';
import { t } from '@/i18n';
import { HALAQA_REMINDER_PREFIX, halaqaReminderQueue, type HalaqaReminder, type HalaqatState } from './model';

export const remindersSupported = true;

export class HalaqaReminderError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') {
    super(issue === 'permission' ? t('halaqat.reminders.permissionDenied') : t('halaqat.reminders.unavailable'));
  }
}

let channelResult: Promise<string | undefined> | undefined;
function channel(): Promise<string | undefined> {
  // Expo Go's channel manager can be missing; its built-in fallback channel is used instead.
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return Promise.resolve(undefined);
  channelResult ??= Notifications.setNotificationChannelAsync('halaqat', { name: t('halaqat.reminders.channelName'), importance: Notifications.AndroidImportance.DEFAULT })
    .then((result) => (result ? 'halaqat' : undefined))
    .catch((error) => {
      if (error instanceof Error && /NotificationsChannelsProvider/.test(error.message)) return undefined;
      channelResult = undefined;
      throw new HalaqaReminderError('unavailable');
    });
  return channelResult;
}

const allowed = (permission: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) =>
  permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** Asks for notifications when a halaqa's reminder is turned on. */
export async function requestHalaqaReminders(): Promise<void> {
  try {
    await channel();
    if (!allowed(await Notifications.requestPermissionsAsync())) throw new HalaqaReminderError('permission');
  } catch (error) {
    throw error instanceof HalaqaReminderError ? error : new HalaqaReminderError('unavailable');
  }
}

const clock = (r: HalaqaReminder) => `${String(r.time.hour).padStart(2, '0')}:${String(r.time.minute).padStart(2, '0')}`;
/** A reminder's words: «حصة حلقة العائلة بعد ساعة», and when it starts. */
export const reminderText = (r: HalaqaReminder) => ({
  title: t(`halaqat.reminders.notification.title${r.before}`, { name: r.name }),
  body: r.before ? t('halaqat.reminders.notification.body', { time: clock(r) }) : t('halaqat.reminders.notification.bodyNow'),
});

let queue: Promise<unknown> = Promise.resolve();
/** Replaces the scheduled halaqa reminders with the ones wanted now; other notifications are left alone. */
export function syncHalaqaReminders(state: HalaqatState) {
  const task = queue.catch(() => {}).then(async () => {
    const wanted = allowed(await Notifications.getPermissionsAsync()) ? halaqaReminderQueue(state, new Date()) : [];
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(HALAQA_REMINDER_PREFIX));
    const keep = new Set(wanted.map((n) => n.id));
    for (const n of existing) if (!keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const channelId = wanted.length ? await channel() : undefined;
    for (const n of wanted) {
      const { title, body } = reminderText(n);
      if (existing.some((x) => x.identifier === n.id && x.content.title === title && x.content.body === body)) continue;
      await Notifications.scheduleNotificationAsync({ identifier: n.id,
        content: { title, body, data: { halaqa: n.halaqa, date: n.day } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, ...(channelId ? { channelId } : {}) } });
    }
  });
  queue = task;
  return task;
}

/** Opens the session a reminder was about. */
export function observeHalaqaNotifications(open: (halaqa: string, date: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const data = response?.notification.request.content.data;
    const halaqa = data?.halaqa, date = data?.date;
    if (typeof halaqa === 'string' && /^halaqa-[a-z0-9-]+$/.test(halaqa) && validDate(date)) { open(halaqa, date); Notifications.clearLastNotificationResponse(); }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  handle(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
