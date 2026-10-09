import type { AyahReference } from '@/lib/quranpedia/types';
import type { QuranPage } from '../types/reader';

/** Only the previous page's final verse can legitimately continue onto this one. */
export function precedingPageAyah(page: QuranPage) {
  const ayah = page.previousAyah;
  return ayah?.mushafId === page.mushafId && ayah.pageNumber === page.number - 1 ? ayah : undefined;
}

export function printedPageAyah(page: QuranPage, reference: Pick<AyahReference, 'surahNumber' | 'ayahNumber'>) {
  const matches = (ayah: Pick<AyahReference, 'surahNumber' | 'ayahNumber'>) =>
    ayah.surahNumber === reference.surahNumber && ayah.ayahNumber === reference.ayahNumber;
  const own = page.ayahs.find(matches);
  const preceding = precedingPageAyah(page);
  return own ?? (preceding && matches(preceding) ? preceding : undefined);
}
