import { describe, expect, test } from 'bun:test';
import { countdown, dayOf, dayTimes, hijriDate, PRAYERS, prayerWindow, shiftDay } from '../src/features/prayers/times';
import { applyPrayers, decodePrayers, defaultPrayerState, normalizePrayers, prayerAlerts, upcomingTimes } from '../src/features/prayers/settings';
import { CITIES, nearestCity } from '../src/features/prayers/cities';
import ar from '../src/i18n/locales/ar/prayers';

// Published Habous times for October 2026 (bladi.net, «Maroc — Ministère des Habous», calibrated on
// the ministry's tables), in UTC+00:00 like the tables: day, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Isha.
const casablanca = `04:57 06:22 12:25 15:42 18:20 19:33|04:58 06:22 12:25 15:41 18:19 19:31|04:59 06:23 12:24 15:41 18:17 19:30
04:59 06:24 12:24 15:40 18:16 19:29|05:00 06:25 12:24 15:39 18:15 19:27|05:01 06:25 12:24 15:38 18:13 19:26
05:02 06:26 12:23 15:37 18:12 19:25|05:02 06:27 12:23 15:36 18:11 19:23|05:03 06:28 12:23 15:35 18:09 19:22
05:04 06:28 12:22 15:34 18:08 19:21|05:05 06:29 12:22 15:33 18:07 19:20|05:05 06:30 12:22 15:32 18:06 19:18
05:06 06:31 12:22 15:31 18:04 19:17|05:07 06:31 12:21 15:30 18:03 19:16|05:07 06:32 12:21 15:30 18:02 19:15
05:08 06:33 12:21 15:29 18:01 19:14|05:09 06:34 12:21 15:28 17:59 19:12|05:10 06:34 12:21 15:27 17:58 19:11
05:10 06:35 12:20 15:26 17:57 19:10|05:11 06:36 12:20 15:25 17:56 19:09|05:12 06:37 12:20 15:24 17:55 19:08
05:13 06:38 12:20 15:23 17:54 19:07|05:13 06:39 12:20 15:23 17:53 19:06|05:14 06:39 12:20 15:22 17:51 19:05
05:15 06:40 12:20 15:21 17:50 19:04|05:16 06:41 12:19 15:20 17:49 19:03|05:16 06:42 12:19 15:19 17:48 19:02
05:17 06:43 12:19 15:19 17:47 19:01|05:18 06:44 12:19 15:18 17:46 19:00|05:19 06:45 12:19 15:17 17:45 18:59
05:19 06:45 12:19 15:16 17:44 18:59`;
const oujda = `04:33 05:59 12:02 15:19 17:57 19:11|04:34 06:00 12:02 15:18 17:55 19:09|04:35 06:01 12:02 15:17 17:54 19:08
04:36 06:01 12:01 15:16 17:53 19:06|04:37 06:02 12:01 15:15 17:51 19:05|04:37 06:03 12:01 15:14 17:50 19:04
04:38 06:04 12:00 15:13 17:49 19:02|04:39 06:05 12:00 15:12 17:47 19:01|04:40 06:05 12:00 15:11 17:46 19:00
04:41 06:06 12:00 15:10 17:45 18:58|04:41 06:07 11:59 15:09 17:43 18:57|04:42 06:08 11:59 15:09 17:42 18:56
04:43 06:09 11:59 15:08 17:41 18:55|04:44 06:09 11:59 15:07 17:39 18:53|04:44 06:10 11:58 15:06 17:38 18:52
04:45 06:11 11:58 15:05 17:37 18:51|04:46 06:12 11:58 15:04 17:36 18:50|04:47 06:13 11:58 15:03 17:34 18:49
04:48 06:14 11:58 15:02 17:33 18:47|04:48 06:14 11:57 15:01 17:32 18:46|04:49 06:15 11:57 15:00 17:31 18:45
04:50 06:16 11:57 14:59 17:30 18:44|04:51 06:17 11:57 14:58 17:28 18:43|04:51 06:18 11:57 14:58 17:27 18:42
04:52 06:19 11:57 14:57 17:26 18:41|04:53 06:20 11:57 14:56 17:25 18:40|04:54 06:20 11:57 14:55 17:24 18:39
04:55 06:21 11:56 14:54 17:23 18:38|04:55 06:22 11:56 14:53 17:22 18:37|04:56 06:23 11:56 14:53 17:21 18:36
04:57 06:24 11:56 14:52 17:20 18:35`;
const habous = { method: 'habous', madhab: 'shafi', adjustments: defaultPrayerState.adjustments };
const utc = (date) => date.toISOString().slice(11, 16);

