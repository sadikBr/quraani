import { expect, test } from 'bun:test';
import { createPrintedPageLoader } from '../src/features/quran-reader/services/printed-page-loader';
import { preloadPageNumbers } from '../src/features/quran-reader/utils/navigation';
const page = (number, mushafId = 4) => ({ number, mushafId, ayahs: [] });
const artwork = (number) => ({ xml: `<svg>${number}</svg>`, regions: [], headings: [], viewBox: '0 0 345 550', width: 345, height: 550 });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
function controlled() {
  const started = [];
  const requests = new Map();
  const loader = createPrintedPageLoader((p) => new Promise((resolve, reject) => { started.push(p.number); requests.set(p.number, { resolve: () => resolve(artwork(p.number)), reject }); }));
  return { loader, started, requests };
}

test('preload runway includes both immediate neighbors, follows direction and respects edges', () => {
  expect(preloadPageNumbers(300, 604).slice(0, 7)).toEqual([300, 301, 299, 302, 298, 303, 297]);
  expect(preloadPageNumbers(300, 604)).toHaveLength(17);
  expect(preloadPageNumbers(300, 604, -1).slice(-3)).toEqual([290, 289, 288]);
  expect(preloadPageNumbers(1, 604)).toEqual(Array.from({ length: 13 }, (_, i) => i + 1));
  expect(preloadPageNumbers(604, 604, -1)).toEqual(Array.from({ length: 13 }, (_, i) => 604 - i));
});

test('background downloads run in parallel while a visible page gets a reserved slot', async () => {
  const { loader, started, requests } = controlled();
  loader.prefetch([page(2), page(3), page(4)]);
  await tick(); expect(started).toEqual([2, 3]);
  const jump = loader.load(page(50)); await tick();
  expect(started).toEqual([2, 3, 50]);
  requests.get(50).resolve(); await jump;
  requests.get(2).resolve(); requests.get(3).resolve(); await tick();
  expect(started).toEqual([2, 3, 50, 4]); requests.get(4).resolve(); await tick();
});

test('rapid turns reuse downloads and synchronous snapshots without waiting for storage', async () => {
  let downloads = 0;
  const loader = createPrintedPageLoader(async (p) => { downloads++; return artwork(p.number); });
  for (let n = 1; n <= 17; n++) await loader.load(page(n));
  for (let n = 1; n <= 17; n++) {
    expect(loader.peek(page(n))).toEqual(artwork(n));
    expect(await loader.load(page(n))).toBe(loader.peek(page(n)));
  }
  expect(downloads).toBe(17);
  expect(loader.peek(page(1, 1))).toBeUndefined();
  await expect(loader.load(page(1, 1))).rejects.toThrow();
});

test('foreground demand promotes a queued preload and duplicate requests share one promise', async () => {
  const { loader, started, requests } = controlled();
  loader.prefetch([page(2), page(3), page(4), page(5)]); await tick();
  const demanded = loader.load(page(5));
  expect(loader.load(page(5))).toBe(demanded);
  await tick(); expect(started).toEqual([2, 3, 5]);
  requests.get(5).resolve(); await demanded;
  requests.get(2).resolve(); requests.get(3).resolve(); await tick(); requests.get(4).resolve(); await tick();
});

test('jumping replaces obsolete queued preloads rather than downloading a growing backlog', async () => {
  const { loader, started, requests } = controlled();
  loader.prefetch([page(2), page(3), page(4), page(5)]); await tick();
  loader.prefetch([page(101), page(102)]);
  requests.get(2).resolve(); requests.get(3).resolve(); await tick();
  expect(started).toEqual([2, 3, 101, 102]);
  requests.get(101).resolve(); requests.get(102).resolve(); await tick();
});

test('LRU eviction bounds memory and keeps recently visited pages available', async () => {
  const loader = createPrintedPageLoader(async (p) => artwork(p.number), { capacity: 3 });
  await loader.load(page(1)); await loader.load(page(2)); await loader.load(page(3));
  await loader.load(page(1)); await loader.load(page(4));
  expect(loader.peek(page(2))).toBeUndefined();
  for (const n of [1, 3, 4]) expect(loader.peek(page(n))).toEqual(artwork(n));
  const bounded = createPrintedPageLoader(async (p) => artwork(p.number), { byteBudget: 50 });
  for (let n = 1; n <= 4; n++) await bounded.load(page(n));
  expect(bounded.peek(page(1))).toBeUndefined(); expect(bounded.peek(page(4))).toBeDefined();
});

test('expired artwork stays readable immediately during refresh, including failed refreshes', async () => {
  let now = 1; let fail = false; let downloads = 0;
  const loader = createPrintedPageLoader(async (p) => { downloads++; if (fail) throw new Error('offline'); return artwork(p.number); }, { ttl: 10, now: () => now });
  const original = await loader.load(page(1)); await tick(); now = 12; fail = true;
  expect(await loader.load(page(1))).toBe(original); await tick();
  expect(downloads).toBe(2); expect(loader.peek(page(1))).toBe(original);
  fail = false; expect(await loader.load(page(1))).toBe(original); await tick();
  expect(downloads).toBe(3);
});

test('failed downloads release slots and remain retryable without caching broken pages', async () => {
  const { loader, requests } = controlled(); const request = loader.load(page(1)); await tick();
  requests.get(1).reject(new Error('timeout')); await expect(request).rejects.toThrow('timeout'); await tick();
  expect(loader.peek(page(1))).toBeUndefined();
  const retry = loader.load(page(1)); await tick(); requests.get(1).resolve();
  expect(await retry).toEqual(artwork(1));
});
