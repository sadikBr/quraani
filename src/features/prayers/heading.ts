import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import * as Location from 'expo-location';

/**
 * Where the phone's top points, from its compass, while `on`: in degrees clockwise from true north.
 *
 * In the Android app, from the app's own module (`modules/athan`, `CompassModule.kt`): Android's
 * fused rotation, true north from the declination at `place`, and the magnetometer's calibration
 * as Android reports it; no permission is needed. Elsewhere (iOS, Expo Go), from Expo's heading,
 * which on Android needs the location permission (asked for here) and cannot tell whether the
 * compass is calibrated: `calibration` is then unknown.
 */
export type HeadingStatus = 'off' | 'starting' | 'live' | 'denied' | 'unavailable';
export interface Heading {
  status: HeadingStatus;
  degrees: number | null;
  /** 'poor' when the compass should be calibrated (moved in a figure 8), 'unknown' when the phone cannot say. */
  calibration: 'good' | 'poor' | 'unknown';
}

interface CompassModule {
  isAvailable(): boolean;
  start(latitude: number, longitude: number): boolean;
  stop(): void;
  addListener(event: 'onHeading', listener: (reading: { heading: number; accuracy: number; error: number }) => void): { remove(): void };
}
/** The app's own compass: missing in Expo Go, on iOS and on the web. */
const compass = Platform.OS === 'android' ? requireOptionalNativeModule<CompassModule>('QiblaCompass') : null;

/** Compass headings are not given on the web. */
export const headingSupported = Platform.OS === 'android' || Platform.OS === 'ios';
/** With no reading by then, the phone is taken to have no compass. */
const FIRST_READING_MS = 4000;
/** An estimated error this large (in degrees) calls for calibration too. */
const POOR_ERROR = 30;

const off: Heading = { status: 'off', degrees: null, calibration: 'unknown' };

export function useHeading(on: boolean, place: { latitude: number; longitude: number }, onReading?: (degrees: number) => void): Heading {
  const [state, setState] = useState<{ session: number; heading: Heading } | null>(null);
  // Each time it is turned on is a session of its own: what the last one found is not shown again.
  const [sessions, setSessions] = useState({ on, count: 0 });
  if (on !== sessions.on) setSessions({ on, count: sessions.count + (on ? 1 : 0) });
  const session = sessions.count;
  useEffect(() => {
    if (!on || !headingSupported) return;
    let active = true, stop: (() => void) | null = null, timer: ReturnType<typeof setTimeout> | null = null;
    let last = -1, lastCalibration: Heading['calibration'] | null = null;
    const set = (heading: Heading) => { if (active) setState({ session, heading }); };
    // Each reading turns the rose; the words under it change by whole degrees, or with the calibration.
    const read = (degrees: number, calibration: Heading['calibration']) => {
      if (!active || !Number.isFinite(degrees)) return;
      onReading?.(degrees);
      if (Math.round(degrees) === last && calibration === lastCalibration) return;
      last = Math.round(degrees);
      lastCalibration = calibration;
      set({ status: 'live', degrees, calibration });
    };
    const unavailable = () => set({ status: 'unavailable', degrees: null, calibration: 'unknown' });
    const waitForFirst = () => { timer = setTimeout(() => { if (last < 0) unavailable(); }, FIRST_READING_MS); };

    let native = false;
    try { native = !!compass?.isAvailable(); } catch { native = false; }
    if (native && compass) {
      try {
        const subscription = compass.addListener('onHeading', ({ heading, accuracy, error }) =>
          read(heading, accuracy === 0 || accuracy === 1 || error >= POOR_ERROR ? 'poor' : accuracy < 0 ? 'unknown' : 'good'));
        stop = () => { subscription.remove(); try { compass.stop(); } catch { /* Already stopped. */ } };
        if (!compass.start(place.latitude, place.longitude)) unavailable();
        else waitForFirst();
      } catch {
        unavailable();
      }
    } else {
      void (async () => {
        try {
          let permission = await Location.getForegroundPermissionsAsync();
          if (!permission.granted && permission.canAskAgain) permission = await Location.requestForegroundPermissionsAsync();
          if (!active) return;
          if (!permission.granted) { set({ status: 'denied', degrees: null, calibration: 'unknown' }); return; }
          waitForFirst();
          const subscription = await Location.watchHeadingAsync(
            // iOS reports the heading's accuracy (1: within 50°, 0: worse); Expo's Android heading does not, reliably.
            (reading) => read(reading.trueHeading >= 0 ? reading.trueHeading : reading.magHeading,
              Platform.OS === 'ios' ? (reading.accuracy < 2 ? 'poor' : 'good') : 'unknown'),
            unavailable);
          if (!active) subscription.remove(); else stop = () => subscription.remove();
        } catch {
          unavailable();
        }
      })();
    }
    return () => { active = false; stop?.(); if (timer) clearTimeout(timer); };
    // A new session (or place) restarts it; `onReading` is read as it is when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, session, place.latitude, place.longitude]);
  if (!on || !headingSupported) return off;
  return state?.session === session ? state.heading : { status: 'starting', degrees: null, calibration: 'unknown' };
}
