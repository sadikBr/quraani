import { expect, test } from 'bun:test';
import { buildPlanIndex, createPlan, nextPortion, recordProgress, rollCompletedCycle, setPlanPaused, assertPlanIndex } from '../src/features/plans/engine';
import { createPlansRepository } from '../src/features/plans/repository';
import { restoreArchivedGoal } from '../src/features/plans/archive';
import { createMemorizationPlan, memorizationReplanDate, memoryFor } from '../src/features/plans/memorization';
import { createRecurringPlan } from '../src/features/plans/recurring';
import { canRelink, needsRelink } from '../src/features/plans/relink';

function corpus(id, length, shift = 0) {
  const ayahs = Array.from({ length }, (_, i) => ({ mushafId: id, surahNumber: i < 7 ? 1 : 2 + Math.floor((i - 7) / 100), ayahNumber: i < 7 ? i + 1 : (i - 7) % 100 + 1,
    pageNumber: Math.min(604, Math.floor((i + shift) * 604 / length) + 1), juzNumber: Math.floor(i * 30 / length) + 1, hizbQuarter: Math.floor(i * 240 / length) + 1 }));
  const surahs = [...new Set(ayahs.map(a => a.surahNumber))].map(number => ({ number, name: `سورة ${number}`, ayahs: ayahs.filter(a => a.surahNumber === number) }));
  const boundaries = key => ayahs.filter((a, i) => !i || key(a) !== key(ayahs[i - 1]));
  const entries = key => boundaries(key).map(a => ({ number: key(a), start: a, pageNumber: a.pageNumber }));
  return buildPlanIndex({ quran: { id, surahs }, pages: boundaries(a => a.pageNumber).map(a => ({ number: a.pageNumber, ayahs: [a] })),
    juzIndex: entries(a => a.juzNumber), hizbIndex: entries(a => Math.ceil(a.hizbQuarter / 4)), quarterHizbIndex: entries(a => a.hizbQuarter) });
}
const warsh = corpus(4, 6214), corrected = corpus(4, 6214, 3);
const draft = { name: 'ختمتي', riwayah: 'warsh', goal: { type: 'khatma', weeks: 1 }, unit: 'pages', start: { kind: 'page', number: 1 }, startDate: '2026-10-01', repeat: true, reminder: { enabled: false, hour: 20, minute: 0 } };
function repository(plans = [], memorization = []) {
  let stored = JSON.stringify({ version: 1, plans, memorization });
  return { repo: createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { stored = value; } }, () => '2026-10-20'), raw: () => JSON.parse(stored) };
}

test('a repeating khatma reopened late starts its next cycle today, not overdue', () => {
  let plan = createPlan(draft, warsh, 'plan-k');
  for (let slot = 0; slot < plan.cycle.sessions.length; slot++) plan = recordProgress(plan, { cycle: 1, slot, to: plan.cycle.sessions[slot].end }, '2026-10-07');
  expect(plan.cycle.completedOn).toBe('2026-10-07');
  const next = rollCompletedCycle(plan, warsh, '2026-10-20');
  expect(next.cycle.sessions[0].date).toBe('2026-10-20');
  expect(nextPortion(next, '2026-10-20').date).toBe('2026-10-20');
  // The normal next-day roll is unchanged.
  expect(rollCompletedCycle(plan, warsh, '2026-10-08').cycle.sessions[0].date).toBe('2026-10-08');
});

test('a goal archived while paused is restored paused, and resuming shifts its dates', () => {
  const plan = createPlan({ ...draft, repeat: false }, warsh, 'plan-p');
  const paused = setPlanPaused(plan, true, '2026-10-02');
  const restored = restoreArchivedGoal({ ...paused, status: 'archived', archivedOn: '2026-10-03' });
  expect(restored.status).toBe('paused'); expect(restored.pausedOn).toBe('2026-10-02'); expect(restored.archivedOn).toBeUndefined();
  const resumed = setPlanPaused(restored, false, '2026-10-12');
  expect(nextPortion(resumed, '2026-10-12').date).toBe('2026-10-11');
  expect(restoreArchivedGoal({ ...plan, status: 'archived' }).status).toBe('active');
});

