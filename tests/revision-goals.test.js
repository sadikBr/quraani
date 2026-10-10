import { expect, test } from 'bun:test';
import { buildPlanIndex, nextPortion, recordProgress, setPlanPaused } from '../src/features/plans/engine';
import { createRevisionPlan, finishRevisionDay, remainingPassDays, portionSpans, revisionDay, revisionPassLength, revisionPassProgress, reviseRevisionSettings, undoRevisionProgress, upcomingRevisionDays } from '../src/features/plans/revision';
import { createMemorizationPlan } from '../src/features/plans/memorization';
import { createPlansRepository, decodePlans, mirrorRevision } from '../src/features/plans/repository';
import { createReadingSession, saveReadingSession } from '../src/features/plans/reading-session';
import { goalsOverview } from '../src/features/plans/overview';
import { planReminderQueue } from '../src/features/plans/reminder-schedule';
import { relinkPlans } from '../src/features/plans/relink';
import { restoreArchivedGoal } from '../src/features/plans/archive';
import { addDays } from '../src/features/plans/dates';

const monday = '2026-10-12';
// Quarters of 8, 12, 4, 16, 20, 8, 12 and 8 ayahs (88 in all).
function fixture(id = 4, sizes = [8, 12, 4, 16, 20, 8, 12, 8]) {
  const ayahs = [], quarters = [];
  for (const [q, size] of sizes.entries()) {
    quarters.push(ayahs.length);
    for (let j = 0; j < size; j++) { const i = ayahs.length; ayahs.push({ mushafId: id, surahNumber: Math.floor(i / 8) + 1, ayahNumber: i % 8 + 1, pageNumber: Math.floor(i / 4) + 1, juzNumber: Math.floor(q / 8) + 1, hizbQuarter: q + 1 }); }
  }
  const surahs = [...new Set(ayahs.map(a => a.surahNumber))].map(number => ({ number, name: `سورة ${number}`, ayahs: ayahs.filter(a => a.surahNumber === number) }));
  const pages = [...new Set(ayahs.map(a => a.pageNumber))].map(number => ({ mushafId: id, number, ayahs: ayahs.filter(a => a.pageNumber === number) }));
  const entries = stride => quarters.filter((_, i) => i % stride === 0).map((start, i) => ({ number: i + 1, start: ayahs[start], pageNumber: ayahs[start].pageNumber }));
  return { quran: { id, surahs }, pages, juzIndex: entries(8), hizbIndex: entries(4), quarterHizbIndex: entries(1) };
}
const content = fixture(), index = buildPlanIndex(content);
const everyDay = [0, 1, 2, 3, 4, 5, 6];
const draft = { name: 'مراجعة المحفوظ', riwayah: 'warsh', dailyQuarters: 1, weekdays: everyDay, startDate: monday, memorized: [{ start: 0, end: 20 }], reminder: { enabled: true, hour: 6, minute: 0 } };
const make = (changes = {}, id = 'plan-revision') => createRevisionPlan({ ...draft, ...changes }, index, id);
const roundTrip = plan => decodePlans(JSON.stringify({ version: 1, plans: [plan] }))[0];
const finish = (plan, date) => {
  for (let guard = 0; guard < 10; guard++) {
    const next = nextPortion(plan, date);
    if (!next?.due) return plan;
    const before = plan.log.length;
    plan = recordProgress(plan, { cycle: next.cycle, slot: next.slot, to: next.end }, date);
    if (plan.log.length > before) return plan;
  }
  throw new Error('portion never finished');
};
function storageRepo() {
  let raw = null, today = monday;
  const storage = { getItem: async () => raw, setItem: async (_, value) => { raw = value; } };
  return { repo: createPlansRepository(storage, () => today), day: value => { today = value; } };
}

test('a day is measured in real quarters and ends on the nearest whole ayah', () => {
  const plan = make();
  expect(portionSpans(plan)).toEqual([{ start: 0, end: 8 }]);
  expect(nextPortion(plan, monday)).toMatchObject({ start: 0, end: 8, slot: 0, cycle: 1, date: monday, due: true });
  const day2 = finish(plan, monday);
  expect(day2.log).toEqual([{ date: monday, from: 0, to: 8, pass: 1 }]);
  expect(nextPortion(day2, monday)).toMatchObject({ due: false, date: '2026-10-13', start: 8, end: 20 });
  // Half a quarter of 12 ayahs is 6 ayahs; a quarter and a half from 0 is 8 + 6.
  expect(portionSpans(make({ dailyQuarters: 2, memorized: [{ start: 0, end: 88 }] }))).toEqual([{ start: 0, end: 20 }]);
  expect(revisionPassLength(plan)).toBe(2);
  expect(revisionPassLength(make({ memorized: [{ start: 0, end: 88 }] }))).toBe(8);
});

