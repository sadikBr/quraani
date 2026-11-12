import { expect, test } from 'bun:test';
import warsh from '../assets/quran/mushaf-4.json';
import hafs from '../assets/quran/mushaf-2.json';
import { expandBundledMushaf } from '../src/lib/quranpedia/bundled';
import { decodeQuran } from '../src/lib/quranpedia/validation';
import { hasSajda, SAJDA_SIGN, splitSajda } from '../src/features/quran-reader/utils/sajda';
import { tajweedTextDocument } from '../src/features/quran-reader/utils/tajweed-text-document';

const ayahsOf = (bundle, id) => decodeQuran(expandBundledMushaf(bundle), id).surahs.flatMap((s) => s.ayahs);

test('the sign of prostration closes its ayah in both editions, and is drawn apart from the text', () => {
  for (const [bundle, id, count] of [[warsh, 4, 13], [hafs, 2, 15]]) {
    const marked = ayahsOf(bundle, id).filter((a) => hasSajda(a.text));
    expect(marked).toHaveLength(count);
    for (const ayah of marked) {
      const { text, sign } = splitSajda(ayah.text);
      expect(sign).toBe(SAJDA_SIGN);
      expect(text + sign).toBe(ayah.text);
      expect(hasSajda(text)).toBe(false);
    }
  }
  expect(splitSajda('نص')).toEqual({ text: 'نص', sign: '' });
});

test('the text document draws the sign as a marker, once, and leaves other ayahs alone', () => {
  const ayahs = ayahsOf(warsh, 4);
  const sajda = ayahs.find((a) => hasSajda(a.text)), plain = ayahs[0];
  const palette = { card: '#fff', foreground: '#000', ornament: '#a80', highlight: '#eee', border: '#ccc', secondary: '#ddd', secondaryForeground: '#111', primary: '#060' };
  const html = tajweedTextDocument([plain, sajda], 'flowing', 'font', 24, false, palette);
  expect(html.split(`<span class="marker">${SAJDA_SIGN}</span>`)).toHaveLength(2);
});
