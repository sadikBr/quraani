import { describe, expect, test } from 'bun:test';
import {
  applyHalaqat, arrivalOf, assignmentFor, attendanceOf, clockText, decodeHalaqat, defaultHalaqatState, halaqaReminderQueue, historyOf, memorizedBy, nextMeeting, nextNew, nextRevision,
  ordinal, portionAyahs, refAt, spanOf, suggestGrade, suggestNext, validPortion,
} from '../src/features/halaqat/model';

// Ayahs per surah in the Hafs count.
const HAFS = [7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52,
  52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6];
const shape = { counts: HAFS };
const p = (fs, fa, ts, ta) => ({ from: { surah: fs, ayah: fa }, to: { surah: ts, ayah: ta } });
const student = (id, extra = {}) => ({ id, name: id, joinedOn: '2026-10-01', direction: 'backward', known: [], ...extra });
const halaqa = (extra = {}) => ({ id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [0, 3], createdOn: '2026-10-01', students: [student('student-1')], sessions: [], ...extra });
const recitation = (kind, portion, grade = 'good', marks = []) => ({ kind, portion, grade, marks });

describe('places in the mushaf', () => {
  test('ordinals and refs agree, and portions are measured in ayahs', () => {
    expect(HAFS.reduce((a, b) => a + b)).toBe(6236);
    expect(ordinal(shape, { surah: 1, ayah: 1 })).toBe(0);
    expect(ordinal(shape, { surah: 2, ayah: 1 })).toBe(7);
    expect(ordinal(shape, { surah: 114, ayah: 6 })).toBe(6235);
    for (const n of [0, 6, 7, 293, 5000, 6235]) expect(ordinal(shape, refAt(shape, n))).toBe(n);
    expect(portionAyahs(shape, p(2, 1, 2, 5))).toBe(5);
    expect(spanOf(shape, p(112, 1, 114, 6))).toEqual({ start: 6236 - 15, end: 6236 });
    expect(validPortion(shape, p(2, 10, 2, 5))).toBe(false);
    expect(validPortion(shape, p(1, 8, 1, 8))).toBe(false);
    expect(validPortion(shape, p(113, 1, 114, 6))).toBe(true);
  });
});

describe('the next portion', () => {
  test('goes on in the same surah, the same length, up to its end', () => {
    expect(nextNew(shape, p(67, 1, 67, 10), 'backward')).toEqual(p(67, 11, 67, 20));
    expect(nextNew(shape, p(67, 21, 67, 28), 'backward')).toEqual(p(67, 29, 67, 30));
  });
  test('then takes the next surah in the student\'s order', () => {
    expect(nextNew(shape, p(114, 1, 114, 6), 'backward')).toEqual(p(113, 1, 113, 5));
    expect(nextNew(shape, p(112, 1, 114, 6), 'backward')).toEqual(p(111, 1, 111, 5));
    expect(nextNew(shape, p(1, 1, 1, 7), 'forward')).toEqual(p(2, 1, 2, 7));
    expect(nextNew(shape, p(114, 1, 114, 6), 'forward')).toBeUndefined();
    expect(nextNew(shape, p(1, 1, 1, 7), 'backward')).toBeUndefined();
  });
  test('revision runs through what is memorized, and starts again', () => {
    const memorized = [spanOf(shape, p(78, 1, 78, 40)), spanOf(shape, p(112, 1, 114, 6))];
    expect(nextRevision(shape, memorized, undefined)).toEqual(p(78, 1, 78, 20));
    expect(nextRevision(shape, memorized, p(78, 1, 78, 20))).toEqual(p(78, 21, 78, 40));
    // The next stretch, as long as it can be.
    expect(nextRevision(shape, memorized, p(78, 21, 78, 40))).toEqual(p(112, 1, 114, 6));
    expect(nextRevision(shape, memorized, p(112, 1, 114, 6))).toEqual(p(78, 1, 78, 15));
    expect(nextRevision(shape, [], p(78, 1, 78, 20))).toBeUndefined();
  });
});

