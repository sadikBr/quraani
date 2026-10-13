import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { createPersistedStore } from '../src/features/quran-reader/state/persisted-store';
import { createBookmarksStore } from '../src/features/quran-reader/state/bookmarks';
import { createReadingPreferencesStore, decodeReadingPreferences, defaultReadingPreferences, READING_PREFERENCES_KEY } from '../src/features/quran-reader/state/reading-preferences';
import { createPlansRepository, PLANS_KEY } from '../src/features/plans/repository';
import { ADHKAR_KEY, applyAdhkar, decodeAdhkar, defaultAdhkarState } from '../src/features/adhkar/progress';
import { applyHalaqat, decodeHalaqat, defaultHalaqatState, HALAQAT_KEY } from '../src/features/halaqat/model';
import { halaqatSource, plansDocument, storeDocument, strictBookmarks } from '../src/features/account/sources';
import { createSyncEngine } from '../src/features/account/sync/engine';
import { createFakeAccount } from './helpers/fake-account';

const USER = 'user-1';
const tick = () => new Promise((resolve) => setTimeout(resolve, 10));
const memorized = { version: 1, plans: [], memorization: [{ riwayah: 'warsh', corpus: 'warsh-corpus', totalAyahs: 6214, ranges: [{ start: 6150, end: 6214 }] }] };
const family = {
  id: 'halaqa-family', name: 'حلقة العائلة', riwayah: 'warsh', weekdays: [0, 3], time: { hour: 17, minute: 30 }, createdOn: '2026-10-01',
  students: [{ id: 'student-a', name: 'إبراهيم', joinedOn: '2026-10-01', direction: 'backward', known: [], me: true }, { id: 'student-b', name: 'مريم', joinedOn: '2026-10-01', direction: 'forward', known: [] }],
  sessions: [{ id: 'session-1', date: '2026-10-11', entries: [{ student: 'student-b', attendance: 'present', recitations: [{ kind: 'new', portion: { from: { surah: 1, ayah: 1 }, to: { surah: 1, ayah: 7 } }, grade: 'excellent', marks: [] }], note: 'ما شاء الله' }] }],
};

/** A phone with the app's real stores over its own storage, as the providers set them up. */
async function phone(storage, account) {
  const plans = createPlansRepository(storage, () => '2026-10-13');
  const adhkar = createPersistedStore({ storage, key: ADHKAR_KEY, fallback: defaultAdhkarState, decode: decodeAdhkar, apply: applyAdhkar });
  const warsh = createBookmarksStore(storage, 'reader:warsh-bookmarks:v1');
  const preferences = createReadingPreferencesStore(storage);
  const halaqat = createPersistedStore({ storage, key: HALAQAT_KEY, fallback: defaultHalaqatState, decode: decodeHalaqat, apply: applyHalaqat });
  [adhkar, warsh, preferences, halaqat].forEach((store) => store.start());
  await plans.load();
  await tick();
  const documents = [
    plansDocument(plans),
    storeDocument(adhkar, ADHKAR_KEY, { decode: decodeAdhkar, fallback: defaultAdhkarState }),
    storeDocument(warsh, 'reader:warsh-bookmarks:v1', { decode: strictBookmarks, fallback: [] }),
    storeDocument(preferences, READING_PREFERENCES_KEY, { decode: decodeReadingPreferences, fallback: defaultReadingPreferences, policy: 'restore' }),
  ];
  const engine = createSyncEngine({ user: USER, remote: account.remote, storage, documents: () => documents, halaqat: () => halaqatSource(halaqat) });
  return { plans, adhkar, warsh, preferences, halaqat, engine, sync: async () => { await engine.run(); await tick(); return engine.getState(); } };
}

describe('restoring onto a new phone', () => {
  test('a phone that signs in to an account gets back everything synced, and keeps it', async () => {
    const account = createFakeAccount();
    const first = new MemoryCacheStorage();
    await first.setItem(PLANS_KEY, JSON.stringify(memorized));
    const a = await phone(first, account);
    a.adhkar.update({ type: 'tasbih' });
    a.adhkar.update({ type: 'reminder', kind: 'morning', value: { enabled: true, hour: 6, minute: 15 } });
    a.warsh.update({ key: '4:67:1', saved: true });
    a.preferences.update({ riwayah: 'hafs', fontSize: 40 });
    a.halaqat.update({ type: 'saveHalaqa', halaqa: { ...family, students: undefined, sessions: undefined } });
    for (const student of family.students) a.halaqat.update({ type: 'saveStudent', halaqa: family.id, student });
    a.halaqat.update({ type: 'saveEntries', halaqa: family.id, date: '2026-10-11', session: 'session-1', entries: family.sessions[0].entries });
    await tick();
    expect((await a.sync()).problem).toBeUndefined();

    // A new phone: nothing on it yet.
    const second = new MemoryCacheStorage();
    const b = await phone(second, account);
    const state = await b.sync();
    expect(state.problem).toBeUndefined();
    expect(state.conflicts).toEqual([]);
    expect(b.plans.memorization()).toEqual(memorized.memorization);
    expect(b.adhkar.getSnapshot().value.misbaha).toBe(1);
    expect(b.adhkar.getSnapshot().value.reminders.morning).toEqual({ enabled: true, hour: 6, minute: 15 });
    expect(b.warsh.getSnapshot().value).toEqual(['4:67:1']);
    expect(b.preferences.getSnapshot().value).toMatchObject({ riwayah: 'hafs', fontSize: 40 });
    expect(b.halaqat.getSnapshot().value).toEqual(a.halaqat.getSnapshot().value);

    // Written on the new phone, so it is there after the app restarts, offline.
    const reopened = await phone(second, createFakeAccount());
    expect(reopened.plans.memorization()).toEqual(memorized.memorization);
    expect(reopened.halaqat.getSnapshot().value.halaqat[0].sessions[0].entries[0].note).toBe('ما شاء الله');
    expect(reopened.warsh.getSnapshot().value).toEqual(['4:67:1']);

    // And nothing goes back up from the new phone.
    account.calls.length = 0;
    await b.sync();
    expect(account.calls.filter((c) => c === 'putDocument' || c === 'pushHalaqa')).toEqual([]);
  });
});
