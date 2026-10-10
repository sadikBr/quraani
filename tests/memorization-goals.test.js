import { expect, test } from 'bun:test';
import { buildPlanIndex, createPlan, nextPortion, recordProgress, setPlanPaused } from '../src/features/plans/engine';
import { buildMemorizationSchedule, createMemorizationPlan, memoryFor, mergeSpans, subtractSpans, quarterAmount, spanCount, reviseMemorization, undoMemorizationProgress, memorizationSchedule } from '../src/features/plans/memorization';
import { createPlansRepository, decodePlans, decodeMemorization } from '../src/features/plans/repository';
import { createReadingSession, saveReadingSession } from '../src/features/plans/reading-session';
import { deleteArchivedGoal, restoreArchivedGoal } from '../src/features/plans/archive';
import { goalsOverview } from '../src/features/plans/overview';
import { planReminderQueue } from '../src/features/plans/reminder-schedule';
import { calendarWeekday } from '../src/features/plans/recurring';
import { addDays } from '../src/features/plans/dates';

const monday = '2026-10-12';
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
const draft = { name: 'رحلتي مع الحفظ', riwayah: 'warsh', weeklyQuarters: 1, weekdays: [1, 3], startDate: monday, memorized: [], reminder: { enabled: true, hour: 18, minute: 0 } };
const make = (changes = {}, i = index, id = 'plan-memory') => createMemorizationPlan({ ...draft, ...changes }, i, id);
const complete = (p, date = monday) => { const next = nextPortion(p, date); return recordProgress(p, { cycle: next.cycle, slot: next.slot, to: next.end }, date); };
const open = (p, date = monday, source = content) => { const next = nextPortion(p, date); return createReadingSession(p, source, String(next.cycle), String(next.slot), date); };
function storageRepo() {
  let raw = null, fail = false, today = monday;
  const storage = { getItem: async () => raw, setItem: async (_, value) => { if (fail) throw new Error('disk'); raw = value; } };
  return { repo: createPlansRepository(storage, () => today), storage, raw: () => raw, fail: value => { fail = value; }, day: value => { today = value; } };
}

test('one real quarter per week is split over Monday and Wednesday, with exact cumulative boundaries', () => {
  const plan = make();
  expect(plan.sessions.slice(0, 4)).toEqual([
    { date: monday, ranges: [{ start: 0, end: 4 }] }, { date: '2026-10-14', ranges: [{ start: 4, end: 8 }] },
    { date: '2026-10-19', ranges: [{ start: 8, end: 14 }] }, { date: '2026-10-21', ranges: [{ start: 14, end: 20 }] },
  ]);
  expect(plan.sessions.every(s => [1, 3].includes(calendarWeekday(s.date)))).toBe(true);
  expect(spanCount(plan.sessions.flatMap(s => s.ranges))).toBe(index.ayahs.length);
  expect(JSON.parse(JSON.stringify(plan))).toEqual(decodePlans(JSON.stringify({ version: 1, plans: [plan] }))[0]);
});

test('overlapping selections are merged; excluded ayahs do not consume the weekly quota', () => {
  const known = mergeSpans([{ start: 0, end: 3 }, { start: 2, end: 5 }, { start: 7, end: 10 }]);
  expect(known).toEqual([{ start: 0, end: 5 }, { start: 7, end: 10 }]);
  const plan = make({ memorized: known });
  expect(plan.sessions[0].ranges).toEqual([{ start: 5, end: 7 }, { start: 10, end: 13 }]);
  expect(quarterAmount(index, plan.sessions[0].ranges)).toBeCloseTo(0.5);
  expect(subtractSpans(plan.sessions.flatMap(s => s.ranges), known)).toEqual(mergeSpans(plan.sessions.flatMap(s => s.ranges)));
  expect(spanCount(known) + spanCount(plan.sessions.flatMap(s => s.ranges))).toBe(index.ayahs.length);
});

