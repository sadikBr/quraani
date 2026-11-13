import { Platform } from 'react-native';
import { useSyncExternalStore } from 'react';
import { clearPreloadedSource, createAudioPlayer, preload, requestNotificationPermissionsAsync, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { AyahReference, Quran } from '@/lib/quranpedia/types';
import { t } from '@/i18n';
import { afterFinished, skipTo, startAt, type QueueAyah, type QueuePlan, type QueuePosition } from './queue';
import { ayahAtTime, needsBasmala, segmentFor, surahFileName, surahStartFor, type Segment, type SurahTimings } from './sources';
import { isMissing, localUri } from './downloads';
import { loadTimings } from './timings';
import { fatihaCountsBasmala } from './catalog';
import { claimAudio, releaseAudio } from '@/features/audio/focus';

export interface RecitationAyah { surahNumber: number; ayahNumber: number; pageNumber: number }

/** 'ayah': each ayah's own recording, one after another; 'surah': a whole surah recorded as one. */
export type RecitationKind = 'ayah' | 'surah';

export interface RecitationState {
  status: 'idle' | 'loading' | 'playing' | 'paused';
  kind: RecitationKind;
  reciter: Reciter | null;
  mushafId: number | null;
  /**
   * The ayah being recited (during the basmala, the ayah it leads into). For a whole surah, known
   * from the reciter's timings; null without them.
   */
  current: RecitationAyah | null;
  /** The whole surah being recited (`kind` 'surah'). */
  surah: number | null;
  basmala: boolean;
  /** Times each ayah (or whole surah) is recited; 0 repeats until stopped. */
  repeat: number;
  /** Completed recitations of the current ayah (or surah). */
  heard: number;
  /** Last ayah of a limited stretch (a single ayah, or a goal's portion). */
  end: RecitationAyah | null;
  /** When the recitation pauses on its own (to fall asleep to it), if asked. */
  sleep: SleepTimer | null;
  error: string | null;
}

/** Pausing on its own: at a time (`at`, epoch milliseconds), or when the surah being recited ends. */
export type SleepTimer = { at: number } | { surah: true };
/** The minutes offered for it. */
export const SLEEP_MINUTES = [15, 30, 45, 60] as const;

const idle: RecitationState = { status: 'idle', kind: 'ayah', reciter: null, mushafId: null, current: null, surah: null, basmala: false, repeat: 1, heard: 0, end: null, sleep: null, error: null };
let state = idle;
const listeners = new Set<() => void>();
const publish = (change: Partial<RecitationState>) => { state = { ...state, ...change }; listeners.forEach((l) => l()); };

/** The recitation everywhere in the app: one player that keeps going between screens. */
export function useRecitation(): RecitationState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => { listeners.delete(l); }; }, () => state, () => idle);
}
export const recitationState = () => state;

/** Where a whole surah's recording is, in milliseconds (0 while unknown). */
export interface RecitationProgress { position: number; duration: number }
const noProgress: RecitationProgress = { position: 0, duration: 0 };
let progress = noProgress;
const progressListeners = new Set<() => void>();
/** Kept apart from the state, and only to the second, so the time going by redraws only its own display. */
function publishProgress(position: number, duration: number) {
  const next = { position: Math.max(0, Math.floor(position / 1000) * 1000), duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0 };
  if (next.position === progress.position && next.duration === progress.duration) return;
  progress = next;
  progressListeners.forEach((l) => l());
}
/** The position in the whole surah being recited, for its seek bar. */
export function useRecitationProgress(): RecitationProgress {
  return useSyncExternalStore((l) => { progressListeners.add(l); return () => { progressListeners.delete(l); }; }, () => progress, () => noProgress);
}

/** What both kinds of recitation track about the file playing. */
interface Playback {
  token: number;
  reciter: Reciter;
  quran: Quran;
  ayahs: QueueAyah[];
  timings: SurahTimings | null;
  uri: string | null;
  /**
   * Set when the source was replaced: statuses of the previous file can still arrive, so they are
   * ignored until the player reports the new one loading (or a moment has passed).
   */
  replacedAt: number | null;
  /** Seek once the new source is loaded (milliseconds). */
  pendingSeek: number | null;
  /** A seek in flight: the end checks wait until playback reaches it. */
  seeking: { at: number; since: number } | null;
  /** Guards against finishing the same recitation twice (end time and file end can both fire). */
  finishing: boolean;
}

