import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import type { Reciter } from '@/lib/quranpedia/reciters';
import { ayahFileName, ayahUrl, needsBasmala, surahFileName, surahUrl, type SurahTimings } from './sources';

/** Recitations are saved on phones only; the web app always streams. */
export const downloadsSupported = Platform.OS !== 'web';

interface Manifest {
  version: 1;
  /** Kept so a downloaded reciter plays offline without the reciter list. */
  reciter: Reciter;
  /** Surahs saved completely. */
  surahs: number[];
  /** Files the server does not have (a few ayahs are missing for some reciters). */
  missing: string[];
}

const folder = (id: number) => new Directory(Paths.document, 'recitations', String(id));
const fileIn = (id: number, name: string) => new File(folder(id), name);

function readJson<T>(file: File): T | null {
  try { return file.exists ? JSON.parse(file.textSync()) as T : null; } catch { return null; }
}
function writeJson(file: File, value: unknown) {
  const dir = file.parentDirectory;
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  file.write(JSON.stringify(value));
}

function readManifest(id: number): Manifest | null {
  if (!downloadsSupported) return null;
  const manifest = readJson<Manifest>(fileIn(id, 'manifest.json'));
  return manifest?.version === 1 && Array.isArray(manifest.surahs) ? manifest : null;
}
function writeManifest(manifest: Manifest) { writeJson(fileIn(manifest.reciter.id, 'manifest.json'), manifest); }

export function readTimings(id: number): SurahTimings | null {
  return downloadsSupported ? readJson<SurahTimings>(fileIn(id, 'timings.json')) : null;
}
export function saveTimings(reciter: Reciter, timings: SurahTimings) {
  if (!downloadsSupported) return;
  try { writeJson(fileIn(reciter.id, 'timings.json'), timings); } catch { /* Timings are fetched again next time. */ }
}

const missingFiles = new Map<number, Set<string>>();
/** A file the server does not have (found while downloading). */
export function isMissing(id: number, name: string): boolean {
  if (!downloadsSupported) return false;
  let set = missingFiles.get(id);
  if (!set) { set = new Set(readManifest(id)?.missing ?? []); missingFiles.set(id, set); }
  return set.has(name);
}

/** A saved file's URI, or null to stream it. */
export function localUri(id: number, name: string): string | null {
  if (!downloadsSupported) return null;
  try { const file = fileIn(id, name); return file.exists && file.size > 0 ? file.uri : null; } catch { return null; }
}

/** Reciters with at least one downloaded surah, for listening without the reciter list. */
export function downloadedReciters(): Reciter[] {
  if (!downloadsSupported) return [];
  try {
    const root = new Directory(Paths.document, 'recitations');
    if (!root.exists) return [];
    return root.list().flatMap((entry) => {
      const id = Number(entry.name);
      const manifest = entry instanceof Directory && Number.isSafeInteger(id) ? readManifest(id) : null;
      return manifest?.surahs.length ? [manifest.reciter] : [];
    });
  } catch { return []; }
}

export interface DownloadState {
  /** Surahs saved on the device. */
  surahs: number[];
  /** Bytes used on the device. */
  bytes: number;
  /** A download in progress. */
  active: { total: number; done: number; surah: number; files: number; filesDone: number } | null;
  error: 'network' | 'storage' | null;
}

const empty: DownloadState = { surahs: [], bytes: 0, active: null, error: null };
const states = new Map<number, DownloadState>();
const listeners = new Set<() => void>();
const jobs = new Map<number, AbortController>();

function sizeOf(id: number) {
  try { return folder(id).size ?? 0; } catch { return 0; }
}
function stateOf(id: number): DownloadState {
  let state = states.get(id);
  if (!state) {
    const manifest = readManifest(id);
    state = { ...empty, surahs: manifest?.surahs ?? [], bytes: manifest ? sizeOf(id) : 0 };
    states.set(id, state);
  }
  return state;
}
let saved: Reciter[] | null = null;
function update(id: number, change: Partial<DownloadState>) {
  states.set(id, { ...stateOf(id), ...change });
  if (change.surahs) saved = null;
  listeners.forEach((listener) => listener());
}
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Download progress and saved surahs of a reciter, kept current while the app runs. */
export function useDownload(id: number | undefined): DownloadState {
  return useSyncExternalStore(subscribe, () => (id === undefined || !downloadsSupported ? empty : stateOf(id)), () => empty);
}