test('seven selected days and very short quarters do not force excess work or truncate ayahs', () => {
  const tiny = buildPlanIndex(fixture(4, [2, 2, 2, 2]));
  const plan = make({ weekdays: [0, 1, 2, 3, 4, 5, 6] }, tiny);
  for (let week = 0; week < 4; week++) {
    const sessions = plan.sessions.filter(s => s.date >= addDays(monday, week * 7) && s.date < addDays(monday, (week + 1) * 7));
    expect(quarterAmount(tiny, sessions.flatMap(s => s.ranges))).toBeCloseTo(1);
  }
  expect(memorizationSchedule(plan, monday)).toEqual(plan.sessions);
});

test('every remaining ayah is scheduled exactly once for full-sized editions and all weekday counts', () => {
  for (const [id, length] of [[4, 6214], [2, 6236]]) {
    const sizes = Array.from({ length: 240 }, (_, i) => Math.floor((i + 1) * length / 240) - Math.floor(i * length / 240));
    const i = buildPlanIndex(fixture(id, sizes)), known = [{ start: 0, end: 7 }, { start: 312, end: 401 }, { start: length - 9, end: length }];
    for (let count = 1; count <= 7; count++) {
      const sessions = buildMemorizationSchedule(i, known, 1, Array.from({ length: count }, (_, n) => n), monday);
      expect(mergeSpans(sessions.flatMap(s => s.ranges))).toEqual(subtractSpans([{ start: 0, end: length }], known));
      expect(spanCount(sessions.flatMap(s => s.ranges))).toBe(length - spanCount(known));
      expect(sessions.every(s => s.ranges.length && s.ranges.every(r => Number.isInteger(r.start) && Number.isInteger(r.end)))).toBe(true);
    }
  }
});

test('nonadjacent passages open independently and confirmations grow memory, not just reading progress', () => {
  let plan = make({ memorized: [{ start: 2, end: 4 }] });
  const session = open(plan);
  expect(session.memorization).toBe(true);
  expect(session.content.quran.surahs.flatMap(s => s.ayahs)).toEqual(index.ayahs.slice(0, 2));
  expect(plan.memorized).toEqual([{ start: 2, end: 4 }]);
  plan = saveReadingSession(plan, session, 2, monday);
  expect(plan.memorized).toEqual([{ start: 0, end: 4 }]);
  expect(nextPortion(plan, monday)).toMatchObject({ start: 4, end: 6, due: true });
  expect(goalsOverview([plan], monday).completedToday).toBe(0);
  plan = complete(plan);
  expect(goalsOverview([plan], monday).completedToday).toBe(1);
  expect(nextPortion(plan, monday)).toMatchObject({ date: '2026-10-14', due: false });
  expect(() => saveReadingSession(plan, session, 2, monday)).toThrow();
});

test('partial completion, stale receipts, edition mismatch and off-day saves are safe', () => {
  const plan = make(), session = open(plan);
  const partial = saveReadingSession(plan, session, 2, monday);
  expect(nextPortion(partial, monday)).toMatchObject({ start: 2, end: 4 });
  expect(() => saveReadingSession(partial, session, 4, monday)).toThrow();
  expect(() => saveReadingSession(plan, session, 4, '2026-10-13')).toThrow();
  expect(() => open(plan, monday, fixture(2))).toThrow();
  expect(recordProgress(plan, { cycle: 1, slot: 0, to: 9000 }, monday)).toBe(plan);
  expect(() => saveReadingSession(reviseMemorization(plan, index, [], monday), session, 4, monday)).toThrow();
});

test('missed sessions carry forward one assignment at a time on selected weekdays', () => {
  const plan = make();
  expect(nextPortion(plan, '2026-10-13')).toMatchObject({ start: 0, date: '2026-10-14', due: false });
  const late = complete(plan, '2026-10-21');
  expect(late.memorized).toEqual([{ start: 0, end: 4 }]);
  expect(nextPortion(late, '2026-10-21')).toMatchObject({ start: 4, date: '2026-10-26', due: false });
  const resumed = setPlanPaused(setPlanPaused(plan, true, monday), false, '2026-11-01');
  expect(nextPortion(resumed, '2026-11-01')).toMatchObject({ start: 0, date: '2026-11-02' });
});

