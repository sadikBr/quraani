import { expect, test } from 'bun:test';
import { alignDivisionsToText, HAFS_QUARTER_STARTS, hafsQuarterOf } from '../src/features/quran-reader/utils/divisions';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { buildPlanIndex } from '../src/features/plans/engine';
import { decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import hafsSample from './fixtures/quranpedia/hafs-sample.json';

const JUZ_STARTS = ['1:1', '2:142', '2:253', '3:93', '4:24', '4:148', '5:82', '6:111', '7:88', '8:41', '9:93', '11:6', '12:53', '15:1', '17:1',
  '18:75', '21:1', '23:1', '25:21', '27:56', '29:46', '33:31', '36:28', '39:32', '41:47', '46:1', '51:31', '58:1', '67:1', '78:1'];

test('the Hafs quarter table has 240 ordered starts and every 8th one starts a juz', () => {
  expect(HAFS_QUARTER_STARTS).toHaveLength(240);
  for (let i = 1; i < 240; i++) {
    const [s0, a0] = HAFS_QUARTER_STARTS[i - 1], [s1, a1] = HAFS_QUARTER_STARTS[i];
    expect(s1 > s0 || (s1 === s0 && a1 > a0)).toBe(true);
  }
  expect(HAFS_QUARTER_STARTS.filter((_, i) => i % 8 === 0).map(([s, a]) => `${s}:${a}`)).toEqual(JUZ_STARTS);
  expect(hafsQuarterOf(9, 1)).toBe(75); expect(hafsQuarterOf(2, 141)).toBe(8); expect(hafsQuarterOf(2, 142)).toBe(9); expect(hafsQuarterOf(114, 6)).toBe(240);
});

/** Warsh Al-Baqarah: 285 ayahs, its first ayah covers Hafs 1–2, then Warsh n = Hafs n + 1.
 * Quranpedia tags Warsh ayahs as if they were Hafs ayahs with the same number. */
function warshBaqarah() {
  const ayah = (number, hafs) => ({ mushafId: 4, surahNumber: 2, ayahNumber: number, sourceId: 1000 + number, pageNumber: 2, text: 'نص', marker: '', availableContent: [],
    hafsAyahNumbers: hafs, juzNumber: Math.ceil(hafsQuarterOf(2, number) / 8), hizbQuarter: hafsQuarterOf(2, number) });
  return { id: 4, name: 'ورش', surahs: [{ number: 2, name: 'البقرة', codedName: '', ayahs: Array.from({ length: 285 }, (_, i) => ayah(i + 1, i ? [i + 2] : [1, 2])) }] };
}

test('Warsh divisions follow the text: juz 2 / hizb 3 starts at 2:141 and its first quarter ends at 2:156', () => {
  const ayahs = alignDivisionsToText(warshBaqarah()).surahs[0].ayahs, at = n => ayahs[n - 1];
  expect([at(140).juzNumber, at(140).hizbQuarter]).toEqual([1, 8]);
  expect([at(141).juzNumber, at(141).hizbQuarter]).toEqual([2, 9]);
  expect(at(156).hizbQuarter).toBe(9);
  expect(at(157).hizbQuarter).toBe(10);
  // Hafs 2:26 (quarter 2) is Warsh 2:25.
  expect([at(24).hizbQuarter, at(25).hizbQuarter]).toEqual([1, 2]);
});

test('the corrected Warsh index puts the start of juz 2 at 2:141 for plans and memorization', () => {
  const quran = warshBaqarah();
  quran.surahs.unshift({ number: 1, name: 'الفاتحة', codedName: '', ayahs: Array.from({ length: 7 }, (_, i) => ({ mushafId: 4, surahNumber: 1, ayahNumber: i + 1, sourceId: i + 1, pageNumber: 1,
    text: 'نص', marker: '', availableContent: [], hafsAyahNumbers: i ? [i + 2] : [1, 2], juzNumber: 1, hizbQuarter: 1 })) });
  const index = buildPlanIndex(prepareReaderContent(quran));
  const juz2 = index.ayahs[index.juzs[1]];
  expect([juz2.surahNumber, juz2.ayahNumber]).toEqual([2, 141]);
  const q10 = index.ayahs[index.quarters[9]];
  expect([q10.surahNumber, q10.ayahNumber]).toEqual([2, 157]);
});

test('Hafs data that is already tagged by text is left unchanged', () => {
  const quran = { id: 2, name: 'حفص', surahs: hafsSample.surahs.map(s => ({ number: s.id, name: s.name, codedName: s.coded_name, ayahs: decodeSurahAyahs(s.ayahs, 2, s.id) })) };
  expect(alignDivisionsToText(quran)).toBe(quran);
});
