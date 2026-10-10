import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { clearPreloadedSource, createAudioPlayer, preload, requestNotificationPermissionsAsync, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { AyahReference, Quran } from '@/lib/quranpedia/types';
import { t } from '@/i18n';
import { afterFinished, skipTo, startAt, type QueueAyah, type QueuePlan, type QueuePosition } from './queue';
import { needsBasmala, segmentFor, type Segment, type SurahTimings } from './sources';
import { isMissing, localUri } from './downloads';
import { loadTimings } from './timings';
import { fatihaCountsBasmala } from './catalog';

export interface RecitationAyah { surahNumber: number; ayahNumber: number; pageNumber: number }

export interface RecitationState {
  status: 'idle' | 'loading' | 'playing' | 'paused';
  reciter: Reciter | null;
  mushafId: number | null;
  /** The ayah being recited (during the basmala, the ayah it leads into). */
  current: RecitationAyah | null;
  basmala: boolean;
  /** Times each ayah is recited; 0 repeats until stopped. */
  repeat: number;
  /** Completed recitations of the current ayah. */
  heard: number;
  /** Last ayah of a limited stretch (a single ayah, or a goal's portion). */
  end: RecitationAyah | null;
  error: string | null;
}

const idle: RecitationState = { status: 'idle', reciter: null, mushafId: null, current: null, basmala: false, repeat: 1, heard: 0, end: null, error: null };
let state = idle;
const listeners = new Set<() => void>();
const publish = (change: Partial<RecitationState>) => { state = { ...state, ...change }; listeners.forEach((l) => l()); };

/** The recitation everywhere in the app: one player that keeps going between screens. */
export function useRecitation(): RecitationState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => idle);
}
export const recitationState = () => state;

// One session at a time; every async step checks it is still the current one.
interface Session {
  token: number;
  reciter: Reciter;
  quran: Quran;
  ayahs: QueueAyah[];
  plan: QueuePlan;
  timings: SurahTimings | null;
  position: QueuePosition;
  segment: Segment | null;
  uri: string | null;
  /**
   * Set when the source was replaced: statuses of the previous file can still arrive, so they are
   * ignored until the player reports the new one loading (or a moment has passed).
   */
  replacedAt: number | null;
  /** Seek once the new source is loaded (milliseconds). */
  pendingSeek: number | null;
  /** A seek in flight: the end-of-ayah checks wait until playback reaches it. */
  seeking: { at: number; since: number } | null;
  /** Guards against finishing the same recitation twice (end time and file end can both fire). */
  finishing: boolean;
  /** Preloaded sources, released when the session moves on. */
  preloaded: Set<string>;
}

let player: AudioPlayer | null = null;
let session: Session | null = null;
let token = 0;
let modeReady = false;

const flatAyahs = new WeakMap<Quran, QueueAyah[]>();
function ayahsOf(quran: Quran): QueueAyah[] {
  let list = flatAyahs.get(quran);
  if (!list) {
    list = quran.surahs.flatMap((s) => s.ayahs.map((a) => ({ surahNumber: a.surahNumber, ayahNumber: a.ayahNumber, pageNumber: a.pageNumber })));
    flatAyahs.set(quran, list);
  }
  return list;
}
const indexOf = (ayahs: QueueAyah[], ref: Pick<AyahReference, 'surahNumber' | 'ayahNumber'>) =>
  ayahs.findIndex((a) => a.surahNumber === ref.surahNumber && a.ayahNumber === ref.ayahNumber);

function audio(): AudioPlayer {
  if (!player) {
    player = createAudioPlayer(null, { updateInterval: 100 });
    player.addListener('playbackStatusUpdate', onStatus);
  }
  return player;
}

async function prepareAudioMode() {
  if (modeReady) return;
  modeReady = true;
  try {
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
    // Android shows the playback controls as a notification.
    if (Platform.OS === 'android') await requestNotificationPermissionsAsync().catch(() => undefined);
  } catch { modeReady = false; }
}

const surahName = (quran: Quran, surah: number) => quran.surahs.find((s) => s.number === surah)?.name ?? '';
function lockScreen(s: Session, ayah: QueueAyah) {
  const metadata = { title: t('recitation.lockScreen.title', { surah: surahName(s.quran, ayah.surahNumber), ayah: ayah.ayahNumber }), artist: s.reciter.name, albumTitle: t('common.appName') };
  try {
    if (state.status === 'idle' || state.status === 'loading') audio().setActiveForLockScreen(true, metadata, { showSeekBackward: false, showSeekForward: false });
    else audio().updateLockScreenMetadata(metadata);
  } catch { /* Not available on every platform. */ }
}

