import { describe, expect, test } from 'bun:test';
import sample from './fixtures/quranpedia/warsh-tajweed-sample.json';
import { alike, ayahsToCompare, checkRecitation, normalizeWord } from '../src/features/recite-check/compare';

const surah = (n) => sample.surahs.find((s) => s.id === n).ayahs.map((a) => ({ surahNumber: n, ayahNumber: a.number, text: a.text }));
const fatiha = surah(1);
const nas = surah(114);
/** Each word in order: «.» recited, «W» said differently, «M» left out. */
const marks = (check) => check.words.map((w) => w.status === 'ok' ? '.' : w.status === 'wrong' ? 'W' : 'M').join('');

// What the model writes for a correct recitation of An-Nas, in plain spelling.
const NAS = 'قل أعوذ برب الناس ملك الناس إله الناس من شر الوسواس الخناس الذي يوسوس في صدور الناس من الجنة والناس';

describe('words of the Warsh mushaf against plain spelling', () => {
  test('marks, hamza and alef forms, and Uthmani spellings come to the same letters', () => {
    expect(normalizeWord('اِ۬لْحَمْدُ')).toBe(normalizeWord('الحمد'));
    expect(normalizeWord('اِ۬لْعَٰلَمِينَ')).toBe(normalizeWord('العالمين'));
    expect(normalizeWord('اَ۬لصِّرَٰطَ')).toBe(normalizeWord('الصراط'));
    expect(normalizeWord('اِ۬لذِے')).toBe(normalizeWord('الذي'));
    expect(normalizeWord('اَ۬لضَّآلِّينَۖ')).toBe(normalizeWord('الضالين'));
    // Warsh drops the hamza where Hafs writes it.
    expect(normalizeWord('يُومِنُونَ')).toBe(normalizeWord('يُؤْمِنُونَ'));
  });

  test('a spelling difference is the same word; a changed word is not', () => {
    expect(alike(normalizeWord('ٱلصَّلَوٰةَ'), normalizeWord('الصلاة'))).toBe(true);
    expect(alike(normalizeWord('ذَٰلِكَ'), normalizeWord('ذلك'))).toBe(true);
    expect(alike(normalizeWord('عَلَىٰ'), normalizeWord('على'))).toBe(true);
    expect(alike(normalizeWord('قَالَ'), normalizeWord('قل'))).toBe(false);
    expect(alike(normalizeWord('مِن'), normalizeWord('ما'))).toBe(false);
    expect(alike(normalizeWord('فِي'), normalizeWord('فيه'))).toBe(false);
  });
});

describe('a recitation compared with the ayahs', () => {
  test('a correct recitation: every word recited, up to the last ayah', () => {
    const check = checkRecitation(nas, NAS);
    expect(marks(check)).toBe('.'.repeat(20));
    expect(check.counts).toEqual({ ok: 20, wrong: 0, missed: 0, extra: 0 });
    expect(check.reached).toBe(5);
  });

  test('with diacritics, as the model often writes', () => {
    const check = checkRecitation(fatiha, 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ الرَّحْمَنِ الرَّحِيمِ مَلِكِ يَوْمِ الدِّينِ');
    expect(marks(check)).toBe('.........');
    expect(check.reached).toBe(2);
  });

  test('stopping early: the words after it are not counted as left out', () => {
    const check = checkRecitation(nas, 'قل أعوذ برب الناس ملك الناس');
    expect(marks(check)).toBe('......');
    expect(check.reached).toBe(1);
  });

  test('a word left out, a word changed and a word added are each found where they are', () => {
    // Leaves out «الخناس», says «قال» for «قل», adds «الكريم» after «برب», and stops before the last ayah.
    const check = checkRecitation(nas, 'قال أعوذ برب الكريم الناس ملك الناس إله الناس من شر الوسواس الذي يوسوس في صدور الناس');
    expect(check.words.find((w) => w.status === 'wrong')).toMatchObject({ ayah: 0, word: 0, heard: 'قال' });
    expect(check.words.find((w) => w.status === 'missed')).toMatchObject({ ayah: 3, word: 3 });
    expect(check.extras).toEqual([{ after: { ayah: 0, word: 2 }, text: 'الكريم' }]);
    expect(check.counts).toEqual({ ok: 15, wrong: 1, missed: 1, extra: 1 });
  });

  test('a whole ayah left out, then the recitation goes on', () => {
    const check = checkRecitation(nas, 'قل أعوذ برب الناس إله الناس من شر الوسواس الخناس');
    expect(marks(check)).toBe('....MM......');
    expect(check.words.filter((w) => w.status === 'missed').every((w) => w.ayah === 1)).toBe(true);
  });

  test('the isti\'adha and basmala before, and «صدق الله العظيم» after, are not part of the comparison', () => {
    const check = checkRecitation(nas, `أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم ${NAS} صدق الله العظيم`);
    expect(check.counts).toEqual({ ok: 20, wrong: 0, missed: 0, extra: 0 });
  });

  test('a word the model splits in two still counts as recited', () => {
    const ayahs = [{ surahNumber: 2, ayahNumber: 20, text: 'يَٰٓأَيُّهَا اَ۬لنَّاسُ اُ۟عْبُدُواْ رَبَّكُمُ' }];
    expect(marks(checkRecitation(ayahs, 'يا أيها الناس اعبدوا ربكم'))).toBe('....');
  });

  test('nothing recognised: nothing recited', () => {
    expect(checkRecitation(nas, '')).toMatchObject({ words: [], extras: [], reached: -1 });
  });

  test('only enough ayahs are compared to cover what was heard', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ text: 'كلمة '.repeat(10).trim(), i }));
    expect(ayahsToCompare(many, 50).length).toBe(12);
    expect(ayahsToCompare(nas, 500)).toHaveLength(6);
  });
});