const none: Reciter[] = [];
/** Reciters with saved surahs, kept current as downloads finish or are deleted. */
export function useDownloadedReciters(): Reciter[] {
  return useSyncExternalStore(subscribe, () => (downloadsSupported ? saved ??= downloadedReciters() : none), () => none);
}

export interface DownloadPlan {
  /** Ayah count of each surah in this riwayah. */
  ayahCounts: Record<number, number>;
  fatihaCountsBasmala: boolean;
}

function filesFor(reciter: Reciter, surah: number, plan: DownloadPlan): { name: string; url: string }[] {
  if (reciter.mode === 'surah') return [{ name: surahFileName(surah), url: surahUrl(reciter, surah) }];
  const count = plan.ayahCounts[surah] ?? 0;
  const ayahs = Array.from({ length: count }, (_, i) => i + 1);
  if (needsBasmala(surah, plan.fatihaCountsBasmala)) ayahs.unshift(0);
  return ayahs.map((ayah) => ({ name: ayahFileName(surah, ayah), url: ayahUrl(reciter, surah, ayah) }));
}

/** Saves surahs one after another (a few files at a time); already saved files are kept. */
export async function downloadSurahs(reciter: Reciter, surahs: number[], plan: DownloadPlan) {
  if (!downloadsSupported || jobs.has(reciter.id)) return;
  const controller = new AbortController();
  jobs.set(reciter.id, controller);
  const manifest: Manifest = readManifest(reciter.id) ?? { version: 1, reciter, surahs: [], missing: [] };
  manifest.reciter = reciter;
  const queue = surahs.filter((s) => reciter.surahs.includes(s) && !manifest.surahs.includes(s));
  update(reciter.id, { error: null, active: { total: queue.length, done: 0, surah: queue[0] ?? 0, files: 0, filesDone: 0 } });
  try {
    folder(reciter.id).create({ intermediates: true, idempotent: true });
    for (const [done, surah] of queue.entries()) {
      const files = filesFor(reciter, surah, plan).filter((f) => !manifest.missing.includes(f.name) && !localUri(reciter.id, f.name));
      let filesDone = 0;
      update(reciter.id, { active: { total: queue.length, done, surah, files: files.length, filesDone } });
      let next = 0;
      const worker = async () => {
        while (next < files.length) {
          const file = files[next++];
          if (controller.signal.aborted) return;
          const target = fileIn(reciter.id, file.name);
          // Saved under another name until it is whole: a download cut short (the app closed) is
          // never taken for the recording.
          const part = fileIn(reciter.id, `${file.name}.part`);
          try {
            await File.downloadFileAsync(file.url, part, { idempotent: true, signal: controller.signal });
            if (target.exists) target.delete();
            part.move(target);
          } catch (error) {
            try { if (part.exists) part.delete(); } catch { /* Replaced on the next attempt. */ }
            if (controller.signal.aborted) return;
            if (/\b404\b/.test(String(error))) { manifest.missing.push(file.name); missingFiles.delete(reciter.id); }
            else throw error;
          }
          filesDone += 1;
          update(reciter.id, { active: { total: queue.length, done, surah, files: files.length, filesDone } });
        }
      };
      await Promise.all(Array.from({ length: Math.min(4, files.length) }, worker));
      if (controller.signal.aborted) break;
      manifest.surahs = [...new Set([...manifest.surahs, surah])].sort((a, b) => a - b);
      writeManifest(manifest);
      update(reciter.id, { surahs: manifest.surahs, bytes: sizeOf(reciter.id) });
    }
    update(reciter.id, { active: null });
  } catch (error) {
    const storage = /space|ENOSPC|disk/i.test(String(error));
    update(reciter.id, { active: null, error: storage ? 'storage' : 'network', bytes: sizeOf(reciter.id) });
  } finally {
    jobs.delete(reciter.id);
  }
}

export function cancelDownload(id: number) {
  jobs.get(id)?.abort();
  jobs.delete(id);
  update(id, { active: null, bytes: sizeOf(id) });
}

/** Removes everything saved for a reciter. */
export function deleteDownload(id: number) {
  cancelDownload(id);
  try { const dir = folder(id); if (dir.exists) dir.delete(); } catch { /* Nothing left to remove. */ }
  missingFiles.delete(id);
  update(id, { surahs: [], bytes: 0, error: null });
}