describe('prayer times', () => {
  // A calendar day's times are instants: the same in any time zone.
  test('the Habous method gives the published times, every day of a month, in two cities', () => {
    const misses = [];
    for (const [place, table] of [[{ latitude: 33.5883, longitude: -7.6114 }, casablanca], [{ latitude: 34.6814, longitude: -1.9086 }, oujda]]) {
      table.split(/[|\n]/).forEach((row, i) => {
        const times = dayTimes(place, `2026-10-${String(i + 1).padStart(2, '0')}`, habous);
        row.split(' ').forEach((expected, j) => {
          const [h, m] = expected.split(':').map(Number);
          const minutes = Math.round((times[PRAYERS[j]].getTime() - Date.UTC(2026, 9, i + 1, h, m)) / 60000);
          if (minutes) misses.push(`${place.latitude} ${i + 1} ${PRAYERS[j]} ${utc(times[PRAYERS[j]])}`);
          expect(Math.abs(minutes)).toBeLessThanOrEqual(1);
        });
      });
    }
    // 372 times; one sunrise falls exactly on a half minute and rounds the other way.
    expect(misses).toEqual(['34.6814 27 sunrise 06:21']);
  });

  test('adjustments, the Hanafi Asr and other methods', () => {
    const place = { latitude: 33.5883, longitude: -7.6114 }, day = '2026-10-11';
    const base = dayTimes(place, day, habous);
    const moved = dayTimes(place, day, { ...habous, adjustments: { ...habous.adjustments, fajr: 2, isha: -3 } });
    expect(moved.fajr.getTime() - base.fajr.getTime()).toBe(120000);
    expect(moved.isha.getTime() - base.isha.getTime()).toBe(-180000);
    expect(dayTimes(place, day, { ...habous, madhab: 'hanafi' }).asr.getTime()).toBeGreaterThan(base.asr.getTime() + 30 * 60000);
    const mwl = dayTimes(place, day, { ...habous, method: 'mwl' });
    expect(mwl.fajr.getTime()).toBeGreaterThan(base.fajr.getTime());
    expect(mwl.maghrib.getTime()).toBeLessThan(base.maghrib.getTime());
    // High latitudes still get every time.
    for (const times of [dayTimes({ latitude: 59.3294, longitude: 18.0687 }, '2026-06-21', { ...habous, method: 'mwl' })]) {
      for (const p of PRAYERS) expect(Number.isFinite(times[p].getTime())).toBe(true);
    }
  });

  test('the current and next times run across midnight', () => {
    const place = { latitude: 33.5883, longitude: -7.6114 };
    const late = new Date(Date.UTC(2026, 9, 11, 23, 30));
    const { current, next } = prayerWindow(place, late, habous);
    expect(current).toMatchObject({ prayer: 'isha', day: '2026-10-11' });
    expect(next).toMatchObject({ prayer: 'fajr', day: '2026-10-12' });
    const early = prayerWindow(place, new Date(Date.UTC(2026, 9, 11, 1, 0)), habous);
    expect(early.current).toMatchObject({ prayer: 'isha', day: '2026-10-10' });
    expect(early.next).toMatchObject({ prayer: 'fajr', day: '2026-10-11' });
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01');
    expect(countdown(new Date(0), new Date(7_445_200))).toBe('2:04:06');
    expect(countdown(new Date(10), new Date(0))).toBe('0:00:00');
    expect(countdown(new Date(0), new Date(7_445_200), false)).toBe('2:05');
  });

  test('the Hijri date (tabular) and its offset', () => {
    expect(hijriDate('2026-02-18')).toEqual({ year: 1447, month: 9, day: 1 });
    expect(hijriDate('2026-03-20')).toEqual({ year: 1447, month: 10, day: 1 });
    expect(hijriDate('2026-05-27')).toEqual({ year: 1447, month: 12, day: 10 });
    expect(hijriDate('2026-06-16', 1)).toEqual({ year: 1448, month: 1, day: 1 });
    expect(hijriDate('2026-10-11', -2)).toEqual({ year: 1448, month: 4, day: 26 });
  });
});

