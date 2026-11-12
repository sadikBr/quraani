import { expect, test } from 'bun:test';
import { activityOf, decodeActivity, defaultActivityState, mergeActivity, monthWeeks, recentDays, shiftMonth, streakOf } from '../src/features/activity/log';

const state = (days) => ({ version: 1, days });

test('the run of days ends today or yesterday, and the longest run is remembered', () => {
  const days = { '2026-10-30': 1, '2026-10-31': 2, '2026-11-01': 1, '2026-11-05': 1, '2026-11-11': 1, '2026-11-12': 3 };
  expect(streakOf(days, '2026-11-12')).toEqual({ current: 2, best: 3, today: true, total: 6 });
  // Today still to come: yesterday's run stands until the day is over.
  expect(streakOf(days, '2026-11-13')).toEqual({ current: 2, best: 3, today: false, total: 6 });
  expect(streakOf(days, '2026-11-14').current).toBe(0);
  expect(streakOf({}, '2026-11-12')).toEqual({ current: 0, best: 0, today: false, total: 0 });
  expect(recentDays(days, '2026-11-12').map((d) => d.done)).toEqual([false, false, false, false, false, true, true]);
});

test('days come from every kind of goal, and are kept after the goal is gone', () => {
  const plans = [
    { goal: { type: 'khatma', weeks: 4 }, cycle: { progress: [{ date: '2026-11-10', from: 0, to: 5 }, { date: '2026-11-12', from: 5, to: 9 }] } },
    { goal: { type: 'memorization', weeklyQuarters: 1 }, progress: [{ date: '2026-11-12', from: 0, to: 3, finished: true }] },
    { goal: { type: 'revision', dailyQuarters: 1 }, log: [{ date: '2026-11-11', from: 0, to: 3, pass: 1 }] },
    { goal: { type: 'recurring', surahs: [18] }, occurrences: [{ date: '2026-11-06', progress: [{ range: 0, from: 0, to: 9 }] }, { date: '2026-11-13', progress: [] }] },
  ];
  const fromGoals = activityOf(plans);
  expect(fromGoals).toEqual({ '2026-11-10': 1, '2026-11-12': 2, '2026-11-11': 1, '2026-11-06': 1 });
  const merged = mergeActivity(defaultActivityState, fromGoals, '2026-11-12');
  expect(Object.keys(merged.days)).toEqual(['2026-11-06', '2026-11-10', '2026-11-11', '2026-11-12']);
  expect(mergeActivity(merged, fromGoals, '2026-11-12')).toBe(merged);
  // The goals deleted: earlier days stay; today, undone, goes.
  const after = mergeActivity(merged, {}, '2026-11-12');
  expect(after.days).toEqual({ '2026-11-06': 1, '2026-11-10': 1, '2026-11-11': 1 });
  expect(mergeActivity(after, {}, '2026-11-13')).toBe(after);
  // A date ahead of the phone's is not taken.
  expect(mergeActivity(defaultActivityState, { '2026-12-01': 1 }, '2026-11-12')).toBe(defaultActivityState);
});

test('saved days are read back whole, and anything malformed is dropped', () => {
  const saved = state({ '2026-11-10': 1, '2026-11-12': 2 });
  expect(decodeActivity(JSON.stringify(saved))).toEqual(saved);
  expect(decodeActivity(JSON.stringify(state({ '2026-02-31': 1, nope: 2, '2026-11-12': 0, '2026-11-11': 1.5, '2026-11-10': 4 }))).days).toEqual({ '2026-11-10': 4 });
  for (const raw of [null, 'x', '[]', '{"version":2,"days":{}}', '{"version":1,"days":[]}']) expect(decodeActivity(raw)).toBe(defaultActivityState);
});

test('a month is laid out in weeks from Monday, and months follow one another across years', () => {
  const weeks = monthWeeks('2026-11');
  // 1 November 2026 is a Sunday: alone at the end of the first week.
  expect(weeks[0]).toEqual([null, null, null, null, null, null, '2026-11-01']);
  expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  expect(weeks.every((week) => week.length === 7)).toBe(true);
  expect(monthWeeks('2028-02').flat().filter(Boolean)).toHaveLength(29);
  expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  expect(shiftMonth('2027-01', -1)).toBe('2026-12');
});
