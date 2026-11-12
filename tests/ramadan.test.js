import { expect, test } from 'bun:test';
import { fastAt, ramadanDay } from '../src/features/ramadan/ramadan';

test('the day of Ramadan follows the Hijri date and the user\'s shift, and is nothing outside the month', () => {
  expect(ramadanDay('2026-11-12')).toBeNull();
  const days = Array.from({ length: 60 }, (_, i) => new Date(Date.UTC(2027, 0, 25 + i)).toISOString().slice(0, 10)).map((d) => ramadanDay(d));
  const month = days.filter((d) => d !== null);
  expect([29, 30]).toContain(month.length);
  expect(month).toEqual(month.map((_, i) => i + 1));
  const first = new Date(Date.UTC(2027, 0, 25 + days.indexOf(1))).toISOString().slice(0, 10);
  // Shifted a day later, the month begins a day earlier on the calendar.
  expect(ramadanDay(first, 1)).toBe(2);
  expect(ramadanDay(first, -1)).toBeNull();
});

test('the fast awaits Maghrib by day, and the next Fajr after it', () => {
  const at = (day, h, m = 0) => new Date(`${day}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
  const times = (day) => ({ fajr: at(day, 5, 40), maghrib: at(day, 18, 20) });
  expect(fastAt(times, '2027-02-20', at('2027-02-20', 4))).toMatchObject({ fasting: false, imsak: at('2027-02-20', 5, 40) });
  expect(fastAt(times, '2027-02-20', at('2027-02-20', 14))).toMatchObject({ fasting: true, iftar: at('2027-02-20', 18, 20) });
  expect(fastAt(times, '2027-02-20', at('2027-02-20', 21))).toMatchObject({ fasting: false, imsak: at('2027-02-21', 5, 40), iftar: at('2027-02-21', 18, 20) });
  expect(fastAt(() => ({ fajr: new Date(NaN), maghrib: new Date(NaN) }), '2027-06-20', at('2027-06-20', 12))).toBeNull();
});
