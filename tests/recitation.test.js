import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { strToU8, zipSync } from 'fflate';
import { decodeReciters, playsSingleAyahs, reciterNameParts } from '../src/lib/quranpedia/reciters';
import { ayahAtTime, ayahFileName, needsBasmala, parseTimings, segmentFor, surahFileName, surahStartFor, timingsFromZip } from '../src/features/recitation/sources';
import { afterFinished, skipTo, startAt } from '../src/features/recitation/queue';

// The player and catalog reach native modules and the network; replace them before loading.
let reciterList = [];
let listFails = false;
let downloaded = [];
const missing = new Set();
let timings = {};
mock.module('react-native', () => ({ Platform: { OS: 'android', select: (o) => o.android ?? o.native ?? o.default }, AppState: { addEventListener: () => ({ remove() {} }) } }));
mock.module('../src/features/recitation/downloads', () => ({
  downloadedReciters: () => downloaded,
  isMissing: (_id, name) => missing.has(name),
  localUri: () => null,
  readTimings: () => null,
  saveTimings: () => {},
}));
mock.module('../src/features/recitation/timings', () => ({ loadTimings: async () => timings }));

class FakePlayer {
  calls = [];
  listener = null;
  addListener(_event, listener) { this.listener = listener; return { remove() {} }; }
  replace(source) { this.calls.push(`replace ${source.uri.split('/').pop()}`); }
  play() { this.calls.push('play'); }
  pause() { this.calls.push('pause'); }
  seekTo(seconds) { this.calls.push(`seek ${Math.round(seconds * 1000)}`); return Promise.resolve(); }
  setActiveForLockScreen() {}
  updateLockScreenMetadata() {}
}
const player = new FakePlayer();
// The recitation's player is the first one made; the reciter samples get their own.
let made = 0;
const samplePlayers = [];
mock.module('expo-audio', () => ({
  createAudioPlayer: () => { if (made++ === 0) return player; const own = new FakePlayer(); samplePlayers.push(own); return own; },
  preload: async () => {},
  clearPreloadedSource: async () => {},
  setAudioModeAsync: async () => {},
  requestNotificationPermissionsAsync: async () => ({ granted: true }),
}));

const { recitersFor, surahRecitersFor, chooseReciter, pickReciter, fatihaCountsBasmala } = await import('../src/features/recitation/catalog');
const resolveReciter = (riwayahId, chosen, listening) => pickReciter(async () => { if (listFails) throw new Error('offline'); return reciterList; }, () => downloaded, riwayahId, chosen, listening);
const recitation = await import('../src/features/recitation/player');

const edition = (overrides) => ({
  id: 1, name: 'مصحف ياسين الجزائري برواية ورش عن نافع', surahs_list: [1, 2], server: 'https://audio.test/r1/', timing_url: null,
  rawi: { id: 2, name: 'ورش' }, recitation_type: { id: 1, name: 'مرتل' }, classification: { id: 2, name: 'آية' }, ...overrides,
});
const reciter = (overrides) => ({ id: 1, title: 't', name: 'قارئ', path: null, riwayahId: 2, style: 'murattal', mode: 'ayah', server: 'https://audio.test/r1', timingUrl: null, surahs: [1, 2, 9], ...overrides });

