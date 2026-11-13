import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { audioIds, audioUrl } from './content';

/** Recordings are saved on phones only; the web app always streams. */
export const downloadsSupported = Platform.OS !== 'web';

const folder = () => new Directory(Paths.document, 'adhkar-audio');
const fileFor = (id: number) => new File(folder(), `${id}.mp3`);

/** A saved recording's URI, or null to stream it. */
export function localAudio(id: number): string | null {
  if (!downloadsSupported) return null;
  try { const file = fileFor(id); return file.exists && file.size > 0 ? file.uri : null; } catch { return null; }
}

export interface AudioDownloadState {
  /** Recordings saved on the device. */
  saved: number;
  total: number;
  bytes: number;
  active: { done: number; total: number } | null;
  error: 'network' | 'storage' | null;
}

const listeners = new Set<() => void>();
let state: AudioDownloadState | null = null;
let job: AbortController | null = null;

function scan(): AudioDownloadState {
  let saved = 0, bytes = 0;
  if (downloadsSupported) {
    for (const id of audioIds) {
      try { const file = fileFor(id); if (file.exists && file.size > 0) { saved++; bytes += file.size; } } catch { /* Counted as missing. */ }
    }
  }
  return { saved, total: audioIds.length, bytes, active: null, error: null };
}
const current = () => (state ??= scan());
function update(change: Partial<AudioDownloadState>) {
  state = { ...current(), ...change };
  listeners.forEach((listener) => listener());
}

const empty: AudioDownloadState = { saved: 0, total: audioIds.length, bytes: 0, active: null, error: null };
export function useAudioDownload(): AudioDownloadState {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => (downloadsSupported ? current() : empty),
    () => empty,
  );
}

/** Saves the recordings not yet on the device, a few at a time. */
export async function downloadAudio() {
  if (!downloadsSupported || job) return;
  const controller = new AbortController();
  job = controller;
  const missing = audioIds.filter((id) => !localAudio(id));
  let done = 0;
  update({ error: null, active: { done, total: missing.length } });
  try {
    folder().create({ intermediates: true, idempotent: true });
    let next = 0;
    const worker = async () => {
      while (next < missing.length && !controller.signal.aborted) {
        const id = missing[next++];
        const target = fileFor(id);
        // Saved under another name until it is whole: a download cut short is never taken for the recording.
        const part = new File(folder(), `${id}.mp3.part`);
        try {
          await File.downloadFileAsync(audioUrl(id), part, { idempotent: true, signal: controller.signal });
          if (target.exists) target.delete();
          part.move(target);
        } catch (error) {
          try { if (part.exists) part.delete(); } catch { /* Replaced next time. */ }
          if (controller.signal.aborted) return;
          throw error;
        }
        done++;
        update({ active: { done, total: missing.length } });
      }
    };
    await Promise.all(Array.from({ length: Math.min(3, missing.length) }, worker));
    update({ ...scan(), active: null });
  } catch (error) {
    update({ ...scan(), error: /space|ENOSPC|disk/i.test(String(error)) ? 'storage' : 'network' });
  } finally {
    if (job === controller) job = null;
  }
}

export function cancelAudioDownload() {
  job?.abort();
  job = null;
  update({ ...scan(), active: null });
}

export function deleteAudio() {
  cancelAudioDownload();
  try { const dir = folder(); if (dir.exists) dir.delete(); } catch { /* Nothing left to remove. */ }
  update({ ...scan(), error: null });
}
