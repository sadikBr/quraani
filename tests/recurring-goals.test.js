import { expect, test } from 'bun:test';
import { buildPlanIndex, createPlan, finishesGoal, nextPortion, recordProgress, setPlanPaused } from '../src/features/plans/engine';
import { canUndoRecurringProgress, createRecurringPlan, occurrenceProgress, completedOccurrences, nextScheduledDate, undoRecurringProgress } from '../src/features/plans/recurring';
import { createReadingSession, saveReadingSession, sessionPageEnd } from '../src/features/plans/reading-session';
import { createPlansRepository, decodePlans } from '../src/features/plans/repository';
import { currentGoal, DuplicateGoalError } from '../src/features/plans/goal-limit';
import { goalsOverview } from '../src/features/plans/overview';
import { planReminderQueue } from '../src/features/plans/reminder-schedule';
import { maintainArchives, restoreArchivedGoal, deleteArchivedGoal } from '../src/features/plans/archive';

const friday = '2026-10-09';
function fixture(mushafId = 4) {
  let ordinal = 0;
  const surahs = [[1, 3], [18, 6], [67, 3]].map(([number, length]) => ({ number, name: `سورة ${number}`,
    ayahs: Array.from({ length }, (_, i) => ({ mushafId, surahNumber: number, ayahNumber: i + 1, pageNumber: Math.floor(ordinal++ / 2) + 1, juzNumber: 1, hizbQuarter: 1 })) }));
  const ayahs = surahs.flatMap(s => s.ayahs);
  const pages = Array.from({ length: 6 }, (_, i) => ({ mushafId, number: i + 1, ayahs: ayahs.filter(a => a.pageNumber === i + 1), previousAyah: ayahs[i * 2 - 1] }));
  const entries = [{ number: 1, start: ayahs[0], pageNumber: 1 }];
  return { quran: { id: mushafId, surahs }, pages, hizbIndex: entries, juzIndex: entries, quarterHizbIndex: entries };
}
const content = fixture(), index = buildPlanIndex(content);
const draft = { name: 'الكهف كل جمعة', riwayah: 'warsh', surahs: [18], weekdays: [5], startDate: friday, reminder: { enabled: true, hour: 20, minute: 0 } };
const make = (changes = {}, i = index, id = 'plan-recurring') => createRecurringPlan({ ...draft, ...changes }, i, id);
const roundTrip = plan => decodePlans(JSON.stringify({ version: 1, plans: [plan] }))[0];
const open = (plan, date = friday, corpus = content) => { const next = nextPortion(plan, date); return createReadingSession(plan, corpus, String(next.cycle), String(next.slot), date); };
const complete = (plan, date = friday) => { const next = nextPortion(plan, date); return recordProgress(plan, { cycle: next.cycle, slot: next.slot, to: next.end }, date); };
const sequential = () => createPlan({ name: 'ختمتي', riwayah: 'warsh', goal: { type: 'khatma', weeks: 1 }, unit: 'pages', start: { kind: 'page', number: 1 }, startDate: friday, repeat: false, reminder: draft.reminder }, index, 'plan-khatma');

test('Friday and custom weekday schedules use calendar dates, respect future starts, and skip missed days', () => {
  const plan = make();
  expect(nextPortion(plan, friday)).toMatchObject({ due: true, date: friday, cycle: 20261009 });
  expect(nextPortion(plan, '2026-10-10')).toMatchObject({ due: false, date: '2026-10-16', start: 3 });
  expect(nextPortion(plan, '2026-10-23')).toMatchObject({ due: true, date: '2026-10-23', start: 3 });
  expect(nextScheduledDate(make({ weekdays: [1, 4] }), friday)).toBe('2026-10-12');
  expect(nextPortion(make({ startDate: '2026-11-01' }), friday)).toMatchObject({ due: false, date: '2026-11-06' });
  expect(nextScheduledDate(make({ startDate: '2026-12-31', weekdays: [5] }), '2026-12-31')).toBe('2027-01-01');
  expect(nextScheduledDate(make({ startDate: '2028-02-28', weekdays: [2] }), '2028-02-28')).toBe('2028-02-29');
});

