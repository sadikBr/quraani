import { expect, test } from 'bun:test';
import { alignDivisionsToText, HAFS_QUARTER_STARTS, hafsQuarterOf } from '../src/features/quran-reader/utils/divisions';
import { eighthInHizb, WARSH_EIGHTH_STARTS, warshEighthOf } from '../src/features/quran-reader/utils/warsh-eighths';
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

/** Juz starts of the King Fahd Complex's Warsh data (its own juz tags), in Warsh numbering. */
const WARSH_JUZ_STARTS = ['1:1', '2:141', '2:251', '3:91', '4:24', '4:147', '5:84', '6:112', '7:87', '8:41', '9:94', '11:6', '12:53', '15:1', '17:1',
  '18:74', '21:1', '23:1', '25:21', '27:58', '29:46', '33:31', '36:27', '39:31', '41:46', '46:1', '51:31', '58:1', '67:1', '78:1'];

test('the Warsh mushaf has 480 ordered athman and every 16th one starts a juz', () => {
  expect(WARSH_EIGHTH_STARTS).toHaveLength(480);
  for (let i = 1; i < 480; i++) {
    const [s0, a0] = WARSH_EIGHTH_STARTS[i - 1], [s1, a1] = WARSH_EIGHTH_STARTS[i];
    expect(s1 > s0 || (s1 === s0 && a1 > a0)).toBe(true);
  }
  expect(WARSH_EIGHTH_STARTS.filter((_, i) => i % 16 === 0).map(([s, a]) => `${s}:${a}`)).toEqual(WARSH_JUZ_STARTS);
  // Hizb 2 opens at «وإذا لقوا» (2:75); 2:84 holds a ۞ mid-ayah and starts the next eighth.
  expect([warshEighthOf(2, 74), warshEighthOf(2, 75), warshEighthOf(2, 83), warshEighthOf(2, 84)]).toEqual([8, 9, 9, 10]);
  expect([warshEighthOf(1, 1), warshEighthOf(2, 15), warshEighthOf(2, 16), warshEighthOf(114, 6)]).toEqual([1, 1, 2, 480]);
  expect([eighthInHizb(1), eighthInHizb(9), eighthInHizb(480)]).toEqual([{ hizb: 1, thumun: 1 }, { hizb: 2, thumun: 1 }, { hizb: 60, thumun: 8 }]);
});

/** Warsh Al-Baqarah: 285 ayahs, its first ayah covers Hafs 1–2, then Warsh n = Hafs n + 1.
 * Quranpedia tags Warsh ayahs as if they were Hafs ayahs with the same number. */
function warshBaqarah() {
  const ayah = (number, hafs) => ({ mushafId: 4, surahNumber: 2, ayahNumber: number, sourceId: 1000 + number, pageNumber: 2, text: 'نص', marker: '', availableContent: [],
    hafsAyahNumbers: hafs, juzNumber: Math.ceil(hafsQuarterOf(2, number) / 8), hizbQuarter: hafsQuarterOf(2, number) });
  return { id: 4, name: 'ورش', surahs: [{ number: 2, name: 'البقرة', codedName: '', ayahs: Array.from({ length: 285 }, (_, i) => ayah(i + 1, i ? [i + 2] : [1, 2])) }] };
}

test('Warsh divisions follow its own marks: juz 2 / hizb 3 starts at 2:141, hizb 2 at 2:75', () => {
  const ayahs = alignDivisionsToText(warshBaqarah()).surahs[0].ayahs, at = n => ayahs[n - 1];
  expect([at(140).juzNumber, at(140).hizbQuarter]).toEqual([1, 8]);
  expect([at(141).juzNumber, at(141).hizbQuarter]).toEqual([2, 9]);
  expect(at(156).hizbQuarter).toBe(9);
  expect(at(157).hizbQuarter).toBe(10);
  // Hafs 2:26 (quarter 2) is Warsh 2:25.
  expect([at(24).hizbQuarter, at(25).hizbQuarter]).toEqual([1, 2]);
  // Hafs's hizb 2 starts at «أفتطمعون» (Warsh 2:74); the Warsh mushaf's at the next ayah.
  expect([at(74).hizbQuarter, at(75).hizbQuarter]).toEqual([4, 5]);
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
