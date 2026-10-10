import type { Ayah, Quran, Surah } from '@/lib/quranpedia/types';
import type { QuranPage } from '../types/reader';

export interface PageSection {
  surah: Surah;
  ayahs: Ayah[];
  opensSurah: boolean;
  showBismillah: boolean;
}

/** A page can contain multiple surahs; each opening keeps its own header. */
export function pageSections(page: QuranPage, quran: Quran): PageSection[] {
  const sections: PageSection[] = [];
  for (const ayah of page.ayahs) {
    const last = sections.at(-1);
    if (last?.surah.number === ayah.surahNumber) last.ayahs.push(ayah);
    else {
      const surah = quran.surahs.find((s) => s.number === ayah.surahNumber);
      if (!surah) throw new Error('Page references an unknown surah');
      const opensSurah = ayah.ayahNumber === 1;
      // eslint-disable-next-line no-restricted-syntax -- riwayah name from the Quran data
      sections.push({ surah, ayahs: [ayah], opensSurah, showBismillah: opensSurah && surah.number !== 9 && !(quran.riwayah.name === 'حفص' && surah.number === 1) });
    }
  }
  return sections;
}