// One session at a time; every async step checks it is still the current one.
interface AyahSession extends Playback {
  kind: 'ayah';
  plan: QueuePlan;
  position: QueuePosition;
  segment: Segment | null;
  /** Preloaded sources, released when the session moves on. */
  preloaded: Set<string>;
}

interface SurahSession extends Playback {
  kind: 'surah';
  surah: number;
  repeat: number;
  /** Completed recitations of this surah. */
  heard: number;
  /** The ayah heard now (0 for the opening basmala), from the timings; null without them. */
  ayah: number | null;
}

type Session = AyahSession | SurahSession;

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
function lockScreen(s: Session, title: string) {
  const metadata = { title, artist: s.reciter.name, albumTitle: t('common.appName') };
  try {
    if (state.status === 'idle' || state.status === 'loading') audio().setActiveForLockScreen(true, metadata, { showSeekBackward: false, showSeekForward: false });
    else audio().updateLockScreenMetadata(metadata);
  } catch { /* Not available on every platform. */ }
}
const ayahTitle = (s: Session, ayah: Pick<QueueAyah, 'surahNumber' | 'ayahNumber'>) =>
  t('recitation.lockScreen.title', { surah: surahName(s.quran, ayah.surahNumber), ayah: ayah.ayahNumber });

const sourceUri = (s: Session, file: string) => localUri(s.reciter.id, file) ?? `${s.reciter.server}/${file}`;

function segmentAt(s: AyahSession, position: QueuePosition): Segment | null {
  const ayah = s.ayahs[position.index];
  return segmentFor(s.reciter, ayah.surahNumber, position.basmala ? 0 : ayah.ayahNumber, s.timings);
}

/** Runs a best-effort call that may return a promise (native) or nothing (web). */
function quietly(call: () => unknown) {
  try { void Promise.resolve(call()).catch(() => undefined); } catch { /* Preloading only saves a moment. */ }
}
const release = (uri: string) => quietly(() => clearPreloadedSource({ uri }));

