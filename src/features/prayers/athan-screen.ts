import type { ImageSourcePropType } from 'react-native';
import { t } from '@/i18n';
import { previewAthanScreen, setAthanScreenStyle } from './athan-native';
import { athanScreenText } from './notifications';
import type { AthanScreenStyle, PrayerState, ScreenPhoto } from './settings';
import { dayTimes, prayerWindow, type PrayerId } from './times';

/**
 * A photo of the athan's screen, from the Android module's resources (`res/drawable-nodpi`), which
 * React Native loads by name; `thumb` is the small copy for the picker.
 */
export const screenImage = (id: ScreenPhoto, thumb = false): ImageSourcePropType => ({ uri: `athan_screen_${id}${thumb ? '_thumb' : ''}` });

/** Gives the module the screen's look, read when the screen opens. */
export const syncScreenStyle = (style: AthanScreenStyle) => setAthanScreenStyle(style);

/** The prayer a test or a preview shows: the next one; after Fajr, that day's Dhuhr (no athan at sunrise). */
export function upcomingAthan(state: PrayerState, now = new Date()): { prayer: PrayerId; time: Date } {
  const next = state.location ? prayerWindow(state.location, now, state).next : undefined;
  if (!next || !state.location) return { prayer: 'dhuhr', time: now };
  if (next.prayer === 'sunrise') return { prayer: 'dhuhr', time: dayTimes(state.location, next.day, state).dhuhr };
  return { prayer: next.prayer, time: next.at };
}

/** The screen's text for the coming athan, as it will show. */
export function upcomingScreenText(state: PrayerState, now = new Date()) {
  const { prayer, time } = upcomingAthan(state, now);
  return { heading: t('prayers.screen.heading'), ...athanScreenText(state, prayer, time) };
}

/** Opens the real screen now, silent, with the coming athan's text. Resolves whether it opened. */
export function openScreenPreview(state: PrayerState): boolean {
  syncScreenStyle(state.screen);
  return previewAthanScreen({ ...upcomingScreenText(state), close: t('prayers.screen.close') });
}
