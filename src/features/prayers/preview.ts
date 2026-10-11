import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { claimAudio, releaseAudio } from '@/features/audio/focus';
import type { TakbirId, VoiceId } from './settings';

/** Each voice's opening and each takbir, bundled as AAC so they play everywhere. */
const athans: Record<VoiceId, number> = {
  original: require('@/assets/athan/preview_original.m4a'),
  azeez: require('@/assets/athan/preview_azeez.m4a'),
  azemi: require('@/assets/athan/preview_azemi.m4a'),
  shalqar: require('@/assets/athan/preview_shalqar.m4a'),
  ghana: require('@/assets/athan/preview_ghana.m4a'),
  nigeria: require('@/assets/athan/preview_nigeria.m4a'),
  aishatu: require('@/assets/athan/preview_aishatu.m4a'),
};
const takbirs: Record<TakbirId, number> = {
  makkah: require('@/assets/athan/preview_takbir_makkah.m4a'),
  medina: require('@/assets/athan/preview_takbir_medina.m4a'),
  original: require('@/assets/athan/preview_takbir_original.m4a'),
  azeez: require('@/assets/athan/preview_takbir_azeez.m4a'),
  azemi: require('@/assets/athan/preview_takbir_azemi.m4a'),
  shalqar: require('@/assets/athan/preview_takbir_shalqar.m4a'),
  ghana: require('@/assets/athan/preview_takbir_ghana.m4a'),
  nigeria: require('@/assets/athan/preview_takbir_nigeria.m4a'),
  aishatu: require('@/assets/athan/preview_takbir_aishatu.m4a'),
};

/** What is playing: `athan:<voice>` or `takbir:<id>`. */
export type PreviewKey = `athan:${VoiceId}` | `takbir:${TakbirId}`;
export interface PreviewState { playing: PreviewKey | null; error: boolean }
const idle: PreviewState = { playing: null, error: false };
let state = idle;
const listeners = new Set<() => void>();
const publish = (next: PreviewState) => { state = next; listeners.forEach((l) => l()); };

export function usePreview(): PreviewState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => idle);
}

let player: AudioPlayer | null = null;
let modeReady = false;

function onStatus(status: AudioStatus) {
  if (state.playing === null) return;
  if (status.error) { stopPreview(); publish({ playing: null, error: true }); return; }
  if (status.didJustFinish) stopPreview();
}

/** Plays a voice's opening or a takbir, stopping any other sound of the app. */
export async function playPreview(key: PreviewKey) {
  claimAudio('athan-preview', stopPreview);
  publish({ playing: key, error: false });
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
    const [kind, id] = key.split(':') as ['athan', VoiceId] | ['takbir', TakbirId];
    player.replace(kind === 'athan' ? athans[id as VoiceId] : takbirs[id as TakbirId]);
    player.play();
  } catch {
    releaseAudio('athan-preview');
    publish({ playing: null, error: true });
  }
}

export function stopPreview() {
  try { player?.pause(); } catch { /* Already stopped. */ }
  releaseAudio('athan-preview');
  if (state.playing !== null) publish(idle);
}
