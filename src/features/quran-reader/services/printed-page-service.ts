import { createPrintedPageLoader } from './printed-page-loader';
import { createPrintedPageCache } from './printed-page-cache';
import { preparePageWhenIdle } from './page-preparation';
import { contentStorage } from '../storage/content-storage';
import type { QuranPage } from '../types/reader';

const PAGE_BASE_URL = 'https://quranpedia.net/api/page/warsh';
async function download(page: QuranPage): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${PAGE_BASE_URL}/${page.number}`, { signal: controller.signal });
    if (!response.ok) throw new Error('The page server could not provide this mushaf page');
    return await response.text();
  } finally { clearTimeout(timeout); }
}

const diskCache = createPrintedPageCache({
  storage: contentStorage, download, prepare: preparePageWhenIdle,
  onRefresh: (page, artwork) => loader.update(page, artwork),
});
const loader = createPrintedPageLoader(diskCache.load);
export const loadPrintedPage = loader.load;
export const getCachedPrintedPage = loader.peek;
export const preloadPrintedPages = loader.prefetch;
export { deferPrintedPagePreparation, setPrintedPageInteraction, waitForPagePreparation } from './page-preparation';
