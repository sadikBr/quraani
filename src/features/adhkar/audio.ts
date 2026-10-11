import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { claimAudio, releaseAudio } from '@/features/audio/focus';
import { audioUrl } from './content';
import { localAudio } from './downloads';

/** The recording playing: which one, whether it is still loading, and any failure. */
export interface ClipState { id: number | null; loading: boolean; error: boolean }

const idle: ClipState = { id: null, loading: false, error: false };
let state = idle;
const listeners = new Set<() => void>();
const publish = (next: ClipState) => { state = next; listeners.forEach((l) => l()); };

export function useClip(): ClipState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => idle);
}

let player: AudioPlayer | null = null;
let modeReady = false;
/** After a new source, statuses of the previous one can still arrive (native players): wait for the new one to load. */
let replacedAt: number | null = null;

function onStatus(status: AudioStatus) {
  if (state.id === null) return;
  if (replacedAt !== null) {
    if (status.isLoaded && Date.now() - replacedAt < 1500) return;
    replacedAt = null;
  }
  if (status.error) { player?.pause(); releaseAudio('adhkar'); publish({ id: null, loading: false, error: true }); return; }
  if (status.didJustFinish) { stopClip(); return; }
  if (state.loading && status.isLoaded && status.playing) publish({ ...state, loading: false });
}

/** Plays one dhikr's recording (saved copy first), stopping any other sound. */
export async function playClip(id: number) {
  claimAudio('adhkar', stopClip);
  publish({ id, loading: true, error: false });
  if (!modeReady) {
    modeReady = true;
    try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }); } catch { modeReady = false; }
  }
  if (state.id !== id) return;
  try {
    if (!player) {
      player = createAudioPlayer(null, { updateInterval: 250 });
      player.addListener('playbackStatusUpdate', onStatus);
    }
    replacedAt = Platform.OS === 'web' ? null : Date.now();
    player.replace({ uri: localAudio(id) ?? audioUrl(id) });
    player.play();
  } catch {
    releaseAudio('adhkar');
    publish({ id: null, loading: false, error: true });
  }
}

export function stopClip() {
  try { player?.pause(); } catch { /* Already stopped. */ }
  releaseAudio('adhkar');
  if (state.id !== null || state.loading) publish(idle);
}

export function toggleClip(id: number) {
  if (state.id === id) stopClip(); else void playClip(id);
}

export function dismissClipError() { if (state.error) publish(idle); }