/** Buffers the next ayah's file so it starts without a pause. */
function preloadNext(s: AyahSession) {
  const next = afterFinished(s.ayahs, { ...s.position, heard: Math.max(s.position.heard, s.plan.repeat - 1) }, s.plan);
  const segment = next && segmentAt(s, next);
  if (!segment) return;
  const uri = sourceUri(s, segment.file);
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

/** Plays `uri` from `from` milliseconds: a new file is loaded first, the same one is sought. */
function load(s: Session, uri: string, from: number) {
  const p = audio();
  if (uri !== s.uri) {
    s.uri = uri;
    s.pendingSeek = from ? from : null;
    s.seeking = null;
    // The web player swaps in a new audio element and drops the old one's events.
    s.replacedAt = Platform.OS === 'web' ? null : Date.now();
    p.replace({ uri });
  } else {
    s.pendingSeek = null;
    seek(s, from);
  }
  p.play();
}

/** Starts the recitation at `position`, skipping what this reciter cannot play. */
function begin(s: AyahSession, position: QueuePosition) {
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
  load(s, sourceUri(s, segment.file), segment.start ?? 0);
  const ayah = s.ayahs[at.index];
  lockScreen(s, ayahTitle(s, ayah));
  publish({ status: state.status === 'paused' ? 'playing' : state.status === 'idle' ? 'loading' : state.status, current: { ...ayah }, basmala: at.basmala, heard: at.heard, error: null });
  preloadNext(s);
}

function seek(s: Session, ms: number) {
  const seeking = { at: ms, since: Date.now() };
  s.seeking = seeking;
  void Promise.resolve(audio().seekTo(ms / 1000)).catch(() => { if (s.seeking === seeking) s.seeking = null; });
}

/** The time asked for has come: the recitation pauses where it is, and can be taken up again. */
function sleepNow() {
  audio().pause();
  publish({ sleep: null, status: 'paused' });
}
const sleepDue = () => !!state.sleep && 'at' in state.sleep && Date.now() >= state.sleep.at;

function finished(s: AyahSession) {
  if (s.finishing) return;
  s.finishing = true;
  const next = afterFinished(s.ayahs, s.position, s.plan);
  if (!next) { stop(); return; }
  // Asked to end with the surah: it ends here.
  if (state.sleep && 'surah' in state.sleep && s.ayahs[next.index].surahNumber !== s.ayahs[s.position.index].surahNumber) { stop(); return; }
  const segment = segmentAt(s, next);
  const repeating = next.index === s.position.index && !s.position.basmala;
  // Within a surah file, the next ayah usually follows on directly: keep playing instead of seeking.
  if (!repeating && segment && s.segment && segment.file === s.segment.file && segment.start !== undefined
    && s.segment.end !== undefined && Math.abs(segment.start - s.segment.end) < 400) {
    s.position = next; s.segment = segment; s.finishing = false;
    const ayah = s.ayahs[next.index];
    lockScreen(s, ayahTitle(s, ayah));
    publish({ current: { ...ayah }, basmala: next.basmala, heard: next.heard });
    return;
  }
  begin(s, next);
}

/** The surah after (or before) `from` that this reciter recorded, or null at the end of the mushaf. */
function surahBeside(s: SurahSession | Pick<SurahSession, 'reciter' | 'quran'>, from: number, direction: 1 | -1): number | null {
  for (let surah = from + direction; surah >= 1 && surah <= 114; surah += direction) {
    if (s.reciter.surahs.includes(surah) && s.quran.surahs.some((x) => x.number === surah) && !isMissing(s.reciter.id, surahFileName(surah))) return surah;
  }
  return null;
}

/**
 * Follows the recitation through the surah's ayahs with the timings: the ayah heard, and the page
 * it is on. `fresh`: a surah just started, shown even when the ayah number has not changed.
 */
function follow(s: SurahSession, ms: number, fresh = false) {
  const ayah = ayahAtTime(s.timings?.[s.surah], ms);
  if (ayah === s.ayah && !fresh) return;
  s.ayah = ayah;
  const reference = ayah === null ? null : s.ayahs.find((a) => a.surahNumber === s.surah && a.ayahNumber === Math.max(1, ayah)) ?? null;
  lockScreen(s, reference ? ayahTitle(s, reference) : surahName(s.quran, s.surah));
  // Before ayah 1 there can be silence or the isti'adha; only surahs that open with the basmala show it.
  publish({ current: reference ? { ...reference } : null, basmala: ayah === 0 && needsBasmala(s.surah, fatihaCountsBasmala(s.quran)) });
}

/** Plays a surah's recording from `from` milliseconds, as its `heard`th recitation. */
function playSurahFile(s: SurahSession, surah: number, from: number, heard: number) {
  const uri = sourceUri(s, surahFileName(surah));
  const changed = uri !== s.uri;
  s.surah = surah;
  s.heard = heard;
  s.finishing = false;
  load(s, uri, from);
  if (changed) publishProgress(from, 0);
  else publishProgress(from, progress.duration);
  publish({ status: state.status === 'paused' ? 'playing' : state.status === 'idle' ? 'loading' : state.status, surah, heard, error: null });
  follow(s, from, true);
}

function surahFinished(s: SurahSession) {
  if (s.finishing) return;
  s.finishing = true;
  const heard = s.heard + 1;
  if (s.repeat === 0 || heard < s.repeat) { playSurahFile(s, s.surah, 0, heard); return; }
  const next = surahBeside(s, s.surah, 1);
  if (next === null || (state.sleep && 'surah' in state.sleep)) { stop(); return; }
  playSurahFile(s, next, 0, 0);
}

/**
 * Statuses that belong to a file being replaced, or arrive before a seek lands, are ignored;
 * a pending seek is made once the new file is loaded. True when the status can be acted on.
 */
function settled(s: Session, status: AudioStatus): boolean {
  if (s.replacedAt !== null) {
    // The new file is loading once the player reports it not loaded.
    if (!status.isLoaded) { s.replacedAt = null; return false; }
    if (Date.now() - s.replacedAt < 1500) return false;
    s.replacedAt = null;
  }
  if (s.pendingSeek !== null) {
    if (!status.isLoaded) return false;
    const at = s.pendingSeek;
    s.pendingSeek = null;
    seek(s, at);
    return false;
  }
  if (s.seeking) {
    // A file can end just as it is sent back for a repetition; that end is not a new one.
    if (Math.abs(status.currentTime * 1000 - s.seeking.at) > 1000 && Date.now() - s.seeking.since < 2000) return false;
    s.seeking = null;
    if (status.didJustFinish) return false;
  }
  return true;
}

function onStatus(status: AudioStatus) {
  const s = session;
  if (!s) return;
  if (status.error) {
    audio().pause();
    publish({ status: 'paused', error: t('recitation.errors.playback') });
    return;
  }
  if (!settled(s, status)) return;
  // Checked as the recording goes by (not with a timer of its own, which a sleeping phone may hold back).
  if (status.playing && sleepDue()) { sleepNow(); return; }
  const position = status.currentTime * 1000;
  if (s.kind === 'surah') {
    if (status.didJustFinish) { surahFinished(s); return; }
    if (!status.isLoaded) return;
    publishProgress(position, status.duration * 1000);
    follow(s, position);
  } else {
    if (status.didJustFinish) { finished(s); return; }
    const end = s.segment?.end;
    if (end !== undefined && status.isLoaded && position >= end - 40) { finished(s); return; }
    // While a new file loads, keep showing the current state.
    if (!status.isLoaded) return;
  }
  const next = status.playing ? 'playing' : 'paused';
  if (next !== state.status) publish({ status: next });
}

/** The reciter, or a lookup that may take a moment (the reciter list can come from the network). */
type ReciterChoice = Reciter | (() => Promise<Reciter | null>);

/**
 * Stops what plays, shows `loading` and finds the reciter. Returns null when the recitation was
 * stopped or replaced meanwhile, or when it failed (the error is shown).
 */
async function prepare(own: number, choose: ReciterChoice, missing: string): Promise<Reciter | null> {
  let reciter: Reciter | null;
  try { reciter = typeof choose === 'function' ? await choose() : choose; } catch {
    if (own === token) reportError(t('recitation.errors.playback'));
    return null;
  }
  if (own !== token) return null;
  if (!reciter) { reportError(missing); return null; }
  publish({ reciter });
  await prepareAudioMode();
  return own === token ? reciter : null;
}

export interface PlayOptions {
  quran: Quran;
  reciter: ReciterChoice;
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
  claimAudio('recitation', stop);
  const end = to ? { ...ayahs[endIndex] } : null;
  // (Asked to pause on its own, it still does when another ayah is chosen.)
  publish({ ...idle, status: 'loading', mushafId: quran.id, current: { ...ayahs[start] }, repeat, end, sleep: state.sleep });
  const reciter = await prepare(own, choose, t('recitation.errors.noReciter'));
  if (!reciter) return;
  let timings: SurahTimings | null = null;
  if (reciter.mode === 'surah') {
    try { timings = await loadTimings(reciter); } catch {
      if (own === token) publish({ status: 'idle', error: t('recitation.errors.playback') });
      return;
    }
  }
  if (own !== token) return;
  // The repetition may have been changed while the reciter loaded.
  plan.repeat = state.repeat;
  const s: AyahSession = { kind: 'ayah', token: own, reciter, quran, ayahs, plan, timings, position: startAt(ayahs, start, plan), segment: null, uri: null, replacedAt: null, pendingSeek: null, seeking: null, finishing: false, preloaded: new Set() };
  session = s;
  begin(s, s.position);
}

export interface SurahPlayOptions {
  quran: Quran;
  /** A reciter with whole-surah recordings. */
  reciter: ReciterChoice;
  /** Its surah is recited; from this ayah when the reciter's timings place it, otherwise from the top. */
  from: Pick<AyahReference, 'surahNumber' | 'ayahNumber'>;
  /** Times each surah is recited before the next; 0 repeats until stopped. */
  repeat: number;
}

/**
 * Recites whole surahs from their recordings, one after another to the end of the mushaf. With
 * the reciter's timings the recitation can start at an ayah and the ayah heard is followed;
 * without them each surah plays from its start.
 */
export async function playSurah({ quran, reciter: choose, from, repeat }: SurahPlayOptions) {
  const ayahs = ayahsOf(quran);
  const own = ++token;
  stopAudio();
  claimAudio('recitation', stop);
  publish({ ...idle, kind: 'surah', status: 'loading', mushafId: quran.id, surah: from.surahNumber, repeat, sleep: state.sleep });
  const reciter = await prepare(own, choose, t('recitation.errors.noSurahReciter'));
  if (!reciter) return;
  // Timings only let the page follow; without them the surah still plays.
  let timings: SurahTimings | null = null;
  if (reciter.timingUrl) timings = await loadTimings(reciter).catch(() => null);
  if (own !== token) return;
  const surah = reciter.surahs.includes(from.surahNumber) && !isMissing(reciter.id, surahFileName(from.surahNumber))
    ? from.surahNumber : surahBeside({ reciter, quran }, from.surahNumber, 1);
  if (surah === null) { reportError(t('recitation.errors.noSurahLeft')); return; }
  // The repetition may have been changed while the reciter and its timings loaded.
  const s: SurahSession = { kind: 'surah', token: own, reciter, quran, ayahs, timings, surah, repeat: state.repeat, heard: 0, ayah: null, uri: null, replacedAt: null, pendingSeek: null, seeking: null, finishing: false };
  session = s;
  const list = timings?.[surah];
  playSurahFile(s, surah, surah === from.surahNumber ? surahStartFor(list, from.ayahNumber) : 0, 0);
}

export function pause() { if (session) audio().pause(); }
export function resume() {
  if (!session) return;
  // A time that came while the recitation was paused is over: taking it up again is the listener's choice.
  if (sleepDue()) publish({ sleep: null });
  audio().play();
  publish({ error: null });
}
export function toggle() { if (state.status === 'playing' || state.status === 'loading') pause(); else resume(); }

/** Moves by one ayah, or by one surah while whole surahs play (−1 previous, +1 next), starting its repetitions over. */
export function step(delta: 1 | -1) {
  const s = session;
  if (!s) return;
  if (s.kind === 'surah') {
    const target = surahBeside(s, s.surah, delta);
    if (target !== null) playSurahFile(s, target, 0, 0);
    return;
  }
  const target = skipTo(s.ayahs, s.position.index + delta, s.plan);
  if (target) begin(s, target);
}

/** Moves within the whole surah being recited (milliseconds). */
export function seekTo(ms: number) {
  const s = session;
  if (!s || s.kind !== 'surah') return;
  const at = Math.max(0, progress.duration ? Math.min(ms, progress.duration - 500) : ms);
  s.finishing = false;
  // While a new file loads, the seek waits for it.
  if (s.pendingSeek !== null || s.replacedAt !== null) s.pendingSeek = at; else seek(s, at);
  publishProgress(at, progress.duration);
  follow(s, at);
}

/**
 * Changes the repetition of the recitation under way (each ayah's, or each surah's). A recitation
 * of the other kind keeps its own (`kind` is the kind of repetition being set).
 */
export function setRepeat(repeat: number, kind: RecitationKind = state.kind) {
  if (kind !== state.kind) return;
  if (session?.kind === 'ayah') session.plan = { ...session.plan, repeat };
  else if (session) session.repeat = repeat;
  publish({ repeat });
}

/**
 * Asks the recitation under way to pause on its own: in `minutes`, at the end of the surah being
 * recited (`'surah'`), or not at all (null). It lasts until it comes, or the recitation is stopped.
 */
export function setSleep(sleep: number | 'surah' | null) {
  if (!session && sleep !== null) return;
  publish({ sleep: sleep === null ? null : sleep === 'surah' ? { surah: true } : { at: Date.now() + sleep * 60_000 } });
}

function stopAudio() {
  const s = session;
  session = null;
  publishProgress(0, 0);
  if (!player) return;
  player.pause();
  if (s?.kind === 'ayah') for (const uri of s.preloaded) release(uri);
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
  releaseAudio('recitation');
  try { player?.setActiveForLockScreen(false); } catch { /* Not available on every platform. */ }
  publish({ ...idle, kind: state.kind, repeat: state.repeat });
}
