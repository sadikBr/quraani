import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { clampName, entryPoints, monthStart, scoresOf } from '../src/features/halaqat/model';
import { createMembershipStore, joinedFrom, membershipKey, passedRecitations, photoOf, recitationKey } from '../src/features/halaqat/membership';

const p = (fs, fa, ts, ta) => ({ from: { surah: fs, ayah: fa }, to: { surah: ts, ayah: ta } });
const student = (id, extra = {}) => ({ id, name: id, joinedOn: '2026-10-01', direction: 'backward', known: [], ...extra });
const recitation = (kind, grade) => ({ kind, grade, portion: p(67, 1, 67, 10), marks: [] });

describe('names', () => {
  test('cut to fit, never half a character', () => {
    expect(clampName('  يوسف  ')).toBe('يوسف');
    expect(clampName('😀'.repeat(40))).toBe('😀'.repeat(30));
    expect(clampName('ا'.repeat(70))).toHaveLength(60);
  });
});

describe('points', () => {
  test('counted as the account counts them', () => {
    // The same days as supabase/tests/joining_halaqat.test.sql.
    expect(entryPoints({ attendance: 'present', recitations: [recitation('new', 'excellent'), recitation('revision', 'good')] })).toBe(10);
    expect(entryPoints({ attendance: 'absent', recitations: [] })).toBe(0);
    expect(entryPoints({ attendance: 'late', recitations: [recitation('new', 'repeat'), recitation('revision', 'fair')] })).toBe(2);
  });

  test('each participant\'s, in all and this month; those who left aside', () => {
    const halaqa = {
      id: 'halaqa-x', name: 'x', riwayah: 'warsh', weekdays: [0], createdOn: '2026-09-01',
      students: [student('student-a'), student('student-b'), student('student-c', { leftOn: '2026-10-01' })],
      sessions: [
        { id: 'session-1', date: '2026-09-28', entries: [{ student: 'student-a', attendance: 'present', recitations: [recitation('new', 'good')] }] },
        { id: 'session-2', date: '2026-10-05', entries: [
          { student: 'student-a', attendance: 'late', recitations: [] },
          { student: 'student-b', attendance: 'present', recitations: [recitation('new', 'excellent')] },
          { student: 'student-c', attendance: 'present', recitations: [] },
        ] },
      ],
    };
    expect(monthStart('2026-10-13')).toBe('2026-10-01');
    expect(scoresOf(halaqa, '2026-10-01')).toEqual([
      { student: 'student-a', total: 7, recent: 1 },
      { student: 'student-b', total: 8, recent: 8 },
    ]);
  });
});

const USER = '00000000-0000-0000-0000-00000000000c';
const view = (extra = {}) => ({
  id: 'halaqa-mosque', version: 7, deleted: false,
  data: { name: 'حلقة المسجد', riwayah: 'warsh', weekdays: [0, 3], createdOn: '2026-10-01' },
  student: { id: 'student-me', data: { name: 'يوسف', joinedOn: '2026-10-10', direction: 'backward', known: [] } },
  entries: [{ date: '2026-10-12', session: 'session-2', data: { attendance: 'present', recitations: [recitation('new', 'excellent')], next: { new: p(67, 11, 67, 20) }, note: 'أحسنت' } }],
  teachers: [{ name: 'الشيخ عمر', avatar: 'teacher/a.jpg', owner: true }],
  roster: [
    { student: 'student-old', name: 'أحمد', avatar: null, me: false, total: 3, recent: 3 },
    { student: 'student-me', name: 'يوسف', avatar: `${USER}/me.jpg`, me: true, total: 8, recent: 8 },
  ],
  ...extra,
});

