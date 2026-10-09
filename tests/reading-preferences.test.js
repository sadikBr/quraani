import { expect, test } from 'bun:test';
import { decodeReadingPreferences, defaultReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';

test('restores saved settings and preserves Warsh page mode as the default', () => {
  const preferences = { appearance: 'dark', mode: 'text', textLayout: 'ayah', fontSize: 40, spacious: true };
  expect(decodeReadingPreferences(JSON.stringify(preferences))).toEqual(preferences);
  expect(decodeReadingPreferences(null)).toEqual(defaultReadingPreferences);
});

test('recovers corrupt preferences and clamps stored text sizes', () => {
  expect(decodeReadingPreferences('{broken')).toEqual(defaultReadingPreferences);
  expect(decodeReadingPreferences(JSON.stringify({ appearance: 'unknown', mode: 'unknown', fontSize: 200, spacious: 'yes' })))
    .toEqual({ appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: 48, spacious: false });
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: 1 })).fontSize).toBe(24);
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: '40' })).fontSize).toBe(32);
});

test('migrates the former ayah reader without changing its layout or other settings', () => {
  const old = { appearance: 'emerald', mode: 'ayah', fontSize: 40, spacious: true };
  expect(decodeReadingPreferences(JSON.stringify(old)))
    .toEqual({ ...old, mode: 'text', textLayout: 'ayah' });
});

test('remembers both text layouts even while printed pages are selected', () => {
  for (const mode of ['page', 'text']) for (const textLayout of ['ayah', 'flowing']) {
    const saved = { ...defaultReadingPreferences, mode, textLayout };
    expect(decodeReadingPreferences(JSON.stringify(saved))).toEqual(saved);
  }
  expect(decodeReadingPreferences(JSON.stringify({ mode: 'text', textLayout: 'unknown' })).textLayout).toBe('ayah');
});