describe('prayer settings', () => {
  test('saved data keeps what is valid', () => {
    expect(decodePrayers(null)).toEqual(defaultPrayerState);
    expect(decodePrayers('{')).toEqual(defaultPrayerState);
    const decoded = decodePrayers(JSON.stringify({
      location: { source: 'city', city: 'oujda', latitude: 34.68, longitude: -1.9, updated: 'x' },
      method: 'nope', madhab: 'hanafi', adjustments: { fajr: 2, isha: 99, dhuhr: 1.5 },
      enabled: 'yes', alerts: { fajr: 'full', sunrise: 'loud' }, before: 7, voice: 'qatami', hijriOffset: -1,
    }));
    expect(decoded.location).toEqual({ source: 'city', city: 'oujda', latitude: 34.68, longitude: -1.9, updated: 'x' });
    expect(decoded.method).toBe('habous');
    expect(decoded.madhab).toBe('hanafi');
    expect(decoded.adjustments).toEqual({ fajr: 2, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 });
    expect(decoded.enabled).toBe(false);
    expect(decoded.alerts).toEqual({ ...defaultPrayerState.alerts, fajr: 'full' });
    expect([decoded.before, decoded.voice, decoded.hijriOffset]).toEqual([0, 'qatami', -1]);
    expect(normalizePrayers({ location: { source: 'city', city: 'atlantis', latitude: 1, longitude: 1 } }).location).toBeNull();
    expect(normalizePrayers({ location: { source: 'gps', latitude: 95, longitude: 1 } }).location).toBeNull();
    expect(applyPrayers(defaultPrayerState, { before: 10, voice: 'alafasy' })).toMatchObject({ before: 10, voice: 'alafasy', method: 'habous' });
    // 20 minutes is no longer offered: a reminder saved with it comes 15 minutes before, not never.
    expect([20, 30, 15, 0].map((before) => normalizePrayers({ before }).before)).toEqual([15, 30, 15, 0]);
    expect([decoded.takbir, normalizePrayers({ takbir: 'madinah' }).takbir, normalizePrayers({ takbir: 'single' }).takbir, normalizePrayers({ takbir: 'cairo' }).takbir]).toEqual(['makkah', 'madinah', 'single', 'makkah']);
    expect(normalizePrayers({ voice: 'ozcan' }).voice).toBe('ozcan');
    // A voice or takbir of the earlier recordings, which are gone, is the default again.
    expect([normalizePrayers({ voice: 'azemi' }).voice, normalizePrayers({ takbir: 'medina' }).takbir]).toEqual(['makkah', 'makkah']);
    // A takbir alone is not a whole athan.
    expect(normalizePrayers({ voice: 'single' }).voice).toBe('makkah');
  });

  test('the prayer times notification is off until chosen, and gets whole days from today', () => {
    expect(defaultPrayerState.timesNotification).toBe(false);
    expect(normalizePrayers({ timesNotification: true }).timesNotification).toBe(true);
    expect(normalizePrayers({ timesNotification: 'yes' }).timesNotification).toBe(false);
    expect(upcomingTimes(defaultPrayerState, new Date(), 3)).toEqual([]);
    const place = { ...defaultPrayerState, location: { source: 'city', city: 'casablanca', latitude: 33.5883, longitude: -7.6114, updated: '' } };
    const at = new Date(Date.UTC(2026, 9, 11, 21, 0)), today = dayOf(at);
    const days = upcomingTimes(place, at, 3);
    expect(days.map((d) => d.day)).toEqual([today, shiftDay(today, 1), shiftDay(today, 2)]);
    expect(days.every((d) => d.times.map((m) => m.prayer).join() === 'fajr,sunrise,dhuhr,asr,maghrib,isha')).toBe(true);
    // In order within each day, and each day after the one before.
    const all = days.flatMap((d) => d.times.map((m) => m.at.getTime()));
    expect(all.every((at, i) => i === 0 || at > all[i - 1])).toBe(true);
  });

  test('the athan screen keeps a valid look', () => {
    expect(defaultPrayerState.screen).toEqual({ background: 'makkah_night', dim: 'medium', motion: 'pulse', date: true });
    expect(normalizePrayers({ screen: { background: 'koutoubia', dim: 'strong', motion: 'glow', date: false } }).screen)
      .toEqual({ background: 'koutoubia', dim: 'strong', motion: 'glow', date: false });
    expect(normalizePrayers({ screen: { background: 'paris', dim: 'max', motion: 'spin', date: 'no' } }).screen).toEqual(defaultPrayerState.screen);
    expect(normalizePrayers({ screen: 'x' }).screen).toEqual(defaultPrayerState.screen);
  });

  test('the opening of the athan («أذان قصير») became the takbir', () => {
    const migrated = normalizePrayers({ alerts: { fajr: 'short', dhuhr: 'short', asr: 'full', maghrib: 'notify', isha: 'off', sunrise: 'takbir' } }).alerts;
    expect(migrated).toEqual({ fajr: 'takbir', sunrise: 'notify', dhuhr: 'takbir', asr: 'full', maghrib: 'notify', isha: 'off' });
    expect(Object.values(defaultPrayerState.alerts)).not.toContain('short');
  });

  const located = { ...defaultPrayerState, enabled: true, location: { source: 'city', city: 'casablanca', latitude: 33.5883, longitude: -7.6114, updated: '' } };
  const now = new Date(Date.UTC(2026, 9, 11, 13, 0));

  test('alerts follow the settings, from now on', () => {
    expect(prayerAlerts(defaultPrayerState, now, { days: 7, native: true, nativeDays: 30 })).toEqual({ notifications: [], athans: [] });
    const { notifications, athans } = prayerAlerts(located, now, { days: 2, native: false, nativeDays: 30 });
    // Today's Asr, Maghrib and Isha, then tomorrow's five prayers; sunrise is off by default.
    expect(notifications.map((n) => n.prayer)).toEqual(['asr', 'maghrib', 'isha', 'fajr', 'dhuhr', 'asr', 'maghrib', 'isha']);
    expect(notifications.every((n) => n.kind === 'takbir' && n.id.startsWith('quranni-prayer:') && n.date > now)).toBe(true);
    expect(athans).toEqual([]);
    expect(new Set(notifications.map((n) => n.id)).size).toBe(notifications.length);
  });

  test('whole athans go to the Android module when it is there, otherwise they are the takbir', () => {
    const state = { ...located, alerts: { ...located.alerts, fajr: 'full', isha: 'notify', sunrise: 'notify' }, before: 10 };
    const withModule = prayerAlerts(state, now, { days: 2, native: true, nativeDays: 30 });
    expect(withModule.athans.map((a) => a.prayer)).toEqual(Array(29).fill('fajr'));
    expect(withModule.athans[0].time > now).toBe(true);
    expect(withModule.notifications.filter((n) => n.prayer === 'fajr').map((n) => n.kind)).toEqual(['before']);
    const isha = withModule.notifications.filter((n) => n.prayer === 'isha');
    expect(isha.map((n) => n.kind)).toEqual(['before', 'notify', 'before', 'notify']);
    expect(isha[0].time.getTime() - isha[0].date.getTime()).toBe(10 * 60000);
    const without = prayerAlerts(state, now, { days: 2, native: false, nativeDays: 30 });
    expect(without.athans).toEqual([]);
    expect(without.notifications.filter((n) => n.prayer === 'fajr').map((n) => n.kind)).toEqual(['before', 'takbir']);
    expect(prayerAlerts({ ...state, enabled: false }, now, { days: 2, native: true, nativeDays: 30 }).athans).toEqual([]);
    // An athan that just passed stays in the module's list (its alarm may be late); a notification does not.
    const justAfter = new Date(withModule.athans[0].time.getTime() + 5 * 60_000);
    const late = prayerAlerts(state, justAfter, { days: 2, native: true, nativeDays: 30 });
    expect(late.athans[0].id).toBe(withModule.athans[0].id);
    expect(late.notifications.every((n) => n.date > justAfter)).toBe(true);
    const later = prayerAlerts(state, new Date(justAfter.getTime() + 10 * 60_000), { days: 2, native: true, nativeDays: 30 });
    expect(later.athans[0].id).not.toBe(withModule.athans[0].id);
  });

  test('no athan at sunrise, and places found by the phone keep their nearest city', () => {
    expect(normalizePrayers({ alerts: { sunrise: 'full' } }).alerts.sunrise).toBe('notify');
    expect(normalizePrayers({ alerts: { sunrise: 'short', fajr: 'full' } }).alerts).toMatchObject({ sunrise: 'notify', fajr: 'full' });
    expect(normalizePrayers({ location: { source: 'gps', near: 'agadir', latitude: 30.9, longitude: -9.1, updated: '' } }).location)
      .toEqual({ source: 'gps', near: 'agadir', latitude: 30.9, longitude: -9.1, updated: '' });
    expect(normalizePrayers({ location: { source: 'gps', city: 'rabat', near: 'agadir', latitude: 34, longitude: -6.8 } }).location?.near).toBeUndefined();
  });
});

describe('cities', () => {
  test('every city has a name and a country, and positions find the nearest one', () => {
    for (const city of CITIES) {
      expect(typeof ar.cities[city.id]).toBe('string');
      expect(typeof ar.countries[city.country]).toBe('string');
    }
    expect(Object.keys(ar.cities)).toHaveLength(CITIES.length);
    expect(nearestCity({ latitude: 33.57, longitude: -7.59 })?.id).toBe('casablanca');
    expect(nearestCity({ latitude: 34.02, longitude: -6.84 })?.id).toBe('rabat');
    expect(nearestCity({ latitude: 31, longitude: -20 })).toBeNull();
  });
});
