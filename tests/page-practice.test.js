import { expect, test } from 'bun:test';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import { decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { ayahWords, createPagePractice, practiceVisibility, revealNext } from '../src/features/quran-reader/utils/page-practice';
import { ayahKey } from '../src/features/quran-reader/utils/references';

const ayahs = decodeSurahAyahs(fatiha, 4, 1);
const plan = createPagePractice({ mushafId: 4, number: 1, ayahs });

test('word reveals preserve original Warsh letters, diacritics, whitespace and ornaments', () => {
  for (const ayah of ayahs) expect(ayahWords(ayah.text).join('')).toBe(ayah.text);
  const text = '  ۞ وَمَنْ\u00a0يُّهَاجِرْ  فِے سَبِيلِ اِ۬للَّهِۖ ';
  expect(ayahWords(text)).toHaveLength(5);
  expect(ayahWords(text).join('')).toBe(text);
  expect(ayahWords('')).toEqual([]);
});

test('hiding a page starts with no visible words and progresses in ayah order', () => {
  expect([...practiceVisibility(plan, 0).values()].every((value) => value === 0)).toBe(true);
  expect(revealNext(plan, 0, 'word')).toBe(1);
  const partial = practiceVisibility(plan, 1);
  expect(partial.get(ayahKey(ayahs[0]))).toBe(1);
  expect(partial.get(ayahKey(ayahs[1]))).toBe(0);
  const firstEnd = revealNext(plan, 1, 'ayah');
  expect(firstEnd).toBe(plan.ayahs[0].end);
  expect(revealNext(plan, firstEnd, 'word')).toBe(firstEnd + 1);
  expect(revealNext(plan, firstEnd, 'ayah')).toBe(plan.ayahs[1].end);
});

test('completion is bounded and another page has independent reveal progress', () => {
  expect(revealNext(plan, plan.totalWords, 'word')).toBe(plan.totalWords);
  expect(revealNext(plan, plan.totalWords, 'ayah')).toBe(plan.totalWords);
  expect([...practiceVisibility(plan, plan.totalWords).values()]).toEqual(plan.ayahs.map((entry) => entry.words.length));
  const otherPage = createPagePractice({ mushafId: 4, number: 2, ayahs: [{ ...ayahs[0], surahNumber: 2, pageNumber: 2 }] });
  expect(otherPage.pageNumber).toBe(2);
  expect([...practiceVisibility(otherPage, 0).values()]).toEqual([0]);
});

test('a verified printed-page continuation is included without adding unrelated previous verses', () => {
  const previous = { ...ayahs[0], pageNumber: 85, surahNumber: 4, ayahNumber: 44 };
  const first = { ...ayahs[1], pageNumber: 86, surahNumber: 4, ayahNumber: 45 };
  const page = { mushafId: 4, number: 86, previousAyah: previous, ayahs: [first] };
  expect(createPagePractice(page).page.ayahs).toEqual([first]);
  expect(createPagePractice(page, [{ surah: 4, ayah: 45 }]).page.ayahs).toEqual([first]);
  const continued = createPagePractice(page, [{ surah: 4, ayah: 44 }, { surah: 4, ayah: 45 }]);
  expect(continued.page.ayahs).toEqual([previous, first]);
  expect(revealNext(continued, 0, 'ayah')).toBe(ayahWords(previous.text).length);
});

test('surah boundaries keep independent ayah numbers and the original reading order', () => {
  const last = { ...ayahs[6], pageNumber: 604, surahNumber: 113, ayahNumber: 5 };
  const next = { ...ayahs[0], pageNumber: 604, surahNumber: 114, ayahNumber: 1 };
  const closing = createPagePractice({ mushafId: 4, number: 604, ayahs: [last, next] });
  const revealed = revealNext(closing, 0, 'ayah');
  expect(practiceVisibility(closing, revealed).get(ayahKey(last))).toBe(ayahWords(last.text).length);
  expect(practiceVisibility(closing, revealed).get(ayahKey(next))).toBe(0);
  expect(practiceVisibility(closing, revealNext(closing, revealed, 'word')).get(ayahKey(next))).toBe(1);
});