describe('grades', () => {
  const marks = (mistakes, prompts) => [...Array(mistakes).fill({ kind: 'mistake' }), ...Array(prompts).fill({ kind: 'hesitation' })];
  test('follow the mistakes and prompts', () => {
    expect(suggestGrade(marks(0, 0))).toBe('excellent');
    expect(suggestGrade(marks(0, 1))).toBe('excellent');
    expect(suggestGrade(marks(1, 2))).toBe('good');
    expect(suggestGrade(marks(0, 4))).toBe('fair');
    expect(suggestGrade(marks(3, 0))).toBe('fair');
    expect(suggestGrade(marks(4, 0))).toBe('repeat');
  });
});

describe('a halaqa over time', () => {
  const session = (id, date, entries) => ({ id, date, entries });
  const entry = (extra) => ({ student: 'student-1', attendance: 'present', recitations: [], ...extra });

  test('a student is given what the last session gave them, or their first portions', () => {
    const first = { new: p(114, 1, 114, 6) };
    const h = halaqa({ students: [student('student-1', { first })], sessions: [
      session('session-1', '2026-10-04', [entry({ recitations: [recitation('new', p(114, 1, 114, 6))], next: { new: p(113, 1, 113, 5) } })]),
      session('session-2', '2026-10-07', [entry({ attendance: 'absent' })]),
    ] });
    const s = h.students[0];
    expect(assignmentFor(h, s, '2026-10-04')).toEqual(first);
    expect(assignmentFor(h, s, '2026-10-07')).toEqual({ new: p(113, 1, 113, 5) });
    // An absence gives nothing new: the last portion given stands.
    expect(assignmentFor(h, s, '2026-10-11')).toEqual({ new: p(113, 1, 113, 5) });
  });

  test('what is memorized grows with the portions passed, not with those to repeat', () => {
    const h = halaqa({ students: [student('student-1', { known: [p(1, 1, 1, 7)] })], sessions: [
      session('session-1', '2026-10-04', [entry({ recitations: [recitation('new', p(114, 1, 114, 6))] })]),
      session('session-2', '2026-10-07', [entry({ recitations: [recitation('new', p(113, 1, 113, 5), 'repeat')] })]),
    ] });
    expect(memorizedBy(shape, h, h.students[0])).toEqual([{ start: 0, end: 7 }, spanOf(shape, p(114, 1, 114, 6))]);
  });

  test('the suggested next portions follow what was recited, and its grade', () => {
    const h = halaqa({ students: [student('student-1', { known: [p(78, 1, 78, 40)], first: { new: p(114, 1, 114, 6), revision: p(78, 1, 78, 20) } })] });
    const s = h.students[0];
    expect(suggestNext(shape, h, s, '2026-10-04', [recitation('new', p(114, 1, 114, 6)), recitation('revision', p(78, 1, 78, 20))]))
      .toEqual({ new: p(113, 1, 113, 5), revision: p(78, 21, 78, 40) });
    expect(suggestNext(shape, h, s, '2026-10-04', [recitation('new', p(114, 1, 114, 6), 'repeat')]))
      .toEqual({ new: p(114, 1, 114, 6), revision: p(78, 1, 78, 20) });
    // The new portion just passed is already part of what can be revised.
    expect(suggestNext(shape, h, s, '2026-10-04', [recitation('new', p(114, 1, 114, 6)), recitation('revision', p(78, 21, 78, 40))]).revision)
      .toEqual(p(114, 1, 114, 6));
  });

  test('a portion cut short at a surah\'s end does not shorten the ones after it', () => {
    const s = student('student-1', { direction: 'forward' });
    const day = (id, date, portion) => session(id, date, [entry({ recitations: [recitation('new', portion)] })]);
    // Ten ayahs a time; the last ten of At-Tahrim (66) were cut to two at its end.
    const h = halaqa({ students: [s], sessions: [day('session-1', '2026-10-04', p(66, 1, 66, 10))] });
    expect(suggestNext(shape, h, s, '2026-10-07', [recitation('new', p(66, 11, 66, 12))]).new).toEqual(p(67, 1, 67, 10));
    // From An-Nas back, a whole short surah each time stays as long as the longest.
    const b = student('student-1');
    const hb = halaqa({ students: [b], sessions: [day('session-1', '2026-10-04', p(114, 1, 114, 6)), day('session-2', '2026-10-07', p(113, 1, 113, 5))] });
    expect(suggestNext(shape, hb, b, '2026-10-11', [recitation('new', p(112, 1, 112, 4))]).new).toEqual(p(111, 1, 111, 5));
  });

  test('a surah already memorized is stepped over', () => {
    const s = student('student-1', { known: [p(113, 1, 113, 5)] });
    const h = halaqa({ students: [s] });
    expect(suggestNext(shape, h, s, '2026-10-04', [recitation('new', p(114, 1, 114, 6))]).new).toEqual(p(112, 1, 112, 4));
    expect(nextNew(shape, p(114, 4, 114, 6), 'backward', 3, [spanOf(shape, p(113, 1, 114, 3))])).toEqual(p(112, 1, 112, 3));
  });

  test('a past entry is judged by what was memorized by then', () => {
    const s = student('student-1', { known: [p(78, 1, 78, 40)] });
    const h = halaqa({ students: [s], sessions: [
      session('session-1', '2026-10-04', [entry({ recitations: [recitation('new', p(114, 1, 114, 6)), recitation('revision', p(78, 21, 78, 40))] })]),
      session('session-2', '2026-10-07', [entry({ recitations: [recitation('new', p(113, 1, 113, 5))] })]),
    ] });
    // Editing the first session: 113, passed later, is not yet there to revise.
    expect(suggestNext(shape, h, s, '2026-10-04', h.sessions[0].entries[0].recitations).revision).toEqual(p(114, 1, 114, 6));
  });

  test('history, attendance and the next meeting', () => {
    const h = halaqa({ sessions: [
      session('session-1', '2026-10-04', [entry({ attendance: 'late' })]),
      session('session-2', '2026-10-07', [entry({ attendance: 'absent' })]),
      session('session-3', '2026-10-11', [entry({})]),
    ] });
    expect(historyOf(h, 'student-1').map((x) => x.session.date)).toEqual(['2026-10-11', '2026-10-07', '2026-10-04']);
    expect(attendanceOf(h, 'student-1')).toEqual({ present: 1, late: 1, excused: 0, absent: 1 });
    // 2026-10-13 is a Tuesday; the halaqa meets on Sundays and Wednesdays.
    expect(nextMeeting(h, '2026-10-13')).toBe('2026-10-14');
    expect(nextMeeting(h, '2026-10-14')).toBe('2026-10-14');
    expect(nextMeeting({ ...h, weekdays: [] }, '2026-10-13')).toBeUndefined();
  });
});

