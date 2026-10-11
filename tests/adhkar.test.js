import { describe, expect, test } from 'bun:test';
import { audioIds, collections, COLLECTION_IDS, isCollectionId } from '../src/features/adhkar/content';
import { adhkarReminderQueue, applyAdhkar, collectionProgress, countsOn, decodeAdhkar, defaultAdhkarState, nextUnfinished } from '../src/features/adhkar/progress';

const find = (id, key) => collections[id].find((d) => d.key === key);
const finish = (state, id, day) => collections[id].reduce((s, d) => Array.from({ length: d.count }).reduce((x) => applyAdhkar(x, { type: 'step', day, collection: id, key: d.key, delta: 1 }), s), state);

describe('adhkar content', () => {
  test('every collection has adhkar with unique keys, counts and clean text', () => {
    for (const id of COLLECTION_IDS) {
      const items = collections[id];
      expect(items.length).toBeGreaterThan(3);
      expect(new Set(items.map((d) => d.key)).size).toBe(items.length);
      for (const d of items) {
        expect(Number.isInteger(d.count) && d.count >= 1).toBe(true);
        expect(d.text).toBe(d.text.normalize('NFC'));
        expect(d.text).not.toMatch(/[()[\]*]|\s{2,}|^\s|\s$/);
      }
    }
    expect(isCollectionId('morning')).toBe(true);
    expect(isCollectionId('__proto__')).toBe(false);
    expect(audioIds.length).toBe(49);
  });

  test('morning and evening differ only where the book gives an evening wording', () => {
    expect(find('morning', '77').text).toContain('أَصْبَحْنَا');
    expect(find('evening', '77e').text).toContain('أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ');
    expect(find('evening', '77e').text).toContain('هَذِهِ اللَّيْلَةِ');
    expect(find('evening', '77e').audio).toBeUndefined();
    expect(find('evening', '78e').text).toContain('الْمَصِيرُ');
    for (const key of ['80e', '81e', '89e', '90e']) expect(find('evening', key).text).not.toContain('أَصْبَح');
    expect(find('evening', '93')).toBeUndefined();
    expect(find('morning', '97')).toBeUndefined();
    expect(find('morning', '83').count).toBe(7);
  });

  test('counted parts get their own counters', () => {
    expect(['66a', '66b', '69a', '69b', '69c', '69d'].map((key) => find('afterPrayer', key).count)).toEqual([3, 1, 33, 33, 33, 1]);
    expect(find('afterPrayer', '69b').text).toBe('الْحَمْدُ لِلَّهِ');
    expect(['106a', '106b', '106c'].map((key) => find('sleep', key).count)).toEqual([33, 33, 34]);
    expect(find('sleep', '106c').text).toBe('اللَّهُ أَكْبَرُ');
    expect(find('sleep', '110').surahs).toEqual([32, 67]);
    expect(find('morning', '76').text.split('\n')).toHaveLength(3);
  });

  test('typos in the source text are corrected', () => {
    for (const [id, key] of [['morning', '76'], ['afterPrayer', '70'], ['sleep', '99']]) expect(find(id, key).text).toContain('مِنَ الْجِنَّةِ وَالنَّاسِ﴾');
    expect(find('evening', '98').text).toContain('نَبِيِّنَا');
    expect(find('waking', '4').text).toContain('وَعَلَى جُنُوبِهِمْ');
  });
});

