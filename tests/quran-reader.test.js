import { describe, expect, test } from 'bun:test';
import metadata from './fixtures/quranpedia/warsh-metadata.json';
import catalog from './fixtures/quranpedia/mushafs.json';
import fatiha from './fixtures/quranpedia/warsh-fatiha.json';
import page2 from './fixtures/quranpedia/warsh-page2-ayahs.json';
import regions from './fixtures/quranpedia/warsh-page1-regions.json';
import { QuranpediaClient } from '../src/lib/quranpedia/client';
import { MemoryCacheStorage, CONTENT_TTL_MS } from '../src/lib/quranpedia/cache';
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

  test('groups edition-local pages and derives 60 hizbs from quarter positions', () => {
    const quran = structuredClone(corpus);
    quran.surahs[0].ayahs.forEach((a) => { a.juzNumber = 1; a.hizbQuarter = 1; });
    quran.surahs[1].ayahs.forEach((a) => { a.juzNumber = 1; a.hizbQuarter = 5; });
    const content = prepareReaderContent(quran);
    expect(content.pages.map((p) => p.ayahs.length)).toEqual([7, 4]);
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
    const flowing = readerReducer(hidden, { type: 'set-mode', mode: 'ayah' });
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

  test('expiry and force refresh retrieve corrections', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.advance(CONTENT_TTL_MS);
    const corrected = structuredClone(fatiha);
    corrected[0].text += ' ';
    env.setHandler(async () => Response.json(corrected));
    expect((await env.client.getSurah(4, 1)).data[0].text).toBe(corrected[0].text);
    await env.client.getSurah(4, 1, { forceRefresh: true });
    expect(env.calls).toBe(3);
  });

  test('returns explicitly stale content offline, with optional strict freshness', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.advance(CONTENT_TTL_MS);
    env.setHandler(async () => { throw new Error('Offline'); });
    const result = await env.client.getSurah(4, 1);
    expect(result.stale).toBe(true);
    expect(result.refreshError.code).toBe('network');
    expect(result.fetchedAt).toBe(1_000_000);
    await expect(env.client.getSurah(4, 1, { allowStale: false })).rejects.toMatchObject({ code: 'network' });
  });

  test('invalid network data cannot overwrite valid cached Quran text', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.setHandler(async () => Response.json({ error: 'Unexpected shape' }));
    await expect(env.client.getSurah(4, 1, { forceRefresh: true })).rejects.toMatchObject({ code: 'invalid-response' });
    expect((await env.client.getSurah(4, 1)).data[0].text).toBe(fatiha[0].text);
  });

  test('404 is not masked by stale cache; 429 reports Retry-After without retrying', async () => {
    const env = setup();
    await env.client.getSurah(4, 1);
    env.setHandler(async () => new Response('', { status: 404 }));
    await expect(env.client.getSurah(4, 1, { forceRefresh: true })).rejects.toMatchObject({ status: 404 });
    env.setHandler(async () => new Response('', { status: 429, headers: { 'Retry-After': '60' } }));
    const result = await env.client.getSurah(4, 1, { forceRefresh: true });
    expect(result.refreshError.retryAfterSeconds).toBe(60);
    expect(env.calls).toBe(3);
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