describe('reciters from Quranpedia', () => {
  test('names come from the edition title, with any transmission path kept apart', () => {
    expect(reciterNameParts('مصحف محمد عبدالكريم برواية ورش عن نافع من طريق الأصبهاني')).toEqual({ name: 'محمد عبدالكريم', path: 'من طريق الأصبهاني' });
    expect(reciterNameParts('المصحف المرتل للشيخ محمود خليل الحصري برواية ورش عن نافع')).toEqual({ name: 'محمود خليل الحصري', path: null });
    expect(reciterNameParts('عمر القزابري')).toEqual({ name: 'عمر القزابري', path: null });
  });

  test('grouped editions are flattened and malformed ones skipped', () => {
    const decoded = decodeReciters([
      [edition({ id: 7 }), edition({ id: 8, classification: { id: 1 }, timing_url: 'https://audio.test/t/8.zip', surahs_list: [2, 1, 1, 200] })],
      [edition({ id: 9, server: 'http://insecure.test' }), edition({ id: 10, rawi: null }), edition({ id: 11, surahs_list: [] }), null],
    ]);
    expect(decoded.map((r) => r.id)).toEqual([7, 8]);
    expect(decoded[0]).toMatchObject({ name: 'ياسين الجزائري', riwayahId: 2, style: 'murattal', mode: 'ayah', server: 'https://audio.test/r1', timingUrl: null, surahs: [1, 2] });
    expect(decoded[1]).toMatchObject({ mode: 'surah', timingUrl: 'https://audio.test/t/8.zip', surahs: [1, 2] });
    expect(() => decodeReciters({})).toThrow();
  });

  test('only editions that can recite one ayah at a time are offered', () => {
    expect(playsSingleAyahs(reciter({ mode: 'ayah' }))).toBe(true);
    expect(playsSingleAyahs(reciter({ mode: 'surah', timingUrl: 'https://audio.test/t.zip' }))).toBe(true);
    expect(playsSingleAyahs(reciter({ mode: 'surah' }))).toBe(false);
  });

  test('one entry per reciter and style, preferring ayah files, sorted by name', () => {
    const list = recitersFor([
      reciter({ id: 1, name: 'ياسين الجزائري', mode: 'surah', timingUrl: 'https://t' }),
      reciter({ id: 2, name: 'ياسين الجزائري', mode: 'ayah' }),
      reciter({ id: 3, name: 'العيون الكوشي', mode: 'surah' }),
      reciter({ id: 4, name: 'الحصري', style: 'mujawwad' }),
      reciter({ id: 5, name: 'الحصري' }),
      reciter({ id: 6, name: 'عبد الباسط', riwayahId: 10 }),
    ], 2);
    expect(list.map((r) => r.id)).toEqual([4, 5, 2]);
  });

  test('whole surahs: surah editions only, preferring timings unless an untimed one covers more', () => {
    const list = surahRecitersFor([
      reciter({ id: 1, name: 'ياسين الجزائري', mode: 'surah', timingUrl: null, surahs: [1, 2, 3] }),
      reciter({ id: 2, name: 'ياسين الجزائري', mode: 'surah', timingUrl: 'https://t', surahs: [1] }),
      reciter({ id: 3, name: 'ياسين الجزائري', mode: 'ayah' }),
      reciter({ id: 4, name: 'العيون الكوشي', mode: 'surah', surahs: [1] }),
      reciter({ id: 5, name: 'العيون الكوشي', mode: 'surah', surahs: [1, 2] }),
      reciter({ id: 6, name: 'عبد الباسط', mode: 'surah', riwayahId: 10 }),
      reciter({ id: 7, name: 'الحصري', mode: 'surah', timingUrl: 'https://t', surahs: [1, 2] }),
      reciter({ id: 8, name: 'الحصري', mode: 'surah', surahs: [1, 2] }),
    ], 2);
    expect(list.map((r) => r.id)).toEqual([7, 5, 2, 1]);
  });

  test('whole surahs default to Al-Husary, in an edition the page can follow', () => {
    const list = [reciter({ id: 1, name: 'أحمد', mode: 'surah' }), reciter({ id: 2, name: 'محمود خليل الحصري', mode: 'surah' }),
      reciter({ id: 3, name: 'محمود خليل الحصري', style: 'mujawwad', mode: 'surah', timingUrl: 'https://t' })];
    expect(chooseReciter(list, 2, undefined, 'surah').id).toBe(3);
    expect(chooseReciter(list, 2, 1, 'surah').id).toBe(1);
    expect(chooseReciter([list[0], list[1]], 2, undefined, 'surah').id).toBe(2);
    expect(chooseReciter([reciter({ id: 7, mode: 'surah' }), reciter({ id: 8, mode: 'surah', timingUrl: 'https://t' })], 2, undefined, 'surah').id).toBe(8);
  });

  test('the chosen reciter, else the riwayah default, else the first one', () => {
    const list = [reciter({ id: 5 }), reciter({ id: 261 }), reciter({ id: 9 })];
    expect(chooseReciter(list, 2, 9).id).toBe(9);
    expect(chooseReciter(list, 2, 404).id).toBe(261);
    expect(chooseReciter(list, 10).id).toBe(5);
    expect(chooseReciter([], 2)).toBeNull();
  });

  test('offline, downloaded reciters are used; with none, the failure is reported', async () => {
    listFails = true;
    downloaded = [reciter({ id: 77 })];
    expect((await resolveReciter(2)).id).toBe(77);
    downloaded = [];
    await expect(resolveReciter(2)).rejects.toThrow('offline');
    listFails = false;
    reciterList = [reciter({ id: 261 }), reciter({ id: 3, name: 'آخر' })];
    expect((await resolveReciter(2, 3)).id).toBe(3);
    expect(await resolveReciter(99)).toBeNull();
    // Whole surahs are chosen from the surah editions only.
    reciterList = [reciter({ id: 261 }), reciter({ id: 40, name: 'آخر', mode: 'surah' })];
    expect((await resolveReciter(2, 261, 'surah')).id).toBe(40);
    downloaded = [];
  });
});

