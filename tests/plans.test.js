import { expect, test } from 'bun:test';
import { buildPlanIndex, canUndoProgress, createPlan, finishesGoal, nextPortion, recordProgress, undoProgress, rollCompletedCycle, setPlanPaused, reschedulePlan, assertPlanIndex } from '../src/features/plans/engine';
import { addDays, localDate, validDate, daysBetween } from '../src/features/plans/dates';
import { createPlansRepository, decodePlans } from '../src/features/plans/repository';
import { planReminderQueue } from '../src/features/plans/reminder-schedule';
import { goalsOverview } from '../src/features/plans/overview';
import { currentGoal, DuplicateGoalError } from '../src/features/plans/goal-limit';
import { resolvePlanStart, startChoices, startAtPosition, filterStartChoices } from '../src/features/plans/start-point';
import { archiveDeletionDate, keptInArchive, maintainArchives, restoreArchivedGoal, deleteArchivedGoal } from '../src/features/plans/archive';

function corpus(id, length) {
  const ayahs = Array.from({ length }, (_, i) => ({ mushafId: id, surahNumber: 1, ayahNumber: i + 1, pageNumber: Math.floor(i * 604 / length) + 1,
    juzNumber: Math.floor(i * 30 / length) + 1, hizbQuarter: Math.floor(i * 240 / length) + 1 }));
  const boundaries = key => ayahs.filter((a, i) => !i || key(a) !== key(ayahs[i - 1]));
  const entries = key => boundaries(key).map(a => ({ number: key(a), start: a, pageNumber: a.pageNumber }));
  return buildPlanIndex({ quran: { id, surahs: [{ number: 1, name: 'سورة اختبار', ayahs }] },
    pages: boundaries(a => a.pageNumber).map(a => ({ number: a.pageNumber, ayahs: [a] })),
    juzIndex: entries(a => a.juzNumber), hizbIndex: entries(a => Math.ceil(a.hizbQuarter / 4)), quarterHizbIndex: entries(a => a.hizbQuarter) });
}
const warsh = corpus(4, 6214), hafs = corpus(2, 6236);
const draft = { name: 'ختمتي', riwayah: 'warsh', goal: { type: 'khatma', weeks: 4 }, unit: 'pages', start: { kind: 'page', number: 1 }, startDate: '2026-10-09', repeat: false, reminder: { enabled: false, hour: 20, minute: 0 } };
const make = (changes = {}, index = warsh) => createPlan({ ...draft, ...changes }, index, 'plan-test');
const roundTrip = plan => decodePlans(JSON.stringify({ version: 1, plans: [plan] }))[0];

function completedGoal(plan) {
  for (let slot = 0; slot < plan.cycle.sessions.length; slot++) {
    plan = recordProgress(plan, { cycle: plan.cycle.number, slot, to: plan.cycle.sessions[slot].end }, addDays('2026-12-01', slot));
  }
  return plan;
}
function goalRepository(initial = []) {
  let stored = JSON.stringify({ version: 1, plans: initial });
  return createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { stored = value; }, removeItem: async () => {} });
}

test('one reading goal includes both modes, paused and future goals across riwayat, but not completed or archived goals', async () => {
  const first = { ...make({ startDate: '2026-10-20' }), id: 'plan-first' };
  const second = { ...make({ riwayah: 'hafs' }, hafs), id: 'plan-second' };
  const daily = { ...make({ goal: { type: 'wird', amount: 5 } }), id: 'plan-daily' };
  const repo = goalRepository([first]); await repo.load();
  await expect(repo.update(items => [...items, second])).rejects.toBeInstanceOf(DuplicateGoalError);
  await expect(repo.update(items => [...items, daily])).rejects.toBeInstanceOf(DuplicateGoalError);
  await repo.update(items => items.map(p => p.id === first.id ? setPlanPaused(p, true, '2026-10-20') : p));
  await expect(repo.update(items => [...items, second])).rejects.toBeInstanceOf(DuplicateGoalError);
  await repo.update(items => items.map(p => p.id === first.id ? { ...p, status: 'archived' } : p));
  const result = await repo.update(items => [...items, second]);
  expect(currentGoal(result)).toEqual(second);
  await expect(repo.update(items => [...items, daily])).rejects.toBeInstanceOf(DuplicateGoalError);
  const dailyRepo = goalRepository([daily]); await dailyRepo.load();
  await expect(dailyRepo.update(items => [...items, first])).rejects.toBeInstanceOf(DuplicateGoalError);
  expect(result[0].cycle).toEqual(first.cycle);
  expect(currentGoal([completedGoal(first)])).toBeUndefined();
});

