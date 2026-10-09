import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';

export interface AyahMarker { surah: number; ayah: number; x: number; y: number; width: number; height: number }
type Region = { surah: number; ayah: number; path: string };

// Publisher marker groups are in reverse order, and a page can span surahs.
// Match their actual centers to the verse polygons, never to array indices.
export function findAyahMarkers(xml: string, regions: Region[]): AyahMarker[] {
  const polygons = regions.map((region) => {
    const contours: number[][][] = [];
    svgpath(region.path).abs().iterate((segment, _index, x, y) => {
      if (segment[0] === 'M') contours.push([[segment[1], segment[2]]]);
      else if (segment[0] === 'L') contours.at(-1)?.push([segment[1], segment[2]]);
      else if (segment[0] === 'H') contours.at(-1)?.push([segment[1], y]);
      else if (segment[0] === 'V') contours.at(-1)?.push([x, segment[1]]);
    });
    return { region, contours };
  });
  const stack: { transforms: string[]; marker: boolean }[] = [{ transforms: [], marker: false }];
  const markers: AyahMarker[] = [];
  for (const match of xml.matchAll(/<g\b[^>]*>|<\/g\s*>|<path\b[^>]*\/>/g)) {
    const tag = match[0];
    if (tag.startsWith('</g')) { if (stack.length > 1) stack.pop(); continue; }
    const parent = stack[stack.length - 1];
    const transform = tag.match(/\btransform="([^"]+)"/)?.[1];
    const transforms = transform ? [...parent.transforms, transform] : parent.transforms;
    const marker = parent.marker || /class="ayah_marker_mark"/.test(tag);
    if (tag.startsWith('<g')) { if (!tag.endsWith('/>')) stack.push({ transforms, marker }); continue; }
    if (!marker) continue;
    const d = tag.match(/\bd="([^"]+)"/)?.[1];
    if (!d) continue;
    const [left, top, right, bottom] = svgPathBbox(svgpath(d).transform(transforms.join(' ')));
    const cx = (left + right) / 2, cy = (top + bottom) / 2;
    const matches = polygons.filter(({ contours }) => contours.some((points) => contains(points, cx, cy)));
    if (matches.length !== 1) continue;
    const { surah, ayah } = matches[0].region;
    if (markers.some((value) => value.surah === surah && value.ayah === ayah)) continue;
    // A small margin makes the ornament comfortable to tap without making the
    // surrounding verse text an action target.
    markers.push({ surah, ayah, x: left - 3, y: top - 3, width: right - left + 6, height: bottom - top + 6 });
  }
  return markers;
}

function contains(points: number[][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

