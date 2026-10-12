import { expect, test } from 'bun:test';
import { decodeReadingPreferences, defaultReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';

test('restores saved settings and preserves Warsh page mode as the default', () => {
  const preferences = { appearance: 'dark', mode: 'text', textLayout: 'ayah', fontSize: 40, spacious: true };
  expect(decodeReadingPreferences(JSON.stringify(preferences))).toEqual({ riwayah: 'warsh', tajweed: false, reciters: {}, repeat: 1, listening: 'ayah', surahReciters: {}, surahRepeat: 1, warshScript: 'maghribi', ...preferences });
  expect(decodeReadingPreferences(null)).toEqual(defaultReadingPreferences);
});

test('recovers corrupt preferences and clamps stored text sizes', () => {
  expect(decodeReadingPreferences('{broken')).toEqual(defaultReadingPreferences);
  expect(decodeReadingPreferences(JSON.stringify({ appearance: 'unknown', mode: 'unknown', fontSize: 200, spacious: 'yes' })))
    .toEqual({ riwayah: 'warsh', tajweed: false, appearance: 'system', mode: 'page', textLayout: 'ayah', fontSize: 48, spacious: false, reciters: {}, repeat: 1, listening: 'ayah', surahReciters: {}, surahRepeat: 1, warshScript: 'maghribi' });
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: 1 })).fontSize).toBe(24);
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: '40' })).fontSize).toBe(32);
});

test('migrates the former ayah reader without changing its layout or other settings', () => {
  const old = { appearance: 'emerald', mode: 'ayah', fontSize: 40, spacious: true };
  expect(decodeReadingPreferences(JSON.stringify(old)))
    .toEqual({ riwayah: 'warsh', tajweed: false, reciters: {}, repeat: 1, listening: 'ayah', surahReciters: {}, surahRepeat: 1, warshScript: 'maghribi', ...old, mode: 'text', textLayout: 'ayah' });
});

test('remembers both text layouts even while printed pages are selected', () => {
  for (const mode of ['page', 'text']) for (const textLayout of ['ayah', 'flowing']) {
    const saved = { ...defaultReadingPreferences, mode, textLayout };
    expect(decodeReadingPreferences(JSON.stringify(saved))).toEqual({ riwayah: 'warsh', tajweed: false, ...saved });
  }
  expect(decodeReadingPreferences(JSON.stringify({ mode: 'text', textLayout: 'unknown' })).textLayout).toBe('ayah');
});

test('the seven-size slider restores every stop and snaps older in-between sizes', () => {
  for (const fontSize of [24, 28, 32, 36, 40, 44, 48]) {
    expect(decodeReadingPreferences(JSON.stringify({ fontSize })).fontSize).toBe(fontSize);
  }
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: 35 })).fontSize).toBe(36);
  expect(decodeReadingPreferences(JSON.stringify({ fontSize: 25.5 })).fontSize).toBe(24);
});

test('keeps a valid reciter per riwayah and a known repeat count', () => {
  const decoded = decodeReadingPreferences(JSON.stringify({ reciters: { warsh: 265, hafs: 'x', qalun: 3 }, repeat: 5 }));
  expect(decoded.reciters).toEqual({ warsh: 265 });
  expect(decoded.repeat).toBe(5);
  expect(decodeReadingPreferences(JSON.stringify({ repeat: 4 })).repeat).toBe(1);
  expect(decodeReadingPreferences(JSON.stringify({ repeat: 0 })).repeat).toBe(0);
});

test('keeps the way of listening, and a whole-surah reciter and repetition apart', () => {
  const decoded = decodeReadingPreferences(JSON.stringify({ listening: 'surah', surahReciters: { hafs: 40, warsh: -1 }, surahRepeat: 3, reciters: { warsh: 265 }, repeat: 5 }));
  expect(decoded).toMatchObject({ listening: 'surah', surahReciters: { hafs: 40 }, surahRepeat: 3, reciters: { warsh: 265 }, repeat: 5 });
  expect(decodeReadingPreferences(JSON.stringify({ listening: 'page', surahRepeat: 4 }))).toMatchObject({ listening: 'ayah', surahReciters: {}, surahRepeat: 1, warshScript: 'maghribi' });
});

test('keeps the chosen Warsh letters, Maghribi by default', () => {
  expect(decodeReadingPreferences(JSON.stringify({ warshScript: 'mashriqi' })).warshScript).toBe('mashriqi');
  expect(decodeReadingPreferences(JSON.stringify({ warshScript: 'other' })).warshScript).toBe('maghribi');
});
