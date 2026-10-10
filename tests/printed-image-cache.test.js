import { Buffer } from 'node:buffer';
import { expect, test } from 'bun:test';
import { createPreparedImageCache } from '../src/features/quran-reader/services/prepared-image-cache';
import { createPrintedImageCache } from '../src/features/quran-reader/services/printed-image-cache';

const artwork = { cacheKey: 'warsh-layout-v2-29-a', xml: '<svg viewBox="0 0 300 550"><g id="content"><path d="M 1 2 L 3 4"/></g></svg>', width: 300, height: 550 };
const colours = ['#20443B', '#AD9156'];
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a decoded image survives cache recreation without SVG encoding or decoding', async () => {
  const disk = new Map(); let prepared = 0, decoded = 0;
  const options = { sizeOf: () => 100, read: async (key) => disk.get(key) ?? null, write: async (image, key) => { disk.set(key, image); },
    prepare: async (work) => { prepared++; return work(); }, decode: async (uri) => { decoded++; return { uri }; } };
  const first = createPrintedImageCache(options);
  const pending = first.load(artwork, ...colours);
  expect(first.load(artwork, ...colours)).toBe(pending);
  const image = await pending;
  expect(first.peek(artwork, ...colours)).toBe(image);
  expect(await first.load(artwork, ...colours)).toBe(image);
  expect(await createPrintedImageCache(options).load(artwork, ...colours)).toBe(image);
  expect(prepared).toBe(1); expect(decoded).toBe(1);
});

test('theme changes and corrected Quran artwork cannot reuse the wrong cached image', async () => {
  const disk = new Map(); let decodes = 0;
  const cache = createPrintedImageCache({ sizeOf: () => 100, prepare: async (f) => f(), read: async (k) => disk.get(k) ?? null,
    write: async (v, k) => { disk.set(k, v); }, decode: async (uri) => ({ uri, id: ++decodes }) });
  const light = await cache.load(artwork, ...colours);
  const dark = await cache.load(artwork, '#EEEEEE', '#BBCCDD');
  const updated = await cache.load({ ...artwork, cacheKey: 'warsh-layout-v2-29-b' }, ...colours);
  expect(dark).not.toBe(light); expect(updated).not.toBe(light); expect(decodes).toBe(3);
  const svg = Buffer.from(light.uri.split(',')[1], 'base64').toString();
  expect(svg).toContain('width="1200" height="2200"');
  expect(svg).toContain('d="M 1 2 L 3 4"');
});

test('missing/unavailable image disk caches fall back to decoding and do not fail reading', async () => {
  const expected = {};
  const cache = createPrintedImageCache({ sizeOf: () => 100, prepare: async (f) => f(), read: async () => { throw new Error('unavailable'); },
    write: async () => { throw new Error('full'); }, decode: async () => expected });
  expect(await cache.load(artwork, ...colours)).toBe(expected); await tick();
});

test('image memory is bounded by bytes and LRU; a failed decode can be retried', async () => {
  const cache = createPreparedImageCache((image) => image.bytes, { capacity: 3, byteBudget: 250 });
  for (const key of ['1', '2']) await cache.load(key, async () => ({ bytes: 100, key }));
  await cache.load('1', async () => { throw new Error('must be warm'); });
  await cache.load('3', async () => ({ bytes: 100 }));
  expect(cache.peek('1')).toBeDefined(); expect(cache.peek('2')).toBeUndefined(); expect(cache.peek('3')).toBeDefined();
  await expect(cache.load('4', async () => { throw new Error('decode'); })).rejects.toThrow();
  expect(await cache.load('4', async () => ({ bytes: 100 }))).toEqual({ bytes: 100 });
});