test('concurrent creation cannot save both a khatma and a daily wird and repeated saves of the same goal are idempotent', async () => {
  const repo = goalRepository(); await repo.load();
  const first = { ...make(), id: 'plan-first' }, second = { ...make({ goal: { type: 'wird', amount: 5 } }), id: 'plan-second' };
  const results = await Promise.allSettled([repo.update(items => [...items, first]), repo.update(items => [...items, second])]);
  expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  expect(results[1].reason.goalId).toBe(first.id);
  expect(await repo.load()).toEqual([first]);
  await repo.update(items => items.some(p => p.id === first.id) ? items : [...items, first]);
  expect(await repo.load()).toEqual([first]);
});

test('replacement preserves completed history, stops the previous repeat, and blocks restore, undo or repeat bypasses', async () => {
  const finished = { ...completedGoal(make({ repeat: true })), id: 'plan-finished' };
  const archived = { ...make(), id: 'plan-archived', status: 'archived' };
  const replacement = { ...make({ goal: { type: 'wird', amount: 5 } }), id: 'plan-replacement' };
  const repo = goalRepository([finished, archived]); await repo.load();
  await repo.update(items => [...items, replacement]);
  const saved = await repo.load();
  expect(saved[0]).toEqual({ ...finished, repeat: false });
  await expect(repo.update(items => items.map(p => p.id === archived.id ? { ...p, status: 'active' } : p))).rejects.toBeInstanceOf(DuplicateGoalError);
  // A finished khatma stays finished: undoing it is not a way back in.
  expect(undoProgress(finished, finished.cycle.completedOn)).toBe(finished);
  await expect(repo.update(items => items.map(p => p.id === finished.id ? { ...p, repeat: true } : p))).rejects.toBeInstanceOf(DuplicateGoalError);
  expect(await repo.load()).toEqual(saved);
  await repo.update(items => items.map(p => p.id === replacement.id ? completedGoal(p) : p));
  await repo.update(items => items.map(p => p.id === archived.id ? { ...p, status: 'active' } : p));
  expect(currentGoal(await repo.load()).id).toBe(archived.id);
});

test('legacy duplicate goals remain readable and editable, without permitting additional duplicates', async () => {
  const legacy = [{ ...make(), id: 'plan-old-one' }, { ...make({ goal: { type: 'wird', amount: 5 } }), id: 'plan-old-two' }];
  const repo = goalRepository(legacy);
  expect(await repo.load()).toEqual(legacy);
  await repo.update(items => items.map(p => p.id === legacy[0].id ? { ...p, name: 'اسم جديد' } : p));
  await expect(repo.update(items => [...items, { ...make(), id: 'plan-third' }])).rejects.toBeInstanceOf(DuplicateGoalError);
  expect((await repo.load()).map(p => p.cycle)).toEqual(legacy.map(p => p.cycle));
});

test('both reading strategies resolve every page and hizb in the selected riwayah without gaps', () => {
  for (const [riwayah, index] of [['warsh', warsh], ['hafs', hafs]]) {
    for (const kind of ['page', 'hizb']) for (const choice of startChoices(index, kind)) {
      const start = { kind, number: choice.number };
      expect(resolvePlanStart(index, start)).toBe(choice.position);
      for (const goal of [{ type: 'khatma', weeks: 4 }, { type: 'wird', amount: 5 }]) {
        const plan = make({ riwayah, goal, start }, index);
        expect(plan.cycle.start).toBe(choice.position);
        let cursor = choice.position;
        for (const session of plan.cycle.sessions) {
          expect(session.start).toBe(cursor);
          expect(session.end).toBeGreaterThan(cursor);
          cursor = session.end;
        }
        expect(cursor).toBe(index.ayahs.length);
        expect(roundTrip(plan)).toEqual(plan);
      }
    }
  }
});

