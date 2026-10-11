import * as Linking from 'expo-linking';
import { formatDate, t } from '@/i18n';
import { athanModule, hideTimesNotification, showTimesNotification } from './athan-native';
import { hijriLabel } from './format';
import { placeName } from './place';
import { upcomingTimes, type PrayerState } from './settings';
import { PRAYERS } from './times';

/** The prayer times notification is drawn by the app's Android module (not in Expo Go, iOS or the web). */
export const timesNotificationSupported = !!athanModule;

/** Days of times given to the module, which moves through them on its own until the app opens again. */
const DAYS = 30;

/**
 * Shows the prayer times notification with the coming days' times, or hides it when it is off or
 * there is no place. Resolves false when the module refused it.
 */
export function syncTimesNotification(state: PrayerState): boolean {
  if (!athanModule) return true;
  if (!state.timesNotification || !state.location) {
    hideTimesNotification();
    return true;
  }
  try {
    showTimesNotification({
      labels: { channel: t('prayers.timesNotification.channel'), tomorrow: t('prayers.timesNotification.tomorrow'), countdown: t('prayers.timesNotification.countdown') },
      place: placeName(state.location),
      url: Linking.createURL('prayers'),
      names: Object.fromEntries(PRAYERS.map((prayer) => [prayer, t(`prayers.names.${prayer}`)])),
      days: upcomingTimes(state, new Date(), DAYS).map(({ day, times }) => ({
        day,
        date: `${hijriLabel(day, state.hijriOffset)} · ${formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}`,
        times: times.map(({ prayer, at }) => ({ prayer, at: at.getTime() })),
      })),
    });
    return true;
  } catch {
    return false;
  }
}
