import { describe, expect, test } from 'bun:test';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import page2 from './fixtures/quranpedia/warsh-page2-ayahs.json';
import tajweedSample from './fixtures/quranpedia/warsh-tajweed-sample.json';
import typography from './fixtures/quranpedia/warsh-typography.json';
import { mashriqiLetters, quranScript, quranScriptForMushaf } from '../src/features/quran-reader/utils/quran-script';

/**
 * What the Madinah font (UthmanicHafs_V22) cannot draw in the Arabic block: absent from it, or
 * drawn as its placeholder, a dot in a dashed circle. Found by comparing each character's outline
 * in the font with the placeholder's. Of these, the Warsh font draws only ے, آ and ۟ (and the
 * Arabic comma, semicolon and question mark, which the Quran text has none of).
 */
const UNDRAWN = /[\u0602-\u0620\u0622\u063B-\u063F\u0658-\u065D\u065F\u066A-\u066D\u066F\u0672-\u06D5\u06DF\u06E3\u06EB\u06EE-\u06FF]/u;
/** Every Quran text in the Warsh samples (ayahs and the bismillah), wherever it sits. */
function warshTexts(value, found = []) {
  if (Array.isArray(value)) for (const item of value) warshTexts(item, found);
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    if ((key === 'text' || key === 'bismillah') && typeof item === 'string') found.push(item);
    else warshTexts(item, found);
  }
  return found;
}

describe('Warsh letters', () => {
  test('Maghribi keeps the Warsh font and text; Mashriqi uses the Madinah font', () => {
    expect(quranScript('warsh', 'maghribi')).toMatchObject({ fontFamily: 'QuranWarsh', fontMushafId: 4 });
    expect(quranScript('warsh', 'mashriqi')).toMatchObject({ fontFamily: 'QuranHafs', fontMushafId: 2 });
    // Hafs is never changed.
    expect(quranScript('hafs', 'mashriqi')).toMatchObject({ fontFamily: 'QuranHafs', fontMushafId: 2 });
    expect(quranScript('hafs', 'mashriqi').display('فِے')).toBe('فِے');
    expect(quranScriptForMushaf(4, 'mashriqi').fontFamily).toBe('QuranHafs');
  });

  test('the final ya and alif with madda take the Madinah forms', () => {
    // From the Warsh edition: An-Nas 5 and Al-Baqarah 5.
    expect(mashriqiLetters('اِ۬لذِے يُوَسْوِسُ فِے')).toBe('اِ۬لذِى يُوَسْوِسُ فِى');
    expect(mashriqiLetters('ءَآنذَرْتَهُمْ')).toBe('ءَآنذَرْتَهُمْ');
    const plain = 'فَكَذَّبْنَا وَقُلْنَا';
    expect(mashriqiLetters(plain)).toBe(plain);
  });

  test('the Warsh hamza dot takes the Madinah dot for an eased hamza', () => {
    // From the Warsh edition: Al-Baqarah 20 and 173, Ar-Ra'd 5, Al Imran 15.
    expect(mashriqiLetters('اَ۬لنَّاسُ اُ۟عْبُدُواْ')).toBe('اَ۬لنَّاسُ اُ۬عْبُدُواْ');
    expect(mashriqiLetters('قَلِيلاً ا۟وْلَٰٓئِكَ')).toBe('قَلِيلاً ا۬وْلَٰٓئِكَ');
    expect(mashriqiLetters('أَ۟ذَا كُنَّا')).toBe('أَ۬ذَا كُنَّا');
    expect(mashriqiLetters('قُلَ اَوْ۟نَبِّئُكُم')).toBe('قُلَ اَوْ۬نَبِّئُكُم');
  });

  test('nothing is left that the Madinah font draws as a dotted circle', () => {
    const texts = [...warshTexts([fatiha, page2, tajweedSample, typography]),
      'اُ۟عْبُدُواْ ا۟وْلَٰٓئِكَ أَ۟ذَا اَوْ۟نَبِّئُكُم'];
    // The samples do have such characters as they come (ے), so the check would catch them.
    expect(texts.some((text) => UNDRAWN.test(text))).toBe(true);
    for (const text of texts) expect(mashriqiLetters(text)).not.toMatch(UNDRAWN);
  });
});
