import { describe, expect, test } from 'bun:test';
import metadata from './fixtures/quranpedia/warsh-metadata.json';
import catalog from './fixtures/quranpedia/mushafs.json';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import page2 from './fixtures/quranpedia/warsh-page2-ayahs.json';
import regions from './fixtures/quranpedia/warsh-page1-regions.json';
import { QuranpediaClient } from '../src/lib/quranpedia/client';
import { syntheticCorpus } from './helpers/synthetic-corpus';
import { MemoryCacheStorage, CORPUS_TTL_MS } from '../src/lib/quranpedia/cache';
import { decodeAyah, decodeMushaf, decodeMushafs, decodePageRegions, decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { DEFAULT_MUSHAF_ID } from '../src/features/quran-reader/config';
import { prepareReaderContent, pageAssetEntries } from '../src/features/quran-reader/utils/content';
import { createQuranSearch, normalizeArabicSearch } from '../src/features/quran-reader/utils/search';
import { createReaderState, readerReducer } from '../src/features/quran-reader/state/reader-state';

const reference = { mushafId: 4, surahNumber: 1, ayahNumber: 1 };
const corpus = {
  ...decodeMushaf(metadata),
  surahs: [
    { number: 1, name: 'سورة الفاتحة', codedName: '', ayahs: decodeSurahAyahs(fatiha, 4, 1) },
    { number: 2, name: 'سورة البقرة', codedName: '', ayahs: decodeSurahAyahs(page2, 4, 2) },
  ],
};

describe('Warsh data and reading behavior', () => {
  test('accepts the full catalog, including absent assets and nullable descriptions', () => {
    const editions = decodeMushafs(catalog);
    expect(editions).toHaveLength(12);
    expect(editions.find((m) => m.id === 11).description).toBeNull();
    expect(editions.find((m) => m.id === 4).riwayah.name).toBe('ورش');
  });
  test('defaults to Warsh and preserves edition-specific numbering', () => {
    expect(DEFAULT_MUSHAF_ID).toBe(4);
    expect(corpus.riwayah.name).toBe('ورش');
    expect(corpus.surahs[0].ayahs[0].hafsAyahNumbers).toEqual([1, 2]);
    expect(corpus.surahs[0].ayahs[6].hafsAyahNumbers).toEqual([7]);
    expect(corpus.surahs[1].ayahs[0].hafsAyahNumbers).toEqual([1, 2]);
  });

  test('keeps original text and marker byte-for-byte, including whitespace', () => {
    const raw = { ...fatiha[0], text: ` ${fatiha[0].text}\n` };
    const ayah = decodeAyah(raw, 4, 1);
    expect(ayah.text).toBe(raw.text);
    expect(ayah.marker).toBe(raw.marker);
    expect(ayah.juzNumber).toBeNull(); // The per-surah response omits partition fields.
    expect(decodeAyah({ ...fatiha[0], juz: 0, hizb: 0 }, 4).hizbQuarter).toBeNull();
  });

  test('rejects wrong surahs, duplicate numbers and missing text', () => {
    expect(() => decodeAyah(fatiha[0], 4, 2)).toThrow();
    expect(() => decodeSurahAyahs([fatiha[0], fatiha[0]], 4, 1)).toThrow();
    expect(() => decodeAyah({ ...fatiha[0], text: '' }, 4)).toThrow();
    expect(() => decodeAyah({ ...fatiha[0], hizb: 241 }, 4)).toThrow();
  });

  test('groups edition-local pages and divides Warsh by its own athman', () => {
    // Al-Fatiha and Al-Baqarah 1–4 are all in the Warsh mushaf's first eighth, whatever the tags say.
    const content = prepareReaderContent(structuredClone(corpus));
    expect(content.pages.map((p) => p.ayahs.length)).toEqual([7, 4]);
    expect(content.quarterHizbIndex.map((i) => i.number)).toEqual([1]);
    expect(content.hizbIndex.map((i) => i.number)).toEqual([1]);
  });

  test('derives 60 hizbs from quarter positions', () => {
    // Another edition's tags, with no Hafs mapping, so text alignment (divisions.test.js) leaves them as given.
    const quran = { ...structuredClone(corpus), id: 2 };
    quran.surahs[0].ayahs.forEach((a) => { a.juzNumber = 1; a.hizbQuarter = 1; a.hafsAyahNumbers = []; });
    quran.surahs[1].ayahs.forEach((a) => { a.juzNumber = 1; a.hizbQuarter = 5; a.hafsAyahNumbers = []; });
    const content = prepareReaderContent(quran);
    expect(content.hizbIndex.map((i) => i.number)).toEqual([1, 2]);
    expect(content.quarterHizbIndex.map((i) => i.number)).toEqual([1, 5]);
    expect(content.hizbIndex[1].start).toEqual({ mushafId: 4, surahNumber: 2, ayahNumber: 1 });
  });

  test('maps asset geometry by Warsh reference and checks page identity', () => {
    expect(decodePageRegions(regions, 4, 1)[0].reference).toEqual(reference);
    expect(decodePageRegions(regions, 4, 1)[0].polygon).toHaveLength(4);
    expect(() => decodePageRegions(regions, 4, 2)).toThrow();
    expect(pageAssetEntries(604)).toEqual({ svg: '604.svg', regions: '604.json' });
    expect(() => pageAssetEntries(605)).toThrow();
  });

  test('searches Warsh text without returning Hafs references or modifying content', () => {
    const original = JSON.stringify(corpus);
    const result = createQuranSearch(corpus)('الحمد');
    expect(result.items[0].reference).toEqual(reference);
    expect(result.items[0].text).toBe(fatiha[0].text);
    expect(JSON.stringify(corpus)).toBe(original);
    expect(normalizeArabicSearch('  بِسْمِ ٱللَّهِ  ')).toBe('بسم الله');
    expect(createQuranSearch(corpus)('ــ')).toEqual({ items: [], total: 0 });
  });

  test('hiding is reversible, edition-scoped and survives view switches', () => {
    const initial = createReaderState();
    const hidden = readerReducer(initial, { type: 'hide', references: [reference] });
    expect(initial.hiddenAyahs.size).toBe(0);
    expect(hidden.hiddenAyahs.has('4:1:1')).toBe(true);
    const flowing = readerReducer(hidden, { type: 'set-mode', mode: 'text' });
    expect(flowing.hiddenAyahs.has('4:1:1')).toBe(true);
    const revealed = readerReducer(flowing, { type: 'tap-ayah', reference });
    expect(revealed.selectedAyah).toEqual(reference);
    expect(revealed.hiddenAyahs.size).toBe(0);
    expect(readerReducer(hidden, { type: 'reveal-all' }).hiddenAyahs.size).toBe(0);
    expect(readerReducer(hidden, { type: 'set-mushaf', mushafId: 1 }).hiddenAyahs.size).toBe(0);
    expect(readerReducer(initial, { type: 'tap-ayah', reference: { ...reference, mushafId: 1 } })).toBe(initial);
  });
});

describe('API requests and cache', () => {
  function setup() {
    const storage = new MemoryCacheStorage();
    let now = 1_000_000;
    let calls = 0;
    let handler = async () => Response.json(fatiha);
    const fetch = async (...args) => { calls++; return handler(...args); };
    const client = new QuranpediaClient({ storage, fetch, now: () => now });
    return { client, storage, get calls() { return calls; }, advance: (ms) => { now += ms; }, setHandler: (fn) => { handler = fn; } };
  }

  test('fresh cache survives client recreation and avoids another request', async () => {
    const env = setup();
    expect((await env.client.getSurah(4, 1)).source).toBe('network');
    const nextClient = new QuranpediaClient({ storage: env.storage, now: () => 1_000_001,
      fetch: async () => { throw new Error('Must not fetch'); } });
    expect((await nextClient.getSurah(4, 1)).source).toBe('cache');
    expect(env.calls).toBe(1);
  });

  test('expired cache is served at once and corrected in the background; force refresh waits for the network', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.advance(CORPUS_TTL_MS);
    const corrected = structuredClone(fatiha);
    corrected[0].text += ' ';
    env.setHandler(async () => Response.json(corrected));
    const expired = await env.client.getSurah(4, 1);
    expect(expired).toMatchObject({ source: 'cache', stale: true, fetchedAt: 1_000_000 });
    expect(expired.data[0].text).toBe(fatiha[0].text);
    expect((await expired.revalidated).data[0].text).toBe(corrected[0].text);
    expect(await env.client.getSurah(4, 1)).toMatchObject({ source: 'cache', stale: false });
    expect((await env.client.getSurah(4, 1, { forceRefresh: true })).source).toBe('network');
    expect(env.calls).toBe(3);
  });

  test('returns explicitly stale content offline, backs off, with optional strict freshness', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.advance(CORPUS_TTL_MS);
    env.setHandler(async () => { throw new Error('Offline'); });
    const first = await env.client.getSurah(4, 1);
    expect(first.stale).toBe(true);
    expect(await first.revalidated).toBeNull();
    const result = await env.client.getSurah(4, 1);
    expect(result.stale).toBe(true);
    expect(result.refreshError.code).toBe('network');
    expect(result.fetchedAt).toBe(1_000_000);
    expect(await result.revalidated).toBeNull();
    expect(env.calls).toBe(2); // The failed refresh is not retried on every call.
    env.advance(5 * 60_000);
    await (await env.client.getSurah(4, 1)).revalidated;
    expect(env.calls).toBe(3);
    await expect(env.client.getSurah(4, 1, { allowStale: false })).rejects.toMatchObject({ code: 'network' });
  });

  test('invalid network data is never cached; the validated copy is served instead', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    for (const invalid of [() => Response.json({ error: 'Unexpected shape' }), () => new Response('<html>Portal</html>', { status: 200 })]) {
      env.setHandler(async () => invalid());
      const result = await env.client.getSurah(4, 1, { forceRefresh: true });
      expect(result).toMatchObject({ source: 'cache', stale: true, refreshError: { code: 'invalid-response' } });
      await expect(env.client.getSurah(4, 1, { forceRefresh: true, allowStale: false })).rejects.toMatchObject({ code: 'invalid-response' });
    }
    env.advance(CORPUS_TTL_MS);
    const expired = await env.client.getSurah(4, 1);
    expect(await expired.revalidated).toBeNull();
    expect((await env.client.getSurah(4, 1)).refreshError.code).toBe('invalid-response');
    expect((await env.client.getSurah(4, 1)).data[0].text).toBe(fatiha[0].text);
  });

  test('every HTTP failure falls back to cache with refreshError; 429 reports Retry-After without retrying', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.setHandler(async () => new Response('', { status: 404 }));
    expect((await env.client.getSurah(4, 1, { forceRefresh: true })).refreshError.status).toBe(404);
    await expect(env.client.getSurah(4, 1, { forceRefresh: true, allowStale: false })).rejects.toMatchObject({ status: 404 });
    env.setHandler(async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }));
    const result = await env.client.getSurah(4, 1, { forceRefresh: true });
    expect(result.refreshError.retryAfterSeconds).toBe(60);
    expect(env.calls).toBe(4);
  });

  test('a manual refresh without cache surfaces the error', async () => {
    const env = setup();
    env.setHandler(async () => new Response('', { status: 503 }));
    await expect(env.client.getSurah(4, 1, { forceRefresh: true })).rejects.toMatchObject({ status: 503 });
  });

  test('a finished request never removes a newer in-flight request for the same path', async () => {
    const env = setup();
    const releases = [];
    env.setHandler(() => new Promise((resolve) => releases.push(() => resolve(Response.json(fatiha)))));
    const first = env.client.getSurah(4, 1, { forceRefresh: true });
    const joined = env.client.getSurah(4, 1, { forceRefresh: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    releases[0]();
    await Promise.all([first, joined]);
    const second = env.client.getSurah(4, 1, { forceRefresh: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const third = env.client.getSurah(4, 1, { forceRefresh: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(env.calls).toBe(2); // third joined second rather than starting another request
    releases[1]();
    await Promise.all([second, third]);
  });

  test('a riwayah mismatch is rejected before the payload is cached', async () => {
    const env = setup();
    env.setHandler(async () => Response.json(syntheticCorpus()));
    await expect(env.client.getMushaf(4, {}, { riwayahName: 'حفص' })).rejects.toThrow('riwayah');
    expect(await env.storage.getItem('quranpedia:v1:/mushafs/4')).toBeNull();
    expect((await env.client.getMushaf(4, {}, { riwayahName: 'ورش' })).source).toBe('network');
    expect(await env.storage.getItem('quranpedia:v1:/mushafs/4')).not.toBeNull();
  });

  test('deduplicates concurrent requests', async () => {
    const env = setup();
    env.setHandler(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return Response.json(fatiha);
    });
    await Promise.all([env.client.getSurah(4, 1), env.client.getSurah(4, 1)]);
    expect(env.calls).toBe(1);
  });

  test('replaces corrupt cache; persistence failure does not prevent reading', async () => {
    const env = setup();
    await env.storage.setItem('quranpedia:v1:/mushafs/4/1', '{bad');
    expect((await env.client.getSurah(4, 1)).source).toBe('network');
    const client = new QuranpediaClient({ fetch: async () => Response.json(fatiha), storage: {
      getItem: async () => { throw new Error('Storage unavailable'); },
      setItem: async () => { throw new Error('Disk full'); }, removeItem: async () => {},
    } });
    expect((await client.getSurah(4, 1)).data).toHaveLength(7);
  });

  test('aborts a slow request and reports timeout', async () => {
    const client = new QuranpediaClient({ timeoutMs: 10, fetch: async (_url, options) =>
      new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('Aborted')))) });
    await expect(client.getSurah(4, 1)).rejects.toMatchObject({ code: 'timeout' });
  });

  test('validates route arguments and separates mushaf cache keys', async () => {
    const env = setup();
    expect(() => env.client.getSurah(4, 115)).toThrow(RangeError);
    await env.client.getSurah(4, 1);
    expect(await env.storage.getItem('quranpedia:v1:/mushafs/1/1')).toBeNull();
    env.setHandler(async () => Response.json(fatiha[1]));
    await expect(env.client.getAyah(reference)).rejects.toMatchObject({ code: 'invalid-response' });
  });
});