test('daily occurrences reset independently while retaining partial and completed history', () => {
  let plan = make({ surahs: [67], weekdays: [0, 1, 2, 3, 4, 5, 6] });
  const session = open(plan);
  plan = saveReadingSession(plan, session, sessionPageEnd(session, 5), friday);
  expect(open(plan).portion.start).toBe(10);
  expect(open(plan, '2026-10-10').portion.start).toBe(9);
  plan = complete(plan, '2026-10-10');
  expect(plan.status).toBe('active');
  expect(occurrenceProgress(plan, friday)).toMatchObject({ done: false, read: 1 });
  expect(occurrenceProgress(plan, '2026-10-10').done).toBe(true);
  expect(nextPortion(plan, '2026-10-10')).toMatchObject({ date: '2026-10-11', due: false });
  expect(completedOccurrences(roundTrip(plan))).toBe(1);
});

test('nonadjacent surahs open separate bounded sessions in both editions and never include the gap', () => {
  for (const mushafId of [4, 2]) {
    const corpus = fixture(mushafId), i = buildPlanIndex(corpus);
    let plan = make({ surahs: [67, 1, 1], riwayah: mushafId === 4 ? 'warsh' : 'hafs' }, i);
    expect(plan.goal.surahs).toEqual([1, 67]);
    const first = open(plan, friday, corpus);
    expect(first.remainingSurahs).toBe(1);
    expect(first.content.quran.surahs.map(s => s.number)).toEqual([1]);
    expect(first.content.pages.at(-1).ayahs.map(a => a.surahNumber)).toEqual([1]);
    expect(first.pages.at(-1)).toBe(corpus.pages[1]);
    plan = saveReadingSession(plan, first, first.portion.end, friday);
    expect(() => saveReadingSession(plan, first, first.portion.end, friday)).toThrow();
    expect(goalsOverview([plan], friday).completedToday).toBe(0);
    const second = open(plan, friday, corpus);
    expect(second.remainingSurahs).toBe(0);
    expect(second.content.quran.surahs.map(s => s.number)).toEqual([67]);
    expect(second.content.pages[0].ayahs.map(a => a.surahNumber)).toEqual([67]);
    expect(second.contains(corpus.quran.surahs[1].ayahs[0])).toBe(false);
    expect(second.content.pages[0].previousAyah).toBeUndefined();
    plan = saveReadingSession(plan, second, second.portion.end, friday);
    expect(occurrenceProgress(plan, friday).done).toBe(true);
    expect(goalsOverview([plan], friday)).toMatchObject({ completedToday: 1, due: [] });
    expect(roundTrip(plan)).toEqual(plan);
  }
});

test('old date, duplicate, changed schedule and mismatched edition receipts cannot alter another occurrence', () => {
  const plan = make({ weekdays: [0, 1, 2, 3, 4, 5, 6] }), session = open(plan);
  expect(() => saveReadingSession(plan, session, session.portion.end, '2026-10-10')).toThrow();
  expect(() => open(plan, friday, fixture(2))).toThrow();
  expect(() => open({ ...plan, ranges: [{ ...plan.ranges[0], start: 4 }] })).toThrow();
  expect(() => saveReadingSession({ ...plan, weekdays: [1] }, session, session.portion.end, friday)).toThrow();
  expect(() => saveReadingSession({ ...plan, status: 'paused' }, session, session.portion.end, friday)).toThrow();
  expect(() => saveReadingSession(plan, session, session.portion.end + 1, friday)).toThrow();
  const saved = saveReadingSession(plan, session, session.portion.end, friday);
  expect(() => saveReadingSession(saved, session, session.portion.end, friday)).toThrow();
  expect(recordProgress(plan, { cycle: 20261008, slot: 0, to: 9 }, friday)).toBe(plan);
});

test('only the last thing recorded today can be undone, and once', () => {
  const two = make({ surahs: [18, 67] });
  const first = complete(two), both = complete(first);
  expect(occurrenceProgress(both, friday).done).toBe(true);
  expect(canUndoRecurringProgress(both, friday)).toBe(true);
  const undone = undoRecurringProgress(both, friday);
  expect(occurrenceProgress(undone, friday)).toMatchObject({ completed: 1, done: false });
  expect(canUndoRecurringProgress(undone, friday)).toBe(false);
  expect(undoRecurringProgress(undone, friday)).toBe(undone);
  expect(roundTrip(undone)).toEqual(undone);
  // Recorded again, it can be undone in its turn; nothing is finished for good here, each date is its own.
  expect(canUndoRecurringProgress(complete(undone), friday)).toBe(true);
  expect(finishesGoal(two, two.ranges[1].end) || open(first).finishesGoal).toBe(false);
  expect(canUndoRecurringProgress(both, '2026-10-10')).toBe(false);
});