describe('a halaqa as a member sees it', () => {
  test('their participant and days, read as the app reads its own halaqat', () => {
    const joined = joinedFrom(view(), '2026-10-01');
    expect(joined.halaqa.students).toEqual([{ id: 'student-me', name: 'يوسف', joinedOn: '2026-10-10', direction: 'backward', known: [], me: true }]);
    expect(joined.halaqa.sessions).toHaveLength(1);
    expect(joined.halaqa.sessions[0].entries[0]).toMatchObject({ student: 'student-me', note: 'أحسنت' });
    expect(joined.roster.map((r) => [r.name, r.total, r.me])).toEqual([['أحمد', 3, false], ['يوسف', 8, true]]);
    expect(joined.teachers).toEqual([{ name: 'الشيخ عمر', avatar: 'teacher/a.jpg', owner: true }]);
    expect(joinedFrom({ id: 'halaqa-mosque', deleted: true }, '2026-10-01')).toBeNull();
    expect(() => joinedFrom(view({ entries: [{ date: '2026-10-12', session: 'session-2', data: { attendance: 'sleeping', recitations: [] } }] }), '2026-10-01')).toThrow();
  });

  test('read from the account, remembered on the phone, and kept when the account can\'t be reached', async () => {
    const storage = new MemoryCacheStorage();
    let offline = false, signed = 0;
    const api = {
      async halaqaVersions() {
        if (offline) throw Object.assign(new Error('offline'), { kind: 'network' });
        return [
          { id: 'halaqa-own', revision: 1, version: 3, deleted: false, role: 'teacher', owner: true },
          { id: 'halaqa-shared', revision: 1, version: 3, deleted: false, role: 'teacher', owner: false },
          { id: 'halaqa-mosque', revision: 1, version: 7, deleted: false, role: 'member', owner: false },
          { id: 'halaqa-gone', revision: 2, version: 9, deleted: true, role: 'member', owner: false },
        ];
      },
      async joinedHalaqa(id, from) { expect(from).toBe('2026-10-01'); return view({ id }); },
      async halaqaPeople() { return []; },
      async photoLinks(paths) { signed += paths.length; return Object.fromEntries(paths.map((x) => [x, `https://example.com/${x}?t=1`])); },
    };
    const store = createMembershipStore({ user: USER, api, storage, now: () => 1_000 });
    await store.refresh('2026-10-13');
    const state = store.getState();
    expect(state.roles).toEqual({ 'halaqa-own': 'owner', 'halaqa-shared': 'teacher' });
    expect(state.joined.map((j) => j.halaqa.id)).toEqual(['halaqa-mosque']);
    expect(signed).toBe(2);
    expect(photoOf(state, `${USER}/me.jpg`, 2_000)).toBe(`https://example.com/${USER}/me.jpg?t=1`);
    await store.refresh('2026-10-13');
    expect(signed).toBe(2); // links that still work are kept

    offline = true;
    const again = createMembershipStore({ user: USER, api, storage, now: () => 1_000 });
    await again.refresh('2026-10-13');
    expect(again.getState().problem).toBe('network');
    expect(again.getState().joined.map((j) => j.halaqa.id)).toEqual(['halaqa-mosque']);
    expect(again.getState().roles['halaqa-shared']).toBe('teacher');

    await again.forget('halaqa-mosque');
    expect(JSON.parse(await storage.getItem(membershipKey(USER))).joined).toEqual([]);
  });

  test('a refresh asked for during another runs after it; one on its way doesn\'t bring back a halaqa just left', async () => {
    const storage = new MemoryCacheStorage();
    let listed = ['halaqa-mosque'], release;
    const gate = () => new Promise((r) => { release = r; });
    let waiting = gate(), calls = 0;
    const api = {
      async halaqaVersions() { calls++; const answer = listed.map((id) => ({ id, revision: 1, version: 7, deleted: false, role: 'member', owner: false })); await waiting; return answer; },
      async joinedHalaqa(id) { return view({ id }); },
      async halaqaPeople() { return []; },
      async photoLinks() { return {}; },
    };
    const store = createMembershipStore({ user: USER, api, storage, now: () => 1_000 });
    const first = store.refresh('2026-10-13');
    await new Promise((r) => setTimeout(r, 0));
    // Left while the first is on its way (its answer still lists it).
    listed = [];
    await store.forget('halaqa-mosque');
    const second = store.refresh('2026-10-13');
    expect(store.refresh('2026-10-13')).toBe(second);
    release(); await first;
    expect(store.getState().joined).toEqual([]);
    waiting = Promise.resolve();
    await second;
    expect(calls).toBe(2);
    expect(store.getState().joined).toEqual([]);
  });
});

