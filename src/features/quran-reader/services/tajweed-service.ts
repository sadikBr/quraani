import type { Surah } from '@/lib/quranpedia/types';
import { RIWAYAT } from '../riwayat';
import { contentStorage } from '../storage/content-storage';
import { decodeTajweedPrintedSurah, decodeTajweedSurah } from '../utils/tajweed';
import { loadWarshTajweed } from './warsh-tajweed-service';

type Format = 'tajweed' | 'tajweed-uthmani';
interface Entry { html: string; fetchedAt: number }
/** Quranpedia's printed Hafs edition supplies colors for the Hafs Unicode text (mushaf 2). */
const SOURCE_EDITION = 1;
/** Annotations for a fixed corpus rarely change; expired copies are used while refreshing. */
const TTL = 30 * 24 * 60 * 60 * 1000;
const RETRY_MS = 5 * 60_000;
const pending = new Map<string, Promise<unknown>>();
const refreshing = new Set<string>();
const retryAt = new Map<string, number>();
const memory = new Map<string, Entry & { surah?: Surah; data?: unknown }>();

async function download(format: Format, surah: Surah): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`https://quranpedia.net/surah/${SOURCE_EDITION}/${surah.number}/${format}`, { signal: controller.signal });
    if (!response.ok) throw new Error(`Tajweed request failed (${response.status})`);
    return await response.text();
  } finally { clearTimeout(timeout); }
}

async function load<T>(surah: Surah, format: Format, decode: (html: string, surah: Surah) => T): Promise<T> {
  const key = `quranpedia:${format}:e${SOURCE_EDITION}:v1:${surah.number}`;
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;
  const remember = (entry: Entry & { surah?: Surah; data?: unknown }) => {
    const data = entry.surah === surah && entry.data ? entry.data as T : decode(entry.html, surah);
    memory.delete(key); memory.set(key, { html: entry.html, fetchedAt: entry.fetchedAt, surah, data });
    while (memory.size > 4) memory.delete(memory.keys().next().value!);
    return data;
  };
  const fetchFresh = async () => {
    const html = await download(format, surah);
    const data = decode(html, surah); // Validate before caching.
    const entry = { html, fetchedAt: Date.now() };
    remember({ ...entry, surah, data });
    retryAt.delete(key);
    void contentStorage.setItem(key, JSON.stringify(entry)).catch(() => {});
    return data;
  };
  const refresh = () => {
    if (refreshing.has(key) || (retryAt.get(key) ?? 0) > Date.now()) return;
    refreshing.add(key);
    void fetchFresh().catch(() => { retryAt.set(key, Date.now() + RETRY_MS); }).finally(() => refreshing.delete(key));
  };
  const task: Promise<T> = (async () => {
    const stored = async (): Promise<Entry | undefined> => {
      // Older builds stored the same edition-1 source without the edition in its key.
      for (const candidate of [key, `quranpedia:${format}:v1:${surah.number}`]) {
        try {
          const raw = await contentStorage.getItem(candidate);
          const parsed = JSON.parse(raw ?? 'null');
          if (typeof parsed?.html !== 'string' || !Number.isFinite(parsed.fetchedAt)) continue;
          if (candidate !== key) void contentStorage.setItem(key, raw!).then(() => contentStorage.removeItem(candidate)).catch(() => {});
          return { html: parsed.html, fetchedAt: parsed.fetchedAt };
        } catch { /* Fetch a fresh copy if persistence is unavailable or corrupt. */ }
      }
    };
    const cached = memory.get(key) ?? await stored();
    if (cached) {
      try {
        const data = remember(cached);
        // Serve the saved copy at once; refresh expired copies in the background.
        const age = Date.now() - cached.fetchedAt;
        if (!(age >= 0 && age < TTL)) refresh();
        return data;
      } catch { /* A copy that no longer matches the corpus is replaced. */ }
    }
    return fetchFresh();
  })().finally(() => { if (pending.get(key) === task) pending.delete(key); });
  pending.set(key, task);
  return task;
}

function assertHafs(surah: Surah, mushafId: number) {
  if (mushafId !== RIWAYAT.hafs.mushafId || surah.ayahs.some((ayah) => ayah.mushafId !== mushafId)) {
    throw new Error('Unsupported tajweed edition');
  }
}
export async function loadTajweedSurah(surah: Surah, mushafId: number = RIWAYAT.hafs.mushafId) {
  if (mushafId === RIWAYAT.warsh.mushafId) return loadWarshTajweed(surah);
  assertHafs(surah, mushafId);
  return load(surah, 'tajweed', decodeTajweedSurah);
}
/** Colored printed pages exist for Hafs only (QPC V4 glyphs of Quranpedia edition 1). */
export async function loadTajweedPrintedSurah(surah: Surah, mushafId: number = RIWAYAT.hafs.mushafId) {
  assertHafs(surah, mushafId);
  return load(surah, 'tajweed-uthmani', decodeTajweedPrintedSurah);
}

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
