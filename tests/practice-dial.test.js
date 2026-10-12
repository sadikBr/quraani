import { describe, expect, test } from 'bun:test';
import { ayahPosition, dialUnits, initialFocus, rangeUnits, rotationFor, toggleUnit, unitAngle, unitAt, unitAtPointer, unitState } from '../src/features/practice/dial';
import { memorizedSince, presetsFor } from '../src/features/practice/presets';

// A small mushaf of 114 surahs of three ayahs each, in 30 juz and 60 hizbs.
const ayahs = Array.from({ length: 342 }, (_, i) => ({ surahNumber: Math.floor(i / 3) + 1, ayahNumber: (i % 3) + 1, pageNumber: Math.floor(i / 6) + 1, text: 'كلمة' }));
const bounds = (count) => Array.from({ length: count + 1 }, (_, i) => Math.round((i * ayahs.length) / count));
const index = {
  mushafId: 4, ayahs, corpus: 'test', pages: bounds(57), hizbs: bounds(60), juzs: bounds(30), quarters: bounds(240),
  surahNames: Object.fromEntries(Array.from({ length: 114 }, (_, i) => [i + 1, `سورة الناس${i + 1}`])),
};

describe('the dial', () => {
  test('surahs, juz and hizbs, with their spans and names', () => {
    const surahs = dialUnits(index, 'surah');
    expect(surahs).toHaveLength(114);
    expect(surahs[1]).toMatchObject({ start: 3, end: 6, number: 2 });
    // The names leave out the word «سورة».
    expect(surahs[0].label.startsWith('سورة')).toBe(false);
    expect(dialUnits(index, 'juz')).toHaveLength(30);
    expect(dialUnits(index, 'hizb')[59]).toMatchObject({ start: index.hizbs[59], end: 342, number: 60 });
  });

  test('a unit at the pointer is the one a tap there finds, as the wheel turns', () => {
    for (const count of [114, 30, 60]) for (const i of [0, 1, 17, count - 1]) {
      const rotation = rotationFor(i, count, 725);
      expect(unitAtPointer(rotation, count)).toBe(i);
      expect(unitAt(180, rotation, count)).toBe(i);
      // The next unit lies just below the pointer.
      expect(unitAt(180 - 360 / count, rotation, count)).toBe((i + 1) % count);
      // The turn chosen is the nearest one.
      expect(Math.abs(rotation - 725)).toBeLessThanOrEqual(180 + 360 / count);
    }
    expect(unitAngle(0, 114)).toBe(180);
  });

  test('a tap chooses a unit or takes it out; a sweep adds or takes out every unit it passes', () => {
    const units = dialUnits(index, 'surah');
    let chosen = toggleUnit([], units[2]);
    expect(chosen).toEqual([{ start: 6, end: 9 }]);
    expect(unitState(chosen, units[2])).toBe('full');
    expect(unitState([{ start: 7, end: 8 }], units[2])).toBe('part');
    chosen = toggleUnit(chosen, units[2]);
    expect(chosen).toEqual([]);
    // Swept either way round, from what was chosen when it began.
    const before = [{ start: 0, end: 3 }];
    expect(rangeUnits(before, units, 4, 2, true)).toEqual([{ start: 0, end: 3 }, { start: 6, end: 15 }]);
    expect(rangeUnits([{ start: 0, end: 30 }], units, 2, 4, false)).toEqual([{ start: 0, end: 6 }, { start: 15, end: 30 }]);
    // Across the seam, an-Nas to al-Fatiha are neighbours: the two of them, not everything between.
    expect(rangeUnits([], units, 113, 0, true)).toEqual([{ start: 0, end: 3 }, { start: 339, end: 342 }]);
    expect(rangeUnits([], units, 1, 112, true)).toEqual([{ start: 0, end: 6 }, { start: 336, end: 342 }]);
  });

  test('ayahs fall between unit centres, and the wheel opens on what is chosen', () => {
    const units = dialUnits(index, 'surah');
    expect(ayahPosition(units, 3)).toBe(0.5);
    expect(ayahPosition(units, 4)).toBeCloseTo(0.5 + 1 / 3);
    expect(initialFocus(units, [{ start: 30, end: 40 }], [{ start: 0, end: 3 }])).toBe(10);
    expect(initialFocus(units, [], [{ start: 9, end: 12 }])).toBe(3);
    expect(initialFocus(units, [], [])).toBe(0);
  });
});

describe('suggestions', () => {
  const memorizing = (progress) => ({ id: 'plan-1', riwayah: 'warsh', corpus: 'test', totalAyahs: 342, goal: { type: 'memorization', weeklyQuarters: 4 }, progress });
  const today = '2026-10-12';

  test('one\'s own: the review, everything memorized, what is new and what is old, then the last two juz', () => {
    const plans = [memorizing([{ date: '2026-10-05', from: 300, to: 330, finished: true }, { date: '2026-06-01', from: 0, to: 30, finished: true }])];
    const presets = presetsFor({ index, memorized: [{ start: 0, end: 30 }, { start: 300, end: 342 }], plans, riwayah: 'warsh', review: 3, helper: false, today });
    expect(presets.map((p) => p.kind)).toEqual(['review', 'memorized', 'recent', 'old', 'juz', 'juz']);
    expect(presets.find((p) => p.kind === 'recent').ranges).toEqual([{ start: 300, end: 330 }]);
    expect(presets.find((p) => p.kind === 'old').ranges).toEqual([{ start: 0, end: 30 }, { start: 330, end: 342 }]);
    expect(presets.filter((p) => p.kind === 'juz').map((p) => [p.number, p.ranges])).toEqual([[30, [{ start: index.juzs[29], end: 342 }]], [29, [{ start: index.juzs[28], end: index.juzs[29] }]]]);
  });

  test('nothing new: neither new nor old repeats «محفوظك كله»; nothing memorized or to review: the juz alone', () => {
    const plans = [memorizing([{ date: '2026-01-01', from: 0, to: 30, finished: true }])];
    expect(presetsFor({ index, memorized: [{ start: 0, end: 30 }], plans, riwayah: 'warsh', review: 0, helper: false, today }).map((p) => p.kind)).toEqual(['memorized', 'juz', 'juz']);
    expect(presetsFor({ index, memorized: [], plans: [], riwayah: 'warsh', review: 0, helper: false, today }).map((p) => p.kind)).toEqual(['juz', 'juz']);
  });

  test('listening to someone else: one\'s own record is left out; surahs often learnt by heart are offered', () => {
    const presets = presetsFor({ index, memorized: [{ start: 0, end: 30 }], plans: [], riwayah: 'warsh', review: 5, helper: true, today });
    expect(presets.map((p) => [p.kind, p.number])).toEqual([['juz', 30], ['juz', 29], ['surah', 18], ['surah', 36]]);
    expect(presets[2].ranges).toEqual([{ start: 51, end: 54 }]);
  });

  test('memorized lately counts only goals of this edition, and spans that fit it', () => {
    const plans = [memorizing([{ date: '2026-10-10', from: 10, to: 20, finished: false }, { date: '2026-10-10', from: 330, to: 400, finished: false }]),
      { ...memorizing([{ date: '2026-10-10', from: 50, to: 60, finished: false }]), corpus: 'other' },
      { ...memorizing([{ date: '2026-10-10', from: 70, to: 80, finished: false }]), riwayah: 'hafs' }];
    expect(memorizedSince(plans, 'warsh', index, '2026-10-01')).toEqual([{ start: 10, end: 20 }]);
  });
});
