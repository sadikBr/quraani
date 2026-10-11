import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from '@/features/plans/local-notifications';
import { t } from '@/i18n';
import { isCollectionId, type CollectionId } from './content';
import { adhkarReminderQueue, REMINDER_PREFIX, type AdhkarState } from './progress';

export const remindersSupported = true;

export class AdhkarReminderError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') {
    super(issue === 'permission' ? t('adhkar.reminders.permissionDenied') : t('adhkar.reminders.unavailable'));
  }
}

let channelResult: Promise<string | undefined> | undefined;
function channel(): Promise<string | undefined> {
  // Expo Go's channel manager can be missing; its built-in fallback channel is used instead.
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return Promise.resolve(undefined);
  channelResult ??= Notifications.setNotificationChannelAsync('adhkar', { name: t('adhkar.reminders.channelName'), importance: Notifications.AndroidImportance.DEFAULT })
    .then((result) => (result ? 'adhkar' : undefined))
    .catch((error) => {
      if (error instanceof Error && /NotificationsChannelsProvider/.test(error.message)) return undefined;
      channelResult = undefined;
      throw new AdhkarReminderError('unavailable');
    });
  return channelResult;
}

const allowed = (permission: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) =>
  permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** Asks for notifications when a reminder is turned on. */
export async function requestAdhkarReminders(): Promise<void> {
  try {
    await channel();
    if (!allowed(await Notifications.requestPermissionsAsync())) throw new AdhkarReminderError('permission');
  } catch (error) {
    throw error instanceof AdhkarReminderError ? error : new AdhkarReminderError('unavailable');
  }
}

let queue: Promise<unknown> = Promise.resolve();
/** Replaces the scheduled adhkar reminders with the ones wanted now; other notifications are left alone. */
export function syncAdhkarReminders(state: AdhkarState) {
  const task = queue.catch(() => {}).then(async () => {
    const wanted = allowed(await Notifications.getPermissionsAsync()) ? adhkarReminderQueue(state, new Date()) : [];
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(REMINDER_PREFIX));
    const keep = new Set(wanted.map((n) => n.id));
    for (const n of existing) if (!keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    const channelId = wanted.length ? await channel() : undefined;
    for (const n of wanted) {
      const title = t(`adhkar.reminders.notification.${n.kind}.title`), body = t(`adhkar.reminders.notification.${n.kind}.body`);
      if (existing.some((x) => x.identifier === n.id && x.content.title === title && x.content.body === body)) continue;
      await Notifications.scheduleNotificationAsync({ identifier: n.id,
        content: { title, body, data: { adhkar: n.kind } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.date, ...(channelId ? { channelId } : {}) } });
    }
  });
  queue = task;
  return task;
}

/** Opens the adhkar a reminder was about. */
export function observeAdhkarNotifications(open: (id: CollectionId) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const id = response?.notification.request.content.data?.adhkar;
    if (isCollectionId(id)) { open(id); Notifications.clearLastNotificationResponse(); }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  handle(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