describe('audio sources', () => {
  test('file names and the basmala', () => {
    expect(ayahFileName(2, 255)).toBe('002255.mp3');
    expect(ayahFileName(1, 0)).toBe('001000.mp3');
    expect(surahFileName(114)).toBe('114.mp3');
    expect(needsBasmala(9, false)).toBe(false);
    expect(needsBasmala(1, false)).toBe(true);
    expect(needsBasmala(1, true)).toBe(false);
    expect(needsBasmala(2, true)).toBe(true);
    expect(fatihaCountsBasmala({ surahs: [{ ayahs: [{ hafsAyahNumbers: [1, 2] }] }] })).toBe(false);
    expect(fatihaCountsBasmala({ surahs: [{ ayahs: [{ hafsAyahNumbers: [1] }] }] })).toBe(true);
  });

  test('ayah files are played whole; surah files by their timings', () => {
    const byAyah = reciter({ mode: 'ayah' });
    expect(segmentFor(byAyah, 2, 5, null)).toEqual({ file: '002005.mp3' });
    expect(segmentFor(byAyah, 3, 1, null)).toBeNull();
    const bySurah = reciter({ mode: 'surah', timingUrl: 'https://t' });
    const timing = { 2: [{ ayah: 1, start: 6000, end: 9000 }, { ayah: 2, start: 9000, end: 15000 }], 9: [{ ayah: 1, start: 120, end: 4000 }] };
    expect(segmentFor(bySurah, 2, 0, timing)).toEqual({ file: '002.mp3', start: 0, end: 6000 });
    expect(segmentFor(bySurah, 2, 2, timing)).toEqual({ file: '002.mp3', start: 9000, end: 15000 });
    // No basmala recorded before ayah 1: the ayah starts with the file.
    expect(segmentFor(bySurah, 9, 0, timing)).toBeNull();
    expect(segmentFor(bySurah, 9, 1, timing)).toEqual({ file: '009.mp3', start: 0, end: 4000 });
    expect(segmentFor(bySurah, 2, 7, timing)).toBeNull();
    expect(segmentFor(bySurah, 1, 1, timing)).toBeNull();
  });

  test('in a whole surah: where an ayah starts, and the ayah heard at a moment', () => {
    const list = [{ ayah: 1, start: 6000, end: 9000 }, { ayah: 2, start: 9000, end: 15000 }, { ayah: 3, start: 15000, end: 20000 }];
    expect(surahStartFor(list, 1)).toBe(0);
    expect(surahStartFor(list, 3)).toBe(15000);
    expect(surahStartFor(list, 9)).toBe(0);
    expect(surahStartFor(undefined, 3)).toBe(0);
    expect(ayahAtTime(list, 2000)).toBe(0);
    expect(ayahAtTime(list, 5950)).toBe(1);
    expect(ayahAtTime(list, 14000)).toBe(2);
    expect(ayahAtTime(list, 25000)).toBe(3);
    expect(ayahAtTime([{ ayah: 1, start: 100, end: 900 }], 0)).toBe(1);
    expect(ayahAtTime(undefined, 1000)).toBeNull();
  });

  test('timing archives are read and invalid entries dropped', () => {
    const bytes = zipSync({ '35.json': strToU8(JSON.stringify({ 2: [{ ayah: 2, start: 9000, end: 15000 }, { ayah: 1, start: 6000, end: 9000 }, { ayah: 3, start: 5, end: 1 }], 200: [{ ayah: 1, start: 0, end: 1 }] })) });
    expect(timingsFromZip(bytes)).toEqual({ 2: [{ ayah: 1, start: 6000, end: 9000 }, { ayah: 2, start: 9000, end: 15000 }] });
    expect(parseTimings(null)).toEqual({});
    expect(() => timingsFromZip(zipSync({ 'readme.txt': strToU8('') }))).toThrow();
  });
});

