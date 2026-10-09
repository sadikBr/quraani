import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';

/** Measure visible path ink, including inherited SVG group transforms. */
export function horizontalInkBounds(xml: string): [number, number] | null {
  const groups: string[][] = [[]];
  let left = Infinity;
  let right = -Infinity;
  for (const match of xml.matchAll(/<g\b[^>]*>|<\/g\s*>|<path\b[^>]*\/>/g)) {
    const tag = match[0];
    if (tag.startsWith('</g')) {
      if (groups.length > 1) groups.pop();
      continue;
    }
    const transforms = [...groups[groups.length - 1]];
    const transform = tag.match(/\btransform="([^"]+)"/)?.[1];
    if (transform) transforms.push(transform);
    if (tag.startsWith('<g')) {
      if (!tag.endsWith('/>')) groups.push(transforms);
      continue;
    }
    const d = tag.match(/\bd="([^"]+)"/)?.[1];
    if (!d || /\bfill="none"/.test(tag)) continue;
    const path = svgpath(d).transform(transforms.join(' '));
    const bounds = svgPathBbox(path);
    left = Math.min(left, bounds[0]);
    right = Math.max(right, bounds[2]);
  }
  return Number.isFinite(left) && Number.isFinite(right) && right > left ? [left, right] : null;
}
