import { describe, expect, test } from 'bun:test';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { restoreReadingPosition, savedPaging } from '../src/features/quran-reader/utils/navigation';
import { pageStartAyah, paginateByThumun, readerPaging, thumunName } from '../src/features/quran-reader/utils/thumun-pages';

/** Ayahs per surah in the Warsh (Madani) numbering, 6214 in all. */
const WARSH_COUNTS = [7, 285, 200, 175, 122, 167, 206, 76, 130, 109, 121, 111, 44, 54, 99, 128, 110, 105, 99, 134, 111, 76, 119, 62, 77, 226, 95, 88, 69, 59,
  33, 30, 73, 54, 46, 82, 182, 86, 72, 84, 53, 50, 89, 56, 36, 34, 39, 29, 18, 45, 60, 47, 61, 55, 77, 99, 28, 21, 24, 13, 14, 11, 11, 18, 12, 12, 31, 52, 52, 44,
  30, 28, 18, 55, 39, 31, 50, 40, 45, 42, 29, 19, 36, 25, 22, 17, 19, 26, 32, 20, 15, 21, 11, 8, 8, 20, 5, 8, 9, 11, 10, 8, 3, 9, 5, 5, 6, 3, 6, 3, 5, 4, 5, 6];

/** A Warsh-numbered corpus spread evenly over 604 pages (not the Quran text). */
function warshContent() {
  let index = 0;
  const surahs = WARSH_COUNTS.map((count, s) => ({ number: s + 1, name: `سورة ${s + 1}`, codedName: '', ayahs: Array.from({ length: count }, (_, a) => ({
    mushafId: 4, surahNumber: s + 1, ayahNumber: a + 1, sourceId: ++index, pageNumber: Math.floor((index - 1) * 604 / 6214) + 1,
    text: 'نص', marker: '', availableContent: [], hafsAyahNumbers: [], juzNumber: null, hizbQuarter: null })) }));
  return prepareReaderContent({ id: 4, name: 'ورش', riwayah: { id: 2, name: 'ورش', fullName: '', qiraahId: 1 }, surahs });
}
const content = warshContent();
const paged = paginateByThumun(content);
const ref = (surahNumber, ayahNumber) => ({ mushafId: 4, surahNumber, ayahNumber });

describe('the reader paged by thumun', () => {
  test('has a page per thumun, each starting at its mark and holding whole ayahs', () => {
    expect(content.pages).toHaveLength(604);
    expect(paged.paging).toBe('thumun');
    expect(paged.pages).toHaveLength(480);
    expect(paged.pages.map((page) => page.number)).toEqual(Array.from({ length: 480 }, (_, i) => i + 1));
    expect(paged.pages.reduce((sum, page) => sum + page.ayahs.length, 0)).toBe(6214);
    // Hizb 1 is Al-Fatiha with Al-Baqarah 1–15; hizb 2 opens at 2:75.
    expect(paged.pages[0].ayahs.map((a) => `${a.surahNumber}:${a.ayahNumber}`).at(-1)).toBe('2:15');
    expect(paged.pages[8].ayahs[0]).toMatchObject({ surahNumber: 2, ayahNumber: 75, pageNumber: 9 });
    expect(paged.pages.every((page) => page.ayahs.every((ayah) => ayah.pageNumber === page.number) && !page.previousAyah)).toBe(true);
  });

  test('finds every ayah and division on its thumun page, and leaves the content as it was', () => {
    const baqarah = paged.quran.surahs[1].ayahs;
    expect([baqarah[73].pageNumber, baqarah[74].pageNumber]).toEqual([8, 9]);
    expect(paged.juzIndex[1]).toMatchObject({ number: 2, pageNumber: 17, start: ref(2, 141) });
    expect(paged.hizbIndex[1]).toMatchObject({ number: 2, pageNumber: 9, start: ref(2, 75) });
    expect(paged.quarterHizbIndex.map((entry) => entry.pageNumber)).toEqual(Array.from({ length: 240 }, (_, i) => i * 2 + 1));
    expect(content.quran.surahs[1].ayahs[74].pageNumber).toBe(Math.floor(81 * 604 / 6214) + 1);
    expect(paginateByThumun(content)).toBe(paged);
  });

  test('is chosen for Warsh in the text view, outside a goal reading', () => {
    const chosen = { riwayah: 'warsh', mode: 'text', thumunPages: true };
    expect(readerPaging(chosen, false)).toBe('thumun');
    expect(readerPaging(chosen, true)).toBe('mushaf');
    expect(readerPaging({ ...chosen, mode: 'page' }, false)).toBe('mushaf');
    expect(readerPaging({ ...chosen, riwayah: 'hafs' }, false)).toBe('mushaf');
    expect(readerPaging({ ...chosen, thumunPages: false }, false)).toBe('mushaf');
  });

  test('names a page by its hizb and thumun', () => {
    expect([thumunName(1), thumunName(9), thumunName(480)]).toEqual(['الحزب 1 · الثمن 1', 'الحزب 2 · الثمن 1', 'الحزب 60 · الثمن 8']);
  });

  test('carries a saved reading position between the two pagings', () => {
    const start = (paging, page) => pageStartAyah(content, paging, page);
    // A mushaf page without a selected ayah: the thumun holding its first ayah, from the top.
    const mushafPage = content.pages.find((page) => page.ayahs[0].surahNumber === 2 && page.ayahs[0].ayahNumber > 75);
    const first = mushafPage.ayahs[0];
    expect(restoreReadingPosition(JSON.stringify({ mushafId: 4, pageNumber: mushafPage.number, ayah: null, scrollY: 300 }), paged, start))
      .toEqual({ mushafId: 4, pageNumber: paged.quran.surahs[1].ayahs[first.ayahNumber - 1].pageNumber, ayah: null, scrollY: 0 });
    // A selected ayah goes with it, either way.
    const selected = { mushafId: 4, pageNumber: 12, ayah: ref(2, 100), scrollY: 40 };
    expect(restoreReadingPosition(JSON.stringify(selected), paged, start)).toEqual({ mushafId: 4, pageNumber: 12, ayah: ref(2, 100), scrollY: 0 });
    const back = restoreReadingPosition(JSON.stringify({ ...selected, pageNumber: 12, paging: 'thumun' }), content, start);
    expect(back).toEqual({ mushafId: 4, pageNumber: content.quran.surahs[1].ayahs[99].pageNumber, ayah: ref(2, 100), scrollY: 0 });
    // Thumun 9 back to the mushaf page holding 2:75.
    expect(restoreReadingPosition(JSON.stringify({ mushafId: 4, pageNumber: 9, ayah: null, scrollY: 0, paging: 'thumun' }), content, start).pageNumber)
      .toBe(content.quran.surahs[1].ayahs[74].pageNumber);
    // In the same paging, the position is as saved.
    expect(restoreReadingPosition(JSON.stringify({ mushafId: 4, pageNumber: 9, ayah: null, scrollY: 50, paging: 'thumun' }), paged, start))
      .toEqual({ mushafId: 4, pageNumber: 9, ayah: null, scrollY: 50 });
    expect([savedPaging(null), savedPaging('{"paging":"thumun"}'), savedPaging('not json')]).toEqual(['mushaf', 'thumun', 'mushaf']);
  });
});
