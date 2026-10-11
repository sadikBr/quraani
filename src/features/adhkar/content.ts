import type { ReaderIconName } from '@/features/quran-reader/components/ui/reader-icon';
import data from './hisn-al-muslim.json';

/** The daily adhkar the app offers, in the order they are listed. */
export const COLLECTION_IDS = ['morning', 'evening', 'afterPrayer', 'sleep', 'waking'] as const;
export type CollectionId = typeof COLLECTION_IDS[number];
export const isCollectionId = (value: unknown): value is CollectionId => COLLECTION_IDS.includes(value as CollectionId);

/** One dhikr, as built from Hisn al-Muslim by scripts/adhkar/build.mjs. */
export interface Dhikr {
  /** Unique within its collection; counts are saved under it. */
  key: string;
  text: string;
  /** Times it is said. */
  count: number;
  /** The book's instruction for it (when or how it is said). */
  note?: string;
  /** Recording id on hisnmuslim.com; absent when no recording has these exact words. */
  audio?: number;
  /** Quran passages are set like the Quran. */
  quran?: boolean;
  /** Surahs it asks to read, opened in the reader. */
  surahs?: number[];
}

export const collections = data.collections as Record<CollectionId, Dhikr[]>;
export const adhkarSource = data.source;
export const audioUrl = (id: number) => `${data.audio}${id}.mp3`;
/** Every recording the daily adhkar use, for downloading them together. */
export const audioIds = [...new Set(COLLECTION_IDS.flatMap((id) => collections[id].flatMap((d) => d.audio ?? [])))].sort((a, b) => a - b);
/** Approximate size of all recordings (measured from hisnmuslim.com). */
export const AUDIO_BYTES = 34_700_000;

export const collectionIcons: Record<CollectionId, ReaderIconName> = {
  morning: 'sunrise', evening: 'sunset', afterPrayer: 'hand-heart', sleep: 'bed', waking: 'alarm',
};
