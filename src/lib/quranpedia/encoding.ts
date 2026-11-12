/**
 * Quranpedia moved its Unicode editions to the King Fahd Complex's 3.0 fonts (seen 2026-11-12:
 * `font_file` UthmanicWarsh-v-3.0 for mushaf 4 and UthmanicHafs-v-3.0 for mushaf 2; on
 * 2026-10-08 they were UthmanicWarsh_V21 and UthmanicHafs_V22), and respelt the text for them.
 * The Warsh text now writes its wasl alifs, hamza dots and stop signs with Unicode 14 letters
 * (U+0870–U+0888, U+08C9, U+08CC) and both editions write open tanween as U+08F0–U+08F2. The
 * bundled V21 and V22 fonts draw none of these, and the bundled Warsh tajweed offsets were made
 * for the old spelling.
 *
 * They are the same letters and marks; this spells them as the bundled fonts and colour data do.
 * Checked against the whole corpus on 2026-11-12: afterwards the Warsh text of 6,054 of the 6,214
 * ayahs is the 2026-10 text exactly (by the fingerprints in assets/tajweed), allowing only the
 * presentation differences `utils/warsh-tajweed.ts` tries; the rest also differ in a stop sign,
 * a space or a letter. Text already in the old spelling (an older cached corpus) is unchanged.
 */

/* eslint-disable no-restricted-syntax -- Quran letters being respelt, not interface text. */

/** Open tanween, in both editions. */
const TANWEEN: Record<string, string> = { '\u08F0': '\u0657', '\u08F1': '\u065E', '\u08F2': '\u0656' };

/** Warsh (mushaf 4) sequences, in order, before the single characters below. */
const WARSH_SEQUENCES: [RegExp, string][] = [
  // آ before a madda was alif, dagger alif and madda.
  [/\u0622\u0653/g, '\u0627\u0670\u0653'],
  // The imala dot below and a tatweel carrying the dagger alif: the old text had the dot alone.
  [/\u065C\u0640/g, '\u06EA'],
  // Alif with a dot on its left: alif, its vowel, then the hamza dot.
  [/\u0878([\u064B-\u0652]*)/g, '\u0627$1\u06DF'],
  // A baseline dot written before its alif: the alif, the dot, then the vowel.
  [/\u0887([\u064B-\u0652]*)\u0627/g, '\u0627\u06DF$1'],
];
const WARSH_CHARACTERS: Record<string, string> = {
  '\u0870': '\u0627\u064E', // alif with fatha (wasl)
  '\u0872': '\u0627\u064F', // alif with damma (wasl)
  '\u0873': '\u0627\u06DF', // alif with the hamza dot
  '\u0874': '\u0627\u0650', // alif with kasra (wasl)
  '\u0876': '\u0627\u06EC', // alif with a round dot above
  '\u0879': '\u0627\u06EA', // alif with a dot below
  '\u0887': '\u06DF', // baseline round dot (the hamza dot)
  '\u0888': '\u06DF', // raised round dot (the hamza dot)
  '\u08C9': '\u06E6', // small yeh
  '\u08CC': '\u06D6', // stop sign
  '\u065C': '\u06EA', // dot below (imala)
  '\u06D1': '\u06E7', // small yeh above, after a hamza below
  ...TANWEEN,
};
const WARSH_NEW = /[\u065C\u06D1\u0870-\u0888\u08C9\u08CC\u08F0-\u08F2]/;
const WARSH_SINGLE = /[\u065C\u06D1\u0870\u0872-\u0874\u0876\u0879\u0887\u0888\u08C9\u08CC\u08F0-\u08F2]/g;

/** The text of mushaf `mushafId` spelt as its bundled font and colour data spell it. */
export function toBundledSpelling(text: string, mushafId: number): string {
  if (mushafId === 2) return text.replace(/[\u08F0-\u08F2]/g, (c) => TANWEEN[c]);
  if (mushafId !== 4 || !WARSH_NEW.test(text)) return text;
  let result = text;
  for (const [pattern, replacement] of WARSH_SEQUENCES) result = result.replace(pattern, replacement);
  return result.replace(WARSH_SINGLE, (c) => WARSH_CHARACTERS[c]);
}
