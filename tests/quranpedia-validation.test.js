import { expect, test } from 'bun:test';
import { syntheticCorpus } from './helpers/synthetic-corpus';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import hafs from './fixtures/quranpedia/hafs-sample.json';
import { decodeAyah, decodeQuran, decodeSurahAyahs, MUSHAF_PAGE_COUNT } from '../src/lib/quranpedia/validation';

const corpus = syntheticCorpus;

test('page and ayah numbers are bounded to the supported 604-page editions', () => {
  expect(decodeAyah({ ...fatiha[0], page_number: 604 }, 4).pageNumber).toBe(604);
  expect(() => decodeAyah({ ...fatiha[0], page_number: 605 }, 4)).toThrow();
  expect(() => decodeAyah({ ...fatiha[0], number: 287 }, 4)).toThrow();
  expect(() => decodeAyah({ ...fatiha[0], number_in_hafs: [100000] }, 4)).toThrow();
  expect(decodeSurahAyahs(hafs.surahs[1].ayahs, 2, 2)).toHaveLength(32);
});

test('the full corpus must cover pages 1–604 contiguously', () => {
  expect(decodeQuran(corpus(), 4).surahs).toHaveLength(114);
  expect(() => decodeQuran(corpus((i) => Math.min(MUSHAF_PAGE_COUNT, i + 2)), 4)).toThrow(/corpus sequence/);
  expect(() => decodeQuran(corpus((i) => Math.min(600, i + 1)), 4)).toThrow(/page count/);
  expect(() => decodeQuran(corpus((i) => (i === 300 ? 302 : Math.min(MUSHAF_PAGE_COUNT, i + 1))), 4)).toThrow();
  const gap = structuredClone(fatiha);
  gap[3].page_number = 3;
  expect(() => decodeSurahAyahs(gap, 4, 1)).toThrow(/page sequence/);
});