const sourceUri = (s: Session, segment: Segment) => localUri(s.reciter.id, segment.file) ?? `${s.reciter.server}/${segment.file}`;

function segmentAt(s: Session, position: QueuePosition): Segment | null {
  const ayah = s.ayahs[position.index];
  return segmentFor(s.reciter, ayah.surahNumber, position.basmala ? 0 : ayah.ayahNumber, s.timings);
}

/** Runs a best-effort call that may return a promise (native) or nothing (web). */
function quietly(call: () => unknown) {
  try { void Promise.resolve(call()).catch(() => undefined); } catch { /* Preloading only saves a moment. */ }
}
const release = (uri: string) => quietly(() => clearPreloadedSource({ uri }));

/** Buffers the next ayah's file so it starts without a pause. */
function preloadNext(s: Session) {
  const next = afterFinished(s.ayahs, { ...s.position, heard: Math.max(s.position.heard, s.plan.repeat - 1) }, s.plan);
  const segment = next && segmentAt(s, next);
  if (!segment) return;
  const uri = sourceUri(s, segment);
  // Release what is no longer needed, but never the file playing now (on the web it is read from the preloaded copy).
  for (const old of s.preloaded) {
    if (old === s.uri || old === uri) continue;
    s.preloaded.delete(old);
    release(old);
  }
  if (uri === s.uri || s.preloaded.has(uri)) return;
  s.preloaded.add(uri);
  quietly(() => preload({ uri }));
}

/** Starts the recitation at `position`, skipping what this reciter cannot play. */
function begin(s: Session, position: QueuePosition) {
  let at: QueuePosition | null = position;
  let segment: Segment | null = null;
  while (at) {
    segment = segmentAt(s, at);
    if (segment && !isMissing(s.reciter.id, segment.file)) break;
    // No basmala recording: go straight to the ayah. An ayah the reciter lacks is skipped.
    const following: number = at.index + 1;
    at = at.basmala ? { ...at, basmala: false } : following <= s.plan.end && following < s.ayahs.length ? startAt(s.ayahs, following, s.plan) : null;
  }
  if (!at || !segment) { stop(); return; }
  s.position = at;
  s.segment = segment;
  s.finishing = false;
  const uri = sourceUri(s, segment);
  const p = audio();
  if (uri !== s.uri) {
    s.uri = uri;
    s.pendingSeek = segment.start ? segment.start : null;
    s.seeking = null;
    // The web player swaps in a new audio element and drops the old one's events.
    s.replacedAt = Platform.OS === 'web' ? null : Date.now();
    p.replace({ uri });
  } else {
    s.pendingSeek = null;
    seek(s, segment.start ?? 0);
  }
  p.play();
  const ayah = s.ayahs[at.index];
  lockScreen(s, ayah);
  publish({ status: state.status === 'paused' ? 'playing' : state.status === 'idle' ? 'loading' : state.status, current: { ...ayah }, basmala: at.basmala, heard: at.heard, error: null });
  preloadNext(s);
}

function seek(s: Session, ms: number) {
  const seeking = { at: ms, since: Date.now() };
  s.seeking = seeking;
  void Promise.resolve(audio().seekTo(ms / 1000)).catch(() => { if (s.seeking === seeking) s.seeking = null; });
}

function finished(s: Session) {
  if (s.finishing) return;
  s.finishing = true;
  const next = afterFinished(s.ayahs, s.position, s.plan);
  if (!next) { stop(); return; }
  const segment = segmentAt(s, next);
  const repeating = next.index === s.position.index && !s.position.basmala;
  // Within a surah file, the next ayah usually follows on directly: keep playing instead of seeking.
  if (!repeating && segment && s.segment && segment.file === s.segment.file && segment.start !== undefined
    && s.segment.end !== undefined && Math.abs(segment.start - s.segment.end) < 400) {
    s.position = next; s.segment = segment; s.finishing = false;
    const ayah = s.ayahs[next.index];
    lockScreen(s, ayah);
    publish({ current: { ...ayah }, basmala: next.basmala, heard: next.heard });
    return;
  }
  begin(s, next);
}

