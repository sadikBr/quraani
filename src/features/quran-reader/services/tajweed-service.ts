import type { Surah } from '@/lib/quranpedia/types';
import { contentStorage } from '../storage/content-storage';
import { decodeTajweedPrintedSurah, decodeTajweedSurah } from '../utils/tajweed';

const pending = new Map<string, Promise<unknown>>();
const memory = new Map<string, { fetchedAt: number; html: string; surah?: Surah; data?: unknown }>();
async function load<T>(surah: Surah, format: 'tajweed' | 'tajweed-uthmani', decode: (html: string, surah: Surah) => T): Promise<T> {
  const key = `quranpedia:${format}:v1:${surah.number}`;
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const task = (async () => {
    let cached = memory.get(key);
    if (!cached) {
      try {
        const parsed = JSON.parse(await contentStorage.getItem(key) ?? 'null');
        if (typeof parsed?.html === 'string' && Number.isFinite(parsed.fetchedAt)) { decode(parsed.html, surah); cached = parsed; }
      } catch { /* Fetch a fresh copy if persistence is unavailable or corrupt. */ }
    }
    const remember = (entry: { html: string; fetchedAt: number; surah?: Surah; data?: unknown }) => {
      const data = entry.surah === surah && entry.data ? entry.data as T : decode(entry.html, surah);
      memory.delete(key); memory.set(key, { ...entry, surah, data });
      while (memory.size > 4) memory.delete(memory.keys().next().value!);
      return data;
    };
    if (cached && Date.now() - cached.fetchedAt < 86400000) return remember(cached);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(`https://quranpedia.net/surah/1/${surah.number}/${format}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Tajweed request failed (${response.status})`);
      const html = await response.text();
      const result = decode(html, surah);
      const entry = { html, fetchedAt: Date.now() };
      remember({ ...entry, surah, data: result });
      void contentStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
      return result;
    } catch (error) {
      if (cached) return remember(cached);
      throw error;
    } finally { clearTimeout(timeout); }
  })().finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}
export const loadTajweedSurah = (surah: Surah) => load(surah, 'tajweed', decodeTajweedSurah);
export const loadTajweedPrintedSurah = (surah: Surah) => load(surah, 'tajweed-uthmani', decodeTajweedPrintedSurah);

const fonts = new Map<number, Promise<string>>();
export function loadTajweedFont(page: number): Promise<string> {
  if (!Number.isInteger(page) || page < 1 || page > 604) return Promise.reject(new Error('Invalid font page'));
  const existing = fonts.get(page); if (existing) return existing;
  const key = `quranpedia:tajweed-font:v4:${page}`;
  const task = (async () => {
    const cached = await contentStorage.getItem(key).catch(() => null);
    if (cached?.startsWith('data:font/woff2;base64,d09GMg')) return cached;
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`https://static-cdn.tarteel.ai/qul/fonts/quran_fonts/v4-tajweed/woff2/p${page}.woff2`, { signal: controller.signal });
      if (!response.ok) throw new Error('Tajweed font unavailable');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (String.fromCharCode(...bytes.slice(0, 4)) !== 'wOF2' || bytes.length > 2000000) throw new Error('Invalid tajweed font');
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      const chunks: string[] = [];
      for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i], b = bytes[i + 1] ?? 0, c = bytes[i + 2] ?? 0;
        chunks.push(alphabet[a >> 2] + alphabet[((a & 3) << 4) | (b >> 4)] + (i + 1 < bytes.length ? alphabet[((b & 15) << 2) | (c >> 6)] : '=') + (i + 2 < bytes.length ? alphabet[c & 63] : '='));
      }
      const uri = `data:font/woff2;base64,${chunks.join('')}`;
      void contentStorage.setItem(key, uri).catch(() => {}); return uri;
    } finally { clearTimeout(timeout); }
  })().catch((error) => { fonts.delete(page); throw error; });
  fonts.set(page, task); while (fonts.size > 12) fonts.delete(fonts.keys().next().value!);
  return task;
}
