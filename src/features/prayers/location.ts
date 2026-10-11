import * as Location from 'expo-location';
import { nearestCity } from './cities';
import type { PrayerLocation } from './settings';

export class LocateError extends Error {
  constructor(readonly issue: 'denied' | 'failed') { super(issue); }
}

const timeout = <T,>(promise: Promise<T>, ms: number) => Promise.race([
  promise,
  new Promise<never>((_, reject) => setTimeout(() => reject(new LocateError('failed')), ms)),
]);
/** About 100 m: plenty for prayer times, and no more precise than needed. */
const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * The phone's position, asked for once. A recent known position is enough (prayer times change by
 * a minute every 25 km or so). Named after the bundled city it is in, or the nearest one; the
 * position is not sent anywhere to be named.
 */
export async function locate(): Promise<PrayerLocation> {
  const permission = await Location.requestForegroundPermissionsAsync().catch(() => null);
  if (permission?.status !== 'granted') throw new LocateError('denied');
  let position: Location.LocationObject | null = null;
  try {
    position = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000, requiredAccuracy: 5000 });
    position ??= await timeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }), 20_000);
  } catch {
    throw new LocateError('failed');
  }
  const latitude = round(position.coords.latitude), longitude = round(position.coords.longitude);
  const city = nearestCity({ latitude, longitude });
  const near = city ? null : nearestCity({ latitude, longitude }, 150);
  return { source: 'gps', ...(city ? { city: city.id } : near ? { near: near.id } : {}), latitude, longitude, updated: new Date().toISOString() };
}
