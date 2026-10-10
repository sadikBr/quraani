import { expect, test } from 'bun:test';
import { readerIndexItems, indexRouteDestination } from '../src/features/quran-reader/utils/reader-index';
const first = { mushafId: 4, surahNumber: 2, ayahNumber: 1, pageNumber: 2, hafsAyahNumbers: [1, 2] };
const boundary = { mushafId: 4, surahNumber: 2, ayahNumber: 10, pageNumber: 3 };
const content = { quran: { id: 4, surahs: [
  { number: 2, name: 'سُورَة الْبَقَرَة', ayahs: [first, boundary] },
  { number: 17, name: 'سورة الإسراء', ayahs: [{ mushafId: 4, surahNumber: 17, ayahNumber: 1, pageNumber: 282 }] },
] }, juzIndex: [{ number: 2, pageNumber: 3, start: boundary }], hizbIndex: [{ number: 3, pageNumber: 3, start: boundary }] };

test('surah filtering ignores diacritics and alef variants without altering source names', () => {
  expect(readerIndexItems(content, 'surah', 'البقرة')).toEqual([{ number: 2, title: 'سُورَة الْبَقَرَة', detail: 'آيتان',
    pageNumber: 2, start: { mushafId: 4, surahNumber: 2, ayahNumber: 1 } }]);
  expect(readerIndexItems(content, 'surah', 'اسراء').map((item) => item.number)).toEqual([17]);
  expect(readerIndexItems(content, 'surah', 'غير موجود')).toEqual([]);
  expect(readerIndexItems(content, 'surah')).toHaveLength(2);
});
test('juz and hizb entries retain exact start ayahs rather than the beginning of their page', () => {
  for (const kind of ['juz', 'hizb']) {
    const [item] = readerIndexItems(content, kind);
    expect(item.pageNumber).toBe(3);
    expect(item.start).toBe(boundary);
    expect(item.detail).toContain('الآية 10');
  }
});
test('route jumps validate edition-local ayahs and reject malformed parameters', () => {
  expect(indexRouteDestination(content, '2', '1')).toBe(first);
  expect(indexRouteDestination(content, '٢', '١٠')).toBe(boundary);
  for (const args of [['2', '2'], ['115', '1'], ['2x', '1'], [['2'], '1'], ['2', undefined]]) {
    expect(indexRouteDestination(content, ...args)).toBeUndefined();
  }
});

test('index accepts Arabic numbers and filters division starts without changing their boundaries', () => {
  for (const query of ['2', '٢', '۲']) expect(readerIndexItems(content, 'surah', query).map(item => item.number)).toEqual([2]);
  expect(readerIndexItems(content, 'juz', '٢')[0].start).toBe(boundary);
  expect(readerIndexItems(content, 'hizb', '٣')[0].start).toBe(boundary);
  expect(readerIndexItems(content, 'hizb', 'البقرة')[0].start).toBe(boundary);
  expect(readerIndexItems(content, 'juz', '3')).toEqual([]);
  expect(readerIndexItems(content, 'hizb', '999')).toEqual([]);
});

test('juz and hizb numbers match exactly, in Latin or Arabic-Indic digits', () => {
  const entry = (number) => ({ number, pageNumber: number, start: boundary });
  const many = { ...content, juzIndex: [2, 20, 22, 29].map(entry), hizbIndex: [5, 50, 55, 59].map(entry) };
  expect(readerIndexItems(many, 'hizb', 'الحزب 5').map((item) => item.number)).toEqual([5]);
  expect(readerIndexItems(many, 'hizb', 'الحزب ٥').map((item) => item.number)).toEqual([5]);
  expect(readerIndexItems(many, 'hizb', 'الحزب٥٠').map((item) => item.number)).toEqual([50]);
  expect(readerIndexItems(many, 'juz', 'الجزء 2').map((item) => item.number)).toEqual([2]);
  expect(readerIndexItems(many, 'juz', '۲').map((item) => item.number)).toEqual([2]);
  expect(readerIndexItems(many, 'juz', 'الجزء').map((item) => item.number)).toEqual([2, 20, 22, 29]);
  expect(readerIndexItems(many, 'juz', 'البقرة 22').map((item) => item.number)).toEqual([22]);
  expect(readerIndexItems(many, 'juz', 'الحزب 2')).toEqual([]);
});
