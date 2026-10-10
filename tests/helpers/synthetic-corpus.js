import metadata from '../fixtures/quranpedia/warsh-metadata.json';
import fatiha from '../fixtures/quranpedia/warsh-fatiha.json';

/** A structurally valid Warsh-shaped 114-surah corpus spread contiguously over 604 pages (not Quran text). */
export function syntheticCorpus(pageOf = (index) => Math.min(604, index + 1), overrides = {}) {
  let index = 0;
  return { ...metadata, ...overrides, surahs: Array.from({ length: 114 }, (_, s) => ({ id: s + 1, name: `سورة ${s + 1}`, coded_name: '',
    ayahs: Array.from({ length: 6 }, (_, a) => ({ ...fatiha[0], id: ++index, number: a + 1, surah: String(s + 1), page_number: pageOf(index - 1), number_in_hafs: [a + 1] })) })) };
}
