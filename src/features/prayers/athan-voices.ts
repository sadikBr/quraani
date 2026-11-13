import { useSyncExternalStore } from 'react';
import { Directory, File, Paths } from 'expo-file-system';
import { athanModule } from './athan-native';
import type { VoiceId } from './settings';

/**
 * The whole athan's recordings. Two come with the app; the others (some 1.5 MB each) are fetched
 * the first time they are chosen, from the app's own repository, and kept on the phone under
 * `documents/athan/`, where the Android module finds them by name (`AthanService.kt`). Until a
 * chosen one is there, the module plays the first of those that come with the app.
 */
export const BUNDLED_VOICES: readonly VoiceId[] = ['makkah', 'madinah'];
/** Where the others are kept (`assets/athan/full/` in the repository). */
const SOURCE = 'https://raw.githubusercontent.com/sadikBr/quraani/main/assets/athan/full';

const fileName = (voice: VoiceId) => `athan_full_${voice}.ogg`;
const folder = () => new Directory(Paths.document, 'athan');
const fileOf = (voice: VoiceId) => new File(folder(), fileName(voice));

export type VoiceState = 'ready' | 'absent' | 'downloading' | 'failed';
const states = new Map<VoiceId, VoiceState>();
const listeners = new Set<() => void>();
let revision = 0;
const publish = (voice: VoiceId, state: VoiceState) => { states.set(voice, state); revision++; listeners.forEach((listener) => listener()); };

/** Whether the recording is on the phone (always, where whole athans are not played: nothing is fetched there). */
function onPhone(voice: VoiceId): boolean {
  if (!athanModule || BUNDLED_VOICES.includes(voice)) return true;
  try { const file = fileOf(voice); return file.exists && file.size > 0; } catch { return false; }
}

export function voiceState(voice: VoiceId): VoiceState {
  let state = states.get(voice);
  if (!state) { state = onPhone(voice) ? 'ready' : 'absent'; states.set(voice, state); }
  return state;
}

/** The recordings' states, kept current as they are fetched. */
export function useVoiceStates(): (voice: VoiceId) => VoiceState {
  useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => revision, () => 0);
  return voiceState;
}

/**
 * Fetches a recording that is not on the phone yet. It is saved under another name until it is
 * whole, so one cut short is never played. Resolves whether it is there.
 */
export async function ensureVoice(voice: VoiceId): Promise<boolean> {
  const state = voiceState(voice);
  if (state === 'ready') return true;
  if (state === 'downloading') return false;
  publish(voice, 'downloading');
  const part = new File(folder(), `${fileName(voice)}.part`);
  try {
    folder().create({ intermediates: true, idempotent: true });
    await File.downloadFileAsync(`${SOURCE}/${fileName(voice)}`, part, { idempotent: true });
    const target = fileOf(voice);
    if (target.exists) target.delete();
    part.move(target);
    publish(voice, 'ready');
    return true;
  } catch {
    try { if (part.exists) part.delete(); } catch { /* Replaced on the next attempt. */ }
    publish(voice, 'failed');
    return false;
  }
}
