import { expect, test } from 'bun:test';
import { decodeReadingPreferences, defaultReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';

test('restores saved settings and preserves Warsh page mode as the default', () => {
  const preferences = { appearance: 'dark', mode: 'ayah', fontSize: 40, spacious: true };
  expect(decodeReadingPreferences(JSON.stringify(preferences))).toEqual(preferences);
  expect(decodeReadingPreferences(null)).toEqual(defaultReadingPreferences);
});

test('recovers corrupt preferences and clamps stored text sizes', () => {
  expect(decodeReadingPreferences('{broken')).toEqual(defaultReadingPreferences);
  expect(decodeReadingPreferences(JSON.stringify({ appearance: 'unknown', mode: 'unknown', fontSize: 200, spacious: 'yes' })))
    .toEqual({ appearance: 'system', mode: 'page', fontSize: 48, spacious: false });
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: 1 })).fontSize).toBe(24);
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: '40' })).fontSize).toBe(32);
});
