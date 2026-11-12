import { hijriDate, shiftDay, type DayTimes } from '@/features/prayers/times';

/** Ramadan is the ninth month of the Hijri year. */
const RAMADAN = 9;

/** Which day of Ramadan a calendar day is (by the app's Hijri date, with the user's shift), or null outside the month. */
export function ramadanDay(day: string, offset = 0): number | null {
  const hijri = hijriDate(day, offset);
  return hijri.month === RAMADAN ? hijri.day : null;
}

export interface Fast {
  /** The fast's two ends that come next: where it stops (Fajr) and where it is broken (Maghrib). */
  imsak: Date; iftar: Date;
  /** Between the two: the fast is under way, and `iftar` is what is waited for. */
  fasting: boolean;
}

/**
 * The fast as it stands at `now`: during the day, today's Maghrib is awaited; after it (and
 * before Fajr), the Fajr that comes next, with that day's Maghrib. Null where the times cannot be
 * computed (the far north in summer).
 */
export function fastAt(times: (day: string) => DayTimes, today: string, now: Date): Fast | null {
  const day = times(today);
  const valid = (t: DayTimes) => Number.isFinite(t.fajr.getTime()) && Number.isFinite(t.maghrib.getTime());
  if (!valid(day)) return null;
  if (now < day.fajr) return { imsak: day.fajr, iftar: day.maghrib, fasting: false };
  if (now < day.maghrib) return { imsak: day.fajr, iftar: day.maghrib, fasting: true };
  const next = times(shiftDay(today, 1));
  return valid(next) ? { imsak: next.fajr, iftar: next.maghrib, fasting: false } : null;
}