describe('adhkar progress', () => {
  const day = '2026-10-10';
  test('counts stay between nothing and the dhikr count, and belong to their day', () => {
    let state = defaultAdhkarState;
    for (let i = 0; i < 5; i++) state = applyAdhkar(state, { type: 'step', day, collection: 'morning', key: '76', delta: 1 });
    expect(countsOn(state, 'morning', day)).toEqual({ 76: 3 });
    state = applyAdhkar(state, { type: 'step', day, collection: 'morning', key: '76', delta: -1 });
    expect(countsOn(state, 'morning', day)).toEqual({ 76: 2 });
    expect(applyAdhkar(state, { type: 'step', day, collection: 'morning', key: 'nope', delta: 1 })).toBe(state);
    expect(countsOn(state, 'morning', '2026-10-11')).toEqual({});
    const tomorrow = applyAdhkar(state, { type: 'step', day: '2026-10-11', collection: 'evening', key: '75', delta: 1 });
    expect(tomorrow.counts).toEqual({ evening: { 75: 1 } });
    expect(applyAdhkar(state, { type: 'reset', day, collection: 'morning' }).counts).toEqual({});
  });

  test('a collection is complete when every dhikr is said its number of times', () => {
    let state = applyAdhkar(defaultAdhkarState, { type: 'step', day, collection: 'waking', key: '1', delta: 1 });
    expect(collectionProgress(state, 'waking', day)).toEqual({ done: 1, total: 4, started: true, complete: false });
    state = finish(state, 'waking', day);
    expect(collectionProgress(state, 'waking', day).complete).toBe(true);
    expect(collectionProgress(state, 'waking', '2026-10-11')).toEqual({ done: 0, total: 4, started: false, complete: false });
    expect(nextUnfinished('waking', { 1: 1, 2: 1 })).toBe(2);
    expect(nextUnfinished('waking', { 1: 1, 3: 1, 4: 1 }, 2)).toBe(1);
    expect(nextUnfinished('waking', { 1: 1, 2: 1, 3: 1, 4: 1 })).toBe(-1);
  });

  test('saved data keeps what is valid', () => {
    expect(decodeAdhkar(null)).toEqual(defaultAdhkarState);
    expect(decodeAdhkar('not json')).toEqual(defaultAdhkarState);
    expect(decodeAdhkar(JSON.stringify({ version: 2 }))).toEqual(defaultAdhkarState);
    const decoded = decodeAdhkar(JSON.stringify({
      version: 1, day,
      counts: { morning: { 76: 9, 75: 1, nope: 2, 77: -1 }, toString: { 1: 1 }, sleep: null },
      reminders: { morning: { enabled: true, hour: 6, minute: 30 }, evening: { enabled: true, hour: 25, minute: 0 } },
    }));
    expect(decoded.counts).toEqual({ morning: { 76: 3, 75: 1 } });
    expect(decoded.reminders).toEqual({ morning: { enabled: true, hour: 6, minute: 30 }, evening: defaultAdhkarState.reminders.evening });
  });
});

describe('misbaha', () => {
  test('counts on across days until restarted, and a restart can be taken back', () => {
    let state = defaultAdhkarState;
    for (let i = 0; i < 34; i++) state = applyAdhkar(state, { type: 'tasbih' });
    expect(state.misbaha).toBe(34);
    state = applyAdhkar(state, { type: 'step', day: '2026-10-11', collection: 'waking', key: '1', delta: 1 });
    expect(state.misbaha).toBe(34);
    state = applyAdhkar(state, { type: 'misbaha', count: 0 });
    expect(state.misbaha).toBe(0);
    expect(applyAdhkar(state, { type: 'misbaha', count: 34 }).misbaha).toBe(34);
    expect(applyAdhkar(state, { type: 'misbaha', count: -3 }).misbaha).toBe(0);
  });

  test('a saved count is kept when valid', () => {
    expect(decodeAdhkar(JSON.stringify({ version: 1, misbaha: 99 })).misbaha).toBe(99);
    for (const misbaha of [-1, 1.5, '12', null]) expect(decodeAdhkar(JSON.stringify({ version: 1, misbaha })).misbaha).toBe(0);
  });
});

describe('adhkar reminders', () => {
  const on = (state, kind, hour, minute = 0) => applyAdhkar(state, { type: 'reminder', kind, value: { enabled: true, hour, minute } });
  test('one reminder a day at the chosen time, from now on', () => {
    const state = on(on(defaultAdhkarState, 'morning', 6, 30), 'evening', 17);
    const queue = adhkarReminderQueue(state, new Date(2026, 9, 10, 12, 0), 3);
    expect(queue.map((r) => r.id)).toEqual([
      'quranni-adhkar:evening:2026-10-10:1700', 'quranni-adhkar:morning:2026-10-11:0630', 'quranni-adhkar:evening:2026-10-11:1700',
      'quranni-adhkar:morning:2026-10-12:0630', 'quranni-adhkar:evening:2026-10-12:1700',
    ]);
    expect(queue[0].date.getHours()).toBe(17);
    expect(adhkarReminderQueue(defaultAdhkarState, new Date(2026, 9, 10, 12, 0))).toEqual([]);
  });

  test('a day whose adhkar are done is skipped', () => {
    let state = on(defaultAdhkarState, 'evening', 17);
    state = finish(state, 'evening', '2026-10-10');
    const queue = adhkarReminderQueue(state, new Date(2026, 9, 10, 12, 0), 2);
    expect(queue.map((r) => r.id)).toEqual(['quranni-adhkar:evening:2026-10-11:1700']);
  });
});
