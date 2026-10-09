import { expect, test } from 'bun:test';
import { readerIndexItems, indexRouteDestination } from '../src/features/quran-reader/utils/reader-index';
const first = { mushafId: 4, surahNumber: 2, ayahNumber: 1, pageNumber: 2, hafsAyahNumbers: [1, 2] };
const boundary = { mushafId: 4, surahNumber: 2, ayahNumber: 10, pageNumber: 3 };
const content = { quran: { id: 4, surahs: [
  { number: 2, name: 'سُورَة الْبَقَرَة', ayahs: [first, boundary] },
  { number: 17, name: 'سورة الإسراء', ayahs: [{ mushafId: 4, surahNumber: 17, ayahNumber: 1, pageNumber: 282 }] },
] }, juzIndex: [{ number: 2, pageNumber: 3, start: boundary }], hizbIndex: [{ number: 3, pageNumber: 3, start: boundary }] };

test('surah filtering ignores diacritics and alef variants without altering source names', () => {
  expect(readerIndexItems(content, 'surah', 'البقرة')).toEqual([{ number: 2, title: 'سُورَة الْبَقَرَة', detail: '2 آيات',
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