test('surah and hizb starts inside a page retain their exact first ayah, including after saving and undo', () => {
  for (const base of [warsh, hafs]) {
    // Surah 2 and hizb 2 start after the first ayah of their containing page.
    const position = base.hizbs[1] + 1;
    const index = { ...base, hizbs: base.hizbs.map((p, i) => i === 1 ? position : p), surahNames: { 1: 'الفاتحة', 2: 'البقرة' }, ayahs: base.ayahs.map((a, i) => ({ ...a,
      surahNumber: i < position ? 1 : 2, ayahNumber: i < position ? i + 1 : i - position + 1 })) };
    expect(index.ayahs.findIndex(a => a.pageNumber === index.ayahs[position].pageNumber)).toBeLessThan(position);
    for (const kind of ['surah', 'hizb']) for (const goal of [{ type: 'khatma', weeks: 4 }, { type: 'wird', amount: 5 }]) {
      const plan = make({ riwayah: base.mushafId === 4 ? 'warsh' : 'hafs', goal, start: { kind, number: 2 } }, index);
      expect(plan.cycle.cursor).toBe(position);
      expect(index.ayahs[plan.cycle.start].ayahNumber).toBe(1);
      const next = nextPortion(plan, draft.startDate);
      const progress = recordProgress(plan, { cycle: 1, slot: 0, to: next.end }, draft.startDate);
      expect(undoProgress(roundTrip(progress), draft.startDate).cycle.cursor).toBe(position);
    }
    expect(startAtPosition(index, 'surah', position + 2)).toEqual({ kind: 'surah', number: 2 });
    expect(filterStartChoices(startChoices(index, 'surah'), index, 'بَقَرَة')).toHaveLength(1);
  }
});

test('start selector accepts Arabic digit search, and rejects missing or invalid boundaries', () => {
  expect(filterStartChoices(startChoices(warsh, 'page'), warsh, '٣٠')).toEqual([{ number: 30, position: warsh.pages[29] }]);
  expect(filterStartChoices(startChoices(warsh, 'hizb'), warsh, '۶۰')).toEqual([{ number: 60, position: warsh.hizbs[59] }]);
  for (const start of [{ kind: 'page', number: 0 }, { kind: 'page', number: 605 }, { kind: 'hizb', number: 61 },
    { kind: 'surah', number: 115 }, { kind: 'hizb', number: 1.5 }, { kind: 'page', number: NaN }, undefined]) {
    expect(() => make({ start })).toThrow();
  }
});

test('goal overview separates due, future, paused, completed and archived goals', () => {
  const due = make();
  const future = make({ startDate: '2026-10-10' });
  const paused = setPlanPaused(make(), true, '2026-10-09');
  const archived = { ...make(), status: 'archived' };
  const completed = { ...make(), status: 'completed', cycle: { ...make().cycle, cursor: warsh.ayahs.length } };
  const overview = goalsOverview([due, future, paused, archived, completed], '2026-10-09');
  expect(overview.due).toEqual([due]);
  expect(overview.all).toEqual([due, future, paused, completed]);
  expect(overview.archived).toEqual([archived]);
  expect(overview.completedToday).toBe(0);
  expect(goalsOverview([], '2026-10-09')).toEqual({ all: [], due: [], archived: [], completedToday: 0 });
});

test('daily overview counts catch-up portions without treating partial reading as completion', () => {
  let p = make();
  p = recordProgress(p, { cycle: 1, slot: 0, to: 8 }, '2026-10-10');
  expect(goalsOverview([p], '2026-10-10').completedToday).toBe(0);
  p = recordProgress(p, { cycle: 1, slot: 0, to: p.cycle.sessions[0].end }, '2026-10-10');
  p = recordProgress(p, { cycle: 1, slot: 1, to: p.cycle.sessions[1].end }, '2026-10-10');
  expect(goalsOverview([p], '2026-10-10').completedToday).toBe(2);
  expect(goalsOverview([p], '2026-10-11').completedToday).toBe(0);
  expect(goalsOverview([undoProgress(p, '2026-10-10')], '2026-10-10').completedToday).toBe(1);
  expect(goalsOverview([{ ...p, status: 'archived' }], '2026-10-10').completedToday).toBe(0);
});

