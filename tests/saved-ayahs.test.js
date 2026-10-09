import { expect, test } from 'bun:test';
import { savedAyahs, filterSavedAyahs } from '../src/features/quran-reader/utils/saved-ayahs';
import { ayahKey } from '../src/features/quran-reader/utils/references';

const first = { mushafId: 4, surahNumber: 1, ayahNumber: 1, pageNumber: 1, text: 'بِسْمِ ٱللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' };
const second = { mushafId: 4, surahNumber: 2, ayahNumber: 255, pageNumber: 42, text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ' };
const quran = { id: 4, surahs: [{ number: 1, name: 'سُورَة الفاتحة', ayahs: [first] }, { number: 2, name: 'سُورَة الْبَقَرَة', ayahs: [second] }] };

test('saved ayahs keep original text and insertion order while excluding other editions and stale keys', () => {
  const items = savedAyahs(quran, [ayahKey(second), ayahKey(first), ayahKey(second), '1:2:255', '4:114:999']);
  expect(items.map(item => item.reference)).toEqual([second, first]);
  expect(items[1].text).toBe(first.text);
  expect(items[0].pageNumber).toBe(42);
});
test('saved ayahs sort by Quran order or newest insertion without changing the source', () => {
  const items = savedAyahs(quran, [ayahKey(first), ayahKey(second)]);
  expect(filterSavedAyahs(items, '', 'recent').map(item => item.reference)).toEqual([second, first]);
  expect(filterSavedAyahs(items, '', 'quran').map(item => item.reference)).toEqual([first, second]);
  expect(items.map(item => item.reference)).toEqual([first, second]);
});
test('saved filtering accepts Arabic text, surah names/numbers and exact Arabic-digit references', () => {
  const items = savedAyahs(quran, [ayahKey(first), ayahKey(second)]);
  for (const query of ['البقرة', '٢', '۲', '٢:٢٥٥', '۲:۲۵۵', 'لا اله']) {
    expect(filterSavedAyahs(items, query, 'quran').map(item => item.reference)).toEqual([second]);
  }
  expect(filterSavedAyahs(items, 'الرحمن', 'recent').map(item => item.reference)).toEqual([first]);
  expect(filterSavedAyahs(items, '2:25', 'quran')).toEqual([]);
  expect(filterSavedAyahs(items, 'غير موجود', 'quran')).toEqual([]);
});
