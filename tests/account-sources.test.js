import { describe, expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { createPersistedStore } from '../src/features/quran-reader/state/persisted-store';
import { createBookmarksStore } from '../src/features/quran-reader/state/bookmarks';
import { createPlansRepository, PLANS_KEY } from '../src/features/plans/repository';
import { applyHalaqat, decodeHalaqat, defaultHalaqatState, HALAQAT_KEY } from '../src/features/halaqat/model';
import { halaqatSource, keepsAll, plansDocument, storeDocument, strictBookmarks } from '../src/features/account/sources';
import { applyAdhkar, decodeAdhkar, defaultAdhkarState } from '../src/features/adhkar/progress';
import { applyPractice, decodePractice, defaultPracticeState } from '../src/features/practice/progress';
import { decodeReadingPreferences, defaultReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';
import { collections } from '../src/features/adhkar/content';

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));

describe('the phone\'s stores, as sync sees them', () => {
  test('a store is read once loaded, and takes the account\'s copy only if unchanged meanwhile', async () => {
    const storage = new MemoryCacheStorage();
    await storage.setItem('reader:warsh-bookmarks:v1', JSON.stringify(['4:1:1']));
    const store = createBookmarksStore(storage, 'reader:warsh-bookmarks:v1');
    const source = storeDocument(store, 'reader:warsh-bookmarks:v1', { decode: strictBookmarks, fallback: [] });
    expect(source.read()).toBeUndefined();
    store.start();
    await tick();
    expect(source.read()).toBe('["4:1:1"]');
    expect(source.empty('[]')).toBe(true);
    expect(source.empty('["4:2:255"]')).toBe(false);
    let changes = 0;
    source.subscribe(() => changes++);
    expect(await source.replace('["4:2:255","4:1:1"]', '["4:1:1"]')).toBe(true);
    expect(store.getSnapshot().value).toEqual(['4:2:255', '4:1:1']);
    expect(changes).toBeGreaterThanOrEqual(1);
    await tick();
    expect(await storage.getItem('reader:warsh-bookmarks:v1')).toBe('["4:2:255","4:1:1"]');
    store.update({ key: '4:3:1', saved: true });
    expect(await source.replace('["4:9:9"]', '["4:2:255","4:1:1"]')).toBe(false); // changed meanwhile
    await expect(source.replace('{"not":"a list"}', source.read())).rejects.toThrow();
    expect(store.getSnapshot().value).toEqual(['4:2:255', '4:1:1', '4:3:1']);
  });

  test('goals: the account\'s copy is checked, written and shown, unless the goals changed meanwhile', async () => {
    const storage = new MemoryCacheStorage();
    const repository = createPlansRepository(storage, () => '2026-10-13');
    const source = plansDocument(repository);
    expect(source.read()).toBeUndefined();
    await repository.load();
    const empty = source.read();
    expect(JSON.parse(empty)).toEqual({ version: 1, plans: [], memorization: [] });
    expect(source.empty(empty)).toBe(true);
    let told = 0;
    repository.subscribe(() => told++);
    const memorized = JSON.stringify({ version: 1, plans: [], memorization: [{ riwayah: 'warsh', corpus: 'c', totalAyahs: 6214, ranges: [{ start: 0, end: 7 }] }] });
    expect(source.empty(memorized)).toBe(false);
    expect(await source.replace(memorized, empty)).toBe(true);
    expect(told).toBe(1);
    expect(repository.memorization()[0].ranges).toEqual([{ start: 0, end: 7 }]);
    expect(await storage.getItem(PLANS_KEY)).toBe(memorized);
    expect(await source.replace(empty, empty)).toBe(false);
    await expect(source.replace('{"version":2}', source.read())).rejects.toThrow();
    expect(repository.memorization()).toHaveLength(1);
  });

  test('halaqat change only to data that checks', async () => {
    const storage = new MemoryCacheStorage();
    const store = createPersistedStore({ storage, key: HALAQAT_KEY, fallback: defaultHalaqatState, decode: decodeHalaqat, apply: applyHalaqat });
    const source = halaqatSource(store);
    expect(source.transform((s) => s)).toBe(false); // not read yet
    store.start();
    await tick();
    expect(source.transform((s) => s)).toBe(true);
    const halaqa = { id: 'halaqa-a', name: 'أ', riwayah: 'warsh', weekdays: [], createdOn: '2026-10-01', students: [], sessions: [] };
    expect(source.transform((s) => ({ ...s, halaqat: [halaqa] }))).toBe(true);
    expect(source.read().halaqat).toHaveLength(1);
    expect(() => source.transform((s) => ({ ...s, halaqat: [{ ...halaqa, name: '' }] }))).toThrow();
    expect(source.read().halaqat[0].name).toBe('أ');
    await tick();
    expect(JSON.parse(await storage.getItem(HALAQAT_KEY)).halaqat[0].id).toBe('halaqa-a');
  });
});


