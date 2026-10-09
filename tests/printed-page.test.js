import { expect, test } from 'bun:test';
import samples from './fixtures/quranpedia/warsh-typography.json';
import fixtures from './fixtures/quranpedia/warsh-page-regions.json';
import { decodePrintedPage, pageInk } from '../src/features/quran-reader/utils/printed-page';
import { horizontalInkBounds } from '../src/features/quran-reader/utils/artwork-bounds';

function page(number) {
  return { number, mushafId: 4, ayahs: samples.flatMap((surah) => surah.ayahs
    .filter((ayah) => ayah.page_number === number)
    .map((ayah) => ({ surahNumber: surah.id, ayahNumber: ayah.number }))) };
}

test('real Warsh page polygons match the API, including one long ayah and three final surahs', () => {
  for (const number of [1, 3, 48, 604]) {
    const decoded = decodePrintedPage(fixtures[number], page(number));
    expect(decoded.regions).toHaveLength(page(number).ayahs.length);
    expect(decoded.xml).not.toContain('ayahPolygon');
  }
  const bounds = decodePrintedPage(fixtures[1], page(1));
  expect(bounds.viewBox).toBe('-6 0 235 235');
  expect(bounds.xml).toContain('viewBox="-6 0 235 235"');
});

test('a dense printed page retains the original 15 line bands, independently of font size', () => {
  const decoded = decodePrintedPage(fixtures[3], page(3));
  const ys = decoded.regions.flatMap((region) => [...region.path.matchAll(/[ML]\s+[-\d.]+\s+([-\d.]+)/g)].map((m) => Number(m[1])));
  expect(new Set(ys).size).toBe(16); // 15 consecutive line bands bounded by 16 y positions.
  expect(decoded.width / decoded.height).toBe(345 / 550);
});

test('rejects artwork from another page and missing or duplicate ayah regions', () => {
  expect(() => decodePrintedPage(fixtures[3], page(1))).toThrow();
  const missing = fixtures[3].replace(/<path[^>]+\/>/, '');
  expect(() => decodePrintedPage(missing, page(3))).toThrow();
  const duplicate = fixtures[3].replace('</svg>', fixtures[3].match(/<path[^>]+\/>/)[0] + '</svg>');
  expect(() => decodePrintedPage(duplicate, page(3))).toThrow();
});

test('theme changes ink without changing any Quran glyph geometry', () => {
  const decoded = decodePrintedPage(fixtures[3], page(3));
  const ink = pageInk(decoded.xml, '#E7EBDE', '#C7B17A');
  expect(ink.match(/\bd="[^"]+"/g)).toEqual(decoded.xml.match(/\bd="[^"]+"/g));
  expect(ink).toContain('fill="#E7EBDE"');
  expect(ink).toContain('fill="#C7B17A"');
});

test('trims blank side gutters and centers ink and hit regions without changing glyphs', () => {
  const xml = '<svg viewBox="-6 0 345 550"><path class="ayahPolygon" surah="2" ayah="5" d="M 0 0 H 345 V 550 Z"/>' +
    '<g transform="matrix(2 0 0 -2 10 550)"><g transform="translate(5 0)"><g id="content">' +
    '<path d="M 0 0 H 150 V 200 H 0 Z"/></g></g></g></svg>';
  const originalPaths = xml.match(/\bd="[^"]+"/g).slice(1);
  const decoded = decodePrintedPage(xml, { number: 3, mushafId: 4, ayahs: [{ surahNumber: 2, ayahNumber: 5 }] });
  expect(horizontalInkBounds(decoded.xml)).toEqual([20, 320]);
  expect(decoded.viewBox).toBe('19.5 0 301 550');
  expect(decoded.xml).toContain(`viewBox="${decoded.viewBox}"`);
  expect(decoded.xml.match(/\bd="[^"]+"/g)).toEqual(originalPaths);
  expect(decoded.regions[0].path).toBe('M 0 0 H 345 V 550 Z');
});

test('ink bounds include Bezier extrema, transformed markers, and sibling groups', () => {
  const xml = '<svg><g transform="translate(10 0)"><path d="M 0 0 C 40 0 40 40 0 40 Z"/></g>' +
    '<g transform="translate(-5 0) scale(2)"><path d="M 0 0 H 5 V 5 H 0 Z"/></g></svg>';
  expect(horizontalInkBounds(xml)).toEqual([-5, 40]);
});

test('surah headings occupy their reserved lines without covering basmala or ayahs', () => {
  expect(decodePrintedPage(fixtures[1], page(1)).headings).toEqual([]);
  expect(decodePrintedPage(fixtures[3], page(3)).headings).toEqual([]);
  const decoded = decodePrintedPage(fixtures[604], page(604));
  expect(decoded.headings.map((heading) => heading.surah)).toEqual([112, 113, 114]);
  for (const heading of decoded.headings) {
    const region = decoded.regions.find((value) => value.surah === heading.surah && value.ayah === 1);
    const firstAyahY = Number(region.path.match(/^M\s+[-\d.]+\s+([-\d.]+)/)[1]);
    expect(heading.y).toBeGreaterThanOrEqual(0);
    expect(heading.y + heading.height).toBe(firstAyahY - heading.height);
  }
  expect(decoded.xml).not.toContain('xmlns:ayah');
  expect(decoded.xml).not.toContain('ayah:x');
});