function onStatus(status: AudioStatus) {
  const s = session;
  if (!s) return;
  if (status.error) {
    audio().pause();
    publish({ status: 'paused', error: t('recitation.errors.playback') });
    return;
  }
  if (s.replacedAt !== null) {
    // The new file is loading once the player reports it not loaded.
    if (!status.isLoaded) { s.replacedAt = null; return; }
    if (Date.now() - s.replacedAt < 1500) return;
    s.replacedAt = null;
  }
  if (s.pendingSeek !== null) {
    if (!status.isLoaded) return;
    const at = s.pendingSeek;
    s.pendingSeek = null;
    seek(s, at);
    return;
  }
  const position = status.currentTime * 1000;
  if (s.seeking) {
    // A file can end just as it is sent back for a repetition; that end is not a new one.
    if (Math.abs(position - s.seeking.at) > 1000 && Date.now() - s.seeking.since < 2000) return;
    s.seeking = null;
    if (status.didJustFinish) return;
  }
  if (status.didJustFinish) { finished(s); return; }
  const end = s.segment?.end;
  if (end !== undefined && status.isLoaded && position >= end - 40) { finished(s); return; }
  // While a new file loads, keep showing the current state.
  if (!status.isLoaded) return;
  const next = status.playing ? 'playing' : 'paused';
  if (next !== state.status) publish({ status: next });
}

export interface PlayOptions {
  quran: Quran;
  /** The reciter, or a lookup that may take a moment (the reciter list can come from the network). */
  reciter: Reciter | (() => Promise<Reciter | null>);
  from: Pick<AyahReference, 'surahNumber' | 'ayahNumber'>;
  /** Stop after this ayah (a single ayah, or the end of a goal's portion). */
  to?: Pick<AyahReference, 'surahNumber' | 'ayahNumber'> | null;
  repeat: number;
}

/** Recites from an ayah onward (to the end of the mushaf, or `to`), repeating each ayah `repeat` times. */
export async function playFrom({ quran, reciter: choose, from, to, repeat }: PlayOptions) {
  const ayahs = ayahsOf(quran);
  const start = indexOf(ayahs, from);
  if (start < 0) return;
  const endIndex = to ? Math.max(start, indexOf(ayahs, to)) : ayahs.length - 1;
  const counts = fatihaCountsBasmala(quran);
  const plan: QueuePlan = { end: endIndex, repeat, basmalaBefore: (surah) => needsBasmala(surah, counts) };
  const own = ++token;
  stopAudio();
  const end = to ? { ...ayahs[endIndex] } : null;
  publish({ ...idle, status: 'loading', mushafId: quran.id, current: { ...ayahs[start] }, repeat, end });
  let reciter: Reciter | null;
  try { reciter = typeof choose === 'function' ? await choose() : choose; } catch {
    if (own === token) reportError(t('recitation.errors.playback'));
    return;
  }
  if (own !== token) return;
  if (!reciter) { reportError(t('recitation.errors.noReciter')); return; }
  publish({ reciter });
  await prepareAudioMode();
  let timings: SurahTimings | null = null;
  if (reciter.mode === 'surah') {
    try { timings = await loadTimings(reciter); } catch {
      if (own === token) publish({ status: 'idle', error: t('recitation.errors.playback') });
      return;
    }
  }
  if (own !== token) return;
  session = { token: own, reciter, quran, ayahs, plan, timings, position: startAt(ayahs, start, plan), segment: null, uri: null, replacedAt: null, pendingSeek: null, seeking: null, finishing: false, preloaded: new Set() };
  begin(session, session.position);
}

export function pause() { if (session) audio().pause(); }
export function resume() {
  if (!session) return;
  audio().play();
  publish({ error: null });
}
export function toggle() { if (state.status === 'playing' || state.status === 'loading') pause(); else resume(); }

/** Moves by one ayah (−1 previous, +1 next), starting its repetitions over. */
export function step(delta: 1 | -1) {
  const s = session;
  if (!s) return;
  const target = skipTo(s.ayahs, s.position.index + delta, s.plan);
  if (target) begin(s, target);
}

export function setRepeat(repeat: number) {
  if (session) session.plan = { ...session.plan, repeat };
  publish({ repeat });
}

function stopAudio() {
  const s = session;
  session = null;
  if (!player) return;
  player.pause();
  if (s) for (const uri of s.preloaded) release(uri);
}

/** Shows a problem in the player without a recitation (e.g. no reciter for this riwayah). */
export function reportError(message: string) {
  stop();
  publish({ error: message });
}

/** Clears an error shown after playback stopped. */
export function dismissError() { if (state.status === 'idle') publish({ error: null }); }

export function stop() {
  token++;
  stopAudio();
  try { player?.setActiveForLockScreen(false); } catch { /* Not available on every platform. */ }
  publish({ ...idle, repeat: state.repeat });
}
