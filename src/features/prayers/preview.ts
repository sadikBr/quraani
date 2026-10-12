import { useSyncExternalStore } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { claimAudio, releaseAudio } from '@/features/audio/focus';
import type { TakbirId, VoiceId } from './settings';

/** Each voice's opening and each takbir, bundled as AAC so they play everywhere. */
const athans: Record<VoiceId, number> = {
  makkah: require('@/assets/athan/preview_makkah.m4a'),
  madinah: require('@/assets/athan/preview_madinah.m4a'),
  aqsa: require('@/assets/athan/preview_aqsa.m4a'),
  alafasy: require('@/assets/athan/preview_alafasy.m4a'),
  alafasy2: require('@/assets/athan/preview_alafasy2.m4a'),
  nufais: require('@/assets/athan/preview_nufais.m4a'),
  zahrani: require('@/assets/athan/preview_zahrani.m4a'),
  qatami: require('@/assets/athan/preview_qatami.m4a'),
  dosari: require('@/assets/athan/preview_dosari.m4a'),
  kurdi: require('@/assets/athan/preview_kurdi.m4a'),
  abdulbasit: require('@/assets/athan/preview_abdulbasit.m4a'),
  ozcan: require('@/assets/athan/preview_ozcan.m4a'),
};
const takbirs: Record<TakbirId, number> = {
  makkah: require('@/assets/athan/preview_takbir_makkah.m4a'),
  madinah: require('@/assets/athan/preview_takbir_madinah.m4a'),
  aqsa: require('@/assets/athan/preview_takbir_aqsa.m4a'),
  alafasy: require('@/assets/athan/preview_takbir_alafasy.m4a'),
  alafasy2: require('@/assets/athan/preview_takbir_alafasy2.m4a'),
  nufais: require('@/assets/athan/preview_takbir_nufais.m4a'),
  zahrani: require('@/assets/athan/preview_takbir_zahrani.m4a'),
  qatami: require('@/assets/athan/preview_takbir_qatami.m4a'),
  dosari: require('@/assets/athan/preview_takbir_dosari.m4a'),
  kurdi: require('@/assets/athan/preview_takbir_kurdi.m4a'),
  abdulbasit: require('@/assets/athan/preview_takbir_abdulbasit.m4a'),
  ozcan: require('@/assets/athan/preview_takbir_ozcan.m4a'),
  single: require('@/assets/athan/preview_takbir_single.m4a'),
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