test('undo affects only today; pause, archive, restoration and weekday edits preserve occurrence history', () => {
  const completed = complete(make()), paused = setPlanPaused(completed, true, friday);
  expect(nextPortion(paused, friday)).toBeNull();
  const resumed = setPlanPaused(paused, false, '2026-10-18');
  expect(nextPortion(resumed, '2026-10-18').date).toBe('2026-10-23');
  expect(undoRecurringProgress(completed, '2026-10-10')).toBe(completed);
  expect(undoRecurringProgress(completed, friday).occurrences).toEqual([]);
  const edited = roundTrip({ ...completed, weekdays: [1] });
  expect(edited.occurrences).toEqual(completed.occurrences);
  expect(nextPortion(edited, friday).date).toBe('2026-10-12');
  const archived = maintainArchives([{ ...completed, status: 'archived' }], friday)[0];
  expect(restoreArchivedGoal(archived)).toMatchObject({ status: 'active', occurrences: completed.occurrences });
  expect(maintainArchives([archived], '2026-10-22')).toHaveLength(1);
  expect(maintainArchives([archived], '2026-10-23')).toEqual([]);
  expect(deleteArchivedGoal([archived], archived.id)).toEqual([]);
});

test('recurring goals coexist with each other and one sequential goal without freeing or claiming its slot', async () => {
  let stored = JSON.stringify({ version: 1, plans: [sequential()] });
  const repo = createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { stored = value; } }, () => friday);
  await repo.load();
  const first = make(), second = make({ surahs: [67] }, index, 'plan-mulk');
  await Promise.all([repo.update(items => [...items, first]), repo.update(items => [...items, second])]);
  expect(decodePlans(stored)).toHaveLength(3);
  expect(currentGoal(decodePlans(stored)).id).toBe('plan-khatma');
  await expect(repo.update(items => [...items, { ...sequential(), id: 'plan-extra' }])).rejects.toBeInstanceOf(DuplicateGoalError);
  await repo.update(items => items.map(p => p.id === first.id ? { ...p, status: 'archived' } : p));
  await repo.update(items => items.map(p => p.id === first.id ? restoreArchivedGoal(p) : p));
  expect(currentGoal([first, second])).toBeUndefined();
  expect(decodePlans(stored).find(p => p.id === first.id).status).toBe('active');
});

test('reminders follow weekdays, skip completed occurrences and stop on pause/archive', () => {
  const plan = make(), now = new Date('2026-10-09T08:00:00');
  const queue = planReminderQueue([plan], now);
  expect(queue.length).toBeGreaterThan(0);
  expect(queue.every(n => n.date.getDay() === 5 && n.date.getHours() === 20)).toBe(true);
  expect(queue[0].date.getDate()).toBe(9);
  expect(planReminderQueue([complete(plan)], now)[0].date.getDate()).toBe(16);
  for (const status of ['paused', 'archived']) expect(planReminderQueue([{ ...plan, status }], now)).toEqual([]);
  expect(planReminderQueue([{ ...plan, reminder: { ...plan.reminder, enabled: false } }], now)).toEqual([]);
  expect(planReminderQueue([{ ...plan, startDate: '2026-10-20' }], now)[0].date.getDate()).toBe(23);
});

test('invalid recurring data is rejected without accepting skipped ranges or fabricated completion', () => {
  for (const changes of [{ surahs: [] }, { surahs: [999] }, { surahs: [2] }, { weekdays: [] }, { weekdays: [7] }, { reminder: { enabled: true, hour: 25, minute: 0 } }]) expect(() => make(changes)).toThrow();
  const plan = make({ surahs: [1, 67] });
  for (const changes of [
    { ranges: [] }, { status: 'completed' }, { goal: { type: 'recurring', surahs: [67, 1] } },
    { occurrences: [{ date: friday, progress: [{ range: 1, from: 9, to: 12 }] }] },
    { occurrences: [{ date: friday, progress: [{ range: 0, from: 1, to: 3 }] }] },
    { occurrences: [{ date: 'invalid', progress: [] }] },
    { ranges: [{ surah: 1, start: 0, end: 3 }, { surah: 67, start: 2, end: 12 }] },
  ]) expect(() => roundTrip({ ...plan, ...changes })).toThrow();
});