test('every duration and unit covers each edition exactly once with no empty reading days', () => {
  for (const [riwayah, index] of [['warsh', warsh], ['hafs', hafs]]) for (const unit of ['pages', 'hizbs', 'juzs']) for (let weeks = 1; weeks <= 52; weeks++) {
    const plan = make({ riwayah, unit, goal: { type: 'khatma', weeks } }, index);
    expect(plan.cycle.sessions).toHaveLength(weeks * 7);
    let cursor = 0;
    for (const s of plan.cycle.sessions) { expect(s.start).toBe(cursor); expect(s.end).toBeGreaterThan(cursor); cursor = s.end; }
    expect(cursor).toBe(index.ayahs.length);
    expect(plan.cycle.sessions.at(-1).date).toBe(addDays(draft.startDate, weeks * 7 - 1));
  }
});
test('division plans use edition boundaries, including quarter hizbs rather than a fixed page estimate', () => {
  for (const unit of ['hizbs', 'juzs']) {
    const p = make({ unit, goal: { type: 'khatma', weeks: 8 } });
    expect(p.cycle.sessions.every(s => warsh.quarters.includes(s.end))).toBe(true);
  }
  const quarter = make({ goal: { type: 'wird', amount: 0.25 }, unit: 'hizbs' });
  expect(quarter.cycle.sessions.map(s => s.end)).toEqual(warsh.quarters.slice(1));
  const juz = make({ goal: { type: 'wird', amount: 1 }, unit: 'juzs' });
  expect(juz.cycle.sessions).toHaveLength(30);
  expect(juz.cycle.sessions[0].end).toBe(warsh.quarters[8]);
  for (const [unit, boundaries] of [['hizbs', warsh.hizbs], ['juzs', warsh.juzs]]) {
    const inside = make({ goal: { type: 'wird', amount: 1 }, unit, start: { kind: 'page', number: 5 } });
    expect(boundaries.includes(inside.cycle.sessions[0].end)).toBe(true);
  }
});
test('wird starts on a selected page and preserves partial progress across missed days', () => {
  let plan = make({ goal: { type: 'wird', amount: 5 }, start: { kind: 'page', number: 10 } });
  expect(plan.cycle.start).toBe(warsh.pages[9]);
  const next = nextPortion(plan, '2026-10-09');
  expect(next.end).toBe(warsh.pages[14]);
  plan = recordProgress(plan, { cycle: 1, slot: 0, to: warsh.pages[11] }, '2026-10-09');
  const late = nextPortion(plan, '2026-11-01');
  expect(late.start).toBe(warsh.pages[11]); expect(late.end).toBe(next.end); expect(late.date).toBe('2026-11-01');
  plan = recordProgress(plan, { cycle: 1, slot: 0, to: next.end }, '2026-11-01');
  expect(nextPortion(plan, '2026-11-01').due).toBe(false);
  expect(nextPortion(plan, '2026-11-02').end - next.end).toBeGreaterThan(0);
  expect(roundTrip(plan)).toEqual(plan);
});
test('stale or repeated completion, future dates and out-of-range progress cannot advance a plan', () => {
  const plan = make();
  const next = nextPortion(plan, '2026-10-09');
  const receipt = { cycle: 1, slot: 0, to: next.end };
  expect(recordProgress(plan, receipt, '2026-10-08')).toBe(plan);
  expect(recordProgress(plan, { ...receipt, to: next.end + 1 }, '2026-10-09')).toBe(plan);
  expect(recordProgress(plan, { ...receipt, cycle: 2 }, '2026-10-09')).toBe(plan);
  const done = recordProgress(plan, receipt, '2026-10-09');
  expect(recordProgress(done, receipt, '2026-10-09')).toBe(done);
  expect(undoProgress(done, '2026-10-09').cycle.cursor).toBe(0);
});
test('only the last thing recorded can be undone, the same day and once; finishing the goal is final', () => {
  const day = '2026-10-09', plan = make();
  expect(canUndoProgress(plan, day)).toBe(false);
  const first = recordProgress(plan, { cycle: 1, slot: 0, to: 4 }, day);
  const second = recordProgress(first, { cycle: 1, slot: 0, to: 8 }, day);
  // The last record goes; the one before it stays, though it is today's too.
  const undone = undoProgress(second, day);
  expect(undone.cycle).toMatchObject({ cursor: 4, progress: first.cycle.progress });
  expect(canUndoProgress(undone, day)).toBe(false);
  expect(undoProgress(undone, day)).toBe(undone);
  expect(roundTrip(undone)).toEqual(undone);
  // A new record can be undone in its turn, but not the next day, nor in the archive.
  const again = recordProgress(undone, { cycle: 1, slot: 0, to: 8 }, day);
  expect(undoProgress(again, day).cycle.cursor).toBe(4);
  expect(canUndoProgress(again, '2026-10-10')).toBe(false);
  expect(undoProgress(again, '2026-10-10')).toBe(again);
  expect(undoProgress({ ...again, status: 'archived' }, day).cycle.cursor).toBe(8);
  expect(undoProgress(setPlanPaused(again, true, day), day).cycle.cursor).toBe(4);
  // Only the record that reaches the end of the Quran finishes the goal.
  expect(finishesGoal(plan, 8)).toBe(false);
  expect(finishesGoal(plan, plan.totalAyahs)).toBe(true);
  const finished = completedGoal(plan);
  expect(canUndoProgress(finished, finished.cycle.completedOn)).toBe(false);
  expect(() => roundTrip({ ...undone, cycle: { ...undone.cycle, undoneAt: -1 } })).toThrow();
});
test('khatma keeps missed portions, and explicit catch-up preserves coverage and previous progress', () => {
  let p = make();
  p = recordProgress(p, { cycle: 1, slot: 0, to: 8 }, '2026-10-09');
  expect(nextPortion(p, '2026-10-15').date).toBe('2026-10-09');
  for (const mode of ['extend', 'redistribute']) {
    const rescheduled = reschedulePlan(p, warsh, mode, '2026-10-15');
    expect(nextPortion(rescheduled, '2026-10-15').start).toBe(8);
    expect(nextPortion(rescheduled, '2026-10-15').date).toBe('2026-10-15');
    expect(rescheduled.cycle.sessions.at(-1).end).toBe(6214);
    expect(roundTrip(rescheduled)).toEqual(rescheduled);
    // What was read on an earlier day stays read, rescheduled or not.
    expect(undoProgress(rescheduled, '2026-10-15')).toBe(rescheduled);
    expect(roundTrip(undoProgress(rescheduled, '2026-10-09')).cycle.cursor).toBe(0);
  }
  expect(reschedulePlan(p, warsh, 'redistribute', '2026-10-15').cycle.sessions.at(-1).date).toBe('2026-11-05');
  expect(() => reschedulePlan(p, warsh, 'redistribute', '2026-12-01')).toThrow();
});
test('pause freezes completion and shifts pending dates when resumed', () => {
  let p = setPlanPaused(make(), true, '2026-10-09');
  expect(nextPortion(p, '2026-10-20')).toBeNull();
  p = setPlanPaused(p, false, '2026-10-12');
  expect(p.cycle.sessions[0].date).toBe('2026-10-12');
  expect(roundTrip(p)).toEqual(p);
});
test('repeat begins a new cycle only after completion and retains history; a finished cycle is not undone', () => {
  let p = make({ goal: { type: 'wird', amount: 604 }, repeat: true });
  p = recordProgress(p, { cycle: 1, slot: 0, to: 6214 }, '2026-10-09');
  expect(p.status).toBe('completed'); expect(rollCompletedCycle(p, warsh, '2026-10-09')).toBe(p);
  expect(canUndoProgress(p, '2026-10-09')).toBe(false); expect(undoProgress(p, '2026-10-09')).toBe(p);
  const next = rollCompletedCycle(p, warsh, '2026-10-10');
  expect(next.cycle.number).toBe(2); expect(next.cycle.cursor).toBe(0); expect(next.history).toHaveLength(1);
  expect(nextPortion(next, '2026-10-10').due).toBe(true); expect(roundTrip(next)).toEqual(next);
  expect(rollCompletedCycle({ ...p, repeat: false }, warsh, '2026-10-10').status).toBe('completed');
});
test('bad inputs and mismatched Quran editions are rejected without modifying progress', () => {
  for (const weeks of [0, -1, 1.2, 53, NaN]) expect(() => make({ goal: { type: 'khatma', weeks } })).toThrow();
  for (const amount of [0, -1, 0.5, Infinity, NaN]) expect(() => make({ goal: { type: 'wird', amount } })).toThrow();
  expect(() => make({ startDate: '2026-02-30' })).toThrow();
  expect(() => make({ goal: { type: 'wird', amount: 1 }, start: { kind: 'page', number: 605 } })).toThrow();
  expect(() => assertPlanIndex(make(), hafs)).toThrow();
  expect(() => assertPlanIndex(make(), { ...warsh, corpus: 'changed' })).toThrow();
  for (const raw of ['no json', '{}', '{"version":2,"plans":[]}']) expect(() => decodePlans(raw)).toThrow();
});
test('calendar arithmetic survives leap years and offset changes without date drift', () => {
  expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
  expect(validDate('2026-02-29')).toBe(false); expect(validDate('2028-02-29')).toBe(true);
  expect(localDate(new Date(2026, 9, 9, 0, 1))).toBe('2026-10-09');
});
test('repository serializes concurrent writes, preserves good data after failure, and refuses corrupt storage', async () => {
  let stored = null, fail = false;
  const repo = createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { if (fail) throw Error('disk full'); stored = value; }, removeItem: async () => {} });
  await repo.load(); const p = make();
  await repo.update(() => [p]);
  fail = true; await expect(repo.update(items => [{ ...items[0], name: 'failed' }])).rejects.toThrow();
  expect(decodePlans(stored)[0].name).toBe('ختمتي');
  fail = false;
  await Promise.all([repo.update(items => [{ ...items[0], name: 'first' }]), repo.update(items => [{ ...items[0], name: items[0].name + '-second' }])]);
  expect(decodePlans(stored)[0].name).toBe('first-second');
  const [, reloaded] = await Promise.all([repo.update(items => [{ ...items[0], name: 'latest' }]), repo.load()]);
  expect(reloaded[0].name).toBe('latest');
  stored = 'corrupt'; await expect(repo.load()).rejects.toThrow();
});