test('undo removes only the last new passage; explicit corrections rebuild remaining work', () => {
  const known = [{ start: 0, end: 2 }], plan = make({ memorized: known });
  const saved = complete(plan), undone = undoMemorizationProgress(saved, index, monday);
  expect(undone.memorized).toEqual(known);
  expect(undone.progress).toEqual([]);
  expect(nextPortion(undone, monday).start).toBe(2);
  const edited = reviseMemorization(saved, index, [{ start: 0, end: 20 }], monday, { weeklyQuarters: 2, weekdays: [5] });
  expect(edited.undoable).toBe(false);
  expect(nextPortion(edited, monday)).toMatchObject({ start: 20, date: '2026-10-16' });
  expect(undoMemorizationProgress(edited, index, monday)).toBe(edited);
});

test('full Quran completion produces no further sessions or reminders and can be corrected', () => {
  const last = index.ayahs.length - 1;
  const plan = make({ memorized: [{ start: 0, end: last }] });
  const saved = complete(plan);
  expect(saved.status).toBe('completed');
  expect(saved.memorized).toEqual([{ start: 0, end: last + 1 }]);
  expect(nextPortion(saved, monday)).toBeNull();
  expect(planReminderQueue([saved], new Date(`${monday}T08:00:00`))).toEqual([]);
  expect(undoMemorizationProgress(saved, index, monday).status).toBe('active');
  expect(make({ memorized: [{ start: 0, end: last + 1 }] }).status).toBe('completed');
});

test('durable memorized record survives archive, deletion and reload, independently of goals', async () => {
  const t = storageRepo(); await t.repo.load();
  await t.repo.update(() => [make()]);
  await t.repo.update(items => items.map(p => complete(p)));
  expect(t.repo.memorization()[0].ranges).toEqual([{ start: 0, end: 4 }]);
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  await t.repo.update(items => deleteArchivedGoal(items, 'plan-memory'));
  expect(decodePlans(t.raw())).toEqual([]);
  const reloaded = createPlansRepository(t.storage, () => monday); await reloaded.load();
  const memory = memoryFor(reloaded.memorization(), 'warsh', index);
  expect(memory).toEqual([{ start: 0, end: 4 }]);
  const next = make({ memorized: memory, initialRecord: memory }, index, 'plan-next');
  await reloaded.update(() => [next]);
  expect(nextPortion(next, monday).start).toBe(4);
});

test('automatic archive expiry preserves memory and failed writes publish neither goal nor memory', async () => {
  const t = storageRepo(); await t.repo.load(); await t.repo.update(() => [make()]);
  t.fail(true);
  await expect(t.repo.update(items => items.map(p => complete(p)))).rejects.toThrow('disk');
  expect(t.repo.memorization()[0].ranges).toEqual([]);
  expect(decodePlans(t.raw())[0].progress).toEqual([]);
  t.fail(false); await t.repo.update(items => items.map(p => complete(p)));
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  t.day('2026-10-26'); expect(await t.repo.load()).toEqual([]);
  expect(decodeMemorization(t.raw())[0].ranges).toEqual([{ start: 0, end: 4 }]);
});

test('storage serializes duplicate taps and creation; a reading goal can coexist with one memorization goal', async () => {
  const t = storageRepo(); await t.repo.load();
  const reading = createPlan({ name: 'ختمة', riwayah: 'warsh', goal: { type: 'khatma', weeks: 1 }, unit: 'pages', startDate: monday, start: { kind: 'page', number: 1 }, repeat: false, reminder: draft.reminder }, index, 'plan-reading');
  await t.repo.update(() => [reading, make()]);
  await expect(t.repo.update(items => [...items, make({}, index, 'plan-another')])).rejects.toThrow('هدف حفظ');
  const session = open(make());
  const results = await Promise.allSettled([1, 2].map(() => t.repo.update(items => items.map(p => p.id === session.id ? saveReadingSession(p, session, 4, monday) : p))));
  expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  expect(t.repo.memorization()[0].ranges).toEqual([{ start: 0, end: 4 }]);
  expect(decodePlans(t.raw()).find(p => p.id === reading.id)).toEqual(reading);
});

