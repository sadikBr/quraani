import { expect, test } from 'bun:test';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import { decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { ayahShareText, decodeBookmarks, parallelAyahs, passageAyahs } from '../src/features/quran-reader/utils/ayah-actions';
import { createQuranSearch } from '../src/features/quran-reader/utils/search';
const ayahs = decodeSurahAyahs(fatiha, 4, 1);
const quran = { id: 4, surahs: [{ number: 1, name: 'الفاتحة', ayahs }, { number: 2, name: 'البقرة', ayahs: [{ ...ayahs[0], surahNumber: 2 }] }] };
test('passage selection validates order, edition and endpoints across surahs', () => {
  expect(passageAyahs(quran, ayahs[5], 2, 1)).toHaveLength(3);
  expect(passageAyahs(quran, ayahs[5], 1, 1)).toEqual([]);
  expect(passageAyahs(quran, ayahs[0], 115, 1)).toEqual([]);
  expect(passageAyahs(quran, { ...ayahs[0], mushafId: 1 }, 1, 7)).toEqual([]);
  expect(passageAyahs(quran, ayahs[0], 1, NaN)).toEqual([]);
});
test('bookmarks reject malformed and other-riwayah references and deduplicate', () => {
  expect(decodeBookmarks('{')).toEqual([]);
  expect(decodeBookmarks(JSON.stringify(['4:1:1', '4:1:1', '1:1:1', '4:115:1', '4:0:1', null]))).toEqual(['4:1:1']);
});
test('copy/share preserves original Warsh text and marker with Warsh reference', () => {
  expect(ayahShareText(ayahs[0], 'الفاتحة')).toBe(`${ayahs[0].text} ${ayahs[0].marker}\nالفاتحة · الآية 1 · رواية ورش عن نافع`);
  expect(parallelAyahs(ayahs[0])).toEqual([1, 2]);
});
test('long search pagination keeps original text, stable references and full result count', () => {
  const long = { id: 4, surahs: [{ number: 2, name: 'البقرة', ayahs: Array.from({ length: 286 }, (_, i) => ({ ...ayahs[0], surahNumber: 2, ayahNumber: i + 1 })) }] };
  const search = createQuranSearch(long);
  const results = [0, 100, 200].flatMap((offset) => search('الحمد', { offset, limit: 100 }).items);
  expect(results).toHaveLength(286);
  expect(new Set(results.map((v) => v.reference.ayahNumber)).size).toBe(286);
  expect(results.every((v) => v.text === ayahs[0].text)).toBe(true);
  expect(search('لا توجد هذه العبارة').total).toBe(0);
  expect(search('').items).toEqual([]);
});
test('Warsh yeh forms match ordinary Arabic without changing displayed text', () => {
  const original = 'اِ۬لذِے فِے شَےْءٖ';
  const search = createQuranSearch({ id: 4, surahs: [{ number: 2, name: 'البقرة', ayahs: [{ ...ayahs[0], text: original }] }] });
  expect(search('الذي في شيء').items[0].text).toBe(original);
});
