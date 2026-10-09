import { expect, test } from 'bun:test';
import { MemoryCacheStorage } from '../src/lib/quranpedia/cache';
import { createPrintedPageCache, readPreparedPage } from '../src/features/quran-reader/services/printed-page-cache';
import { decodePrintedPage } from '../src/features/quran-reader/utils/printed-page';
import fixtures from './fixtures/quranpedia/warsh-ayah-markers.json';

const xml = fixtures[29];
const page = { number: 29, mushafId: 4, ayahs: [186, 187, 188, 189].map((ayahNumber) => ({ surahNumber: 2, ayahNumber })) };
const key = 'warsh-printed-v2-29';
const legacyKey = 'warsh-printed-v1-29';
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const prepare = async (work) => work();
const decoded = decodePrintedPage(xml, page);
const entry = (artwork = decoded, fetchedAt = 100) => JSON.stringify({ version: 2, mushafId: 4, pageNumber: 29, fetchedAt, artwork });

test('a reopened page uses its prepared disk cache with no download or geometry decoding', async () => {
  const storage = new MemoryCacheStorage();
  let downloads = 0, decodes = 0;
  const options = { storage, prepare, now: () => 100, download: async () => { downloads++; return xml; },
    decode: (...args) => { decodes++; return decodePrintedPage(...args); } };
  const first = await createPrintedPageCache(options).load(page);
  await tick();
  const restarted = await createPrintedPageCache(options).load(page);
  expect(restarted).toEqual(first);
  expect(downloads).toBe(1);
  expect(decodes).toBe(1);
});

test('old downloads are migrated once without losing offline reading', async () => {
  const storage = new MemoryCacheStorage();
  await storage.setItem(legacyKey, JSON.stringify({ xml, fetchedAt: 100 }));
  let decodes = 0;
  const options = { storage, prepare, now: () => 200, download: async () => { throw new Error('offline'); },
    decode: (...args) => { decodes++; return decodePrintedPage(...args); } };
  expect((await createPrintedPageCache(options).load(page)).markers).toHaveLength(4);
  await tick();
  expect(await storage.getItem(legacyKey)).toBeNull();
  expect(await createPrintedPageCache(options).load(page)).toEqual(decoded);
  expect(decodes).toBe(1);
});

test('expired pages render without waiting for a network refresh, which updates the warm cache', async () => {
  const storage = new MemoryCacheStorage();
  await storage.setItem(key, entry());
  let finishDownload, requests = 0, refreshed;
  const cache = createPrintedPageCache({ storage, prepare, now: () => 100 + 86_400_000,
    download: () => { requests++; return new Promise((resolve) => { finishDownload = resolve; }); },
    onRefresh: (_, artwork) => { refreshed = artwork; } });
  expect(await cache.load(page)).toEqual(decoded);
  expect(await cache.load(page)).toEqual(decoded);
  expect(requests).toBe(1);
  expect(refreshed).toBeUndefined();
  finishDownload(xml.replace('version="1.1"', 'version="1.1" data-revision="2"'));
  await tick();
  expect(refreshed.cacheKey).not.toBe(decoded.cacheKey);
  expect(readPreparedPage(await storage.getItem(key), page).artwork).toEqual(refreshed);
});

test('failed offline refreshes retain the readable page and are not retried on every swipe', async () => {
  const storage = new MemoryCacheStorage();
  await storage.setItem(key, entry());
  let downloads = 0;
  const cache = createPrintedPageCache({ storage, prepare, now: () => 86_400_100,
    download: async () => { downloads++; throw new Error('offline'); } });
  expect(await cache.load(page)).toEqual(decoded);
  await tick();
  expect(await cache.load(page)).toEqual(decoded);
  expect(downloads).toBe(1);
  expect(await storage.getItem(key)).toBe(entry());
});

test('invalid, wrong-edition and mismatched geometry caches are rejected and repaired', async () => {
  const mutations = [
    (e) => { e.version = 0; }, (e) => { e.mushafId = 1; }, (e) => { e.pageNumber = 30; },
    (e) => { e.artwork.regions[0].ayah = 999; }, (e) => { e.artwork.markers[0].width = -1; },
    (e) => { e.artwork.width = 10; }, (e) => { e.artwork.markers = [e.artwork.markers[0], e.artwork.markers[0]]; },
  ];
  for (const mutate of mutations) {
    const bad = JSON.parse(entry()); mutate(bad);
    expect(readPreparedPage(JSON.stringify(bad), page)).toBeNull();
  }
  const storage = new MemoryCacheStorage(); await storage.setItem(key, '{broken');
  let downloads = 0;
  const cache = createPrintedPageCache({ storage, prepare, now: () => 100, download: async () => { downloads++; return xml; } });
  expect(await cache.load(page)).toEqual(decoded); await tick();
  expect(downloads).toBe(1);
  expect(readPreparedPage(await storage.getItem(key), page).artwork).toEqual(decoded);
});

test('disk failure never blocks reading, and duplicate cache misses share one download', async () => {
  let downloads = 0;
  const storage = { getItem: async () => { throw new Error('disk'); }, setItem: async () => { throw new Error('full'); }, removeItem: async () => {} };
  const cache = createPrintedPageCache({ storage, prepare, now: () => 100, download: async () => { downloads++; return xml; } });
  const first = cache.load(page);
  expect(cache.load(page)).toBe(first);
  expect(await first).toEqual(decoded);
  await tick(); expect(downloads).toBe(1);
});

test('a verified preceding-page continuation can load and round-trip through the prepared cache', async () => {
  const continued = { mushafId: 4, number: 86, ayahs: [45, 46, 47, 48, 49, 50].map((ayahNumber) => ({ surahNumber: 4, ayahNumber })),
    previousAyah: { mushafId: 4, pageNumber: 85, surahNumber: 4, ayahNumber: 44 } };
  const artwork = decodePrintedPage(fixtures[86], continued);
  expect(artwork.regions.map((r) => r.ayah)).toEqual([44, 45, 46, 47, 48, 49, 50]);
  expect(artwork.markers.some((m) => m.ayah === 44 && m.surah === 4)).toBe(true);
  const serialized = JSON.stringify({ version: 2, mushafId: 4, pageNumber: 86, fetchedAt: 100, artwork });
  expect(readPreparedPage(serialized, continued).artwork).toEqual(artwork);
  for (const previousAyah of [undefined, { ...continued.previousAyah, mushafId: 1 }, { ...continued.previousAyah, pageNumber: 84 }, { ...continued.previousAyah, ayahNumber: 43 }]) {
    const invalid = { ...continued, previousAyah };
    expect(() => decodePrintedPage(fixtures[86], invalid)).toThrow();
    expect(readPreparedPage(serialized, invalid)).toBeNull();
  }
});
