import { describe, expect, test } from 'bun:test';
import { audioIds, collections, COLLECTION_IDS, isCollectionId } from '../src/features/adhkar/content';
import { adhkarReminderQueue, applyAdhkar, collectionProgress, countsOn, decodeAdhkar, defaultAdhkarState, nextUnfinished, TEXT_SCALES } from '../src/features/adhkar/progress';
import { quranReadings, readingLength, resolveReading } from '../src/features/adhkar/quran';
import { beadLayout } from '../src/features/adhkar/thread';

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

describe('Quran adhkar', () => {
  test('every Quran dhikr of the book is read from the mushaf, and only those', () => {
    const quranKeys = new Set(COLLECTION_IDS.flatMap((id) => collections[id].filter((d) => d.quran).map((d) => d.key)));
    expect([...quranKeys].sort()).toEqual(Object.keys(quranReadings).sort());
  });

  // A mushaf of another count (Warsh): Al-Baqarah's ayahs are numbered one lower than Hafs's.
  const ayah = (surahNumber, ayahNumber, hafs) => ({ surahNumber, ayahNumber, hafsAyahNumbers: hafs, text: `${surahNumber}:${ayahNumber}`, marker: 'ﰀ' });
  const quran = { bismillah: 'بسم', surahs: [
    { number: 2, name: 'سورة البقرة', ayahs: [ayah(2, 253, [254]), ayah(2, 254, [255]), ayah(2, 284, [285]), ayah(2, 285, [286])] },
    ...[112, 113, 114].map((n) => ({ number: n, name: `${n}`, ayahs: [ayah(n, 1, [1]), ayah(n, 2, [2])] })),
  ] };

  test('passages are found by their Hafs numbers, whole surahs marked', () => {
    const kursi = resolveReading(quran, quranReadings[75]);
    expect(kursi.map((p) => [p.surah.number, p.ayahs.map((a) => a.ayahNumber), p.whole])).toEqual([[2, [254], false]]);
    expect(quranReadings[75].before).toBeTruthy();
    expect(resolveReading(quran, quranReadings[101])[0].ayahs.map((a) => a.ayahNumber)).toEqual([284, 285]);
    expect(resolveReading(quran, quranReadings[76]).map((p) => [p.surah.number, p.whole])).toEqual([[112, true], [113, true], [114, true]]);
    expect(readingLength(kursi)).toBe('2:254'.length + 2);
    // A mushaf without the passage keeps the book's text.
    expect(resolveReading(quran, quranReadings[4])).toBeNull();
  });
});

describe('text size', () => {
  test('a saved step of the offered sizes, kept within them', () => {
    expect(defaultAdhkarState.textSize).toBe(TEXT_SCALES.indexOf(1));
    expect(decodeAdhkar(JSON.stringify({ version: 1, textSize: 5 })).textSize).toBe(5);
    expect(decodeAdhkar(JSON.stringify({ version: 1, textSize: 99 })).textSize).toBe(defaultAdhkarState.textSize);
    expect(decodeAdhkar(JSON.stringify({ version: 1, textSize: 1.5 })).textSize).toBe(defaultAdhkarState.textSize);
    expect(applyAdhkar(defaultAdhkarState, { type: 'textSize', step: 9 }).textSize).toBe(TEXT_SCALES.length - 1);
    expect(applyAdhkar(defaultAdhkarState, { type: 'textSize', step: -3 }).textSize).toBe(0);
  });
});

describe('the string of beads', () => {
  test('the bead shown gets the wide slot and the others share the rest, from the right', () => {
    const beads = beadLayout(5, 2, 126, 26);
    // Slots from the right: 25, 25, 26, 25, 25.
    expect([0, 1, 2, 3, 4].map((i) => beads.x(i))).toEqual([113.5, 88.5, 63, 37.5, 12.5]);
    expect(beads.at(120)).toBe(0);
    expect(beads.at(70)).toBe(2);
    expect(beads.at(51)).toBe(2);
    expect(beads.at(49)).toBe(3);
    expect(beads.at(0)).toBe(4);
  });

  test('taps beyond the ends, odd positions and one bead stay within the string', () => {
    const beads = beadLayout(4, 0, 100, 26);
    expect(beads.at(-10)).toBe(3);
    expect(beads.at(130)).toBe(0);
    expect(beadLayout(4, 9, 100, 26).x(3)).toBe(13);
    expect(beadLayout(1, 0, 80, 26).x(0)).toBe(40);
    expect(beadLayout(1, 0, 80, 26).at(5)).toBe(0);
    expect(beadLayout(3, 1, 0, 26).at(5)).toBe(0);
  });

  test('every bead is found where it is drawn, whichever is shown', () => {
    for (let current = 0; current < 23; current++) {
      const beads = beadLayout(23, current, 290, 26);
      for (let i = 0; i < 23; i++) expect(beads.at(beads.x(i))).toBe(i);
    }
  });
});
