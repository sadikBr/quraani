import type { BundledMushaf } from '@/lib/quranpedia/bundled';

/**
 * The copy of an edition's text that ships with the app (assets/quran; see
 * lib/quranpedia/bundled.ts). Read when the edition is first asked for, not at launch.
 */
export function bundledCorpus(mushafId: number): BundledMushaf {
  if (mushafId === 4) return require('@/assets/quran/mushaf-4.json') as BundledMushaf;
  if (mushafId === 2) return require('@/assets/quran/mushaf-2.json') as BundledMushaf;
  throw new Error('No Quran text is bundled for this edition');
}
