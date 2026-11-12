import * as Linking from 'expo-linking';
import { formatDate, t } from '@/i18n';
import { athanModule, hideTimesNotification, setWidgetTimes, showTimesNotification, type TimesNotification } from './athan-native';
import { hijriLabel } from './labels';
import { placeName } from './place';
import { upcomingTimes, type PrayerState } from './settings';
import { PRAYERS } from './times';

/** The prayer times notification is drawn by the app's Android module (not in Expo Go, iOS or the web). */
export const timesNotificationSupported = !!athanModule;

/** Days of times given to the module, which moves through them on its own until the app opens again. */
const DAYS = 30;

/** The coming days' times with their text, as the module shows them (in the notification and the widget). */
function timesContent(state: PrayerState & { location: NonNullable<PrayerState['location']> }): TimesNotification {
  return {
    labels: { channel: t('prayers.timesNotification.channel'), tomorrow: t('prayers.timesNotification.tomorrow'), countdown: t('prayers.timesNotification.countdown') },
    place: placeName(state.location),
    url: Linking.createURL('prayers'),
    names: Object.fromEntries(PRAYERS.map((prayer) => [prayer, t(`prayers.names.${prayer}`)])),
    days: upcomingTimes(state, new Date(), DAYS).map(({ day, times }) => ({
      day,
      date: `${hijriLabel(day, state.hijriOffset)} · ${formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}`,
      times: times.map(({ prayer, at }) => ({ prayer, at: at.getTime() })),
    })),
  };
}

/**
 * Gives the home-screen widget the coming days' times (always, when there is a place: the widget
 * is the user's to add), and shows the prayer times notification with them, or hides it when it
 * is off or there is no place. Resolves false when the module refused the notification.
 */
export function syncTimesNotification(state: PrayerState): boolean {
  if (!athanModule) return true;
  const location = state.location;
  if (!location) {
    setWidgetTimes(null);
    hideTimesNotification();
    return true;
  }
  let content: TimesNotification;
  try { content = timesContent({ ...state, location }); } catch { return false; }
  setWidgetTimes(content);
  if (!state.timesNotification) {
    hideTimesNotification();
    return true;
  }
  try {
    showTimesNotification(content);
    return true;
  } catch {
    return false;
  }
}
