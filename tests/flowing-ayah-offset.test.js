import { expect, test } from 'bun:test';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import { decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { flowingAyahOffset } from '../src/features/quran-reader/utils/flowing-ayah-offset';

const ayahs = decodeSurahAyahs(fatiha, 4, 1);
const pieces = ayahs.map((ayah) => `${ayah.text}\u00a0${ayah.marker} `);

test('a jump finds the actual line when several ayahs share a continuous paragraph', () => {
  const lines = [
    { text: pieces[0] + pieces[1].slice(0, 8), y: 8 },
    { text: pieces[1].slice(8) + pieces[2], y: 70 },
  ];
  expect(flowingAyahOffset(ayahs, ayahs[0], lines)).toBe(8);
  expect(flowingAyahOffset(ayahs, ayahs[1], lines)).toBe(8);
  expect(flowingAyahOffset(ayahs, ayahs[2], lines)).toBe(70);
});

test('a new line at an ayah boundary follows the chosen font wrapping', () => {
  const lines = pieces.map((text, i) => ({ text, y: i * 90 }));
  expect(flowingAyahOffset(ayahs, ayahs[4], lines)).toBe(360);
  expect(flowingAyahOffset(ayahs, ayahs[4], [])).toBeUndefined();
  expect(flowingAyahOffset(ayahs, { ...ayahs[0], surahNumber: 2 }, lines)).toBeUndefined();
});
