import { expect, test } from 'bun:test';
import fixtures from './fixtures/quranpedia/warsh-ayah-markers.json';
import { decodePrintedPage } from '../src/features/quran-reader/utils/printed-page';
import { findAyahMarkers } from '../src/features/quran-reader/utils/ayah-markers';
import { svgImageUri } from '../src/features/quran-reader/utils/svg-image';

function decode(number) {
  const xml = fixtures[number];
  const ayahs = [...xml.matchAll(/<path\b[^>]*class="ayahPolygon"[^>]*\/>/g)].map(([tag]) => ({
    surahNumber: Number(tag.match(/surah="(\d+)"/)[1]), ayahNumber: Number(tag.match(/ayah="(\d+)"/)[1]),
  }));
  return decodePrintedPage(xml, { number, mushafId: 4, ayahs });
}

test('real numbered ornaments match their verses despite reversed publisher order', () => {
  const page = decode(29);
  expect(page.markers.map((m) => m.ayah)).toEqual([189, 188, 187, 186]);
  expect(page.markers.every((m) => m.surah === 2)).toBe(true);
  const marker = page.markers.find((m) => m.ayah === 187);
  expect(marker.x + marker.width / 2).toBeCloseTo(285.31, 1);
  expect(marker.y + marker.height / 2).toBeCloseTo(381.69, 1);
  expect(marker.width).toBeLessThan(24);
  expect(marker.height).toBeLessThan(32);
});

test('numbers restarting at each surah still map to distinct ayah actions', () => {
  const page = decode(604);
  expect(page.markers).toHaveLength(15);
  expect(page.markers.filter((m) => m.ayah === 1).map((m) => m.surah)).toEqual([114, 113, 112]);
  expect(new Set(page.markers.map((m) => `${m.surah}:${m.ayah}`))).toEqual(new Set(page.regions.map((r) => `${r.surah}:${r.ayah}`)));
});

test('unknown or ambiguous marker locations never select an arbitrary verse', () => {
  const xml = '<svg><g class="ayah_marker_mark"><path d="M 0 0 H 10 V 10 H 0 Z"/></g></svg>';
  const region = { surah: 1, ayah: 1, path: 'M 0 0 H 20 V 20 H 0 Z' };
  expect(findAyahMarkers(xml, [])).toEqual([]);
  expect(findAyahMarkers(xml, [region, { ...region, ayah: 2 }])).toEqual([]);
});

test('SVG image data keeps glyph paths intact, Unicode valid, and handles base64 padding/chunks', () => {
  for (const text of ['a', 'ab', 'abc', 'x'.repeat(24579), '<svg><title>القرآن</title><path d="M 1 2 L 3 4"/></svg>']) {
    const decoded = Buffer.from(svgImageUri(text).split(',')[1], 'base64').toString('utf8');
    const restored = decoded.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
    expect(restored).toBe(text);
  }
});
