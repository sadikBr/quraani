import type { EmblemName, Motif } from '@/components/craft/art';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import type { BookService, HafsReference } from '@/lib/quranpedia/ayah-services';
import { parallelAyahs } from '../../../utils/ayah-actions';

/**
 * What the ayah sheet opens on an ayah, as Quranpedia gives it: each a door of the sheet's arcade.
 * Three arches hold them by what they say of the ayah: its meaning (the tafsir, its rare words,
 * its grammar, its translations); its revelation and recitation (why it came down, how it is
 * read, the ayahs it resembles, what abrogates it); and what was handed down about it (the
 * narrations, reflections, its topics, fatwas).
 */
export type Science =
  | 'tafsir' | 'meanings' | 'e3rab' | 'translations'
  | 'asbab' | 'qiraat' | 'similar' | 'nasekh' | 'mutshabeh'
  | 'sayings' | 'notes' | 'topics' | 'fatwa';

export type ScienceGroupId = 'meaning' | 'revelation' | 'narration';
export interface ScienceGroup { id: ScienceGroupId; motif: Motif; emblem: EmblemName; sciences: readonly Science[] }

export const SCIENCE_GROUPS: readonly ScienceGroup[] = [
  { id: 'meaning', motif: 'lattice', emblem: 'lantern', sciences: ['tafsir', 'meanings', 'e3rab', 'translations'] },
  { id: 'revelation', motif: 'rosette', emblem: 'crescent', sciences: ['asbab', 'qiraat', 'similar', 'nasekh', 'mutshabeh'] },
  { id: 'narration', motif: 'khatam', emblem: 'leaf', sciences: ['sayings', 'notes', 'topics', 'fatwa'] },
];

/** The sciences read as books, one chosen at a time. */
export const BOOK_SCIENCES: Record<Science, BookService | null> = {
  tafsir: 'tafsir', e3rab: 'e3rab', asbab: 'asbab', nasekh: 'nasekh', mutshabeh: 'mutshabeh',
  meanings: null, translations: null, qiraat: null, similar: null, sayings: null, notes: null, topics: null, fatwa: null,
};

/** The sciences the mushaf's data lists for an ayah (its `options`). The other two are asked for. */
const LISTED: readonly Science[] = ['tafsir', 'meanings', 'similar', 'qiraat', 'topics', 'fatwa', 'e3rab', 'notes', 'asbab', 'translations', 'sayings'];
/** Rare, and not listed in the options: shown once a request finds books for the ayah. */
export const PROBED = ['nasekh', 'mutshabeh'] as const satisfies readonly BookService[];

/** What the sheet offers for an ayah: what its options list (all when the data has none), and the probed ones found. */
export function availableSciences(ayah: Ayah, found: readonly Science[]): Set<Science> {
  const listed = ayah.availableContent.filter((option): option is Science => (LISTED as readonly string[]).includes(option));
  return new Set([...(listed.length ? listed : LISTED), ...found]);
}

/** The Hafs numbers the services know the ayah by (a Warsh ayah may span two of them). */
export const hafsNumbers = (ayah: Ayah) => parallelAyahs(ayah);

/** The ayah of the open edition at a place given in the Hafs numbering (the first, if it spans two). */
export function editionAyah(quran: Quran, reference: HafsReference): Ayah | undefined {
  return quran.surahs.find((surah) => surah.number === reference.surah)?.ayahs.find((ayah) => ayah.hafsAyahNumbers.includes(reference.ayah));
}
