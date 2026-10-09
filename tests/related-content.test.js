import { expect, test } from 'bun:test';
import tafsir from './fixtures/quranpedia/tafsir-muyassar.json';
import translations from './fixtures/quranpedia/translations-en.json';
import { decodeBookContent, decodeTranslations, relatedPlainText } from '../src/lib/quranpedia/related-content';
import { QuranpediaClient } from '../src/lib/quranpedia/client';
import { MemoryCacheStorage, CONTENT_TTL_MS } from '../src/lib/quranpedia/cache';
test('real related responses preserve text, direction and named authors/sources', () => {
  const t = decodeBookContent(tafsir);
  expect(t.book.id).toBe(2012); expect(t.book.author).toBe('مجمع الملك فهد لطباعة المصحف الشريف');
  expect(t.texts[0]).toBe(tafsir.content[0].text); expect(t.direction).toBe('rtl');
  const tr = decodeTranslations(translations);
  expect(tr[0].book.id).toBe(1947); expect(tr[0].texts[0]).toBe(translations[0]['translation-content']); expect(tr[0].direction).toBe('ltr');
  expect(() => decodeBookContent({ book: tafsir.book, content: [{}] })).toThrow();
  expect(() => decodeTranslations([{ book: {}, 'translation-content': 'text' }])).toThrow();
});
test('prose HTML conversion removes markup and safely decodes entities', () => {
  expect(relatedPlainText('<p>A &amp; B</p><script>bad()</script>&#x627;')).toBe('A & B\nا');
  expect(relatedPlainText('&#999999999;')).toBe('&#999999999;');
});
test('on-demand content caches each parallel ayah independently and survives offline expiry', async () => {
  const storage = new MemoryCacheStorage(); let now = 1000000; const paths = [];
  const client = new QuranpediaClient({ storage, now: () => now, fetch: async (url) => { paths.push(url); return Response.json(url.includes('/book/') ? tafsir : translations); } });
  await client.getBookContent(1, 1, 2012); await client.getBookContent(1, 2, 2012); await client.getTranslations(1, 2, 'en');
  await client.getTranslations(1, 2, 'en'); expect(paths).toHaveLength(3);
  expect(paths[1]).toEndWith('/ayah/1/2/book/2012');
  now += CONTENT_TTL_MS;
  const offline = new QuranpediaClient({ storage, now: () => now, fetch: async () => { throw new Error('offline'); } });
  expect((await offline.getBookContent(1, 2, 2012)).stale).toBe(true);
  expect(() => client.getTranslations(1, 2, '../')).toThrow();
});
test('interrupted and slow related-content requests time out without caching error data', async () => {
  const storage = new MemoryCacheStorage();
  const client = new QuranpediaClient({ storage, timeoutMs: 10, fetch: (_url, { signal }) => new Promise((_r, reject) => signal.addEventListener('abort', () => reject(new Error('interrupted')))) });
  await expect(client.getBookContent(2, 255, 2012)).rejects.toMatchObject({ code: 'timeout' });
  expect(await storage.getItem('quranpedia:v1:/ayah/2/255/book/2012')).toBeNull();
});
test('a mismatched tafsir source is rejected before entering the cache', async () => {
  const storage = new MemoryCacheStorage();
  const client = new QuranpediaClient({ storage, fetch: async () => Response.json(tafsir) });
  await expect(client.getBookContent(1, 2, 3)).rejects.toMatchObject({ code: 'invalid-response' });
  expect(await storage.getItem('quranpedia:v1:/ayah/1/2/book/3')).toBeNull();
});