test('memorization re-plans from tomorrow when today already finished a session', () => {
  const plan = createMemorizationPlan({ name: 'حفظ', riwayah: 'warsh', weeklyQuarters: 2, weekdays: [0, 1, 2, 3, 4, 5, 6], startDate: '2026-10-10', memorized: [], reminder: { enabled: false, hour: 18, minute: 0 } }, warsh, 'plan-m');
  expect(memorizationReplanDate(plan, '2026-10-10')).toBe('2026-10-10');
  expect(memorizationReplanDate({ ...plan, progress: [{ date: '2026-10-10', from: 0, to: 3, finished: true }] }, '2026-10-10')).toBe('2026-10-11');
});

test('goals and the memorization record re-link to a corrected edition instead of locking', async () => {
  expect(warsh.corpus).not.toBe(corrected.corpus);
  const khatma = createPlan(draft, warsh, 'plan-k');
  const memory = createMemorizationPlan({ name: 'حفظ', riwayah: 'warsh', weeklyQuarters: 2, weekdays: [1, 3], startDate: '2026-10-20', memorized: [{ start: 0, end: 7 }], initialRecord: [], reminder: { enabled: false, hour: 18, minute: 0 } }, warsh, 'plan-m');
  const recurring = createRecurringPlan({ name: 'الكهف', riwayah: 'warsh', surahs: [2], weekdays: [5], startDate: '2026-10-20', reminder: { enabled: false, hour: 9, minute: 0 } }, warsh, 'plan-r');
  const { repo } = repository();
  await repo.load();
  await repo.update(items => [...items, khatma, memory, recurring]);
  expect(() => assertPlanIndex(khatma, corrected)).toThrow();
  expect(() => memoryFor(repo.memorization(), 'warsh', corrected)).toThrow();
  expect(needsRelink(await repo.load(), repo.memorization(), 'warsh', corrected)).toBe(true);
  const plans = await repo.relink(corrected);
  for (const plan of plans) expect(() => assertPlanIndex(plan, corrected)).not.toThrow();
  expect(memoryFor(repo.memorization(), 'warsh', corrected)).toEqual([{ start: 0, end: 7 }]);
  expect(needsRelink(plans, repo.memorization(), 'warsh', corrected)).toBe(false);
  // A different ayah count is a different edition: never re-linked.
  expect(canRelink(khatma, corpus(4, 6236))).toBe(false);
});

test('pausing and archiving a memorization goal does not need the mushaf index', async () => {
  const memory = createMemorizationPlan({ name: 'حفظ', riwayah: 'warsh', weeklyQuarters: 2, weekdays: [1, 3], startDate: '2026-10-20', memorized: [], reminder: { enabled: false, hour: 18, minute: 0 } }, warsh, 'plan-m');
  const { repo } = repository();
  await repo.load(); await repo.update(items => [...items, memory]);
  const paused = await repo.update(items => items.map(p => setPlanPaused(p, true, '2026-10-20')));
  expect(paused[0].status).toBe('paused');
  const archived = await repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  expect(archived[0].status).toBe('archived');
});

test('regression: memorized ranges picked from list rows (with label/number) save without "تغيّر سجل محفوظك"', async () => {
  const rows = [{ number: 1, label: 'سورة 1', start: 0, end: 7 }, { number: 3, label: 'سورة 3', start: 107, end: 207 }];
  let draft = [];
  for (const row of rows) draft = [...draft, row]; // what the old sheet toggle produced
  const { repo, raw } = repository();
  await repo.load();
  const initialRecord = memoryFor(repo.memorization(), 'warsh', warsh);
  const plan = createMemorizationPlan({ name: 'حفظ', riwayah: 'warsh', weeklyQuarters: 2, weekdays: [1, 3], startDate: '2026-10-20', memorized: draft, initialRecord, reminder: { enabled: false, hour: 18, minute: 0 } }, warsh, 'plan-m');
  expect(plan.memorized).toEqual([{ start: 0, end: 7 }, { start: 107, end: 207 }]);
  await repo.update(items => [...items, plan]);
  expect(raw().memorization[0].ranges).toEqual([{ start: 0, end: 7 }, { start: 107, end: 207 }]);
  // Pausing the new goal afterwards still passes the record consistency check.
  await repo.update(items => items.map(p => setPlanPaused(p, true, '2026-10-20')));
});
