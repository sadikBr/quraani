import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import sample from './fixtures/quranpedia/hafs-sample.json';
import { decodeMushaf, decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { decodeReadingPreferences } from '../src/features/quran-reader/state/reading-preferences';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { pageSections } from '../src/features/quran-reader/utils/page-sections';
import { readingPositionKey } from '../src/features/quran-reader/riwayat';
import { restoreReadingPosition } from '../src/features/quran-reader/utils/navigation';
import { ayahShareText, decodeBookmarks } from '../src/features/quran-reader/utils/ayah-actions';
import { createPrintedPageLoader } from '../src/features/quran-reader/services/printed-page-loader';
import { decodePrintedPage } from '../src/features/quran-reader/utils/printed-page';
import { alignTajweed, decodeTajweedSurah, decodeTajweedPrintedSurah, sliceTajweed } from '../src/features/quran-reader/utils/tajweed';
import { tajweedTextDocument, tajweedTextState } from '../src/features/quran-reader/utils/tajweed-text-document';
import { readerThemes } from '../src/features/quran-reader/theme';
import { createPagePractice, practiceVisibility } from '../src/features/quran-reader/utils/page-practice';
const quran = { ...decodeMushaf(sample), surahs: sample.surahs.map((s) => ({ number: s.id, name: s.name, codedName: s.coded_name, ayahs: decodeSurahAyahs(s.ayahs, 2, s.id) })) };
const content = prepareReaderContent(quran);
const fixture = (name) => readFileSync(new URL(`./fixtures/quranpedia/${name}`, import.meta.url), 'utf8');

test('legacy installs stay Warsh; Hafs, colors and both text layouts survive restoration', () => {
  expect(decodeReadingPreferences('{}').riwayah).toBe('warsh');
  expect(decodeReadingPreferences('{"riwayah":"unknown"}').riwayah).toBe('warsh');
  for (const mode of ['page', 'text']) for (const textLayout of ['ayah', 'flowing']) {
    const value = decodeReadingPreferences(JSON.stringify({ riwayah: 'hafs', tajweed: true, mode, textLayout }));
    expect(value).toMatchObject({ riwayah: 'hafs', tajweed: true, mode, textLayout });
  }
});
test('Hafs Fatiha includes its numbered basmala once, other surahs retain unnumbered openings', () => {
  expect(pageSections(content.pages[0], quran)[0].showBismillah).toBe(false);
  expect(content.pages[0].ayahs).toHaveLength(7);
  expect(content.pages[0].ayahs[0].text).toBe(sample.surahs[0].ayahs[0].text);
  expect(pageSections(content.pages[1], quran)[0].showBismillah).toBe(true);
});
test('positions, bookmarks and share attribution remain edition-specific', () => {
  expect(readingPositionKey(4)).toBe('warsh:reading-position:v1');
  expect(readingPositionKey(2)).not.toBe(readingPositionKey(4));
  const saved = { mushafId: 2, pageNumber: 3, ayah: null, scrollY: 20 };
  expect(restoreReadingPosition(JSON.stringify(saved), content)).toEqual(saved);
  expect(restoreReadingPosition(JSON.stringify({ ...saved, mushafId: 4 }), content).pageNumber).toBe(1);
  expect(decodeBookmarks('["2:1:1","4:1:1","1:1:1"]')).toEqual(['2:1:1','4:1:1']);
  expect(ayahShareText(content.pages[0].ayahs[0], 'الفاتحة')).toContain('حفص عن عاصم');
});
test('warm printed caches cannot return Warsh artwork for a Hafs page of the same number', async () => {
  const loader = createPrintedPageLoader(async (p) => ({ xml: `${p.mushafId}`, cacheKey: `${p.mushafId}:${p.number}` }));
  const warsh = { mushafId: 4, number: 1, ayahs: [] }, hafs = { ...warsh, mushafId: 2 };
  const [w,h] = await Promise.all([loader.load(warsh), loader.load(hafs)]);
  expect(w).not.toEqual(h); expect(loader.peek(warsh)).toBe(w); expect(loader.peek(hafs)).toBe(h);
  const page = content.pages[2];
  expect(decodePrintedPage(fixture('hafs-page3-regions.svg'), page).regions).toHaveLength(page.ayahs.length);
});
test('published tajweed colors retain all letters and markers, including a doubled tatweel', () => {
  const html = fixture('hafs-tajweed-sample.html');
  for (const surah of quran.surahs) {
    const local = html.replace(/<a\b([^>]*)>[\s\S]*?<\/a>/g, (tag, attrs) => attrs.includes(`surah="${surah.number}"`) ? tag : '');
    const colored = decodeTajweedSurah(local, surah);
    for (const a of surah.ayahs) expect(colored[a.ayahNumber].map((r) => r.text).join('')).toBe(a.text);
  }
  expect(() => alignTajweed([{ text: 'بِسْمِ' }], 'بَسْمِ')).toThrow();
  const runs = [{ text: 'abc', rule: 'qlq' }, { text: ' def' }];
  expect(sliceTajweed(runs, 'abc def', 2, 5).map((r) => r.text).join('')).toBe('c d');
});
test('colored printed glyphs have exact ayah targets and cannot inject markup', () => {
  const html = fixture('hafs-tajweed-printed-sample.html');
  const pages = decodeTajweedPrintedSurah(html, quran.surahs[0]);
  expect(pages[1].flatMap((l) => l.words).filter((w) => w.marker).map((w) => w.ayah)).toEqual([1,2,3,4,5,6,7]);
  expect(() => decodeTajweedPrintedSurah(html.replace('ayah="1"', 'ayah="999"'), quran.surahs[0])).toThrow();
  expect(() => decodeTajweedPrintedSurah(html.replace('ﱁ', '&lt;script&gt;'), quran.surahs[0])).toThrow();
});

test('joined text rendering preserves Quran Unicode and ayah markers through hide/reveal', () => {
  const page = content.pages[0], surah = quran.surahs[0];
  const source = fixture('hafs-tajweed-sample.html').replace(/<a\b([^>]*)>[\s\S]*?<\/a>/g, (tag, attrs) => attrs.includes('surah="1"') ? tag : '');
  const runs = decodeTajweedSurah(source, surah);
  const plan = createPagePractice(page);
  const hidden = JSON.parse(tajweedTextState(page.ayahs, runs, true, readerThemes.midnight, page.ayahs[1], practiceVisibility(plan, 0)));
  for (let i = 0; i < hidden.length; i++) {
    expect(hidden[i].words.join('').replace(/<[^>]*>/g, '')).toBe(page.ayahs[i].text);
    expect(hidden[i].visible).toBe(0);
    expect(hidden[i].selected).toBe(false);
  }
  const revealed = JSON.parse(tajweedTextState(page.ayahs, runs, true, readerThemes.midnight, null, practiceVisibility(plan, 1)));
  expect(revealed[0].visible).toBe(1);
  expect(revealed.slice(1).every((ayah) => ayah.visible === 0)).toBe(true);
  // Hide/reveal updates visibility in the existing document, never its source.
  for (const layout of ['ayah', 'flowing']) {
    const html = tajweedTextDocument(page.ayahs, layout, 'data:font/ttf;base64,AA==', 36, false, readerThemes.midnight);
    for (const ayah of page.ayahs) expect(html.split(ayah.marker).length - 1).toBe(1);
    expect(html.includes('\u200d')).toBe(false); // no synthetic joiners in sacred text
    const visible = JSON.parse(tajweedTextState(page.ayahs, runs, true, readerThemes.midnight, null));
    expect(visible.every((ayah) => ayah.visible === null)).toBe(true);
  }
});