test('after the last memorized ayah a new pass starts from the first one', () => {
  let plan = finish(make(), monday);
  plan = finish(plan, '2026-10-13');
  expect(plan.log.map(l => [l.from, l.to, l.pass])).toEqual([[0, 8, 1], [8, 20, 1]]);
  expect(plan.pass).toBe(2);
  expect(nextPortion(plan, '2026-10-14')).toMatchObject({ start: 0, end: 8, due: true });
  expect(revisionPassProgress(plan)).toBe(0);
  expect(roundTrip(plan)).toEqual(JSON.parse(JSON.stringify(plan)));
});

test('a tiny tail joins the last day and a large amount is capped at all memorized', () => {
  expect(portionSpans(make({ memorized: [{ start: 0, end: 9 }] }))).toEqual([{ start: 0, end: 9 }]);
  expect(portionSpans(make({ memorized: [{ start: 0, end: 22 }] }))).toEqual([{ start: 0, end: 8 }]);
  expect(upcomingRevisionDays(make({ memorized: [{ start: 0, end: 22 }] }), monday, 4).map(d => [d.date, d.spans])).toEqual([
    [monday, [{ start: 0, end: 8 }]], ['2026-10-13', [{ start: 8, end: 20 }]], ['2026-10-14', [{ start: 20, end: 22 }]], ['2026-10-15', [{ start: 0, end: 8 }]],
  ]);
  const all = make({ dailyQuarters: 8 });
  expect(portionSpans(all)).toEqual([{ start: 0, end: 20 }]);
  expect(nextPortion(finish(all, monday), '2026-10-13')).toMatchObject({ start: 0, end: 20, due: true });
});

test('separate memorized passages form one day of several parts, read part by part', () => {
  // 4 ayahs of an 8-ayah quarter, then 10 ayahs of a 16-ayah quarter.
  const plan = make({ memorized: [{ start: 0, end: 4 }, { start: 30, end: 40 }] });
  expect(portionSpans(plan)).toEqual([{ start: 0, end: 4 }, { start: 30, end: 40 }]);
  expect(nextPortion(plan, monday)).toMatchObject({ start: 0, end: 4, slot: 0 });
  const session = createReadingSession(plan, content, '1', '0', monday);
  expect(session).toMatchObject({ revision: true, remainingSurahs: 1 });
  const half = saveReadingSession(plan, session, 4, monday);
  expect(half.log).toEqual([]);
  expect(nextPortion(half, monday)).toMatchObject({ start: 30, end: 40, slot: 1, cycle: 2, due: true });
  // A stale receipt for the first part cannot complete the second one.
  expect(recordProgress(half, { cycle: 1, slot: 0, to: 4 }, monday)).toBe(half);
  expect(() => saveReadingSession(half, session, 4, monday)).toThrow();
  const done = recordProgress(half, { cycle: 2, slot: 1, to: 40 }, monday);
  expect(done.log).toEqual([{ date: monday, from: 0, to: 40, pass: 1 }]);
});

test('partial progress resumes the same day, and missed days never pile up', () => {
  let plan = make({ weekdays: [1, 3] });
  plan = recordProgress(plan, { cycle: 1, slot: 0, to: 5 }, monday);
  expect(nextPortion(plan, monday)).toMatchObject({ start: 5, end: 8, due: true });
  expect(nextPortion(plan, '2026-10-13')).toMatchObject({ start: 5, date: '2026-10-14', due: false });
  // Wednesday skipped: the same portion waits for the next revision day only.
  expect(nextPortion(plan, '2026-10-15')).toMatchObject({ start: 5, end: 8, date: '2026-10-19', due: false });
  expect(nextPortion(plan, '2026-10-19')).toMatchObject({ start: 5, end: 8, due: true });
  expect(nextPortion(make({ startDate: '2026-10-20' }), monday)).toMatchObject({ date: '2026-10-20', due: false });
});

test('progress can be undone on the same day only', () => {
  const plan = make(), done = finish(plan, monday);
  const undone = undoRevisionProgress(done, monday);
  expect(undone).toMatchObject({ portionStart: 0, cursor: 0, pass: 1, availableDate: monday, log: [] });
  expect(undone.revision).toBeGreaterThan(done.revision);
  expect(undoRevisionProgress(undone, monday)).toBe(undone);
  expect(undoRevisionProgress(done, '2026-10-13')).toBe(done);
  // A pass that wrapped is unwrapped too.
  const wrapped = finish(finish(plan, monday), '2026-10-13');
  expect(undoRevisionProgress(wrapped, '2026-10-13')).toMatchObject({ pass: 1, portionStart: 8, cursor: 8 });
});

