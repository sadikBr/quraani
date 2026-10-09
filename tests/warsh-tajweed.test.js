import { expect, test } from 'bun:test';
import data from '../assets/tajweed/warsh-azraq-v1.json';
import sample from './fixtures/quranpedia/warsh-tajweed-sample.json';
import { decodeAyah } from '../src/lib/quranpedia/validation';
import { decodeWarshTajweed } from '../src/features/quran-reader/utils/warsh-tajweed';
import { tajweedColor } from '../src/features/quran-reader/utils/tajweed';
import { tajweedTextDocument, tajweedTextState } from '../src/features/quran-reader/utils/tajweed-text-document';
import { createPagePractice, practiceVisibility } from '../src/features/quran-reader/utils/page-practice';
import { readerThemes } from '../src/features/quran-reader/theme';

const surahs = sample.surahs.map((s) => ({ number: s.id, name: s.name, codedName: s.coded_name, ayahs: s.ayahs.map((ayah) => decodeAyah(ayah, 4, s.id)) }));
test('offline Warsh annotations cover all 6,214 ayahs with bounded, ordered color spans', () => {
  expect(data.mushafId).toBe(4);
  expect(data.route).toBe('warsh-al-azraq');
  expect(data.boundary).toBe('stop-at-each-ayah');
  expect(Object.keys(data.ayahs)).toHaveLength(6214);
  expect(new Set(Object.keys(data.ayahs).map((key) => key.split(':')[0])).size).toBe(114);
  for (const [fingerprint, spans] of Object.values(data.ayahs)) {
    const length = Number(fingerprint.split('-')[0]);
    let previous = 0;
    expect(spans.every(([start, end, rule]) => {
      const valid = start >= previous && end > start && end <= length && Number.isInteger(rule) && !!data.rules[rule];
      previous = end;
      return valid;
    })).toBe(true);
  }
  for (const rule of data.rules) for (const dark of [false, true]) {
    expect(tajweedColor(rule, dark, 'unmapped')).not.toBe('unmapped');
  }
});

test('color spans preserve original Warsh spelling, marks, numbering and composed maddah', () => {
  for (const surah of surahs) {
    const colored = decodeWarshTajweed(surah, data);
    for (const ayah of surah.ayahs) expect(colored[ayah.ayahNumber].map((r) => r.text).join('')).toBe(ayah.text);
  }
  expect(surahs[0].ayahs[0].text).toStartWith('اِ۬لْحَمْدُ');
  expect(surahs.find((s) => s.number === 67).ayahs[0].text).toContain('جَآءَنَا');
});

test('Warsh annotations include its own hamza, inclination and lam rules', () => {
  const baqarah = surahs.find((s) => s.number === 2);
  const colors = decodeWarshTajweed(baqarah, data);
  expect(colors[2].some((r) => r.rule === 'warsh_ibdal' && r.text.includes('و'))).toBe(true);
  expect(colors[2].some((r) => r.rule === 'warsh_lam' && r.text.includes('ل'))).toBe(true);
  expect(colors[3].some((r) => r.rule === 'warsh_naql')).toBe(true);
  const taha = decodeWarshTajweed(surahs.find((s) => s.number === 20), data);
  expect(taha[1].some((r) => r.rule === 'warsh_imala')).toBe(true);
  expect(taha[1].some((r) => r.rule === 'warsh_taqlil')).toBe(true);
});

test('annotations reject Hafs references, changed vowels and invalid offsets', () => {
  const original = surahs[0], ayah = original.ayahs[0];
  expect(() => decodeWarshTajweed({ ...original, ayahs: [{ ...ayah, mushafId: 2 }] }, data)).toThrow();
  expect(() => decodeWarshTajweed({ ...original, ayahs: [{ ...ayah, text: ayah.text.replace('حَمْ', 'حِمْ') }] }, data)).toThrow();
  const malformed = { ...data, ayahs: { ...data.ayahs, '1:1': [data.ayahs['1:1'][0], [[0, ayah.text.length + 1, 0]]] } };
  expect(() => decodeWarshTajweed(original, malformed)).toThrow();
});

test('both Warsh text layouts keep markers and practice visibility with colors', () => {
  const surah = surahs[0], runs = decodeWarshTajweed(surah, data);
  const page = { mushafId: 4, number: 1, ayahs: surah.ayahs };
  const practice = createPagePractice(page);
  for (const layout of ['ayah', 'flowing']) {
    const html = tajweedTextDocument(page.ayahs, layout, 'data:font/ttf;base64,AA==', 36, false, readerThemes.midnight);
    for (const ayah of page.ayahs) expect(html.split(ayah.marker).length - 1).toBe(1);
    expect(html).not.toContain('\u200d');
    const hidden = JSON.parse(tajweedTextState(page.ayahs, runs, true, readerThemes.midnight, null, practiceVisibility(practice, 0)));
    for (let i = 0; i < hidden.length; i++) {
      expect(hidden[i].visible).toBe(0);
      expect(hidden[i].words.join('').replace(/<[^>]+>/g, '')).toBe(page.ayahs[i].text);
    }
    const revealed = JSON.parse(tajweedTextState(page.ayahs, runs, false, readerThemes.light, null, practiceVisibility(practice, 1)));
    expect(revealed[0].visible).toBe(1);
    expect(revealed.slice(1).every((a) => a.visible === 0)).toBe(true);
  }
});