describe('changes and saving', () => {
  test('entries are saved into the day\'s session, made when needed', () => {
    let state = applyHalaqat(defaultHalaqatState, { type: 'saveHalaqa', halaqa: { id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [0], createdOn: '2026-10-01' } });
    state = applyHalaqat(state, { type: 'saveStudent', halaqa: 'halaqa-a', student: student('student-1') });
    state = applyHalaqat(state, { type: 'saveStudent', halaqa: 'halaqa-a', student: student('student-2') });
    state = applyHalaqat(state, { type: 'saveEntries', halaqa: 'halaqa-a', date: '2026-10-04', session: 'session-1',
      entries: [{ student: 'student-1', attendance: 'present', recitations: [] }, { student: 'student-2', attendance: 'absent', recitations: [] }] });
    state = applyHalaqat(state, { type: 'saveEntries', halaqa: 'halaqa-a', date: '2026-10-04', session: 'session-x',
      entries: [{ student: 'student-1', attendance: 'late', recitations: [recitation('new', p(114, 1, 114, 6))] }] });
    const h = state.halaqat[0];
    expect(h.sessions).toHaveLength(1);
    expect(h.sessions[0].id).toBe('session-1');
    expect(h.sessions[0].entries.map((e) => [e.student, e.attendance])).toEqual([['student-2', 'absent'], ['student-1', 'late']]);
    // Saved state reads back as it was.
    expect(decodeHalaqat(JSON.stringify(state))).toEqual(state);
    // A student's removal takes their entries, and a session left empty.
    state = applyHalaqat(state, { type: 'deleteStudent', halaqa: 'halaqa-a', student: 'student-1' });
    state = applyHalaqat(state, { type: 'deleteStudent', halaqa: 'halaqa-a', student: 'student-2' });
    expect(state.halaqat[0].sessions).toEqual([]);
  });

  test('a halaqa keeps its riwayah once something is recorded by it', () => {
    const base = { id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [0], createdOn: '2026-10-01' };
    let state = applyHalaqat(defaultHalaqatState, { type: 'saveHalaqa', halaqa: base });
    state = applyHalaqat(state, { type: 'saveHalaqa', halaqa: { ...base, riwayah: 'warsh', name: 'B' } });
    expect(state.halaqat[0]).toMatchObject({ riwayah: 'warsh', name: 'B' });
    state = applyHalaqat(state, { type: 'saveStudent', halaqa: 'halaqa-a', student: student('student-1', { known: [p(1, 1, 1, 7)] }) });
    state = applyHalaqat(state, { type: 'saveHalaqa', halaqa: { ...base, riwayah: 'hafs' } });
    expect(state.halaqat[0].riwayah).toBe('warsh');
  });

  test('malformed saved data is refused', () => {
    const good = { version: 1, halaqat: [halaqa()] };
    expect(decodeHalaqat(JSON.stringify(good)).halaqat).toHaveLength(1);
    expect(decodeHalaqat(null)).toEqual(defaultHalaqatState);
    const broken = [
      { ...good, version: 2 },
      { version: 1, halaqat: [halaqa({ id: 'x' })] },
      { version: 1, halaqat: [halaqa({ riwayah: 'qalun' })] },
      { version: 1, halaqat: [halaqa({ students: [student('student-1', { known: [p(2, 10, 2, 1)] })] })] },
      { version: 1, halaqat: [halaqa({ sessions: [{ id: 'session-1', date: '2026-10-04', entries: [{ student: 'student-9', attendance: 'present', recitations: [] }] }] })] },
      { version: 1, halaqat: [halaqa({ sessions: [{ id: 'session-1', date: '2026-10-04', entries: [{ student: 'student-1', attendance: 'present', recitations: [recitation('new', p(1, 1, 1, 7), 'perfect')] }] }] })] },
    ];
    for (const value of broken) expect(() => decodeHalaqat(JSON.stringify(value))).toThrow();
  });
});

