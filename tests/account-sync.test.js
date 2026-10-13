import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { createSyncEngine } from '../src/features/account/sync/engine';
import { canonical, fingerprint } from '../src/features/account/sync/fingerprint';
import { decodeLedger, emptyLedger, ledgerKey } from '../src/features/account/sync/ledger';
import { syncHalaqat } from '../src/features/account/sync/halaqat';
import { createFakeAccount, memoryDocument, memoryHalaqat } from './helpers/fake-account';

const USER = 'user-1';
/** A phone: its documents, its halaqat and its own marks, syncing with `account`. */
function phone(account, { documents = [], halaqat } = {}) {
  const storage = new MemoryCacheStorage();
  const source = halaqat === undefined ? undefined : memoryHalaqat(halaqat);
  const engine = createSyncEngine({ user: USER, remote: account.remote, storage, documents: () => documents, halaqat: () => source });
  return { engine, storage, documents, halaqat: source, sync: () => engine.run().then(() => engine.getState()) };
}
const plans = (n) => JSON.stringify({ version: 1, plans: Array.from({ length: n }, (_, i) => ({ id: `plan-${i}` })), memorization: [] });
const EMPTY_PLANS = JSON.stringify({ version: 1, plans: [], memorization: [] });
const doc = (raw, options) => memoryDocument('plans:v1', raw, { fallback: EMPTY_PLANS, ...options });

describe('fingerprints', () => {
  test('the same data has the same fingerprint, whatever the order of its keys', () => {
    expect(canonical({ b: 1, a: [{ d: 2, c: undefined }] })).toBe('{"a":[{"d":2}],"b":1}');
    expect(fingerprint({ a: 1, b: { c: 2, d: 3 } })).toBe(fingerprint(JSON.parse('{"b":{"d":3,"c":2},"a":1}')));
    expect(fingerprint({ a: 1 })).not.toBe(fingerprint({ a: 2 }));
    expect(fingerprint('حلقة')).not.toBe(fingerprint('حلقه'));
  });
  test('marks that are someone else\'s, or unreadable, are started afresh', () => {
    expect(decodeLedger(null, USER)).toEqual(emptyLedger(USER));
    expect(decodeLedger(JSON.stringify(emptyLedger('other')), USER)).toEqual(emptyLedger(USER));
    expect(decodeLedger('{', USER)).toEqual(emptyLedger(USER));
    const kept = { ...emptyLedger(USER), documents: { 'plans:v1': { revision: 2, fp: 'x' } } };
    expect(decodeLedger(JSON.stringify(kept), USER)).toEqual(kept);
  });
});

