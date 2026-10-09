import { expect, test } from 'bun:test';
import metadata from './fixtures/quranpedia/warsh-metadata.json';
import samples from './fixtures/quranpedia/warsh-typography.json';
import { decodeAyah, decodeMushaf } from '../src/lib/quranpedia/validation';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { pageSections } from '../src/features/quran-reader/utils/page-sections';

const quran = {
  ...decodeMushaf(metadata),
  surahs: samples.map((s) => ({ number: s.id, name: s.name, codedName: s.coded_name,
    ayahs: s.ayahs.map((a) => decodeAyah(a, 4, s.id)) })),
};
const pages = prepareReaderContent(quran).pages;

test('Al-Fatiha has an unnumbered Bismillah and seven original Warsh ayahs', () => {
  const section = pageSections(pages.find((p) => p.number === 1), quran)[0];
  expect(section.showBismillah).toBe(true);
  expect(section.ayahs).toHaveLength(7);
  expect(section.ayahs[0].text).toBe(samples[0].ayahs[0].text);
  expect(section.ayahs[0].text).not.toBe(quran.bismillah);
});

test('continuation pages do not insert another Bismillah', () => {
  const section = pageSections(pages.find((p) => p.number === 3), quran)[0];
  expect(section.showBismillah).toBe(false);
  expect(section.ayahs[0].ayahNumber).toBe(5);
  expect(section.ayahs).toHaveLength(11);
});

test('a long Warsh ayah stays intact in one page section', () => {
  const section = pageSections(pages.find((p) => p.number === 48), quran)[0];
  expect(section.ayahs).toHaveLength(1);
  expect(section.ayahs[0].ayahNumber).toBe(281);
  expect(section.ayahs[0].text.length).toBeGreaterThan(1200);
});

test('the closing page separates three surahs with their own openings', () => {
  const sections = pageSections(pages.find((p) => p.number === 604), quran);
  expect(sections.map((s) => s.surah.number)).toEqual([112, 113, 114]);
  expect(sections.map((s) => s.ayahs.length)).toEqual([4, 5, 6]);
  expect(sections.every((s) => s.showBismillah)).toBe(true);
});

test('surah 9 starts without Bismillah', () => {
  const ayah = quran.surahs.find((s) => s.number === 9).ayahs[0];
  const sections = pageSections({ number: ayah.pageNumber, mushafId: 4, ayahs: [ayah] }, quran);
  expect(sections[0].opensSurah).toBe(true);
  expect(sections[0].showBismillah).toBe(false);
});

test('section preparation never modifies original text, markers, or ordering', () => {
  const snapshot = JSON.stringify(quran);
  for (const page of pages) {
    expect(pageSections(page, quran).flatMap((s) => s.ayahs)).toEqual(page.ayahs);
  }
  expect(JSON.stringify(quran)).toBe(snapshot);
});

import { spacedAyahMarkers } from '../src/features/quran-reader/utils/printed-page';

test('marker spacing scales only decorative frames and preserves numbers and Quran paths', () => {
  const frame = '<path d="M0 0H20V30H0Z"/>';
  const number = '<g transform="translate(5 8)"><path d="M0 0H3V8H0Z"/></g>';
  const content = '<g id="content"><path d="M30 0H100V20H30Z"/></g>';
  const xml = `<svg><g id="ayah_markers"><g class="ayah_marker"><g class="ayah_marker_mark" transform="translate(80 60) scale(0.0056 -0.0056)">${frame}</g>${number}</g></g>${content}</svg>`;
  const spaced = spacedAyahMarkers(xml);
  expect(spaced).toContain(`transform="translate(10 15) scale(0.86) translate(-10 -15)">${frame}`);
  expect(spacedAyahMarkers(spaced)).toBe(spaced);
  const translatedFrame = '<g class="ayah_marker_mark"><path d="M0 0H20V30H0Z" transform="translate(-10 -15)"/></g>';
  expect(spacedAyahMarkers(translatedFrame)).toContain('translate(0 0) scale(0.86) translate(0 0)');
  expect(spaced).toContain(number);
  expect(spaced).toContain(content);
  expect(spaced).toContain('transform="translate(80 60) scale(0.0056 -0.0056)"');
  expect(spacedAyahMarkers('<g class="ayah_marker_mark"><path d="bad"/></g>')).toBe('<g class="ayah_marker_mark"><path d="bad"/></g>');
});