describe('listening order', () => {
  const ayahs = [
    { surahNumber: 1, ayahNumber: 1, pageNumber: 1 }, { surahNumber: 1, ayahNumber: 2, pageNumber: 1 },
    { surahNumber: 2, ayahNumber: 1, pageNumber: 2 }, { surahNumber: 2, ayahNumber: 2, pageNumber: 2 },
    { surahNumber: 9, ayahNumber: 1, pageNumber: 3 },
  ];
  const plan = (repeat, end = ayahs.length - 1) => ({ end, repeat, basmalaBefore: (surah) => surah !== 9 });

  test('the basmala opens a surah, each ayah repeats, then the next follows', () => {
    const p = plan(2);
    let at = startAt(ayahs, 0, p);
    const heard = [];
    while (at) { heard.push(`${at.index}${at.basmala ? 'b' : ''}:${at.heard}`); at = afterFinished(ayahs, at, p); }
    expect(heard).toEqual(['0b:0', '0:0', '0:1', '1:0', '1:1', '2b:0', '2:0', '2:1', '3:0', '3:1', '4:0', '4:1']);
  });

  test('a stretch ends at its last ayah; endless repetition never moves on', () => {
    let at = startAt(ayahs, 3, plan(1, 3));
    expect(at).toEqual({ index: 3, basmala: false, heard: 0 });
    expect(afterFinished(ayahs, at, plan(1, 3))).toBeNull();
    at = { index: 1, basmala: false, heard: 41 };
    expect(afterFinished(ayahs, at, plan(0))).toEqual({ index: 1, basmala: false, heard: 42 });
    expect(startAt(ayahs, 4, plan(1)).basmala).toBe(false);
  });

  test('skipping goes straight to the ayah within the stretch', () => {
    expect(skipTo(ayahs, 2, plan(3))).toEqual({ index: 2, basmala: false, heard: 0 });
    expect(skipTo(ayahs, -1, plan(3))).toBeNull();
    expect(skipTo(ayahs, 4, plan(3, 3))).toBeNull();
  });
});

