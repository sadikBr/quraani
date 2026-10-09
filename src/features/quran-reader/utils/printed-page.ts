import { editionForMushaf } from '../riwayat';
import { printedPageAyah } from './printed-page-ayahs';
import type { QuranPage } from '../types/reader';
import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';
import { horizontalInkBounds } from './artwork-bounds';
import { findAyahMarkers, type AyahMarker } from './ayah-markers';
import { pageFingerprint } from './page-fingerprint';

export interface PrintedPage {
  cacheKey: string;
  xml: string;
  viewBox: string;
  width: number;
  height: number;
  regions: { surah: number; ayah: number; path: string }[];
  headings: { surah: number; y: number; height: number }[];
  markers: AyahMarker[];
}

export function decodePrintedPage(xml: string, page: QuranPage): PrintedPage {
  if (![4, 2].includes(page.mushafId) || !xml.match(/<svg\b[^>]*viewBox="[^"]+"/)) throw new Error('Invalid mushaf page artwork');
  // The endpoint pads the two opening pages into a full-page canvas. Keep their
  // smaller original artwork bounds so the opening text is readable on a phone.
  const viewBox = page.number <= 2 ? '-6 0 235 235' : xml.match(/<svg\b[^>]*viewBox="([^"]+)"/)?.[1];
  const dimensions = viewBox?.split(/\s+/).map(Number);
  if (!dimensions || dimensions.length !== 4 || !dimensions.every(Number.isFinite) ||
    dimensions[2] <= 0 || dimensions[3] <= 0 || !xml.includes('id="content"')) {
    throw new Error('Invalid mushaf page artwork');
  }
  const regions: PrintedPage['regions'] = [];
  const artwork = xml.replace(/\s(?:xmlns:ayah|ayah:[\w-]+|xml:space)="[^"]*"/g, '')
    .replace(/<path\b[^>]*class="ayahPolygon"[^>]*\/>/g, (tag) => {
    const surah = Number(tag.match(/\bsurah="(\d+)"/)?.[1]);
    const ayah = Number(tag.match(/\bayah="(\d+)"/)?.[1]);
    const path = tag.match(/\bd="([^"]+)"/)?.[1];
    if (!path || !printedPageAyah(page, { surahNumber: surah, ayahNumber: ayah })) {
      throw new Error('Artwork does not match this mushaf page');
    }
    regions.push({ surah, ayah, path });
    return '';
  });
  if (page.ayahs.some((ayah) => !regions.some((region) => region.surah === ayah.surahNumber && region.ayah === ayah.ayahNumber)) || new Set(regions.map((r) => `${r.surah}:${r.ayah}`)).size !== regions.length) {
    throw new Error('Mushaf page has missing ayah regions');
  }
  // Center visible Quran ink rather than the publisher's asymmetric blank canvas.
  // Trim blank side gutters with a tiny allowance for antialiased glyph edges.
  // Keep vertical position, line breaks, and every original path unchanged.
  const bounds = horizontalInkBounds(artwork);
  if (bounds) {
    dimensions[0] = bounds[0] - 0.5;
    dimensions[2] = bounds[1] - bounds[0] + 1;
  }
  const centeredViewBox = dimensions.join(' ');
  // Each surah opening reserves a heading line, then a basmala line (except 9).
  // Overlay only that reserved line; Quran glyphs and selection geometry stay intact.
  const lineHeight = 36.5;
  const headings = page.number <= 2 ? [] : regions.filter((region) => region.ayah === 1).map((region) => {
    const top = Number(region.path.match(/^M\s+[-\d.]+\s+([-\d.]+)/)?.[1]);
    return { surah: region.surah, y: top - lineHeight * (region.surah === 9 ? 1 : 2), height: lineHeight };
  }).filter((heading) => Number.isFinite(heading.y) && heading.y >= 0);
  const markers = findAyahMarkers(artwork, regions);
  return { cacheKey: `${editionForMushaf(page.mushafId).pageSource}-layout-v2-${page.number}-${pageFingerprint(xml)}`, xml: spacedAyahMarkers(artwork).replace(/viewBox="[^"]+"/, `viewBox="${centeredViewBox}"`), viewBox: centeredViewBox, width: dimensions[2], height: dimensions[3], regions, headings, markers };
}

/** Change ink only; every original glyph outline and position stays intact. */
export function pageInk(xml: string, text: string, ornament: string): string {
  let result = xml.replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${text}"`)
    .replace('<svg ', `<svg fill="${text}" `)
    .replace('<g id="ayah_markers"', `<g fill="${ornament}" id="ayah_markers"`);
  const start = result.indexOf(`<g fill="${ornament}" id="ayah_markers"`);
  const end = result.indexOf('<g id="content"', start);
  if (start >= 0 && end > start) result = result.slice(0, start) +
    result.slice(start, end).replace(/fill="#[0-9a-fA-F]{6}"/g, `fill="${ornament}"`) + result.slice(end);
  return result;
}

/** Give the decorative frame room without moving Quran text or shrinking numbers.
 * The publisher positions each frame and number in separate sibling groups.
 * Scale only the frame in its own coordinate system; retain the original center.
 */
export function spacedAyahMarkers(xml: string): string {
  return xml.replace(/(<g\b[^>]*class="ayah_marker_mark"[^>]*>)([\s\S]*?)(<\/g\s*>)/g, (group, opening: string, body: string, closing: string) => {
    const paths = [...body.matchAll(/<path\b[^>]*\bd="([^"]+)"[^>]*\/>/g)];
    // Unknown artwork is displayed unchanged rather than guessing its geometry.
    if (paths.length !== 1 || /<g\b/.test(body)) return group;
    try {
      const [left, top, right, bottom] = svgPathBbox(svgpath(paths[0][1]).transform(paths[0][0].match(/\btransform="([^"]+)"/)?.[1] ?? ''));
      const x = (left + right) / 2;
      const y = (top + bottom) / 2;
      if (![x, y, left, top, right, bottom].every(Number.isFinite) || right <= left || bottom <= top) return group;
      return `${opening}<g transform="translate(${x} ${y}) scale(0.86) translate(${-x} ${-y})">${body}</g>${closing}`;
    } catch { return group; }
  });
}
