import { describe, expect, test } from 'bun:test';
import data from '../assets/tajweed/warsh-azraq-v1.json';
import v3 from './fixtures/quranpedia/warsh-v3-sample.json';
import oldWarsh from './fixtures/quranpedia/warsh-tajweed-sample.json';
import oldHafs from './fixtures/quranpedia/hafs-sample.json';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import { toBundledSpelling } from '../src/lib/quranpedia/encoding';
import { decodeAyah } from '../src/lib/quranpedia/validation';
import { decodeWarshTajweed } from '../src/features/quran-reader/utils/warsh-tajweed';
import { decodeTajweedSurah } from '../src/features/quran-reader/utils/tajweed';
import { createQuranSearch } from '../src/features/quran-reader/utils/search';

/** Letters of the 3.0 fonts' spelling that the bundled V21/V22 fonts do not draw. */
const NEW_LETTERS = /[\u065C\u06D1\u0870-\u089F\u08C9-\u08FF]/;
const ayah = (key, text) => {
  const [surahNumber, ayahNumber] = key.split(':').map(Number);
  return { mushafId: 4, surahNumber, ayahNumber, text };
};
const respelt = Object.entries(v3.ayahs).map(([key, text]) => ayah(key, toBundledSpelling(text, 4)));
const bySurah = Map.groupBy(respelt, (a) => a.surahNumber);

describe('Quranpedia 3.0 spelling', () => {
  test('Warsh text is spelt with the letters the bundled font draws', () => {
    expect(Object.values(v3.ayahs).filter((text) => NEW_LETTERS.test(text)).length).toBeGreaterThan(30);
    for (const a of respelt) expect(a.text).not.toMatch(NEW_LETTERS);
    // The opening of Al-Fatiha as the bundled font and the colours spell it.
    expect(respelt[0].text).toStartWith('\u0627\u0650\u06EC\u0644\u0652\u062D\u064E\u0645\u0652\u062F\u064F');
  });

  test('text in the old spelling (an older cached corpus) is unchanged', () => {
    for (const surah of oldWarsh.surahs) for (const a of surah.ayahs) expect(toBundledSpelling(a.text, 4)).toBe(a.text);
    for (const surah of oldHafs.surahs) for (const a of surah.ayahs) expect(toBundledSpelling(a.text, 2)).toBe(a.text);
    expect(toBundledSpelling('\u0870\u08F0', 1)).toBe('\u0870\u08F0');
  });

  test('Hafs open tanween takes the marks of the Madinah V22 font', () => {
    const old = new Map(oldHafs.surahs.flatMap((s) => s.ayahs.map((a) => [`${s.id}:${a.number}`, a.text])));
    for (const [key, text] of Object.entries(v3.hafs)) {
      expect(text).toMatch(/[\u08F0-\u08F2]/);
      expect(toBundledSpelling(text, 2)).toBe(old.get(key));
    }
  });

  test('decoding an ayah respells its text and keeps everything else', () => {
    const source = { ...fatiha[0], text: v3.ayahs['1:1'] };
    const decoded = decodeAyah(source, 4, 1);
    expect(decoded.text).toBe(toBundledSpelling(v3.ayahs['1:1'], 4));
    expect(decoded.marker).toBe(fatiha[0].marker);
    expect(decodeAyah(source, 2, 1).text).toBe(v3.ayahs['1:1']);
  });

  test('search finds the respelt text again', () => {
    const fatihah = (spell) => ({ id: 4, surahs: [{ number: 1, name: '', codedName: '', ayahs: respelt.filter((a) => a.surahNumber === 1)
      .map((a) => ({ ...a, text: spell(v3.ayahs[`1:${a.ayahNumber}`]), marker: '', pageNumber: 1, hafsAyahNumbers: [a.ayahNumber] })) }] });
    expect(createQuranSearch(fatihah((t) => t))('\u0627\u0644\u062D\u0645\u062F').items).toHaveLength(0);
    expect(createQuranSearch(fatihah((t) => toBundledSpelling(t, 4)))('\u0627\u0644\u062D\u0645\u062F').items[0].reference.ayahNumber).toBe(1);
  });

  test('Hafs tajweed markup in the new spelling still aligns with the respelt corpus', () => {
    const text = v3.hafs['2:2'];
    const html = `<a class="ayah" surah="2" ayah="2">${text.slice(0, 10)}<tajweed class="ghn">${text.slice(10, 12)}</tajweed>${text.slice(12)}<span class="marker">`;
    const surah = { number: 2, ayahs: [{ mushafId: 2, surahNumber: 2, ayahNumber: 2, text: toBundledSpelling(text, 2) }] };
    const runs = decodeTajweedSurah(html, surah)[2];
    expect(runs.map((r) => r.text).join('')).toBe(surah.ayahs[0].text);
    expect(runs.some((r) => r.rule === 'ghn')).toBe(true);
  });
});

describe('Warsh colours after the respelling', () => {
  test('the colours are made for the respelt text, including the settings preview (Al-Mulk 9-10)', () => {
    for (const [number, ayahs] of bySurah) {
      const colours = decodeWarshTajweed({ number, ayahs }, data);
      for (const a of ayahs) {
        const runs = colours[a.ayahNumber];
        expect(runs.map((r) => r.text).join('')).toBe(a.text);
        expect([`${number}:${a.ayahNumber}`, runs.some((r) => r.rule)]).toEqual([`${number}:${a.ayahNumber}`, true]);
      }
    }
  });

  test('an ayah that reads otherwise stays plain beside coloured ones; a surah with none matching is an error', () => {
    const fatihah = bySurah.get(1).map((a) => a.ayahNumber === 7 ? { ...a, text: a.text.replace('\u064E', '\u0650') } : a);
    const colours = decodeWarshTajweed({ number: 1, ayahs: fatihah }, data);
    expect(colours[7]).toEqual([{ text: fatihah[6].text }]);
    expect(colours[1].some((r) => r.rule)).toBe(true);
    // The text as Quranpedia now spells it, not respelt: nothing matches.
    const raw = Object.entries(v3.ayahs).filter(([key]) => key.startsWith('1:')).map(([key, text]) => ayah(key, text));
    expect(() => decodeWarshTajweed({ number: 1, ayahs: raw }, data)).toThrow();
  });
});
