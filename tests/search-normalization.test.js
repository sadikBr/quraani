import { describe, expect, test } from 'bun:test';
import hafs from './fixtures/quranpedia/hafs-sample.json';
import typography from './fixtures/quranpedia/warsh-typography.json';
import { decodeMushaf, decodeSurahAyahs, decodeAyah } from '../src/lib/quranpedia/validation';
import { createArabicMatcher, createQuranSearch, normalizeArabicSearch, searchableArabic } from '../src/features/quran-reader/utils/search';

const quran = { ...decodeMushaf(hafs), surahs: hafs.surahs.map((s) => ({ number: s.id, name: s.name, codedName: s.coded_name, ayahs: decodeSurahAyahs(s.ayahs, 2, s.id) })) };
const text = (surah, ayah) => hafs.surahs.find((s) => s.id === surah).ayahs.find((a) => a.number === ayah).text;
const warsh = (surah, ayah) => typography.flatMap((s) => s.ayahs ?? []).find((a) => Number(a.surah) === surah && a.number === ayah)?.text;
const search = createQuranSearch(quran);
const refs = (query) => search(query, { limit: 100 }).items.map((i) => `${i.reference.surahNumber}:${i.reference.ayahNumber}`);
const matches = (query, value) => createArabicMatcher(query)(searchableArabic(value));

describe('Quran search normalization', () => {
  test('strips small waw/yeh (Lm) and Quranic ornaments, stop signs and annotation marks', () => {
    expect(normalizeArabicSearch('حَوۡلَهُۥ لِنُرِيَهُۥ')).toBe('حوله لنريه');
    expect(matches('حوله لنريه', 'ٱلَّذِي بَٰرَكۡنَا حَوۡلَهُۥ لِنُرِيَهُۥ مِنۡ ءَايَٰتِنَآۚ')).toBe(true);
    expect(refs('حوله ذهب')).toEqual(['2:17']);
    expect(normalizeArabicSearch(`۞ ${text(2, 26).slice(2, 20)}`)).not.toMatch(/[ۖ-ۭ࣓-ࣿ]/);
    expect(normalizeArabicSearch('رَيۡبَۛ فِيهِۛ ۝١ ۩ ࣰ')).toBe('ريب فيه 1');
    for (const ayah of hafs.surahs.flatMap((s) => s.ayahs)) {
      expect(normalizeArabicSearch(ayah.text)).toMatch(/^[ا-ي 0-9]+$/u);
    }
  });

  test('superscript alef: standard spellings match with or without the alef', () => {
    expect(normalizeArabicSearch('ٱلرَّحۡمَٰنِ')).toBe('الرحمن');
    expect(refs('الرحمن')).toEqual(['1:1', '1:3']);
    expect(refs('الرحمان')).toEqual(['1:1', '1:3']);
    expect(refs('العالمين')).toEqual(['1:2']);
    expect(refs('الحمد لله رب العلمين')).toEqual(['1:2']);
    expect(refs('ذلك الكتاب لا ريب')).toEqual(['2:2']);
    expect(refs('مالك يوم الدين')).toEqual(['1:4']);
  });

  test('Uthmani waw/alef maksura seats with superscript alef map to alef', () => {
    expect(normalizeArabicSearch('ٱلصَّلَوٰةَ')).toBe('الصلاه');
    expect(refs('يقيمون الصلاة')).toEqual(['2:3']);
    expect(refs('فسواهن')).toEqual(['2:29']);
    expect(normalizeArabicSearch('ٱلتَّوۡرَىٰةَ')).toBe('التوراه');
    // Final alef maksura keeps its standard spelling.
    expect(refs('على هدى من ربهم')).toEqual(['2:5']);
  });

  test('hamza seats, bare hamza, teh marbuta and alef maksura fold to their bare forms', () => {
    expect(refs('أأنذرتهم')).toEqual(['2:6']);
    expect(refs('بالآخرة هم يوقنون')).toEqual(['2:4']);
    expect(refs('ءامنوا')).toEqual(refs('آمنوا'));
    expect(refs('شيء')).toEqual(refs('شي'));
    expect(normalizeArabicSearch('شَيۡءٖ سَوَآءٌ')).toBe('شي سوا');
    expect(refs('آمنوا').length).toBeGreaterThan(0);
    expect(refs('يستحيي')).toEqual(['2:26']);
    expect(refs('يستحي')).toEqual(['2:26']);
    expect(normalizeArabicSearch('يُؤۡمِنُونَ')).toBe(normalizeArabicSearch('يُومِنُونَ'));
    const warshText = warsh(2, 5);
    expect(matches('أأنذرتهم', warshText)).toBe(true);
    expect(matches('لا يؤمنون', warshText)).toBe(true);
  });

  test('stays precise and never changes displayed text', () => {
    expect(refs('الرحمن')).not.toContain('1:2');
    expect(refs('ابراهيم')).toEqual([]);
    expect(createArabicMatcher('ـ')).toBeNull();
    const before = structuredClone(quran);
    search('الصلاة');
    expect(quran).toEqual(before);
    expect(search('الصلاة').items[0].text).toBe(text(2, 3));
    expect(decodeAyah(hafs.surahs[0].ayahs[0], 2, 1).text).toBe(text(1, 1));
  });
});