describe('player', () => {
  const quran = {
    id: 4,
    surahs: [
      { number: 1, name: 'سورة الفاتحة', ayahs: [{ surahNumber: 1, ayahNumber: 1, pageNumber: 1, hafsAyahNumbers: [1, 2] }, { surahNumber: 1, ayahNumber: 2, pageNumber: 1, hafsAyahNumbers: [3] }] },
      { number: 2, name: 'سورة البقرة', ayahs: [1, 2, 3].map((n) => ({ surahNumber: 2, ayahNumber: n, pageNumber: 2, hafsAyahNumbers: [n] })) },
    ],
  };
  const status = (overrides = {}) => player.listener({ isLoaded: true, playing: true, currentTime: 0, didJustFinish: false, error: null, ...overrides });
  const where = () => { const s = recitation.recitationState(); return s.current ? `${s.current.surahNumber}:${s.current.ayahNumber}${s.basmala ? 'b' : ''}#${s.heard}` : s.status; };
  // Starting over pauses whatever played before; only the new recitation's calls matter here.
  const calls = () => player.calls.filter((call) => call !== 'pause');
  beforeEach(() => { recitation.stop(); player.calls = []; missing.clear(); });

  test('ayah files: basmala, repetitions, next ayah; stale statuses after a new file are ignored', async () => {
    await recitation.playFrom({ quran, reciter: async () => reciter({ id: 261 }), from: { surahNumber: 1, ayahNumber: 1 }, repeat: 2 });
    expect(calls()).toEqual(['replace 001000.mp3', 'play']);
    expect(recitation.recitationState()).toMatchObject({ status: 'loading', reciter: { id: 261 }, mushafId: 4 });
    status({ isLoaded: false });
    status({ currentTime: 0.5 });
    expect(recitation.recitationState().status).toBe('playing');
    expect(where()).toBe('1:1b#0');
    status({ didJustFinish: true, playing: false, currentTime: 5 });
    expect(where()).toBe('1:1#0');
    // The previous file's last status arrives after the switch.
    status({ didJustFinish: true, playing: false, currentTime: 5 });
    expect(where()).toBe('1:1#0');
    status({ isLoaded: false });
    status({ didJustFinish: true, playing: false, currentTime: 4 });
    expect(where()).toBe('1:1#1');
    expect(calls().slice(2)).toEqual(['replace 001001.mp3', 'play', 'seek 0', 'play']);
    status({ currentTime: 0.1 });
    status({ didJustFinish: true, playing: false, currentTime: 4 });
    expect(where()).toBe('1:2#0');
    recitation.step(1);
    expect(where()).toBe('2:1#0');
    recitation.step(-1);
    expect(where()).toBe('1:2#0');
  });

  test('ayahs the reciter lacks are skipped, and the stretch ends at its last ayah', async () => {
    missing.add('002000.mp3');
    missing.add('002002.mp3');
    await recitation.playFrom({ quran, reciter: reciter(), from: { surahNumber: 1, ayahNumber: 2 }, to: { surahNumber: 2, ayahNumber: 3 }, repeat: 1 });
    status({ isLoaded: false });
    status({ didJustFinish: true, playing: false });
    expect(where()).toBe('2:1#0');
    status({ isLoaded: false });
    status({ didJustFinish: true, playing: false });
    expect(where()).toBe('2:3#0');
    status({ isLoaded: false });
    status({ didJustFinish: true, playing: false });
    expect(recitation.recitationState().status).toBe('idle');
  });

  test('surah files: seek to the ayah, play on through the next, repeat by seeking back', async () => {
    timings = { 2: [{ ayah: 1, start: 6000, end: 9000 }, { ayah: 2, start: 9000, end: 15000 }, { ayah: 3, start: 15000, end: 20000 }] };
    const bySurah = reciter({ id: 8, mode: 'surah', timingUrl: 'https://audio.test/t.zip' });
    await recitation.playFrom({ quran, reciter: bySurah, from: { surahNumber: 2, ayahNumber: 2 }, to: { surahNumber: 2, ayahNumber: 3 }, repeat: 1 });
    expect(calls()).toEqual(['replace 002.mp3', 'play']);
    status({ isLoaded: false });
    status({ currentTime: 0 });
    expect(player.calls.at(-1)).toBe('seek 9000');
    status({ currentTime: 0.1 }); // before the seek lands
    status({ currentTime: 9.05 });
    status({ currentTime: 14.97 });
    expect(where()).toBe('2:3#0');
    expect(player.calls.at(-1)).toBe('seek 9000'); // no seek between consecutive ayahs
    recitation.setRepeat(2);
    status({ currentTime: 19.97 });
    expect(where()).toBe('2:3#1');
    expect(player.calls.at(-1)).toBe('play');
    expect(player.calls.at(-2)).toBe('seek 15000');
    // The file ends while it is sent back; that is not the end of the repetition.
    status({ didJustFinish: true, playing: false, currentTime: 20 });
    expect(where()).toBe('2:3#1');
    status({ currentTime: 15.1 });
    status({ currentTime: 19.97 });
    expect(recitation.recitationState().status).toBe('idle');
  });

  test('whole surahs without timings: from the top, then the next surah; the bar moves by surah', async () => {
    timings = {};
    const bySurah = reciter({ id: 50, mode: 'surah', surahs: [1, 2] });
    await recitation.playSurah({ quran, reciter: async () => bySurah, from: { surahNumber: 1, ayahNumber: 2 }, repeat: 1 });
    expect(calls()).toEqual(['replace 001.mp3', 'play']);
    expect(recitation.recitationState()).toMatchObject({ kind: 'surah', status: 'loading', surah: 1, current: null, reciter: { id: 50 } });
    status({ isLoaded: false });
    status({ currentTime: 3, duration: 60 });
    expect(recitation.recitationState().status).toBe('playing');
    status({ didJustFinish: true, playing: false, currentTime: 60, duration: 60 });
    expect(recitation.recitationState()).toMatchObject({ surah: 2, heard: 0 });
    expect(calls().slice(2)).toEqual(['replace 002.mp3', 'play']);
    recitation.step(-1);
    expect(recitation.recitationState().surah).toBe(1);
    recitation.step(-1);
    expect(recitation.recitationState().surah).toBe(1);
    recitation.step(1);
    status({ isLoaded: false });
    status({ didJustFinish: true, playing: false, currentTime: 60, duration: 60 });
    // No surah after the last one this reciter recorded.
    expect(recitation.recitationState().status).toBe('idle');
  });

  test('whole surahs with timings: start at the ayah, follow the ayahs, repeat the surah, seek', async () => {
    timings = { 2: [{ ayah: 1, start: 6000, end: 9000 }, { ayah: 2, start: 9000, end: 15000 }, { ayah: 3, start: 15000, end: 20000 }] };
    const bySurah = reciter({ id: 51, mode: 'surah', timingUrl: 'https://audio.test/t.zip', surahs: [2] });
    await recitation.playSurah({ quran, reciter: bySurah, from: { surahNumber: 2, ayahNumber: 2 }, repeat: 2 });
    expect(calls()).toEqual(['replace 002.mp3', 'play']);
    expect(where()).toBe('2:2#0');
    status({ isLoaded: false });
    status({ currentTime: 0 });
    expect(player.calls.at(-1)).toBe('seek 9000');
    status({ currentTime: 0.2 }); // before the seek lands
    expect(where()).toBe('2:2#0');
    status({ currentTime: 9.1, duration: 21 });
    status({ currentTime: 15.2, duration: 21 });
    expect(where()).toBe('2:3#0');
    // The ayah-by-ayah repetition is not this recitation's.
    recitation.setRepeat(5, 'ayah');
    expect(recitation.recitationState().repeat).toBe(2);
    status({ didJustFinish: true, playing: false, currentTime: 21, duration: 21 });
    expect(recitation.recitationState()).toMatchObject({ surah: 2, heard: 1 });
    expect(where()).toBe('2:1b#1');
    expect(player.calls.slice(-2)).toEqual(['seek 0', 'play']);
    status({ currentTime: 0.3, duration: 21 });
    recitation.seekTo(16000);
    expect(where()).toBe('2:3#1');
    expect(player.calls.at(-1)).toBe('seek 16000');
    status({ currentTime: 16.1, duration: 21 });
    status({ didJustFinish: true, playing: false, currentTime: 21, duration: 21 });
    expect(recitation.recitationState().status).toBe('idle');
  });

  test('whole surahs: no surah recording for the riwayah is reported', async () => {
    await recitation.playSurah({ quran, reciter: async () => null, from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState()).toMatchObject({ status: 'idle', error: expect.any(String) });
    await recitation.playSurah({ quran, reciter: reciter({ mode: 'surah', surahs: [9] }), from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState()).toMatchObject({ status: 'idle', error: expect.any(String) });
  });

  test('a missing reciter or a failed lookup is reported in the player', async () => {
    await recitation.playFrom({ quran, reciter: async () => null, from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState()).toMatchObject({ status: 'idle', error: expect.any(String) });
    recitation.dismissError();
    expect(recitation.recitationState().error).toBeNull();
    await recitation.playFrom({ quran, reciter: async () => { throw new Error('offline'); }, from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState()).toMatchObject({ status: 'idle', error: expect.any(String) });
  });

  test('stopping while the reciter is looked up wins', async () => {
    let release;
    const pending = recitation.playFrom({ quran, reciter: () => new Promise((resolve) => { release = resolve; }), from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState().status).toBe('loading');
    recitation.stop();
    release(reciter());
    await pending;
    expect(recitation.recitationState().status).toBe('idle');
    expect(player.calls).not.toContain('replace 001000.mp3');
  });
});

describe('reciter samples', () => {
  test('the opening of Al-Fatiha, or of the first surah recorded', async () => {
    const { sampleFiles } = await import('../src/features/recitation/sample');
    const count = (surah) => ({ 1: 7, 85: 22, 108: 3 })[surah] ?? 0;
    expect(sampleFiles(reciter({ surahs: [1, 2] }), count)).toEqual(['001001.mp3', '001002.mp3', '001003.mp3', '001004.mp3']);
    expect(sampleFiles(reciter({ surahs: [108, 109] }), count)).toEqual(['108001.mp3', '108002.mp3', '108003.mp3']);
    expect(sampleFiles(reciter({ mode: 'surah', surahs: [85, 86] }), count)).toEqual(['085.mp3']);
    expect(sampleFiles(reciter({ surahs: [] }), count)).toEqual([]);
  });

  test('a sample stops the recitation, plays its files in turn, and reports a failure', async () => {
    const sample = await import('../src/features/recitation/sample');
    const quran = { id: 4, surahs: [{ number: 1, name: 'سورة الفاتحة', ayahs: [{ surahNumber: 1, ayahNumber: 1, pageNumber: 1, hafsAyahNumbers: [1] }] }] };
    await recitation.playFrom({ quran, reciter: reciter({ id: 261 }), from: { surahNumber: 1, ayahNumber: 1 }, repeat: 1 });
    expect(recitation.recitationState().status).not.toBe('idle');
    const voice = reciter({ id: 70, server: 'https://audio.test/r70' });
    await sample.playSample(voice, ['001001.mp3', '001002.mp3']);
    expect(recitation.recitationState().status).toBe('idle');
    expect(sample.sampleState()).toEqual({ reciter: 70, loading: true, failed: null });
    const own = samplePlayers.at(-1);
    const status = (overrides = {}) => own.listener({ isLoaded: true, playing: true, currentTime: 0, didJustFinish: false, error: null, ...overrides });
    expect(own.calls).toEqual(['replace 001001.mp3', 'play']);
    status({ isLoaded: false });
    status({ currentTime: 0.2 });
    expect(sample.sampleState().loading).toBe(false);
    status({ didJustFinish: true, playing: false });
    expect(own.calls.slice(-2)).toEqual(['replace 001002.mp3', 'play']);
    status({ isLoaded: false });
    status({ error: 'gone' });
    expect(sample.sampleState()).toEqual({ reciter: null, loading: false, failed: 70 });
    sample.stopSample();
    await sample.playSample(voice, []);
    expect(own.calls.at(-1)).toBe('pause');
  });
});
