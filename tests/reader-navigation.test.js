import { expect, test } from 'bun:test';
import { ayahDestination, nearbyPageNumbers, parseReaderNumber, restoreReadingPosition, swipePageDelta } from '../src/features/quran-reader/utils/navigation';
const ayah = { mushafId: 4, surahNumber: 2, ayahNumber: 1, pageNumber: 2, hafsAyahNumbers: [1, 2] };
const content = { pages: [{ number: 1, mushafId: 4, ayahs: [] }, { number: 2, mushafId: 4, ayahs: [ayah] }, { number: 3, mushafId: 4, ayahs: [] }], quran: { id: 4, surahs: [{ number: 2, ayahs: [ayah] }] } };

test('jump inputs accept both digit forms and reject partial or decimal numbers', () => {
  expect(parseReaderNumber(' 604 ')).toBe(604);
  expect(parseReaderNumber('٢٨٦')).toBe(286);
  for (const value of ['', '2x', '-1', '1.5']) expect(Number.isNaN(parseReaderNumber(value))).toBe(true);
});
test('ayah jumps use Warsh references instead of Hafs numbering', () => {
  expect(ayahDestination(content, 2, 1)).toBe(ayah);
  expect(ayahDestination(content, 2, 2)).toBeUndefined();
  expect(ayahDestination(content, 115, 1)).toBeUndefined();
});
test('restores valid edition-specific positions and safely handles stale or corrupt saves', () => {
  const saved = { mushafId: 4, pageNumber: 2, ayah, scrollY: 150 };
  expect(restoreReadingPosition(JSON.stringify(saved), content)).toEqual({ ...saved, ayah: { mushafId: 4, surahNumber: 2, ayahNumber: 1 } });
  for (const raw of ['bad', null, JSON.stringify({ ...saved, mushafId: 1 }), JSON.stringify({ ...saved, pageNumber: 999 })]) {
    expect(restoreReadingPosition(raw, content)).toEqual({ mushafId: 4, pageNumber: 1, ayah: null, scrollY: 0 });
  }
  expect(restoreReadingPosition(JSON.stringify({ ...saved, ayah: { mushafId: 4, surahNumber: 2, ayahNumber: 999 }, scrollY: -2 }), content))
    .toEqual({ mushafId: 4, pageNumber: 2, ayah: null, scrollY: 0 });
});
test('swipes honor RTL and ignore taps, vertical scrolling and short drags', () => {
  expect(swipePageDelta(80, 5, 0.2)).toBe(1);
  expect(swipePageDelta(-80, 5, -0.2)).toBe(-1);
  expect(swipePageDelta(25, 2, 0.8)).toBe(1);
  expect(swipePageDelta(10, 1, 1)).toBe(0);
  expect(swipePageDelta(60, 80, 1)).toBe(0);
  expect(swipePageDelta(30, 1, 0.1)).toBe(0);
});
test('preloading prioritizes immediate neighbors and never crosses the mushaf edges', () => {
  expect(nearbyPageNumbers(1, 604)).toEqual([2, 3]);
  expect(nearbyPageNumbers(604, 604)).toEqual([603, 602]);
  expect(nearbyPageNumbers(300, 604)).toEqual([301, 299, 302, 298]);
});

test('reopening a selected continuation retains the page being read, not the verse start page', () => {
  const start = { mushafId: 4, surahNumber: 4, ayahNumber: 44, pageNumber: 85 };
  const continuedContent = { pages: [{ mushafId: 4, number: 85, ayahs: [start] }, { mushafId: 4, number: 86, ayahs: [], previousAyah: start }],
    quran: { id: 4, surahs: [{ number: 4, ayahs: [start] }] } };
  expect(restoreReadingPosition(JSON.stringify({ mushafId: 4, pageNumber: 86, ayah: start, scrollY: 12 }), continuedContent).pageNumber).toBe(86);
});