test('legacy archives receive a persisted 14-day grace period, independent of old reading dates', async () => {
  let date = '2026-10-09';
  let stored = JSON.stringify({ version: 1, plans: [{ ...make({ startDate: '2020-01-01' }), status: 'archived' }] });
  const repo = createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { stored = value; } }, () => date);
  const first = (await repo.load())[0];
  expect(first.archivedOn).toBe('2026-10-09');
  expect(archiveDeletionDate(first)).toBe('2026-10-23');
  expect(decodePlans(stored)[0]).toEqual(first);
  date = '2026-10-22';
  expect((await repo.load())[0]).toEqual(first);
  date = '2026-10-23';
  expect(await repo.load()).toEqual([]);
  expect(decodePlans(stored)).toEqual([]);
});

test('archive timestamps survive edits, restoration clears them, and re-archiving starts a new window', async () => {
  let date = '2026-10-09', stored = null;
  const repo = createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { stored = value; } }, () => date);
  await repo.load(); await repo.update(() => [make()]);
  await repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  date = '2026-10-15';
  const edited = await repo.update(items => items.map(p => ({ ...p, name: 'أرشيفي', archivedOn: date })));
  expect(edited[0].archivedOn).toBe('2026-10-09');
  const restored = await repo.update(items => items.map(restoreArchivedGoal));
  expect(restored[0].status).toBe('active'); expect(restored[0].archivedOn).toBeUndefined();
  expect(archiveDeletionDate(restored[0])).toBeUndefined();
  const archived = await repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  expect(archiveDeletionDate(archived[0])).toBe('2026-10-29');
  expect(archived[0].cycle).toEqual(make().cycle);
});

