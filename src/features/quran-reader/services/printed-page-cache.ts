import { precedingPageAyah } from '../utils/printed-page-ayahs';
import type { CacheStorage } from '@/lib/quranpedia/cache';
import type { QuranPage } from '../types/reader';
import { decodePrintedPage, type PrintedPage } from '../utils/printed-page';

const VERSION = 2;
const TTL = 24 * 60 * 60 * 1000;
interface Entry { version: number; pageNumber: number; mushafId: 4; fetchedAt: number; artwork: PrintedPage }
interface Options {
  storage: CacheStorage;
  download: (page: QuranPage) => Promise<string>;
  prepare: <T>(work: () => T) => Promise<T>;
  decode?: typeof decodePrintedPage;
  now?: () => number;
  onRefresh?: (page: QuranPage, artwork: PrintedPage) => void;
}

/** Persist validated layout and marker geometry, not just the original download. */
export function createPrintedPageCache({ storage, download, prepare, decode = decodePrintedPage, now = Date.now, onRefresh }: Options) {
  const pending = new Map<number, Promise<PrintedPage>>();
  const refreshing = new Set<number>();
  const retryAfter = new Map<number, number>();
  let refreshQueue = Promise.resolve();
  const key = (page: QuranPage) => `warsh-printed-v${VERSION}-${page.number}`;
  const save = async (page: QuranPage, artwork: PrintedPage, fetchedAt: number) => {
    const serialized = await prepare(() => JSON.stringify({ version: VERSION, mushafId: 4, pageNumber: page.number, fetchedAt, artwork } satisfies Entry));
    await storage.setItem(key(page), serialized);
  };
  const fetchFresh = async (page: QuranPage) => {
    const xml = await download(page);
    const artwork = await prepare(() => decode(xml, page));
    // Reading never waits on serialization or a disk write.
    void save(page, artwork, now()).catch(() => {});
    return artwork;
  };
  const refresh = (page: QuranPage) => {
    if (refreshing.has(page.number) || (retryAfter.get(page.number) ?? 0) > now()) return;
    refreshing.add(page.number);
    // Expired cached pages open immediately. One background refresh at a time
    // avoids a burst of network/geometry work when reopening the app offline.
    refreshQueue = refreshQueue.then(async () => {
      try {
        const artwork = await fetchFresh(page);
        retryAfter.set(page.number, now() + TTL);
        onRefresh?.(page, artwork);
      } catch { retryAfter.set(page.number, now() + 60_000); }
      finally { refreshing.delete(page.number); }
    });
  };
  const read = async (page: QuranPage) => {
    try {
      const raw = await storage.getItem(key(page));
      const cached = raw ? readPreparedPage(raw, page) : null;
      if (cached) {
        if (now() - cached.fetchedAt >= TTL) refresh(page);
        return cached.artwork;
      }
    } catch { /* A missing/corrupt disk cache must not prevent a download. */ }
    // Upgrade existing downloads once, including when the phone is offline.
    try {
      const oldKey = `warsh-printed-v1-${page.number}`;
      const raw = await storage.getItem(oldKey);
      const legacy = raw ? JSON.parse(raw) : null;
      if (typeof legacy?.xml === 'string' && Number.isFinite(legacy.fetchedAt) && legacy.fetchedAt > 0) {
        const artwork = await prepare(() => decode(legacy.xml, page));
        void save(page, artwork, legacy.fetchedAt).then(() => storage.removeItem(oldKey)).catch(() => {});
        if (now() - legacy.fetchedAt >= TTL) refresh(page);
        return artwork;
      }
    } catch { /* Download if the legacy entry cannot be migrated safely. */ }
    return fetchFresh(page);
  };
  const load = (page: QuranPage): Promise<PrintedPage> => {
    if (page.mushafId !== 4 || !Number.isInteger(page.number) || page.number < 1 || page.number > 604) {
      return Promise.reject(new Error('Warsh mushaf page is unavailable'));
    }
    const existing = pending.get(page.number);
    if (existing) return existing;
    const task = read(page).finally(() => pending.delete(page.number));
    pending.set(page.number, task);
    return task;
  };
  return { load };
}

/** Cheap cache validation: do not run the expensive SVG geometry parser again. */
export function readPreparedPage(raw: string, page: QuranPage): Entry | null {
  try {
    const entry = JSON.parse(raw) as Entry;
    const value = entry.artwork;
    if (page.mushafId !== 4 || entry.version !== VERSION || entry.mushafId !== 4 || entry.pageNumber !== page.number ||
      !Number.isFinite(entry.fetchedAt) || entry.fetchedAt <= 0 || !value ||
      typeof value.xml !== 'string' || !value.xml.includes('id="content"') ||
      typeof value.cacheKey !== 'string' || !value.cacheKey.startsWith(`warsh-layout-v2-${page.number}-`) ||
      typeof value.viewBox !== 'string' || ![value.width, value.height].every((n) => Number.isFinite(n) && n > 0)) return null;
    const box = value.viewBox.split(/\s+/).map(Number);
    if (box.length !== 4 || !box.every(Number.isFinite) || box[2] !== value.width || box[3] !== value.height ||
      !value.xml.includes(`viewBox="${value.viewBox}"`)) return null;
    const required = new Set(page.ayahs.map((ayah) => `${ayah.surahNumber}:${ayah.ayahNumber}`));
    const references = new Set(required);
    const preceding = precedingPageAyah(page);
    if (preceding) references.add(`${preceding.surahNumber}:${preceding.ayahNumber}`);
    if (!Array.isArray(value.regions)) return null;
    const actual = new Set(value.regions.map((r) => `${r.surah}:${r.ayah}`));
    if (actual.size !== value.regions.length || [...required].some((ref) => !actual.has(ref)) ||
      !value.regions.every((r) => references.has(`${r.surah}:${r.ayah}`) && typeof r.path === 'string' && r.path.length > 0)) return null;
    if (!Array.isArray(value.markers) || new Set(value.markers.map((m) => `${m.surah}:${m.ayah}`)).size !== value.markers.length || !value.markers.every((m) => actual.has(`${m.surah}:${m.ayah}`) &&
      [m.x, m.y, m.width, m.height].every(Number.isFinite) && m.width > 0 && m.height > 0) ||
      !Array.isArray(value.headings) || !value.headings.every((h) => references.has(`${h.surah}:1`) && Number.isFinite(h.y) && h.y >= 0 && Number.isFinite(h.height) && h.height > 0)) return null;
    return entry;
  } catch { return null; }
}
