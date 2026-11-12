import { describe, expect, test } from 'bun:test';
import warsh from '../assets/quran/mushaf-4.json';
import hafs from '../assets/quran/mushaf-2.json';
import colours from '../assets/tajweed/warsh-azraq-v1.json';
import { expandBundledMushaf } from '../src/lib/quranpedia/bundled';
import { decodeQuran } from '../src/lib/quranpedia/validation';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { createQuranSearch } from '../src/features/quran-reader/utils/search';
import { decodeWarshTajweed } from '../src/features/quran-reader/utils/warsh-tajweed';
import { pageFingerprint } from '../src/features/quran-reader/utils/page-fingerprint';

/** Letters of Quranpedia's 3.0 spelling, which the bundled Warsh V21 and Hafs V22 fonts do not draw. */
const UNDRAWN = { warsh: /[\u065C\u06D1\u0870-\u089F\u08C9-\u08FF]/, hafs: /[\u0870-\u089F\u08C9-\u08FF]/ };
const quran = { warsh: decodeQuran(expandBundledMushaf(warsh), 4), hafs: decodeQuran(expandBundledMushaf(hafs), 2) };

describe('the Quran text bundled with the app', () => {
  test('each copy records where it came from', () => {
    for (const [copy, id] of [[warsh, 4], [hafs, 2]]) {
      expect(copy).toMatchObject({ version: 1, source: `https://api.quranpedia.net/v1/mushafs/${id}` });
      expect(copy.fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(copy.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  test('Warsh: 114 surahs, 6,214 ayahs, 604 pages, in letters its font draws', () => {
    expect(quran.warsh.riwayah.name).toBe('ورش');
    const ayahs = quran.warsh.surahs.flatMap((surah) => surah.ayahs);
    expect(ayahs).toHaveLength(6214);
    expect(quran.warsh.surahs[1].ayahs).toHaveLength(285);
    expect(ayahs.filter((ayah) => UNDRAWN.warsh.test(ayah.text))).toEqual([]);
    const content = prepareReaderContent(quran.warsh);
    expect(content.pages.map((page) => page.number)).toEqual(Array.from({ length: 604 }, (_, i) => i + 1));
    expect([content.juzIndex.length, content.hizbIndex.length, content.quarterHizbIndex.length]).toEqual([30, 60, 240]);
    expect(createQuranSearch(quran.warsh)('الحمد').items[0].reference).toMatchObject({ surahNumber: 1, ayahNumber: 1 });
  });

  test('Hafs: 114 surahs, 6,236 ayahs, 604 pages, in letters its font draws', () => {
    expect(quran.hafs.riwayah.name).toBe('حفص');
    const ayahs = quran.hafs.surahs.flatMap((surah) => surah.ayahs);
    expect(ayahs).toHaveLength(6236);
    expect(ayahs.filter((ayah) => UNDRAWN.hafs.test(ayah.text))).toEqual([]);
    expect(prepareReaderContent(quran.hafs).pages).toHaveLength(604);
  });

  test('the Warsh tajweed colours are made for this text: every ayah, by its fingerprint', () => {
    expect(colours.corpusSha256).toBe(warsh.sha256);
    const ayahs = quran.warsh.surahs.flatMap((surah) => surah.ayahs);
    expect(ayahs.filter((ayah) => colours.ayahs[`${ayah.surahNumber}:${ayah.ayahNumber}`]?.[0] !== pageFingerprint(ayah.text))).toEqual([]);
    expect(Object.keys(colours.ayahs)).toHaveLength(ayahs.length);
    for (const surah of quran.warsh.surahs) {
      const runs = decodeWarshTajweed(surah, colours);
      for (const ayah of surah.ayahs) expect(runs[ayah.ayahNumber].map((run) => run.text).join('')).toBe(ayah.text);
    }
  });
});
