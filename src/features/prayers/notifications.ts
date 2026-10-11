import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from '@/features/plans/local-notifications';
import { t } from '@/i18n';
import { athanModule, canScheduleExactAlarms, scheduleAthans, testAthan, type AthanLabels } from './athan-native';
import { hijriLabel } from './labels';
import { placeName } from './place';
import { ALERT_PREFIX, isPrayerAlertData, prayerAlerts, type PrayerAlert, type PrayerState, type TakbirId } from './settings';
import { clock, dayOf, type PrayerId } from './times';

export const alertsSupported = true;
/** Whole athans need the app's Android module (not in Expo Go). */
export const fullAthanSupported = !!athanModule;
/** iOS cannot play the bundled Ogg clips: its alerts are plain notifications. */
export const athanSoundsSupported = Platform.OS === 'android';

export class PrayerAlertError extends Error {
  constructor(readonly issue: 'permission' | 'unavailable') {
    super(issue === 'permission' ? t('prayers.alerts.permissionDenied') : t('prayers.alerts.unavailable'));
  }
}

const channels = new Map<string, Promise<string | undefined>>();
/** Creates a channel once. Expo Go's channel manager can be missing; its fallback channel is used. */
function channel(id: string, options: Parameters<typeof Notifications.setNotificationChannelAsync>[1]): Promise<string | undefined> {
  if (Platform.OS !== 'android' || isRunningInExpoGo()) return Promise.resolve(undefined);
  let result = channels.get(id);
  if (!result) {
    result = Notifications.setNotificationChannelAsync(id, options)
      .then((created) => (created ? id : undefined))
      .catch((error) => {
        if (error instanceof Error && /NotificationsChannelsProvider/.test(error.message)) return undefined;
        channels.delete(id);
        throw new PrayerAlertError('unavailable');
      });
    channels.set(id, result);
  }
  return result;
}
const alertChannel = () => channel('prayer-alerts', { name: t('prayers.alerts.channels.alerts'), importance: Notifications.AndroidImportance.HIGH });
/** A channel keeps the sound it was made with, so each takbir has its own. */
export const takbirChannelId = (takbir: TakbirId) => `prayer-takbir-${takbir}`;
const takbirChannel = (takbir: TakbirId) => channel(takbirChannelId(takbir), {
  name: t('prayers.alerts.channels.takbir', { voice: t(`prayers.takbirs.${takbir}.name`) }),
  importance: Notifications.AndroidImportance.HIGH,
  sound: `takbir_${takbir}.ogg`,
});

/**
 * The first version had a channel per voice for the athan's opening, which the takbir replaced.
 * Their sounds (`athan_<voice>.ogg`) stay in the app for one more version, for the alerts scheduled
 * before an update until the app is next opened.
 */
let retired = false;
async function retireOldChannels() {
  if (retired || Platform.OS !== 'android' || isRunningInExpoGo()) return;
  retired = true;
  for (const voice of ['original', 'azeez', 'azemi']) await Notifications.deleteNotificationChannelAsync(`prayer-athan-${voice}`).catch(() => {});
}

const allowed = (permission: Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>) =>
  permission.granted || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

/** Asks for notifications alone (the prayer times notification makes its own channel). Resolves whether they are allowed. */
export async function requestNotifications(): Promise<boolean> {
  try {
    return allowed(await Notifications.requestPermissionsAsync());
  } catch {
    return false;
  }
}

/** Asks for notifications when alerts are turned on. */
export async function requestPrayerAlerts(takbir: TakbirId): Promise<void> {
  try {
    await Promise.all([alertChannel(), takbirChannel(takbir)]);
    if (!allowed(await Notifications.requestPermissionsAsync())) throw new PrayerAlertError('permission');
  } catch (error) {
    throw error instanceof PrayerAlertError ? error : new PrayerAlertError('unavailable');
  }
}

const notificationTitle = (prayer: PrayerId) => t(`prayers.notification.title.${prayer}`);
function notificationBody(prayer: PrayerId, time: Date, place: string) {
  return prayer === 'sunrise' ? t('prayers.notification.sunriseBody', { time: clock(time) }) : t('prayers.notification.body', { time: clock(time), place });
}
function content(alert: PrayerAlert, state: PrayerState, place: string, exact: boolean) {
  const title = alert.kind === 'before'
    ? t('prayers.notification.before', { prayer: t(`prayers.prayerOf.${alert.prayer}`), count: alert.minutes ?? 0 })
    : notificationTitle(alert.prayer);
  // Android 8+ takes the sound from the channel; this is for older Android and iOS.
  const sound = alert.kind === 'takbir' && Platform.OS === 'android' ? `takbir_${state.takbir}.ogg` : 'default';
  return { title, body: notificationBody(alert.prayer, alert.time, place), sound, data: { prayer: alert.prayer, kind: alert.kind, exact } };
}

/** The module's text, and the takbir channel it falls back to when it cannot play the athan. */
export const athanLabels = (takbir: TakbirId): AthanLabels => ({
  stop: t('prayers.notification.stop'), channel: t('prayers.alerts.channels.full'), fallbackChannel: takbirChannelId(takbir), heading: t('prayers.screen.heading'),
});

