import { RIWAYAT, type Riwayah } from '../riwayat';

/**
 * How the Warsh text's letters are drawn: as in the Maghrib (the King Fahd Complex Warsh font:
 * qaf with one dot above, fa with one dot below, final ya without dots), or as in the East (the
 * Madinah mushaf's Hafs font from the same complex: two dots on qaf, one above fa).
 */
export type WarshScript = 'maghribi' | 'mashriqi';

/**
 * The Warsh text in the Hafs font. The text uses the common letters, so the font alone sets the
 * dots; two forms are the Hafs font's own: the Maghribi final ya (yeh barree) is written ى, as in
 * the Madinah mushaf, and alif with madda (absent from that font) as alif and a madda mark. Applied
 * to each piece as it is drawn, so offsets into the original text (tajweed runs, words) still hold.
 */
// eslint-disable-next-line no-restricted-syntax -- Quran letters being redrawn, not interface text.
export const mashriqiLetters = (text: string) => text.replace(/ے/g, 'ى').replace(/آ/g, 'آ');
const asIs = (text: string) => text;

export interface QuranScript {
  /** The font family for Quran text. */
  fontFamily: string;
  /** The mushaf whose bundled font draws it (for the tajweed text's document). */
  fontMushafId: number;
  /** The text as that font draws it. */
  display: (text: string) => string;
}

export function quranScript(riwayah: Riwayah, warshScript: WarshScript): QuranScript {
  if (riwayah === 'warsh' && warshScript === 'mashriqi') return { fontFamily: RIWAYAT.hafs.fontFamily, fontMushafId: RIWAYAT.hafs.mushafId, display: mashriqiLetters };
  return { fontFamily: RIWAYAT[riwayah].fontFamily, fontMushafId: RIWAYAT[riwayah].mushafId, display: asIs };
}

/** The same for a mushaf edition (Warsh 4, Hafs 2). */
export const quranScriptForMushaf = (mushafId: number, warshScript: WarshScript) =>
  quranScript(mushafId === RIWAYAT.warsh.mushafId ? 'warsh' : 'hafs', warshScript);