test('cleanup removes only expired archives across calendar boundaries and never clears a live goal', () => {
  const expired = { ...make(), status: 'archived', archivedOn: '2028-02-20' };
  const recent = { ...expired, id: 'plan-recent', archivedOn: '2028-02-21' };
  const active = { ...make(), archivedOn: '2020-01-01' };
  const paused = { ...active, id: 'plan-paused', status: 'paused' };
  const completed = { ...completedGoal(make()), archivedOn: '2020-01-01' };
  const future = { ...recent, id: 'plan-future', archivedOn: '2028-03-10' };
  expect(archiveDeletionDate(expired)).toBe('2028-03-05');
  const result = maintainArchives([expired, recent, active, paused, completed, future], '2028-03-05');
  expect(result).toHaveLength(5);
  expect(result.filter(p => p.status === 'archived')).toEqual([recent, future]);
  expect(result.filter(p => p.status !== 'archived').every(p => p.archivedOn === undefined)).toBe(true);
  expect(maintainArchives(result, '2028-03-05')).toBe(result);
  // A goal with a finished khatma is kept for good; only the user deletes it.
  const kept = { ...completedGoal(make()), id: 'plan-kept', status: 'archived', archivedOn: '2020-01-01' };
  expect(keptInArchive(kept)).toBe(true); expect(keptInArchive(expired)).toBe(false);
  expect(archiveDeletionDate(kept)).toBeUndefined();
  expect(maintainArchives([kept, expired], '2030-01-01')).toEqual([kept]);
  expect(deleteArchivedGoal([kept], kept.id)).toEqual([]);
  expect(() => decodePlans(JSON.stringify({ version: 1, plans: [{ ...expired, archivedOn: '2028-02-31' }] }))).toThrow();
});

