import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { claimAudio, releaseAudio } from '@/features/audio/focus';

/**
 * A rawi's recitation of the ayah, heard from the qira'at: one at a time, stopping any other
 * sound of the app (and stopped by it). `playing` is the clip's key, `failed` the one that could
 * not play.
 */
export interface ClipState { playing: string | null; loading: boolean; failed: string | null }
const idle: ClipState = { playing: null, loading: false, failed: null };
let state = idle;
const listeners = new Set<() => void>();
const publish = (next: ClipState) => { state = next; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function useClip(): ClipState {
  return useSyncExternalStore(subscribe, () => state, () => idle);
}

let player: AudioPlayer | null = null;
let modeReady = false;

function onStatus(status: AudioStatus) {
  if (state.playing === null) return;
  if (status.error) { const failed = state.playing; stopClip(); publish({ ...idle, failed }); return; }
  if (status.playing && state.loading) publish({ ...state, loading: false });
  if (status.didJustFinish) stopClip();
}

export async function playClip(key: string, url: string) {
  claimAudio('qiraat', stopClip);
  publish({ playing: key, loading: true, failed: null });
  if (!modeReady) {
    modeReady = true;
    try { await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' }); } catch { modeReady = false; }
  }
  if (state.playing !== key) return;
  try {
    if (!player) {
      player = createAudioPlayer(null, { updateInterval: 250 });
      player.addListener('playbackStatusUpdate', onStatus);
    }
    player.replace({ uri: url });
    player.play();
  } catch {
    releaseAudio('qiraat');
    publish({ playing: null, loading: false, failed: key });
  }
}

export function stopClip() {
  try { player?.pause(); } catch { /* Already stopped. */ }
  releaseAudio('qiraat');
  if (state.playing !== null) publish({ ...idle, failed: state.failed });
}

/** Stops, and forgets a clip that failed (the qira'at closing). */
export function resetClip() {
  stopClip();
  if (state.failed !== null) publish(idle);
}
