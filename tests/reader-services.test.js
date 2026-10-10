import { afterAll, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import hafsSample from './fixtures/quranpedia/hafs-sample.json';
import warshFatiha from './fixtures/quranpedia/warsh-fatiha.json';
import { MemoryCacheStorage, CORPUS_TTL_MS } from '../src/lib/quranpedia/cache';
import { decodeQuran, decodeSurahAyahs } from '../src/lib/quranpedia/validation';
import { prepareReaderContent } from '../src/features/quran-reader/utils/content';
import { syntheticCorpus } from './helpers/synthetic-corpus';

// Services use the app's persistent storage and global fetch; replace both before loading them.
const storage = new MemoryCacheStorage();
mock.module('../src/features/quran-reader/storage/content-storage', () => ({ contentStorage: storage }));
const originalFetch = globalThis.fetch;
const calls = [];
let handler = async () => new Response('', { status: 503 });
globalThis.fetch = async (url, init) => { calls.push(String(url)); return handler(String(url), init); };
// Hooks: the selected riwayah is controlled by the test; AppState is inert.
let riwayah = 'warsh';
mock.module('../src/features/quran-reader/state/reading-preferences-provider', () => ({ useReadingPreferences: () => ({ preferences: { riwayah } }) }));
mock.module('react-native', () => ({ AppState: { addEventListener: () => ({ remove() {} }) } }));
// A minimal DOM-less React root: enough to run hooks and effects.
const fakeWindow = { event: undefined, HTMLIFrameElement: class {} };
const hadWindow = 'window' in globalThis;
globalThis.window ??= fakeWindow;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
afterAll(() => {
  globalThis.fetch = originalFetch;
  if (!hadWindow) delete globalThis.window;
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});
const { loadReaderContent } = await import('../src/features/quran-reader/services/reader-service');
const { loadTajweedPrintedSurah, loadTajweedSurah } = await import('../src/features/quran-reader/services/tajweed-service');
const { useReaderContent } = await import('../src/features/quran-reader/hooks/use-reader-content');
const { useReadingPosition } = await import('../src/features/quran-reader/hooks/use-reading-position');
const { useTajweed } = await import('../src/features/quran-reader/hooks/use-tajweed');

function renderHook(hook, props) {
  const document = { createElement: () => ({}), addEventListener() {}, removeEventListener() {}, defaultView: fakeWindow, activeElement: null };
  fakeWindow.document = document;
  const root = createRoot({ nodeType: 1, nodeName: 'DIV', tagName: 'DIV', namespaceURI: 'http://www.w3.org/1999/xhtml', ownerDocument: document,
    addEventListener() {}, removeEventListener() {}, childNodes: [], firstChild: null, appendChild() {}, removeChild() {}, textContent: '' });
  const result = { current: undefined, history: [] };
  function Probe({ value }) { result.current = hook(value); result.history.push(result.current); return null; }
  const render = (value) => act(async () => { root.render(createElement(Probe, { value })); });
  return { result, render, settle: (ms = 5) => act(() => tick(ms)), unmount: () => act(async () => root.unmount()) };
}

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const slow = (response) => async () => { await tick(150); return response(); };
const hafsFatiha = { number: 1, name: 'الفاتحة', codedName: '', ayahs: decodeSurahAyahs(hafsSample.surahs[0].ayahs, 2, 1) };
const printedHtml = readFileSync(new URL('./fixtures/quranpedia/hafs-tajweed-printed-sample.html', import.meta.url), 'utf8');

describe('reader content service', () => {
  test('expired cache is returned without waiting for the network, refreshed once in the background', async () => {
    const fetchedAt = Date.now() - CORPUS_TTL_MS - 1000;
    await storage.setItem('quranpedia:v1:/mushafs/4', JSON.stringify({ version: 1, fetchedAt, payload: syntheticCorpus() }));
    handler = slow(() => new Response('', { status: 503 }));
    const started = Date.now();
    const result = await loadReaderContent({}, 'warsh');
    expect(Date.now() - started).toBeLessThan(120);
    expect(result).toMatchObject({ source: 'cache', stale: true, fetchedAt });
    expect(result.data.pages).toHaveLength(604);
    expect(calls).toHaveLength(1);
    await tick(200);
    expect(await loadReaderContent({}, 'warsh')).toBe(result);
    await tick(200);
    expect(calls).toHaveLength(1); // A failed refresh is not retried on every mount.
  });

  test('a manual refresh waits for the network and reports failures', async () => {
    handler = async () => new Response('', { status: 503 });
    const failed = await loadReaderContent({ forceRefresh: true }, 'warsh');
    expect(failed).toMatchObject({ source: 'cache', stale: true, refreshError: { status: 503 } });
    handler = async () => Response.json(syntheticCorpus());
    const fresh = await loadReaderContent({ forceRefresh: true }, 'warsh');
    expect(fresh).toMatchObject({ source: 'network', stale: false });
    expect(await loadReaderContent({}, 'warsh')).toBe(fresh);
    expect(calls).toHaveLength(3);
  });

  test('a payload for the wrong riwayah is rejected before it is cached', async () => {
    handler = async () => Response.json(syntheticCorpus(undefined, { id: 2 }));
    await expect(loadReaderContent({}, 'hafs')).rejects.toThrow('riwayah');
    expect(await storage.getItem('quranpedia:v1:/mushafs/2')).toBeNull();
  });
});

describe('tajweed service', () => {
  test('printed colors: expired legacy cache is migrated to an edition key and served at once', async () => {
    calls.length = 0;
    const legacy = 'quranpedia:tajweed-uthmani:v1:1';
    await storage.setItem(legacy, JSON.stringify({ html: printedHtml, fetchedAt: Date.now() - 40 * 86400000 }));
    handler = slow(() => new Response('', { status: 503 }));
    const pages = await loadTajweedPrintedSurah(hafsFatiha, 2);
    expect(pages[1].length).toBeGreaterThan(0);
    expect(calls).toEqual(['https://quranpedia.net/surah/1/1/tajweed-uthmani']); // background refresh only
    await tick(200);
    expect(JSON.parse(await storage.getItem('quranpedia:tajweed-uthmani:e1:v1:1')).html).toBe(printedHtml);
    expect(await storage.getItem(legacy)).toBeNull();
    expect(await loadTajweedPrintedSurah(hafsFatiha)).toBe(pages);
    await tick(200);
    expect(calls).toHaveLength(1);
  });

  test('colored printed pages and Hafs text colors reject other editions', async () => {
    const warshSurah = { number: 1, name: 'الفاتحة', codedName: '', ayahs: decodeSurahAyahs(warshFatiha, 4, 1) };
    await expect(loadTajweedPrintedSurah(hafsFatiha, 4)).rejects.toThrow('Unsupported');
    await expect(loadTajweedPrintedSurah(hafsFatiha, 1)).rejects.toThrow('Unsupported');
    await expect(loadTajweedPrintedSurah(warshSurah)).rejects.toThrow('Unsupported');
    await expect(loadTajweedSurah(warshSurah, 2)).rejects.toThrow('Unsupported');
    await expect(loadTajweedSurah(hafsFatiha, 3)).rejects.toThrow('Unsupported');
  });
});

describe('reader hooks', () => {
  const hafsMetadata = { ...hafsSample, surahs: undefined };
  const hafsCorpus = () => syntheticCorpus(undefined, { id: 2, rawi: hafsMetadata.rawi, name: hafsMetadata.name });

  test('reader content: errors and manual-refresh revisions do not leak across riwayat', async () => {
    calls.length = 0;
    riwayah = 'hafs';
    handler = async () => new Response('', { status: 503 });
    const hook = renderHook(() => useReaderContent());
    await hook.render();
    await hook.settle();
    expect(hook.result.current.error).not.toBeNull();
    riwayah = 'warsh';
    hook.result.history.length = 0;
    await hook.render();
    await hook.settle();
    // Warsh never shows the Hafs error while it loads, and is served from memory.
    expect(hook.result.history.every((value) => value.error === null)).toBe(true);
    expect(hook.result.current).toMatchObject({ loading: false, content: { data: { quran: { id: 4 } } } });
    const before = calls.length;
    await act(async () => hook.result.current.refresh());
    await hook.settle();
    expect(calls.length).toBe(before + 1); // the manual refresh went to the network
    await storage.setItem('quranpedia:v1:/mushafs/2', JSON.stringify({ version: 1, fetchedAt: Date.now(), payload: hafsCorpus() }));
    riwayah = 'hafs';
    await hook.render();
    await hook.settle();
    expect(hook.result.current).toMatchObject({ loading: false, error: null, content: { data: { quran: { id: 2 } } } });
    expect(calls.length).toBe(before + 1); // switching riwayah did not force a network fetch
    riwayah = 'warsh';
    await hook.render();
    await hook.settle();
    expect(calls.length).toBe(before + 1);
    await hook.unmount();
  });

  test('reading position reloads per storage key and offers a stable selectAyah', async () => {
    const warsh = prepareReaderContent(decodeQuran(syntheticCorpus(), 4));
    const hafs = prepareReaderContent(decodeQuran(hafsCorpus(), 2));
    await storage.setItem('warsh:reading-position:v1', JSON.stringify({ mushafId: 4, pageNumber: 2, ayah: null, scrollY: 10 }));
    const hafsSaved = JSON.stringify({ mushafId: 2, pageNumber: 3, ayah: null, scrollY: 0 });
    await storage.setItem('hafs:reading-position:v1', hafsSaved);
    riwayah = 'warsh';
    const hook = renderHook((content) => useReadingPosition(content));
    await hook.render(warsh);
    await hook.settle();
    expect(hook.result.current).toMatchObject({ ready: true, position: { mushafId: 4, pageNumber: 2 } });
    const { selectAyah } = hook.result.current;
    await act(async () => hook.result.current.move({ ...hook.result.current.position, pageNumber: 4 }));
    expect(hook.result.current.selectAyah).toBe(selectAyah);
    await act(async () => selectAyah({ mushafId: 4, surahNumber: 1, ayahNumber: 3 }));
    expect(hook.result.current.position).toMatchObject({ pageNumber: 4, scrollY: 10, ayah: { mushafId: 4, surahNumber: 1, ayahNumber: 3 } });
    // Switch riwayah while the previous edition's content is still passed in.
    riwayah = 'hafs';
    await hook.render(warsh);
    await hook.settle(20);
    expect(hook.result.current).toMatchObject({ ready: false, position: { mushafId: 2, pageNumber: 1 } });
    expect(await storage.getItem('hafs:reading-position:v1')).toBe(hafsSaved);
    await hook.render(hafs);
    await hook.settle(20);
    expect(hook.result.current).toMatchObject({ ready: true, position: { mushafId: 2, pageNumber: 3 } });
    expect(JSON.parse(await storage.getItem('warsh:reading-position:v1'))).toMatchObject({ pageNumber: 4, ayah: { ayahNumber: 3 } });
    await hook.unmount();
  });

  test('tajweed results and errors belong to the surahs they were loaded for', async () => {
    const html = readFileSync(new URL('./fixtures/quranpedia/hafs-tajweed-sample.html', import.meta.url), 'utf8');
    const only = (n) => html.replace(/<a\b([^>]*)>[\s\S]*?<\/a>/g, (tag, attrs) => attrs.includes(`surah="${n}"`) ? tag : '');
    const quran = { ...hafsMetadata, id: 2, surahs: hafsSample.surahs.map((s) => ({ number: s.id, name: s.name, codedName: s.coded_name, ayahs: decodeSurahAyahs(s.ayahs, 2, s.id) })) };
    const [first, second] = prepareReaderContent(quran).pages;
    handler = async (url) => url.endsWith('/1/tajweed') ? new Response('', { status: 503 }) : (await tick(100), new Response(only(2)));
    const hook = renderHook((page) => useTajweed(page, quran, true));
    await hook.render(first);
    await hook.settle(20);
    expect(hook.result.current.error).toBe(true);
    hook.result.history.length = 0;
    await hook.render(second);
    expect(hook.result.history.every((value) => !value.error && !Object.keys(value.data).length)).toBe(true);
    await hook.settle(200);
    expect(hook.result.current.error).toBe(false);
    expect(Object.keys(hook.result.current.data)).toEqual(['2']);
    await hook.unmount();
  });
});
