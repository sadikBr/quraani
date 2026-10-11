import { CalculationMethod, CalculationParameters, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan';

/** The five prayers and sunrise, which ends the time of Fajr. In the order of the day. */
export const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export type PrayerId = typeof PRAYERS[number];
export const isPrayerId = (value: unknown): value is PrayerId => PRAYERS.includes(value as PrayerId);

/**
 * Calculation methods. `habous` (the default) follows the Moroccan Ministry of Habous and Islamic
 * Affairs; the others are the usual national and international conventions.
 */
export const METHOD_IDS = ['habous', 'algeria', 'tunisia', 'france', 'mwl', 'egyptian', 'ummAlQura', 'dubai', 'qatar', 'kuwait',
  'karachi', 'turkey', 'singapore', 'northAmerica', 'moonsighting', 'tehran'] as const;
export type MethodId = typeof METHOD_IDS[number];
export const isMethodId = (value: unknown): value is MethodId => METHOD_IDS.includes(value as MethodId);

export type MadhabId = 'shafi' | 'hanafi';
export type Adjustments = Record<PrayerId, number>;
export interface TimesSettings { method: MethodId; madhab: MadhabId; adjustments: Adjustments }
export interface Place { latitude: number; longitude: number }

function angles(fajr: number, isha: number) {
  return new CalculationParameters('Other', fajr, isha);
}

const methods: Record<MethodId, () => CalculationParameters> = {
  habous: () => {
    // 19° and 17°; sunrise 3 minutes earlier, Dhuhr and Maghrib 5 minutes later. The published
    // tables come from an engine that differs from this one by a few seconds (Asr by about 45), so
    // those seconds are added to round to the same minute: tests/prayers.test.js checks two cities
    // for a whole month against the tables.
    const p = angles(19, 17);
    const seconds = (value: number) => value / 60;
    p.methodAdjustments = { fajr: seconds(-0.5), sunrise: -3, dhuhr: seconds(301.5), asr: seconds(43.5), maghrib: seconds(299.5), isha: seconds(3.5) };
    return p;
  },
  algeria: () => angles(18, 17),
  tunisia: () => angles(18, 18),
  // Union des organisations islamiques de France.
  france: () => angles(12, 12),
  mwl: CalculationMethod.MuslimWorldLeague,
  egyptian: CalculationMethod.Egyptian,
  ummAlQura: CalculationMethod.UmmAlQura,
  dubai: CalculationMethod.Dubai,
  qatar: CalculationMethod.Qatar,
  kuwait: CalculationMethod.Kuwait,
  karachi: CalculationMethod.Karachi,
  turkey: CalculationMethod.Turkey,
  singapore: CalculationMethod.Singapore,
  northAmerica: CalculationMethod.NorthAmerica,
  moonsighting: CalculationMethod.MoonsightingCommittee,
  tehran: CalculationMethod.Tehran,
};

export function calculationParameters(place: Place, settings: TimesSettings): CalculationParameters {
  const p = methods[settings.method]();
  p.madhab = settings.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi;
  p.highLatitudeRule = HighLatitudeRule.recommended(new Coordinates(place.latitude, place.longitude));
  p.adjustments = { ...settings.adjustments };
  return p;
}

export type DayTimes = Record<PrayerId, Date>;

/** The times of a calendar day ('YYYY-MM-DD') at a place, as instants. */
export function dayTimes(place: Place, day: string, settings: TimesSettings): DayTimes {
  const [year, month, date] = day.split('-').map(Number);
  const times = new PrayerTimes(new Coordinates(place.latitude, place.longitude), new Date(year, month - 1, date), calculationParameters(place, settings));
  return { fajr: times.fajr, sunrise: times.sunrise, dhuhr: times.dhuhr, asr: times.asr, maghrib: times.maghrib, isha: times.isha };
}

/** A calendar day in the device's time zone. */
export function dayOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function shiftDay(day: string, amount: number): string {
  const [year, month, date] = day.split('-').map(Number);
  return dayOf(new Date(year, month - 1, date + amount));
}

export interface PrayerMoment { prayer: PrayerId; day: string; at: Date }

/** The time we are in (the last that began) and the next one to come, across midnight. */
export function prayerWindow(place: Place, now: Date, settings: TimesSettings): { current: PrayerMoment; next: PrayerMoment } {
  const today = dayOf(now);
  const moments = [shiftDay(today, -1), today, shiftDay(today, 1)].flatMap((day) => {
    const times = dayTimes(place, day, settings);
    return PRAYERS.map((prayer) => ({ prayer, day, at: times[prayer] }));
  }).filter((m) => Number.isFinite(m.at.getTime()));
  const index = moments.findIndex((m) => m.at.getTime() > now.getTime());
  return { current: moments[index - 1], next: moments[index] };
}

/** "HH:MM", 24-hour, in the device's time zone. */
export function clock(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "H:MM:SS" until `to` (never negative); "H:MM" without seconds, rounded up to the minute. */
export function countdown(now: Date, to: Date, withSeconds = true): string {
  const left = Math.max(0, to.getTime() - now.getTime());
  const seconds = withSeconds ? Math.ceil(left / 1000) : Math.ceil(left / 60000) * 60;
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}${withSeconds ? `:${String(s).padStart(2, '0')}` : ''}`;
}

// The tabular Islamic calendar (the "Kuwaiti algorithm"): 30-year cycles with 11 leap years,
// counted from 16 July 622 (Julian). It can differ by a day or two from the calendar announced
// after moon sighting, so the user can shift it.
const ISLAMIC_EPOCH = 1948439.5;
const islamicToJulianDay = (year: number, month: number, day: number) =>
  day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;

export interface HijriDate { year: number; month: number; day: number }

/** The Hijri date of a calendar day ('YYYY-MM-DD'), shifted by `offset` days. */
export function hijriDate(day: string, offset = 0): HijriDate {
  const [y, m, d] = day.split('-').map(Number);
  const jd = Math.floor(Date.UTC(y, m - 1, d + offset) / 86400000) + 2440587.5;
  const year = Math.floor((30 * (jd - ISLAMIC_EPOCH) + 10646) / 10631);
  const month = Math.min(12, Math.ceil((jd - (29 + islamicToJulianDay(year, 1, 1))) / 29.5) + 1);
  return { year, month, day: jd - islamicToJulianDay(year, month, 1) + 1 };
}