describe('copies from the account are read whole, or not at all', () => {
  const whole = (decode, value) => { const raw = JSON.stringify(value); return keepsAll(decode(raw), JSON.parse(raw)); };

  test('the app\'s own data reads whole', () => {
    const morning = collections.morning[0].key;
    let adhkar = defaultAdhkarState;
    for (const change of [
      { type: 'step', day: '2026-10-13', collection: 'morning', key: morning, delta: 1 },
      { type: 'step', day: '2026-10-13', collection: 'morning', key: morning, delta: -1 },
      { type: 'tasbih' }, { type: 'textSize', step: 4 }, { type: 'reminder', kind: 'evening', value: { enabled: true, hour: 18, minute: 30 } },
    ]) {
      adhkar = applyAdhkar(adhkar, change);
      expect(whole(decodeAdhkar, adhkar)).toBe(true);
    }
    let practice = defaultPracticeState;
    for (const change of [
      { type: 'begin', riwayah: 'warsh' },
      { type: 'grade', riwayah: 'warsh', key: '67:1', grade: 'wrong', date: '2026-10-13' },
      { type: 'exam', riwayah: 'hafs', result: { date: '2026-10-13', total: 10, good: 7, hesitant: 2, wrong: 1 } },
    ]) {
      practice = applyPractice(practice, change);
      expect(whole(decodePractice, practice)).toBe(true);
    }
    expect(whole(decodeReadingPreferences, defaultReadingPreferences)).toBe(true);
    expect(whole(decodeReadingPreferences, { ...defaultReadingPreferences, riwayah: 'hafs', fontSize: defaultReadingPreferences.fontSize, reciters: { warsh: 3 } })).toBe(true);
  });

  test('data from a newer version does not', () => {
    expect(whole(decodeAdhkar, { ...defaultAdhkarState, version: 2 })).toBe(false);
    expect(whole(decodeAdhkar, { ...defaultAdhkarState, streak: 12 })).toBe(false);
    expect(whole(decodeReadingPreferences, { ...defaultReadingPreferences, riwayah: 'qalun' })).toBe(false);
    expect(whole(decodePractice, { ...defaultPracticeState, version: 2 })).toBe(false);
  });

  test('a store won\'t take one, and it is never counted as empty', async () => {
    const storage = new MemoryCacheStorage();
    const store = createPersistedStore({ storage, key: 'adhkar:v1', fallback: defaultAdhkarState, decode: decodeAdhkar, apply: applyAdhkar });
    store.start();
    await tick();
    const source = storeDocument(store, 'adhkar:v1', { decode: decodeAdhkar, fallback: defaultAdhkarState });
    const newer = JSON.stringify({ ...defaultAdhkarState, version: 2, misbaha: 99 });
    expect(() => source.check(newer)).toThrow();
    await expect(source.replace(newer, source.read())).rejects.toThrow();
    expect(store.getSnapshot().value.misbaha).toBe(0);
    expect(() => source.check(JSON.stringify({ ...defaultAdhkarState, misbaha: 5 }))).not.toThrow();
  });
});
