import { describe, expect, test } from 'bun:test';
import { mashriqiLetters, quranScript, quranScriptForMushaf } from '../src/features/quran-reader/utils/quran-script';

describe('Warsh letters', () => {
  test('Maghribi keeps the Warsh font and text; Mashriqi uses the Madinah font', () => {
    expect(quranScript('warsh', 'maghribi')).toMatchObject({ fontFamily: 'QuranWarsh', fontMushafId: 4 });
    expect(quranScript('warsh', 'mashriqi')).toMatchObject({ fontFamily: 'QuranHafs', fontMushafId: 2 });
    // Hafs is never changed.
    expect(quranScript('hafs', 'mashriqi')).toMatchObject({ fontFamily: 'QuranHafs', fontMushafId: 2 });
    expect(quranScript('hafs', 'mashriqi').display('فِے')).toBe('فِے');
    expect(quranScriptForMushaf(4, 'mashriqi').fontFamily).toBe('QuranHafs');
  });

  test('only the final ya and alif with madda take the Madinah forms', () => {
    // From the Warsh edition: An-Nas 5 and Al-Baqarah 5.
    expect(mashriqiLetters('اِ۬لذِے يُوَسْوِسُ فِے')).toBe('اِ۬لذِى يُوَسْوِسُ فِى');
    expect(mashriqiLetters('ءَآنذَرْتَهُمْ')).toBe('ءَآنذَرْتَهُمْ');
    const plain = 'فَكَذَّبْنَا وَقُلْنَا';
    expect(mashriqiLetters(plain)).toBe(plain);
  });
});