describe('a member\'s own reminders and record', () => {
  const api = (listed) => ({
    async halaqaVersions() { return listed().map((id) => ({ id, revision: 1, version: 7, deleted: false, role: 'member', owner: false })); },
    async joinedHalaqa(id) { return view({ id }); },
    async halaqaPeople() { return []; },
    async photoLinks() { return {}; },
  });

  test('the reminder they chose is kept on the phone, and goes with the halaqa', async () => {
    const storage = new MemoryCacheStorage();
    let listed = ['halaqa-mosque', 'halaqa-home'];
    const store = createMembershipStore({ user: USER, api: api(() => listed), storage, now: () => 1_000 });
    await store.refresh('2026-10-13');
    await store.setReminder('halaqa-mosque', 30);
    await store.setReminder('halaqa-home', 0);
    expect(store.getState().reminders).toEqual({ 'halaqa-mosque': 30, 'halaqa-home': 0 });
    await store.setReminder('halaqa-home', undefined);
    expect(store.getState().reminders).toEqual({ 'halaqa-mosque': 30 });
    // Read back on the phone; a lead the app doesn't know is left out.
    const saved = JSON.parse(await storage.getItem(membershipKey(USER)));
    await storage.setItem(membershipKey(USER), JSON.stringify({ ...saved, reminders: { ...saved.reminders, 'halaqa-home': 45 } }));
    const again = createMembershipStore({ user: USER, api: api(() => listed), storage, now: () => 1_000 });
    await again.read();
    expect(again.getState().reminders).toEqual({ 'halaqa-mosque': 30 });
    // Taken out of the halaqa (the account no longer lists it), or left: its reminder goes too.
    listed = ['halaqa-home'];
    await again.refresh('2026-10-13');
    expect(again.getState().reminders).toEqual({});
    await again.setReminder('halaqa-home', 60);
    await again.forget('halaqa-home');
    expect(JSON.parse(await storage.getItem(membershipKey(USER))).reminders).toEqual({});
  });

  test('what they pass is what their record hasn\'t taken in yet; a portion changed afterwards counts anew', () => {
    const entry = (session, date, recitations, studentId = 'student-me') => ({ id: session, date, entries: [{ student: studentId, attendance: 'present', recitations }] });
    const joined = joinedFrom(view(), '2026-10-01');
    joined.halaqa.sessions = [
      entry('session-1', '2026-10-05', [recitation('new', 'good'), { ...recitation('revision', 'excellent'), portion: p(112, 1, 114, 6) }]),
      entry('session-2', '2026-10-07', [{ ...recitation('new', 'repeat'), portion: p(67, 11, 67, 20) }]),
      entry('session-3', '2026-10-12', [{ ...recitation('new', 'fair'), portion: p(67, 11, 67, 20) }]),
      entry('session-4', '2026-10-12', [recitation('new', 'excellent')], 'student-other'),
    ];
    const none = () => new Set();
    // New portions heard and not to be repeated; their revision and someone else's left out.
    expect(passedRecitations([joined], none).map((r) => [r.riwayah, r.key])).toEqual([
      ['warsh', 'halaqa-mosque|session-1:67.1-67.10'], ['warsh', 'halaqa-mosque|session-3:67.11-67.20'],
    ]);
    // What the record of the halaqa's riwayah already took in is left out (another riwayah's doesn't count).
    const asked = [];
    const taken = (riwayah) => { asked.push(riwayah); return new Set(riwayah === 'warsh' ? ['halaqa-mosque|session-1:67.1-67.10'] : []); };
    expect(passedRecitations([joined], taken).map((r) => r.key)).toEqual(['halaqa-mosque|session-3:67.11-67.20']);
    expect(asked).toEqual(['warsh']);
    expect(recitationKey('halaqa-mosque', 'session-3', p(67, 11, 67, 21))).not.toBe('halaqa-mosque|session-3:67.11-67.20');
  });
});