describe('documents', () => {
  test('the first sync puts the phone\'s data in an empty account, once', async () => {
    const account = createFakeAccount();
    const a = phone(account, { documents: [doc(plans(2))] });
    expect((await a.sync()).problem).toBeUndefined();
    expect(account.documents.get('plans:v1')).toEqual({ revision: 1, data: JSON.parse(plans(2)) });
    account.calls.length = 0;
    await a.sync();
    expect(account.calls).toEqual(['documentRevisions']);
    expect(JSON.parse(await a.storage.getItem(ledgerKey(USER))).documents['plans:v1'].revision).toBe(1);
  });

  test('an empty phone takes the account\'s data; an empty phone puts nothing in an empty account', async () => {
    const account = createFakeAccount();
    await phone(account, { documents: [doc(EMPTY_PLANS)] }).sync();
    expect(account.documents.size).toBe(0);
    await phone(account, { documents: [doc(plans(3))] }).sync();
    const fresh = doc(EMPTY_PLANS);
    await phone(account, { documents: [fresh] }).sync();
    expect(JSON.parse(fresh.value).plans).toHaveLength(3);
  });

  test('a change on one phone reaches the other; a phone that missed it never overwrites it', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(1)), onB = doc(EMPTY_PLANS);
    const a = phone(account, { documents: [onA] }), b = phone(account, { documents: [onB] });
    await a.sync(); await b.sync();
    expect(JSON.parse(onB.value)).toEqual(JSON.parse(onA.value));
    onA.set(plans(4));
    await a.sync();
    expect(account.documents.get('plans:v1').revision).toBe(2);
    await b.sync(); // B changed nothing: it takes A's, and puts nothing
    expect(JSON.parse(onB.value).plans).toHaveLength(4);
    expect(account.documents.get('plans:v1').revision).toBe(2);
  });

  test('changed on both phones: the user chooses, either way', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(1)), onB = doc(EMPTY_PLANS);
    const a = phone(account, { documents: [onA] }), b = phone(account, { documents: [onB] });
    await a.sync(); await b.sync();
    onA.set(plans(2)); onB.set(plans(5));
    await a.sync();
    const state = await b.sync();
    expect(state.conflicts.map((c) => c.key)).toEqual(['plans:v1']);
    expect(JSON.parse(onB.value).plans).toHaveLength(5); // nothing changed until the user chooses
    await b.engine.settle('account');
    expect(JSON.parse(onB.value).plans).toHaveLength(2);
    expect(b.engine.getState().conflicts).toEqual([]);

    onA.set(plans(3)); onB.set(plans(6));
    await a.sync();
    await b.sync();
    await b.engine.settle('phone');
    expect(JSON.parse(JSON.stringify(account.documents.get('plans:v1').data)).plans).toHaveLength(6);
    await a.sync(); // A changed nothing since: it takes B's
    expect(JSON.parse(onA.value).plans).toHaveLength(6);
  });

  test('signing in on a phone with its own data, to an account with other data, asks', async () => {
    const account = createFakeAccount();
    await phone(account, { documents: [doc(plans(2))] }).sync();
    const mine = doc(plans(5));
    const b = phone(account, { documents: [mine] });
    expect((await b.sync()).conflicts.map((c) => c.key)).toEqual(['plans:v1']);
    expect(account.documents.get('plans:v1').data.plans).toHaveLength(2);
    // The same data on both sides is no conflict.
    expect((await phone(account, { documents: [doc(plans(2))] }).sync()).conflicts).toEqual([]);
  });

  test('the phone\'s own settings: they go up, and come down only to a new phone', async () => {
    const account = createFakeAccount();
    const prefs = (theme) => memoryDocument('reader:preferences:v1', JSON.stringify({ theme }), { policy: 'restore', fallback: '{"theme":"light"}' });
    const onA = prefs('dark'), onB = prefs('sepia'), fresh = prefs('light');
    const a = phone(account, { documents: [onA] }), b = phone(account, { documents: [onB] });
    await a.sync();
    expect((await b.sync()).conflicts).toEqual([]);
    expect(account.documents.get('reader:preferences:v1').data).toEqual({ theme: 'sepia' });
    await a.sync(); // A keeps its own
    expect(JSON.parse(onA.value)).toEqual({ theme: 'dark' });
    onA.set(JSON.stringify({ theme: 'night' }));
    await a.sync();
    expect(account.documents.get('reader:preferences:v1').data).toEqual({ theme: 'night' });
    await phone(account, { documents: [fresh] }).sync();
    expect(JSON.parse(fresh.value)).toEqual({ theme: 'night' });
  });

  test('an answer lost on the way back is caught up at the next sync, without a conflict', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(1));
    const a = phone(account, { documents: [onA] });
    await a.sync();
    onA.set(plans(2));
    const realPut = account.remote.putDocument;
    let lost = true;
    account.remote.putDocument = async (...args) => { const r = await realPut(...args); if (lost) { lost = false; throw Object.assign(new Error('lost'), { kind: 'network' }); } return r; };
    expect((await a.sync()).problem).toBe('network');
    expect(account.documents.get('plans:v1').revision).toBe(2);
    const state = await a.sync();
    expect(state.problem).toBeUndefined();
    expect(state.conflicts).toEqual([]);
    expect(JSON.parse(await a.storage.getItem(ledgerKey(USER))).documents['plans:v1'].revision).toBe(2);
  });

  test('an account copy this version can\'t read is left alone, and so is the phone\'s', async () => {
    const account = createFakeAccount();
    await phone(account, { documents: [doc(plans(1))] }).sync();
    account.documents.get('plans:v1').data = { version: 2, plans: [] };
    account.documents.get('plans:v1').revision = 9;
    const strict = doc(EMPTY_PLANS, { check: (raw) => { if (JSON.parse(raw).version !== 1) throw new Error('unsupported'); } });
    const state = await phone(account, { documents: [strict] }).sync();
    expect(state.unreadable).toEqual(['plans:v1']);
    expect(strict.value).toBe(EMPTY_PLANS);
    expect(account.documents.get('plans:v1').data.version).toBe(2);
  });

  test('offline: nothing is lost, and the next sync catches up', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(2));
    const a = phone(account, { documents: [onA] });
    account.fail(1);
    expect((await a.sync()).problem).toBe('network');
    expect(a.engine.pending()).toBe(true);
    expect((await a.sync()).problem).toBeUndefined();
    expect(a.engine.pending()).toBe(false);
    onA.set(plans(3));
    expect(a.engine.pending()).toBe(true);
  });
});

