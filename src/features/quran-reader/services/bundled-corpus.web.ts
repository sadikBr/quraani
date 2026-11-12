import type { BundledMushaf } from '@/lib/quranpedia/bundled';

/**
 * The copy of an edition's text that ships with the app (assets/quran; see
 * lib/quranpedia/bundled.ts). In the browser each edition is a file of its own, fetched when the
 * edition is first asked for, so the page does not wait for both.
 */
export async function bundledCorpus(mushafId: number): Promise<BundledMushaf> {
  if (mushafId === 4) return (await import('@/assets/quran/mushaf-4.json')).default as unknown as BundledMushaf;
  if (mushafId === 2) return (await import('@/assets/quran/mushaf-2.json')).default as unknown as BundledMushaf;
  throw new Error('No Quran text is bundled for this edition');
}