test('manual deletion is archived-only, idempotent, and cannot race a restore into deleting a current goal', async () => {
  const archived = { ...make(), status: 'archived' };
  const repo = goalRepository([archived]); await repo.load();
  const [restored, deleted] = await Promise.allSettled([
    repo.update(items => items.map(restoreArchivedGoal)),
    repo.update(items => deleteArchivedGoal(items, archived.id)),
  ]);
  expect(restored.status).toBe('fulfilled'); expect(deleted.status).toBe('rejected');
  expect((await repo.load())[0].status).toBe('active');
  await repo.update(items => items.map(p => ({ ...p, status: 'archived' })));
  await repo.update(items => deleteArchivedGoal(items, archived.id));
  expect(await repo.load()).toEqual([]);
  await repo.update(items => deleteArchivedGoal(items, archived.id));
  expect(await repo.load()).toEqual([]);
});

test('failed archive cleanup or deletion keeps stored data intact and can be retried', async () => {
  const archived = { ...make(), status: 'archived', archivedOn: '2026-10-09' };
  let stored = JSON.stringify({ version: 1, plans: [archived] }), fail = false, date = '2026-10-10';
  const repo = createPlansRepository({ getItem: async () => stored, setItem: async (_, value) => { if (fail) throw Error('disk full'); stored = value; } }, () => date);
  await repo.load(); fail = true;
  await expect(repo.update(items => deleteArchivedGoal(items, archived.id))).rejects.toThrow('disk full');
  expect(decodePlans(stored)).toEqual([archived]);
  date = '2026-10-23';
  await expect(repo.load()).rejects.toThrow('disk full');
  expect(decodePlans(stored)).toEqual([archived]);
  fail = false;
  expect(await repo.load()).toEqual([]);
  expect(decodePlans(stored)).toEqual([]);
});
test('reminders are future-only, bounded, unique, and stop for paused, archived or completed plans', () => {
  const now = new Date(2026, 9, 9, 19, 0);
  const p = make({ reminder: { enabled: true, hour: 20, minute: 0 } });
  const requests = planReminderQueue([p], now);
  expect(requests).toHaveLength(30); expect(requests[0].date.getHours()).toBe(20);
  for (const status of ['paused', 'archived', 'completed']) expect(planReminderQueue([{ ...p, status }], now)).toEqual([]);
  const future = { ...p, startDate: '2026-10-12' };
  expect(localDate(planReminderQueue([future], now)[0].date)).toBe('2026-10-12');
  const many = planReminderQueue(Array.from({ length: 8 }, (_, i) => ({ ...p, id: `plan-${i}` })), now);
  expect(many).toHaveLength(48); expect(new Set(many.map(x => x.id)).size).toBe(48);
  const after = planReminderQueue([p], new Date(2026, 9, 9, 21, 0));
  expect(localDate(after[0].date)).toBe('2026-10-10');
  const finishedToday = recordProgress(p, { cycle: 1, slot: 0, to: p.cycle.sessions[0].end }, '2026-10-09');
  expect(localDate(planReminderQueue([finishedToday], now)[0].date)).toBe('2026-10-10');
});
