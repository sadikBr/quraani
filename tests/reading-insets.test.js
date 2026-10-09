import { expect, test } from 'bun:test';
import { reserveReadingInsets } from '../src/features/quran-reader/utils/reading-insets';

test('late camera-cutout measurements expand the reserved reading area', () => {
  expect(reserveReadingInsets({ top: 24, bottom: 0 }, { top: 52, bottom: 24 }))
    .toEqual({ top: 52, bottom: 24 });
});

test('hiding and revealing system bars keeps the same viewport and state object', () => {
  const reserved = { top: 59, bottom: 34 };
  expect(reserveReadingInsets(reserved, { top: 0, bottom: 0 })).toBe(reserved);
  expect(reserveReadingInsets(reserved, { top: 59, bottom: 34 })).toBe(reserved);
  expect(reserveReadingInsets(reserved, { top: 24, bottom: 16 })).toBe(reserved);
});

test('a larger measurement on one edge does not reduce the other edge', () => {
  expect(reserveReadingInsets({ top: 24, bottom: 34 }, { top: 52, bottom: 0 }))
    .toEqual({ top: 52, bottom: 34 });
  expect(reserveReadingInsets({ top: 59, bottom: 0 }, { top: 0, bottom: 24 }))
    .toEqual({ top: 59, bottom: 24 });
});