// Halaqat ------------------------------------------------------------------------------------------

const p = (fs, fa, ts, ta) => ({ from: { surah: fs, ayah: fa }, to: { surah: ts, ayah: ta } });
const student = (id, extra = {}) => ({ id, name: id, joinedOn: '2026-10-01', direction: 'backward', known: [], ...extra });
const entry = (s, extra = {}) => ({ student: s, attendance: 'present', recitations: [], ...extra });
const family = (extra = {}) => ({
  id: 'halaqa-family', name: 'حلقة العائلة', riwayah: 'warsh', weekdays: [0, 3], time: { hour: 17, minute: 30 }, reminder: { before: 60 }, createdOn: '2026-10-01',
  students: [student('student-a', { me: true }), student('student-b')],
  sessions: [{ id: 'session-1', date: '2026-10-04', entries: [entry('student-a', { recitations: [{ kind: 'new', portion: p(67, 1, 67, 10), grade: 'good', marks: [{ kind: 'mistake', at: { surah: 67, ayah: 3 } }] }], next: { new: p(67, 11, 67, 20) } }), entry('student-b', { attendance: 'absent' })] }],
  ...extra,
});
const state = (...halaqat) => ({ version: 1, halaqat });
const only = (source) => source.value.halaqat[0];

describe('halaqat', () => {
  test('a halaqa goes up whole and comes down the same on another phone', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) });
    await a.sync();
    const h = account.halaqat.get('halaqa-family');
    expect(h.students.size).toBe(2);
    expect(h.entries.size).toBe(2);
    expect(h.data).toEqual({ createdOn: '2026-10-01', name: 'حلقة العائلة', reminder: { before: 60 }, riwayah: 'warsh', time: { hour: 17, minute: 30 }, weekdays: [0, 3] });
    const b = phone(account, { halaqat: state() });
    await b.sync();
    expect(b.halaqat.value).toEqual(state(family()));
    expect(b.engine.pending()).toBe(false);
    account.calls.length = 0;
    await b.sync();
    expect(account.calls).toEqual(['documentRevisions', 'halaqaVersions']);
  });

  test('only what changed moves, and two phones recording the same day are merged', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    // A hears student-a on a new day; B marks student-b on the same day, both offline.
    a.halaqat.set(state({ ...only(a.halaqat), sessions: [...only(a.halaqat).sessions, { id: 'session-a2', date: '2026-10-07', entries: [entry('student-a')] }] }));
    b.halaqat.set(state({ ...only(b.halaqat), sessions: [...only(b.halaqat).sessions, { id: 'session-b2', date: '2026-10-07', entries: [entry('student-b', { attendance: 'late' })] }] }));
    await a.sync();
    let pulls = 0;
    const pull = account.remote.pullHalaqa;
    account.remote.pullHalaqa = async (id, since) => { pulls++; const r = await pull(id, since); expect(r.entries).toHaveLength(1); return r; };
    await b.sync();
    expect(pulls).toBe(1);
    account.remote.pullHalaqa = pull;
    await a.sync();
    for (const source of [a.halaqat, b.halaqat]) {
      const day = only(source).sessions.find((s) => s.date === '2026-10-07');
      expect(day.entries.map((e) => [e.student, e.attendance]).sort()).toEqual([['student-a', 'present'], ['student-b', 'late']]);
    }
    expect(only(a.halaqat).sessions.find((s) => s.date === '2026-10-07').id).toBe('session-a2'); // each phone keeps its own session id
  });

  test('the same participant\'s day changed on both phones: the last to sync wins everywhere', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    const setNote = (source, note) => source.set(state({ ...only(source), sessions: only(source).sessions.map((s) => ({ ...s, entries: s.entries.map((e) => e.student === 'student-b' ? { ...e, note } : e) })) }));
    setNote(a.halaqat, 'من أ'); setNote(b.halaqat, 'من ب');
    await a.sync(); await b.sync(); await a.sync();
    for (const source of [a.halaqat, b.halaqat]) expect(only(source).sessions[0].entries.find((e) => e.student === 'student-b').note).toBe('من ب');
    expect(a.engine.pending()).toBe(false);
    expect(b.engine.pending()).toBe(false);
  });

  test('deleting a day, a participant or a halaqa reaches the other phone', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family({ sessions: [...family().sessions, { id: 'session-2', date: '2026-10-07', entries: [entry('student-b')] }] })) });
    const b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    expect(only(b.halaqat).sessions).toHaveLength(2);

    a.halaqat.set(state({ ...only(a.halaqat), sessions: only(a.halaqat).sessions.filter((s) => s.date !== '2026-10-07') }));
    await a.sync(); await b.sync();
    expect(only(b.halaqat).sessions.map((s) => s.date)).toEqual(['2026-10-04']);

    a.halaqat.set(state({ ...only(a.halaqat), students: only(a.halaqat).students.filter((s) => s.id !== 'student-b'),
      sessions: only(a.halaqat).sessions.map((s) => ({ ...s, entries: s.entries.filter((e) => e.student !== 'student-b') })) }));
    await a.sync(); await b.sync();
    expect(only(b.halaqat).students.map((s) => s.id)).toEqual(['student-a']);
    expect(only(b.halaqat).sessions[0].entries.map((e) => e.student)).toEqual(['student-a']);

    // B changes the halaqa while A deletes it: the deletion wins.
    b.halaqat.set(state({ ...only(b.halaqat), name: 'اسم جديد' }));
    a.halaqat.set(state());
    await a.sync();
    expect(account.halaqat.get('halaqa-family').deleted).toBe(true);
    await b.sync();
    expect(b.halaqat.value.halaqat).toEqual([]);
    expect(b.engine.pending()).toBe(false);
  });

  test('signing in again on a phone that already has the same halaqa sends nothing back', async () => {
    const account = createFakeAccount();
    await phone(account, { halaqat: state(family()) }).sync();
    const pushes = account.calls.filter((c) => c === 'pushHalaqa').length;
    const again = phone(account, { halaqat: state(family()) }); // fresh marks
    await again.sync();
    expect(account.calls.filter((c) => c === 'pushHalaqa').length).toBe(pushes);
    expect(again.engine.pending()).toBe(false);
  });

  test('halaqat on both sides at the first sign-in are merged', async () => {
    const account = createFakeAccount();
    await phone(account, { halaqat: state(family()) }).sync();
    const mine = { ...family(), id: 'halaqa-mosque', name: 'حلقة المسجد', students: [student('student-z')], sessions: [] };
    const b = phone(account, { halaqat: state(mine) });
    await b.sync();
    expect(b.halaqat.value.halaqat.map((h) => h.id).sort()).toEqual(['halaqa-family', 'halaqa-mosque']);
    expect([...account.halaqat.keys()].sort()).toEqual(['halaqa-family', 'halaqa-mosque']);
  });

  test('the phone\'s owner stays one participant when both phones named one', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    const moveMe = (source, to) => source.set(state({ ...only(source), students: only(source).students.map(({ me, ...s }) => s.id === to ? { ...s, me: true } : s) }));
    moveMe(a.halaqat, 'student-b');
    await a.sync();
    moveMe(b.halaqat, 'student-a'); // unchanged on B: still a
    await b.sync();
    expect(only(b.halaqat).students.filter((s) => s.me).map((s) => s.id)).toEqual(['student-b']);
  });

  test('data from the account that doesn\'t check is not taken, and the rest goes on', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) });
    await a.sync();
    account.halaqat.get('halaqa-family').entries.get('2026-10-04|student-b').data = { attendance: 'sleeping', recitations: [] };
    account.halaqat.get('halaqa-family').version++;
    account.halaqat.get('halaqa-family').entries.get('2026-10-04|student-b').version = account.halaqat.get('halaqa-family').version;
    const b = phone(account, { halaqat: state() });
    const result = await b.sync();
    expect(result.problem).toBe('failed');
    expect(b.halaqat.value.halaqat).toEqual([]);
  });

  test('a push whose answer is lost is caught up without duplicates', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) });
    const push = account.remote.pushHalaqa;
    let lost = true;
    account.remote.pushHalaqa = async (...args) => { const r = await push(...args); if (lost) { lost = false; throw Object.assign(new Error('lost'), { kind: 'network' }); } return r; };
    const ledger = emptyLedger(USER);
    const { failed } = await syncHalaqat(account.remote, a.halaqat, ledger);
    expect(failed).toEqual(['halaqa-family']);
    await syncHalaqat(account.remote, a.halaqat, ledger);
    expect(only(a.halaqat)).toEqual(family());
    expect(account.halaqat.get('halaqa-family').entries.size).toBe(2);
    expect(Object.keys(ledger.halaqat['halaqa-family'].entries)).toHaveLength(2);
    expect(ledger.halaqat['halaqa-family'].version).toBe(account.halaqat.get('halaqa-family').version);
  });
});