describe('the phone\'s owner in a halaqa', () => {
  test('one participant at most is the owner, and naming another moves it', () => {
    let state = applyHalaqat(defaultHalaqatState, { type: 'saveHalaqa', halaqa: { id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [], createdOn: '2026-10-01' } });
    state = applyHalaqat(state, { type: 'saveStudent', halaqa: 'halaqa-a', student: student('student-1', { me: true }) });
    state = applyHalaqat(state, { type: 'saveStudent', halaqa: 'halaqa-a', student: student('student-2', { me: true }) });
    expect(state.halaqat[0].students.map((s) => !!s.me)).toEqual([false, true]);
    expect('me' in state.halaqat[0].students[0]).toBe(false);
    expect(decodeHalaqat(JSON.stringify(state))).toEqual(state);
    const two = { version: 1, halaqat: [halaqa({ students: [student('student-1', { me: true }), student('student-2', { me: true })] })] };
    expect(() => decodeHalaqat(JSON.stringify(two))).toThrow();
  });
});

describe('reminders before sessions', () => {
  // Tuesday 13 October 2026, 10:00 local time.
  const now = new Date(2026, 9, 13, 10, 0);
  const meets = (extra = {}) => ({ version: 1, halaqat: [halaqa({ weekdays: [2, 3], time: { hour: 17, minute: 30 }, reminder: { before: 60 }, ...extra })] });

  test('come before each session on its days, ahead by the chosen lead', () => {
    const queue = halaqaReminderQueue(meets(), now, 8);
    expect(queue.map((r) => [r.day, r.date.getHours(), r.date.getMinutes()])).toEqual([
      ['2026-10-13', 16, 30], ['2026-10-14', 16, 30], ['2026-10-20', 16, 30],
    ]);
    expect(queue[0].id).toBe('quranni-halaqa:halaqa-a:2026-10-13:1730:60');
    // At the session's start, today's has passed once it is under way.
    expect(halaqaReminderQueue(meets({ reminder: { before: 0 } }), new Date(2026, 9, 13, 17, 45), 2).map((r) => r.day)).toEqual(['2026-10-14']);
  });

  test('none without a time, a reminder, days or participants, nor for a session already done', () => {
    expect(halaqaReminderQueue(meets({ reminder: undefined }), now)).toEqual([]);
    expect(halaqaReminderQueue(meets({ time: undefined }), now)).toEqual([]);
    expect(halaqaReminderQueue(meets({ weekdays: [] }), now)).toEqual([]);
    expect(halaqaReminderQueue(meets({ students: [] }), now)).toEqual([]);
    const done = meets({ sessions: [{ id: 'session-1', date: '2026-10-13', entries: [{ student: 'student-1', attendance: 'absent', recitations: [] }] }] });
    expect(halaqaReminderQueue(done, now, 2).map((r) => r.day)).toEqual(['2026-10-14']);
  });

  test('for a halaqa the user is a member of: as they chose on their phone, not as its supervisor did', () => {
    const joined = halaqa({ id: 'halaqa-m', name: 'M', weekdays: [2], time: { hour: 17, minute: 30 }, reminder: { before: 120 }, students: [student('student-me', { me: true })] });
    const queue = halaqaReminderQueue({ version: 1, halaqat: [] }, now, 8, [{ halaqa: joined, before: 15 }]);
    expect(queue.map((r) => [r.day, r.date.getHours(), r.date.getMinutes(), r.member])).toEqual([['2026-10-13', 17, 15, true], ['2026-10-20', 17, 15, true]]);
    expect(queue[0].id).toBe('quranni-halaqa:halaqa-m:2026-10-13:1730:15');
    // Done for them once they have been heard that day.
    const heardToday = { ...joined, sessions: [{ id: 'session-1', date: '2026-10-13', entries: [{ student: 'student-me', attendance: 'present', recitations: [{ kind: 'new', grade: 'good', portion: p(67, 1, 67, 5), marks: [] }] }] }] };
    expect(halaqaReminderQueue({ version: 1, halaqat: [] }, now, 8, [{ halaqa: heardToday, before: 15 }]).map((r) => r.day)).toEqual(['2026-10-20']);
    // Theirs and those they supervise, together, the soonest first.
    const both = halaqaReminderQueue(meets(), now, 2, [{ halaqa: joined, before: 15 }]);
    expect(both.map((r) => [r.halaqa, !!r.member])).toEqual([['halaqa-a', false], ['halaqa-m', true], ['halaqa-a', false]]);
    // Gone once they left it.
    const left = { ...joined, students: [student('student-me', { me: true, leftOn: '2026-10-12' })] };
    expect(halaqaReminderQueue({ version: 1, halaqat: [] }, now, 8, [{ halaqa: left, before: 15 }])).toEqual([]);
  });

  test('say when they come, the evening before for a session just after midnight', () => {
    expect(clockText({ hour: 7, minute: 5 })).toBe('07:05');
    expect(arrivalOf({ hour: 17, minute: 30 }, 60)).toEqual({ hour: 16, minute: 30 });
    expect(arrivalOf({ hour: 0, minute: 15 }, 30)).toEqual({ hour: 23, minute: 45 });
    expect(arrivalOf({ hour: 9, minute: 0 }, 0)).toEqual({ hour: 9, minute: 0 });
  });

  test('are saved with the halaqa, and turned off when left out', () => {
    let state = applyHalaqat(defaultHalaqatState, { type: 'saveHalaqa', halaqa: { id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [2], time: { hour: 17, minute: 0 }, reminder: { before: 30 }, createdOn: '2026-10-01' } });
    expect(decodeHalaqat(JSON.stringify(state))).toEqual(state);
    state = applyHalaqat(state, { type: 'saveHalaqa', halaqa: { id: 'halaqa-a', name: 'A', riwayah: 'hafs', weekdays: [2], createdOn: '2026-10-01' } });
    expect(state.halaqat[0].time).toBeUndefined();
    expect(state.halaqat[0].reminder).toBeUndefined();
    expect(() => decodeHalaqat(JSON.stringify(meets({ time: undefined })))).toThrow();
    expect(() => decodeHalaqat(JSON.stringify(meets({ reminder: { before: 45 } })))).toThrow();
  });
});