test('newly memorized ayahs join in mushaf order; removed ones leave the cycle', () => {
  let plan = finish(make(), monday); // next: 8..20
  plan = mirrorRevision([plan], [{ riwayah: 'warsh', corpus: index.corpus, totalAyahs: 88, ranges: [{ start: 0, end: 24 }, { start: 40, end: 60 }] }])[0];
  expect(plan.memorized).toEqual([{ start: 0, end: 24 }, { start: 40, end: 60 }]);
  expect(nextPortion(plan, '2026-10-13')).toMatchObject({ start: 8, end: 20 });
  expect(upcomingRevisionDays(plan, '2026-10-13', 3).map(d => d.spans)).toEqual([[{ start: 8, end: 20 }], [{ start: 20, end: 24 }], [{ start: 40, end: 60 }]]);
  // Earlier ayahs added mid-pass wait for the next pass; the current place is kept.
  const shrunk = mirrorRevision([plan], [{ riwayah: 'warsh', corpus: index.corpus, totalAyahs: 88, ranges: [{ start: 0, end: 8 }, { start: 40, end: 60 }] }])[0];
  expect(nextPortion(shrunk, '2026-10-13')).toMatchObject({ start: 40, end: 60 });
  const empty = mirrorRevision([plan], [{ riwayah: 'warsh', corpus: index.corpus, totalAyahs: 88, ranges: [] }])[0];
  expect(nextPortion(empty, '2026-10-13')).toBeNull();
  expect(roundTrip(empty)).toEqual(JSON.parse(JSON.stringify(empty)));
});

test('the repository keeps revision and memorization on one record', async () => {
  const t = storageRepo(); await t.repo.load();
  await t.repo.update(() => [make()]);
  expect(t.repo.memorization()[0].ranges).toEqual([{ start: 0, end: 20 }]);
  // Editing what is memorized from the revision goal updates the record.
  await t.repo.update(items => items.map(p => ({ ...p, memorized: [{ start: 0, end: 24 }] })));
  expect(t.repo.memorization()[0].ranges).toEqual([{ start: 0, end: 24 }]);
  // A memorization goal now owns the record; its progress flows into revision.
  const memo = createMemorizationPlan({ name: 'حفظي', riwayah: 'warsh', weeklyQuarters: 1, weekdays: [1], startDate: monday, memorized: [{ start: 0, end: 24 }], initialRecord: [{ start: 0, end: 24 }], reminder: draft.reminder }, index, 'plan-memory');
  await t.repo.update(items => [...items, memo]);
  const plans = await t.repo.update(items => items.map(p => {
    if (p.id !== 'plan-memory') return p;
    const next = nextPortion(p, monday);
    return recordProgress(p, { cycle: next.cycle, slot: next.slot, to: next.end }, monday);
  }));
  const grown = t.repo.memorization()[0].ranges;
  expect(grown[0].end).toBeGreaterThan(24);
  expect(plans.find(p => p.id === 'plan-revision').memorized).toEqual(grown);
  await expect(t.repo.update(items => items.map(p => p.id === 'plan-revision' ? { ...p, memorized: [{ start: 0, end: 4 }] } : p))).rejects.toThrow('هدف الحفظ');
  await expect(t.repo.update(items => [...items, make({}, 'plan-second')])).rejects.toThrow('هدف مراجعة');
  // An archived revision goal stays in sync and comes back with the current record.
  await t.repo.update(items => items.map(p => p.id === 'plan-revision' ? { ...p, status: 'archived' } : p));
  const restored = await t.repo.update(items => items.map(p => p.id === 'plan-revision' ? restoreArchivedGoal(p) : p));
  expect(restored.find(p => p.id === 'plan-revision')).toMatchObject({ status: 'active', memorized: grown });
});

test('settings keep the place, pause holds the day, and the overview and reminders follow', () => {
  const half = recordProgress(make(), { cycle: 1, slot: 0, to: 4 }, monday);
  const bigger = reviseRevisionSettings(half, { dailyQuarters: 2, weekdays: [1, 3] }, monday);
  expect(nextPortion(bigger, monday)).toMatchObject({ start: 4, end: 20, due: true });
  expect(() => reviseRevisionSettings(half, { dailyQuarters: 0, weekdays: [1] }, monday)).toThrow();
  expect(() => reviseRevisionSettings(half, { dailyQuarters: 1, weekdays: [] }, monday)).toThrow();
  const paused = setPlanPaused(make(), true, monday);
  expect(nextPortion(paused, monday)).toBeNull();
  expect(nextPortion(setPlanPaused(paused, false, '2026-10-20'), '2026-10-20')).toMatchObject({ start: 0, due: true });
  const done = finish(make(), monday);
  expect(goalsOverview([done], monday).completedToday).toBe(1);
  expect(goalsOverview([make()], monday).due.length).toBe(1);
  const reminders = planReminderQueue([done], new Date(`${monday}T05:00:00`));
  expect(reminders[0].date.getDate()).toBe(13);
  expect(reminders.length).toBe(29);
  expect(planReminderQueue([make({ weekdays: [5] })], new Date(`${monday}T05:00:00`)).every(r => r.date.getDay() === 5)).toBe(true);
  expect(revisionDay(make(), monday).pass).toBe(1);
});