describe('what the review found', () => {
  test('a phone without marks takes the account\'s halaqa records, never reverts them', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    b.halaqat.set(state({ ...only(b.halaqat), students: only(b.halaqat).students.map((s) => s.id === 'student-b' ? { ...s, name: 'أحمد' } : s) }));
    await b.sync();
    // A changed nothing, but lost its marks (another account signed in meanwhile, say).
    const again = phone(account, { halaqat: a.halaqat.value });
    await again.sync();
    expect(only(again.halaqat).students.find((s) => s.id === 'student-b').name).toBe('أحمد');
    expect(account.halaqat.get('halaqa-family').students.get('student-b').data.name).toBe('أحمد');
  });

  test('a record the phone keeps stays to go up, even changed back to what it was', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    const attend = (source, attendance) => source.set(state({ ...only(source), sessions: only(source).sessions.map((s) => ({ ...s, entries: s.entries.map((e) => e.student === 'student-b' ? { ...e, attendance } : e) })) }));
    attend(a.halaqat, 'late'); await a.sync();          // the account: late
    attend(b.halaqat, 'excused');                      // B, offline: excused
    const push = account.remote.pushHalaqa;
    account.remote.pushHalaqa = async () => { throw Object.assign(new Error('offline'), { kind: 'network' }); };
    await b.sync();                                     // pulled (B keeps its own), push failed
    account.remote.pushHalaqa = push;
    attend(b.halaqat, 'absent');                        // B changes it back to what it had before
    await b.sync();
    expect(account.halaqat.get('halaqa-family').entries.get('2026-10-04|student-b').data.attendance).toBe('absent');
    expect(b.engine.pending()).toBe(false);
  });

  test('a halaqa deleted on the phone while it downloads is deleted in the account, not emptied', async () => {
    const account = createFakeAccount();
    const a = phone(account, { halaqat: state(family()) }), b = phone(account, { halaqat: state() });
    await a.sync(); await b.sync();
    a.halaqat.set(state({ ...only(a.halaqat), name: 'اسم آخر' }));
    await a.sync();
    const pull = account.remote.pullHalaqa;
    account.remote.pullHalaqa = async (...args) => { const r = await pull(...args); b.halaqat.set(state()); return r; };
    await b.sync();
    account.remote.pullHalaqa = pull;
    await b.sync();
    const h = account.halaqat.get('halaqa-family');
    expect(h.deleted).toBe(true);
    expect([...h.students.values()].filter((s) => !s.deleted)).toHaveLength(2);
    expect(b.halaqat.value.halaqat).toEqual([]);
  });

  test('a halaqa whose id is another account\'s goes up under a new id', async () => {
    const account = createFakeAccount();
    account.halaqat.set('halaqa-family', { revision: 1, version: 1, deleted: false, data: {}, students: new Map(), entries: new Map() });
    account.others.add('halaqa-family');
    const a = phone(account, { halaqat: state(family()) });
    expect((await a.sync()).problem).toBe('failed');
    const renamed = only(a.halaqat).id;
    expect(renamed).not.toBe('halaqa-family');
    expect((await a.sync()).problem).toBeUndefined();
    expect(account.halaqat.get(renamed).students.size).toBe(2);
    expect(a.engine.pending()).toBe(false);
  });

  test('an account copy this version can\'t read never becomes a choice, nor is written over', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(1));
    const a = phone(account, { documents: [onA] });
    await a.sync();
    account.documents.get('plans:v1').data = { version: 2, plans: [] };
    account.documents.get('plans:v1').revision = 7;
    const strict = (raw) => { if (JSON.parse(raw).version !== 1) throw new Error('unsupported'); };
    const local = doc(plans(4), { check: strict });
    const b = phone(account, { documents: [local] });
    const state = await b.sync();
    expect(state.conflicts).toEqual([]);
    expect(state.unreadable).toEqual(['plans:v1']);
    expect(account.documents.get('plans:v1').data.version).toBe(2);
  });

  test('marks that can\'t be read stop the sync instead of starting over', async () => {
    const account = createFakeAccount();
    const onA = doc(plans(2));
    const storage = new MemoryCacheStorage();
    const failing = { getItem: async () => { throw new Error('disk'); }, setItem: (k, v) => storage.setItem(k, v) };
    const engine = createSyncEngine({ user: USER, remote: account.remote, storage: failing, documents: () => [onA], halaqat: () => undefined });
    await engine.run();
    expect(engine.getState().problem).toBe('failed');
    expect(account.calls).toEqual([]);
    expect(await storage.getItem(ledgerKey(USER))).toBeNull();
  });

  test('a stopped sync changes nothing more', async () => {
    const account = createFakeAccount();
    await phone(account, { documents: [doc(plans(3))] }).sync();
    const local = doc(EMPTY_PLANS);
    const b = phone(account, { documents: [local], halaqat: state() });
    const revisions = account.remote.documentRevisions;
    account.remote.documentRevisions = async () => { b.engine.stop(); return revisions(); };
    await b.engine.run();
    expect(account.calls.filter((c) => c === 'halaqaVersions')).toHaveLength(0);
  });
});