/** What the athan's screen shows for a prayer: its name, time, Hijri date and the place. */
export const athanScreenText = (state: PrayerState, prayer: PrayerId, time: Date) => ({
  name: t(`prayers.names.${prayer}`), time: clock(time), date: hijriLabel(dayOf(time), state.hijriOffset), place: state.location ? placeName(state.location) : '',
});

let queue: Promise<unknown> = Promise.resolve();
/**
 * Replaces the scheduled prayer alerts with the ones wanted now: two weeks of notifications (two
 * days on iOS, which keeps few), and a month of whole athans for the Android module. Other
 * notifications are left alone.
 */
export function syncPrayerAlerts(state: PrayerState) {
  const task = queue.catch(() => {}).then(async () => {
    const permitted = allowed(await Notifications.getPermissionsAsync());
    const horizon = { days: Platform.OS === 'ios' ? 2 : 14, native: !!athanModule, nativeDays: 30 };
    const { notifications: wanted, athans } = permitted ? prayerAlerts(state, new Date(), horizon) : { notifications: [], athans: [] };
    const place = state.location ? placeName(state.location) : '';
    let failed = false;
    if (athanModule) {
      try {
        // The takbir's channel is what the module falls back to.
        if (athans.length) await takbirChannel(state.takbir);
        scheduleAthans(athanLabels(state.takbir), athans.map((a) => ({
          id: a.id, at: a.time.getTime(), voice: state.voice, title: notificationTitle(a.prayer), body: notificationBody(a.prayer, a.time, place),
          ...athanScreenText(state, a.prayer, a.time),
        })));
      } catch {
        // The notifications below are scheduled all the same.
        failed = true;
      }
    }
    // Alarms set before exact alarms were allowed stay inexact: schedule them again once they are.
    const exact = canScheduleExactAlarms();
    const existing = (await Notifications.getAllScheduledNotificationsAsync()).filter((n) => n.identifier.startsWith(ALERT_PREFIX));
    const keep = new Set(wanted.map((n) => n.id));
    for (const n of existing) if (!keep.has(n.identifier)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
    // Once nothing scheduled uses them (the notifications below move to the takbir's channels).
    await retireOldChannels();
    const alertsId = wanted.some((n) => n.kind !== 'takbir') ? await alertChannel() : undefined;
    const takbirId = wanted.some((n) => n.kind === 'takbir') ? await takbirChannel(state.takbir) : undefined;
    for (const alert of wanted) {
      const next = content(alert, state, place, exact);
      const channelId = alert.kind === 'takbir' ? takbirId : alertsId;
      if (existing.some((x) => {
        const previousChannel = x.trigger && 'channelId' in x.trigger ? x.trigger.channelId : undefined;
        return x.identifier === alert.id && x.content.title === next.title && x.content.body === next.body && previousChannel === channelId
          && x.content.data?.exact === exact;
      })) continue;
      await Notifications.scheduleNotificationAsync({ identifier: alert.id, content: next,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.date, ...(channelId ? { channelId } : {}) } });
    }
    if (!permitted && state.enabled) throw new PrayerAlertError('permission');
    if (failed) throw new PrayerAlertError('unavailable');
  });
  queue = task;
  return task;
}

export const TEST_SECONDS = 10;
const TEST_ID = 'quranni-prayer-test';

/**
 * Sends a prayer's alert in TEST_SECONDS, the way it comes at prayer time, so it can be seen and
 * heard with the phone locked: a notification, the takbir, or the whole athan with its screen.
 */
export async function testPrayerAlert(state: PrayerState, kind: 'notify' | 'takbir' | 'full', prayer: PrayerId, time: Date) {
  await requestPrayerAlerts(state.takbir);
  const title = t('prayers.test.title', { title: notificationTitle(prayer) });
  const body = notificationBody(prayer, time, state.location ? placeName(state.location) : '');
  if (kind === 'full' && athanModule) {
    testAthan(athanLabels(state.takbir), { id: 'test', at: Date.now() + TEST_SECONDS * 1000, voice: state.voice, title, body, notifyAfter: false, ...athanScreenText(state, prayer, time) }, TEST_SECONDS);
    return;
  }
  const takbir = kind !== 'notify';
  const channelId = takbir ? await takbirChannel(state.takbir) : await alertChannel();
  await Notifications.scheduleNotificationAsync({ identifier: TEST_ID,
    content: { title, body, sound: takbir && Platform.OS === 'android' ? `takbir_${state.takbir}.ogg` : 'default', data: { prayer, kind: 'test' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + TEST_SECONDS * 1000), ...(channelId ? { channelId } : {}) } });
}

/** Opens the prayer times from one of their notifications. */
export function observePrayerNotifications(open: () => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    if (isPrayerAlertData(response?.notification.request.content.data)) { open(); Notifications.clearLastNotificationResponse(); }
  };
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  handle(Notifications.getLastNotificationResponse());
  return () => subscription.remove();
}
