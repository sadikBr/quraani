import { expect, test } from 'bun:test';
import { pageDivisions, quarterLabel, quarterRangeLabels, quarterSummary } from '../src/features/quran-reader/utils/page-divisions';

const page = (...positions) => ({ ayahs: positions.map(([juzNumber, hizbQuarter]) => ({ juzNumber, hizbQuarter })) });

test('Warsh quarters roll from fourth rub of hizb 1 to first rub of hizb 2', () => {
  // Observed Warsh page 11 starts at quarter 4 and ends at quarter 5.
  expect(pageDivisions(page([1, 4], [1, 4], [1, 5]))).toEqual({
    juz: [1], quarters: [{ hizb: 1, rub: 4 }, { hizb: 2, rub: 1 }],
  });
});

test('retains both juz values on a boundary page rather than hiding the new division', () => {
  // Observed Warsh page 22 spans juz 1–2 and quarter positions 8–9.
  expect(pageDivisions(page([1, 8], [2, 9]))).toEqual({
    juz: [1, 2], quarters: [{ hizb: 2, rub: 4 }, { hizb: 3, rub: 1 }],
  });
});

test('handles beginning/end positions and does not invent missing division data', () => {
  expect(pageDivisions(page([1, 1])).quarters).toEqual([{ hizb: 1, rub: 1 }]);
  expect(pageDivisions(page([30, 240])).quarters).toEqual([{ hizb: 60, rub: 4 }]);
  expect(pageDivisions(page([null, null]))).toEqual({ juz: [], quarters: [] });
});

test('formats quarter labels with standard digits', () => {
  expect(quarterLabel({ hizb: 60, rub: 4 })).toBe('الحزب 60 · الربع 4/4');
});

test('combines neighboring quarters but retains both hizbs at a boundary', () => {
  expect(quarterRangeLabels([{ hizb: 1, rub: 1 }, { hizb: 1, rub: 2 }]))
    .toEqual(['الحزب 1 · الربع \u20661–2/4\u2069']);
  expect(quarterRangeLabels([{ hizb: 1, rub: 4 }, { hizb: 2, rub: 1 }]))
    .toEqual(['الحزب 1 · الربع \u20664/4\u2069', 'الحزب 2 · الربع \u20661/4\u2069']);
  expect(quarterRangeLabels([{ hizb: 1, rub: 1 }, { hizb: 1, rub: 3 }, { hizb: 1, rub: 1 }]))
    .toEqual(['الحزب 1 · الربع \u20661، 3/4\u2069']);
  expect(quarterRangeLabels([])).toEqual([]);
});


test('compact boundary summaries preserve the hizb/quarter pairs without newlines', () => {
  expect(quarterSummary([{ hizb: 59, rub: 4 }, { hizb: 60, rub: 1 }]))
    .toBe('الحزب \u206659 (4/4)\u2069، \u206660 (1/4)\u2069');
  expect(quarterSummary([{ hizb: 60, rub: 1 }])).toBe('الحزب 60 · الربع \u20661/4\u2069');
  expect(quarterSummary([])).toBe('');
});