test('creation and stored data are validated', () => {
  expect(() => make({ memorized: [] })).toThrow('حدد ما تحفظه');
  expect(() => make({ dailyQuarters: 0 })).toThrow();
  expect(() => make({ weekdays: [] })).toThrow();
  expect(() => make({ riwayah: 'hafs' })).toThrow();
  const plan = make();
  expect(roundTrip(plan)).toEqual(plan);
  for (const broken of [{ portionStart: -1 }, { quarters: [0, 8] }, { pass: 0 }, { log: [{ date: monday, from: 4, to: 2, pass: 1 }] }, { goal: { type: 'revision', dailyQuarters: 1.5 } }, { status: 'completed' }]) {
    expect(() => roundTrip({ ...plan, ...broken })).toThrow();
  }
  // Corrected quarter boundaries are taken on relink.
  const corrected = { ...index, corpus: 'other', quarters: [0, 10, 20, 30, 40, 50, 60, 70, 88] };
  expect(relinkPlans([plan], corrected)[0]).toMatchObject({ corpus: 'other', quarters: corrected.quarters, revision: 2 });
  expect(addDays(monday, 1)).toBe('2026-10-13');
});

test('finishing the day records every remaining part, and one undo restores it', () => {
  const plan = recordProgress(make({ memorized: [{ start: 0, end: 4 }, { start: 30, end: 40 }] }), { cycle: 1, slot: 0, to: 2 }, monday);
  const done = finishRevisionDay(plan, monday);
  expect(done.log).toEqual([{ date: monday, from: 0, to: 40, pass: 1 }]);
  expect(finishRevisionDay(done, monday)).toBe(done);
  expect(undoRevisionProgress(done, monday)).toMatchObject({ cursor: 2, portionStart: 0, log: [] });
  expect(finishRevisionDay(make({ startDate: '2026-10-13' }), monday).log).toEqual([]);
});

test('changing only the days keeps today\'s portion; a smaller amount than already read closes the day', () => {
  const half = recordProgress(make({ memorized: [{ start: 0, end: 40 }] }), { cycle: 1, slot: 0, to: 5 }, monday);
  const days = reviseRevisionSettings(half, { dailyQuarters: 1, weekdays: [1, 3] }, monday);
  expect(nextPortion(days, monday)).toMatchObject({ start: 5, end: 8, due: true });
  const read = recordProgress(make({ dailyQuarters: 2, memorized: [{ start: 0, end: 40 }] }), { cycle: 1, slot: 0, to: 12 }, monday);
  const smaller = reviseRevisionSettings(read, { dailyQuarters: 1, weekdays: everyDay }, monday);
  expect(smaller.log).toEqual([{ date: monday, from: 0, to: 12, pass: 1 }]);
  expect(nextPortion(smaller, monday)).toMatchObject({ start: 12, due: false, date: '2026-10-13' });
  expect(roundTrip(smaller)).toEqual(JSON.parse(JSON.stringify(smaller)));
});

test('an empty goal is allowed only beside a memorization goal, and large records stay fast', () => {
  const empty = createRevisionPlan({ ...draft, memorized: [] }, index, 'plan-empty', { allowEmpty: true });
  expect(nextPortion(empty, monday)).toBeNull();
  expect(roundTrip(empty)).toEqual(empty);
  const big = buildPlanIndex(fixture(4, Array.from({ length: 240 }, (_, i) => 20 + (i % 7) * 3)));
  const plan = createRevisionPlan({ ...draft, memorized: [{ start: 0, end: big.ayahs.length }] }, big, 'plan-big');
  const started = performance.now();
  expect(revisionPassLength(plan)).toBe(240);
  expect(performance.now() - started).toBeLessThan(400);
  expect(upcomingRevisionDays(plan, monday, 3).map(d => d.spans)).toEqual([[{ start: big.quarters[0], end: big.quarters[1] }], [{ start: big.quarters[1], end: big.quarters[2] }], [{ start: big.quarters[2], end: big.quarters[3] }]]);
});

test('the schedule lists the rest of the current pass, the current portion first', () => {
  const plan = finish(make({ memorized: [{ start: 0, end: 88 }] }), monday);
  const days = remainingPassDays(plan, monday);
  expect(days.map(d => d.date)).toEqual(['2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19']);
  expect(days[0].spans).toEqual([{ start: 8, end: 20 }]);
  expect(days.at(-1).spans.at(-1).end).toBe(88);
  expect(remainingPassDays(createRevisionPlan({ ...draft, memorized: [] }, index, 'plan-empty', { allowEmpty: true }), monday)).toEqual([]);
});
