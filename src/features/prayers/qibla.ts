import { Coordinates, Qibla } from 'adhan';

/** The Kaaba, in Makkah. */
export const KAABA = { latitude: 21.4224779, longitude: 39.8251832 } as const;
const EARTH_KM = 6371.0088;
const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** The qibla from a place: the great circle's bearing to the Kaaba, in degrees clockwise from true north. */
export function qiblaBearing(place: { latitude: number; longitude: number }): number {
  return ((Qibla(new Coordinates(place.latitude, place.longitude)) % 360) + 360) % 360;
}

/** How far the Kaaba is, along the earth's surface, in kilometres. */
export function distanceToKaaba(place: { latitude: number; longitude: number }): number {
  const dLat = rad(KAABA.latitude - place.latitude), dLng = rad(KAABA.longitude - place.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(place.latitude)) * Math.cos(rad(KAABA.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** An angle brought to (-180, 180]: how far, and which way, to turn from one heading to another. */
export function turn(from: number, to: number): number {
  const delta = (((to - from) % 360) + 540) % 360 - 180;
  return delta === -180 ? 180 : delta;
}

/** The eight winds, by the bearing they cover (each 45°, centred on its direction). */
export const WINDS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type Wind = typeof WINDS[number];
export const windOf = (bearing: number): Wind => WINDS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];

/**
 * Facing the qibla, within `tolerance` degrees. Once facing, the reader stays so until `release`
 * degrees away, so a needle trembling on the edge does not flicker in and out.
 */
export function facing(delta: number, wasFacing: boolean, tolerance = 3, release = 6): boolean {
  return Math.abs(delta) <= (wasFacing ? release : tolerance);
}
