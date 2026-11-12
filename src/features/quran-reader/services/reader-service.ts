import { expandBundledMushaf, type BundledMushaf } from '@/lib/quranpedia/bundled';
import { QuranpediaClient, type ContentResult } from '@/lib/quranpedia/client';
import { QuranpediaError } from '@/lib/quranpedia/errors';
import { decodeQuran } from '@/lib/quranpedia/validation';
import { RIWAYAT, type Riwayah } from '../riwayat';
import { contentStorage } from '../storage/content-storage';
import { prepareReaderContent } from '../utils/content';
import type { ReaderContent } from '../types/reader';
import { bundledCorpus } from './bundled-corpus';

/** What an ayah opens (tafsir, translations…) still comes from Quranpedia, cached. */
export const quranpedia = new QuranpediaClient({ storage: contentStorage });

/**
 * Loads an edition's Quran text from the copy bundled with the app (`source`), validated like a
 * response from Quranpedia and prepared once per edition. Nothing is asked of the network: the
 * text is the one that was reviewed, online or not, until a new version of the app brings another.
 */
export function createReaderContentLoader(source: (mushafId: number) => BundledMushaf | Promise<BundledMushaf>, forget: (key: string) => Promise<void> = () => Promise.resolve()) {
  const loaded = new Map<Riwayah, Promise<ContentResult<ReaderContent>>>();
  return function loadReaderContent(riwayah: Riwayah = 'warsh'): Promise<ContentResult<ReaderContent>> {
    let task = loaded.get(riwayah);
    if (!task) {
      task = (async () => {
        const edition = RIWAYAT[riwayah];
        const bundle = await source(edition.mushafId);
        const quran = decodeQuran(expandBundledMushaf(bundle), edition.mushafId);
        if (quran.riwayah.name !== edition.name) throw new QuranpediaError('invalid-response', 'The selected riwayah does not match the bundled text');
        // The copy earlier versions downloaded and kept (a few megabytes) is no longer read.
        void forget(`quranpedia:v1:/mushafs/${edition.mushafId}`).catch(() => {});
        return { data: prepareReaderContent(quran), fetchedAt: Date.parse(bundle.fetched) || 0, source: 'bundle' as const, stale: false };
      })();
      loaded.set(riwayah, task);
      // A failure is not kept: the next request reads the copy again.
      task.catch(() => { if (loaded.get(riwayah) === task) loaded.delete(riwayah); });
    }
    return task;
  };
}

/** The selected edition's text, pages and indexes, from the copy bundled with the app. */
export const loadReaderContent = createReaderContentLoader(bundledCorpus, (key) => contentStorage.removeItem(key));
