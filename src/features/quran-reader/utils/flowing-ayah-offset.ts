import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import { ayahKey } from './references';

/** Locate an ayah in the actual wrapped lines, without imposing printed line breaks. */
export function flowingAyahOffset(
  ayahs: readonly Ayah[], target: AyahReference,
  lines: readonly { text: string; y: number }[],
): number | undefined {
  const index = ayahs.findIndex((ayah) => ayahKey(ayah) === ayahKey(target));
  if (index < 0 || !lines.length) return undefined;
  // Keep this separator identical to QuranPage's inline text and number marker.
  const start = ayahs.slice(0, index).reduce((length, ayah) => length + `${ayah.text}\u00a0${ayah.marker} `.length, 0);
  let end = 0;
  for (const line of lines) {
    end += line.text.length;
    if (start < end) return line.y;
  }
  return lines[lines.length - 1].y;
}