/** A stand-in for the phone's speech recognition service, driven by the test. */
function fakeService(services = ['com.google.android.tts', 'com.samsung.android.bixby.agent']) {
  const listeners = new Map();
  const service = {
    starts: [], stops: 0, aborts: 0,
    getSpeechRecognitionServices: () => services,
    addListener(event, listener) {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
      return { remove: () => set.delete(listener) };
    },
    start(options) { service.starts.push(options); },
    stop() { service.stops++; },
    abort() { service.aborts++; },
    emit(event, payload) { for (const listener of [...(listeners.get(event) ?? [])]) listener(payload); },
    listeners: () => [...listeners.values()].reduce((count, set) => count + set.size, 0),
  };
  return service;
}
const said = (transcript, isFinal = false) => ({ isFinal, results: [{ transcript, confidence: -1, segments: [] }] });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fast = { restart: 1, lastWords: 30 };

describe('listening with the phone\'s speech recognition', () => {
  const listen = async (service, platform = 'android') => {
    const { listenWith } = await import('../src/features/recite-check/listening-session');
    const seen = { text: '', ended: null };
    const session = listenWith(service, platform, { text: (text) => { seen.text = text; }, ended: (text, seconds, problem) => { seen.ended = { text, problem }; } }, fast);
    return { session, seen };
  };

  test('Arabic, continuous, with live words, through Google\'s service when the phone has it', async () => {
    const service = fakeService();
    await listen(service);
    expect(service.starts[0]).toMatchObject({ lang: 'ar-SA', continuous: true, interimResults: true, androidRecognitionServicePackage: 'com.google.android.tts' });
    const other = fakeService(['com.samsung.android.bixby.agent']);
    await listen(other);
    expect(other.starts[0].androidRecognitionServicePackage).toBeUndefined();
  });

  test('Android\'s segments add up; a segment not yet final is shown as it changes', async () => {
    const service = fakeService();
    const { seen } = await listen(service);
    service.emit('result', said('الحمد لله'));
    expect(seen.text).toBe('الحمد لله');
    service.emit('result', said('الحمد لله رب العالمين', true));
    service.emit('result', said('الرحمن'));
    expect(seen.text).toBe('الحمد لله رب العالمين الرحمن');
    service.emit('result', said('الرحمن الرحيم'));
    expect(seen.text).toBe('الحمد لله رب العالمين الرحمن الرحيم');
  });

  test('a session the service ends after a pause: listening goes on, keeping what was heard', async () => {
    const service = fakeService();
    const { session, seen } = await listen(service);
    service.emit('result', said('الحمد لله رب العالمين'));
    service.emit('end');
    await wait(5);
    expect(service.starts).toHaveLength(2);
    service.emit('result', said('الرحمن الرحيم', true));
    expect(seen.text).toBe('الحمد لله رب العالمين الرحمن الرحيم');
    // Stopping waits for the service's last words.
    const stopped = session.stop();
    expect(service.stops).toBe(1);
    service.emit('result', said('مالك يوم الدين', true));
    service.emit('end');
    expect((await stopped).text).toBe('الحمد لله رب العالمين الرحمن الرحيم مالك يوم الدين');
    expect(service.listeners()).toBe(0);
    expect(seen.ended).toBeNull();
  });

  test('stopping when the service gives nothing more still ends', async () => {
    const service = fakeService();
    const { session } = await listen(service);
    service.emit('result', said('قل هو الله أحد'));
    expect((await session.stop()).text).toBe('قل هو الله أحد');
    expect(service.aborts).toBe(1);
  });

  test('a problem stops listening and says which', async () => {
    const service = fakeService();
    const { seen } = await listen(service);
    service.emit('result', said('قل أعوذ'));
    service.emit('error', { error: 'network', message: '' });
    service.emit('end');
    await wait(5);
    expect(service.starts).toHaveLength(1);
    expect(seen.ended).toEqual({ text: 'قل أعوذ', problem: 'network' });
  });

  test('a long silence ends listening with what was heard', async () => {
    const service = fakeService();
    const { seen } = await listen(service);
    service.emit('result', said('والعصر', true));
    for (let i = 0; i < 7 && !seen.ended; i++) { service.emit('error', { error: 'no-speech', message: '' }); service.emit('end'); await wait(5); }
    expect(seen.ended).toEqual({ text: 'والعصر', problem: undefined });
  });

  test('on iOS a session gives its whole text each time; the sessions add up', async () => {
    const service = fakeService();
    service.getSpeechRecognitionServices = () => { throw new Error('Android only'); };
    const { seen } = await listen(service, 'ios');
    expect(service.starts[0].androidRecognitionServicePackage).toBeUndefined();
    service.emit('result', said('بسم'));
    service.emit('result', said('بسم الله'));
    service.emit('end');
    await wait(5);
    service.emit('result', said('الرحمن الرحيم'));
    expect(seen.text).toBe('بسم الله الرحمن الرحيم');
  });

  test('leaving the screen stops at once', async () => {
    const service = fakeService();
    const { session, seen } = await listen(service);
    session.cancel();
    expect(service.aborts).toBe(1);
    expect(service.listeners()).toBe(0);
    service.emit('end');
    await wait(5);
    expect(service.starts).toHaveLength(1);
    expect(seen.ended).toBeNull();
  });
});
