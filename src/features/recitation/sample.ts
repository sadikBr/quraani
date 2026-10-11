import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { Reciter } from '@/lib/quranpedia/reciters';
import { claimAudio, releaseAudio } from '@/features/audio/focus';
import { localUri } from './downloads';
import { ayahFileName, surahFileName } from './sources';

/** A sample lasts this long once the voice is heard, and fades out over its last moment. */
export const SAMPLE_MS = 20_000;
const FADE_MS = 1_500;
/** From an edition with ayah files, at most this many ayahs, one after another. */
const SAMPLE_AYAHS = 4;

/**
 * What a reciter's sample plays: the opening of Al-Fatiha, or of the first surah they recorded
 * (its first ayahs' files, or the start of its surah file).
 */
export function sampleFiles(reciter: Reciter, ayahCount: (surah: number) => number): string[] {
  const surah = reciter.surahs.includes(1) ? 1 : reciter.surahs[0];
  if (surah === undefined) return [];
  if (reciter.mode === 'surah') return [surahFileName(surah)];
  const count = Math.min(SAMPLE_AYAHS, Math.max(1, ayahCount(surah)));
  return Array.from({ length: count }, (_, i) => ayahFileName(surah, i + 1));
}

export interface SampleState {
  /** The reciter whose sample plays (or loads). */
  reciter: number | null;
  /** Its first file is still on its way. */
  loading: boolean;
  /** The reciter whose sample could not be played. */
  failed: number | null;
}
const idle: SampleState = { reciter: null, loading: false, failed: null };
let state = idle;
const listeners = new Set<() => void>();
const publish = (next: SampleState) => { state = next; listeners.forEach((l) => l()); };

export const sampleState = () => state;

/** The sample playing, for the reciter list's listen buttons. */
export function useSample(): SampleState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => idle);
}

interface Session {
  reciter: Reciter;
  files: string[];
  index: number;
  /** Statuses of the file before can still arrive after a switch (see the recitation's player). */
  replacedAt: number | null;
  ending: ReturnType<typeof setTimeout> | null;
  fading: ReturnType<typeof setInterval> | null;
}

let player: AudioPlayer | null = null;
let session: Session | null = null;
let token = 0;
let modeReady = false;

function audio(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 200 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

function playFile(s: Session) {
  const file = s.files[s.index];
  const p = audio();
  s.replacedAt = Platform.OS === 'web' ? null : Date.now();
  p.replace({ uri: localUri(s.reciter.id, file) ?? `${s.reciter.server}/${file}` });
  // On the web, a file that cannot be fetched also rejects `play`; its status reports the failure.
  void Promise.resolve(p.play() as unknown).catch(() => undefined);
}

/** Lowers the volume to nothing, then stops. */
function fadeOut(s: Session) {
  if (s.fading) return;
  const started = Date.now();
  s.fading = setInterval(() => {
    const left = 1 - (Date.now() - started) / FADE_MS;
    if (left <= 0 || session !== s) { stopSample(); return; }
    try { audio().volume = left; } catch { /* Ends at once instead. */ }
  }, 100);
}

function onStatus(status: AudioStatus) {
  const s = session;
  if (!s) return;
  if (status.error) { fail(s); return; }
  if (s.replacedAt !== null) {
    if (!status.isLoaded) { s.replacedAt = null; return; }
    if (Date.now() - s.replacedAt < 1500) return;
    s.replacedAt = null;
  }
  if (status.didJustFinish) {
    if (s.index + 1 < s.files.length && !s.fading) { s.index += 1; playFile(s); }
    else stopSample();
    return;
  }
  // The time counts from when the voice is first heard, not while the file is fetched.
  if (status.playing && state.loading) {
    publish({ ...state, loading: false });
    s.ending ??= setTimeout(() => fadeOut(s), SAMPLE_MS - FADE_MS);
  }
}

function fail(s: Session) {
  stopSample();
  publish({ ...idle, failed: s.reciter.id });
}

/** Plays a short sample of a reciter (`files` from `sampleFiles`), stopping any other sound of the app. */
export async function playSample(reciter: Reciter, files: string[]) {
  stopSample();
  if (!files.length) return;
  const own = ++token;
  claimAudio('reciter-sample', stopSample);
  publish({ reciter: reciter.id, loading: true, failed: null });
  if (!modeReady) {
    modeReady = true;
    // The same mode as the recitation's, which sets it once for the app.
    try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }); } catch { modeReady = false; }
  }
  if (own !== token) return;
  const s: Session = { reciter, files, index: 0, replacedAt: null, ending: null, fading: null };
  session = s;
  try {
    const p = audio();
    p.volume = 1;
    playFile(s);
  } catch { fail(s); }
}

export function stopSample() {
  token++;
  const s = session;
  session = null;
  if (s?.ending) clearTimeout(s.ending);
  if (s?.fading) clearInterval(s.fading);
  if (player) {
    try { player.pause(); player.volume = 1; } catch { /* Already stopped. */ }
  }
  releaseAudio('reciter-sample');
  if (state.reciter !== null) publish({ ...idle, failed: state.failed });
}