test('manual changes and undo persist atomically, and stale initial snapshots cannot erase memory', async () => {
  const t = storageRepo(); await t.repo.load(); await t.repo.update(() => [make()]);
  await t.repo.update(items => items.map(p => complete(p)));
  await t.repo.update(items => items.map(p => undoMemorizationProgress(p, index, monday)));
  expect(t.repo.memorization()[0].ranges).toEqual([]);
  await t.repo.update(items => items.map(p => reviseMemorization(p, index, [{ start: 0, end: 20 }], monday)));
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  await expect(t.repo.update(items => [...items, make({}, index, 'plan-stale')])).rejects.toThrow('تغيّر سجلّ محفوظك');
  await t.repo.update(items => [...items, make({ initialRecord: [{ start: 0, end: 20 }], memorized: [{ start: 0, end: 8 }] }, index, 'plan-corrected')]);
  expect(t.repo.memorization()[0].ranges).toEqual([{ start: 0, end: 8 }]);
  await expect(t.repo.update(items => items.map(p => p.id === 'plan-memory' ? restoreArchivedGoal(p) : p))).rejects.toThrow();
});

test('Warsh and Hafs records are distinct and a changed corpus is rejected', async () => {
  const t = storageRepo(); await t.repo.load(); await t.repo.update(() => [make({ memorized: [{ start: 0, end: 8 }] })]);
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  const hafs = buildPlanIndex(fixture(2));
  await t.repo.update(items => [...items, make({ riwayah: 'hafs' }, hafs, 'plan-hafs')]);
  expect(memoryFor(t.repo.memorization(), 'hafs', hafs)).toEqual([]);
  expect(memoryFor(t.repo.memorization(), 'warsh', index)).toEqual([{ start: 0, end: 8 }]);
  expect(() => memoryFor(t.repo.memorization(), 'warsh', { ...index, corpus: 'other' })).toThrow();
});

test('reminders follow actual remaining sessions and omit completed days', () => {
  const now = new Date(`${monday}T08:00:00`), plan = make();
  expect(planReminderQueue([plan], now).every(n => [1, 3].includes(n.date.getDay()))).toBe(true);
  expect(planReminderQueue([complete(plan)], now)[0].date.getDate()).toBe(14);
  expect(planReminderQueue([{ ...plan, status: 'paused' }], now)).toEqual([]);
});

test('invalid quota, days, ranges and corrupt schedules are rejected', () => {
  for (const changes of [{ weeklyQuarters: 0 }, { weeklyQuarters: 0.25 }, { weeklyQuarters: 241 }, { weekdays: [] }, { weekdays: [8] }, { weekdays: [1, 1] }, { memorized: [{ start: -1, end: 2 }] }, { startDate: 'wrong' }]) expect(() => make(changes)).toThrow();
  for (const changes of [{ sessions: [] }, { status: 'completed' }, { memorized: [{ start: 0, end: 10000 }] }, { undoable: true }, { revision: 0 }]) expect(() => decodePlans(JSON.stringify({ version: 1, plans: [{ ...make(), ...changes }] }))).toThrow();
  expect(() => decodeMemorization(JSON.stringify({ memorization: [{ riwayah: 'warsh', corpus: 'x', totalAyahs: 10, ranges: [{ start: 5, end: 4 }] }] }))).toThrow();
});

test('undo restores a split day exactly without assigning an extra daily quota', () => {
  const plan = make({ memorized: [{ start: 2, end: 4 }] });
  const first = complete(plan), second = complete(first);
  const undone = undoMemorizationProgress(second, index, monday);
  expect(undone.sessions).toEqual(first.sessions);
  expect(undone.memorized).toEqual(first.memorized);
  expect(undone.progress).toEqual(first.progress);
});

test('restoring an old archived goal must rebase to the lifelong record', async () => {
  const t = storageRepo(); await t.repo.load();
  await t.repo.update(() => [make()]);
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  await t.repo.update(items => [...items, make({ memorized: [{ start: 0, end: 20 }] }, index, 'plan-later')]);
  await t.repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  await expect(t.repo.update(items => items.map(p => p.id === 'plan-memory' ? restoreArchivedGoal(p) : p))).rejects.toThrow('تغيّر سجل');
  const saved = await t.repo.update(items => items.map(p => p.id === 'plan-memory' ? restoreArchivedGoal(reviseMemorization(p, index, t.repo.memorization()[0].ranges, monday)) : p));
  expect(nextPortion(saved[0], monday).start).toBe(20);
});
