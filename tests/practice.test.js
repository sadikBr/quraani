import { describe, expect, test } from 'bun:test';
import { ayahOf, candidates, choosePlaces, cueFor, endFor, placeFor, placesAt, seededRandom, tally } from '../src/features/practice/engine';
import { applyPractice, decodePractice, defaultPracticeState, placesToReview, placeWeight, riwayahPractice } from '../src/features/practice/progress';

// Short surahs with the kinds of repetition the Quran has: shared openings (الم, يا أيها الذين آمنوا),
// a refrain repeated word for word, and an ayah that is the start of the next one.
const surahs = [
  ['الم', 'ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ', 'ٱلَّذِينَ يُؤۡمِنُونَ بِٱلۡغَيۡبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ'],
  ['الم', 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُ', 'نَزَّلَ عَلَيۡكَ ٱلۡكِتَٰبَ بِٱلۡحَقِّ مُصَدِّقٗا'],
  ['ٱلرَّحۡمَٰنُ', 'عَلَّمَ ٱلۡقُرۡءَانَ', 'خَلَقَ ٱلۡإِنسَٰنَ عَلَّمَهُ ٱلۡبَيَانَ', 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ', 'ٱلشَّمۡسُ وَٱلۡقَمَرُ بِحُسۡبَانٖ',
    'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ', 'وَٱلنَّجۡمُ وَٱلشَّجَرُ يَسۡجُدَانِ', 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ'],
  ['يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱتَّقُواْ ٱللَّهَ', 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ ٱتَّقُواْ ٱللَّهَ وَقُولُواْ قَوۡلٗا سَدِيدٗا',
    'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ لَا تُقَدِّمُواْ بَيۡنَ يَدَيِ ٱللَّهِ', 'وَٱتَّقُواْ ٱللَّهَ إِنَّ ٱللَّهَ سَمِيعٌ عَلِيمٞ'],
];
const source = { ayahs: surahs.flatMap((ayahs, s) => ayahs.map((text, a) => ({ surahNumber: s + 1, ayahNumber: a + 1, pageNumber: s + 1, text }))) };
const at = (surah, ayah) => ayahOf(source, `${surah}:${ayah}`);
const all = [{ start: 0, end: source.ayahs.length }];

describe('practice cues', () => {
  test('three words when they point to one place, more when the opening is shared', () => {
    expect(cueFor(source, at(1, 2), 'complete')).toEqual({ shown: 3, context: 0, surah: false });
    // «يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُواْ» opens three ayahs: the cue runs until it is unique.
    expect(cueFor(source, at(4, 3), 'complete')).toEqual({ shown: 4, context: 0, surah: false });
    expect(cueFor(source, at(4, 2), 'complete')).toEqual({ shown: 6, context: 0, surah: false });
  });

  test('a repeated ayah is shown after the one before it; a shared opening names the place', () => {
    expect(cueFor(source, at(3, 6), 'complete')).toEqual({ shown: 3, context: 1, surah: false });
    expect(cueFor(source, at(3, 6), 'next')).toEqual({ shown: 4, context: 1, surah: false });
    expect(cueFor(source, at(3, 5), 'next')).toEqual({ shown: 3, context: 0, surah: false });
    expect(cueFor(source, at(1, 1), 'complete')).toEqual({ shown: 1, context: 0, surah: true });
    // The first ayah is also the start of the second, and nothing comes before it in its surah.
    expect(cueFor(source, at(4, 1), 'complete')).toEqual({ shown: 3, context: 0, surah: true });
    expect(cueFor(source, at(1, 1), 'next')).toEqual({ shown: 1, context: 0, surah: true });
  });

  test('the recitation reaches the chosen length, at least a few words, inside the scope', () => {
    // «خلق الإنسان علمه البيان»: three words shown leave one, so the next ayah joins.
    const mushaf = all[0];
    expect(endFor(source, at(3, 3), 3, 'ayah', mushaf)).toBe(at(3, 5));
    expect(endFor(source, at(1, 2), 3, 'ayah', mushaf)).toBe(at(1, 3));
    // Three ayahs after the shown one; to the end of its page.
    expect(endFor(source, at(3, 2), 2, 'ayahs', mushaf)).toBe(at(3, 6));
    expect(endFor(source, at(3, 2), 2, 'page', mushaf)).toBe(at(4, 1));
    expect(endFor(source, at(3, 8), 4, 'ayah', mushaf)).toBe(at(4, 2));
    // Nothing follows the last ayah of a span when it is shown whole.
    expect(endFor(source, at(3, 8), 4, 'ayah', { start: at(3, 1), end: at(4, 1) })).toBeNull();
    expect(placeFor(source, at(3, 2), { cue: 'next', reach: 'ayah' }, all)).toEqual({ key: '3:2', ayah: at(3, 2), shown: 2, context: 0, surah: false, end: at(3, 4) });
  });

  test('candidates leave out what cannot open a place', () => {
    const span = [{ start: at(3, 1), end: at(3, 4) }];
    expect(candidates(source, span, 'next')).toEqual([at(3, 1), at(3, 2)]);
    expect(candidates(source, span, 'complete')).toEqual([at(3, 1), at(3, 2)]);
    expect(candidates(source, [{ start: at(4, 2), end: at(4, 3) }], 'complete')).toEqual([at(4, 2)]);
  });
});

describe('choosing places', () => {
  // 100 different ayahs of seven words, ten to a page.
  const long = { ayahs: Array.from({ length: 100 }, (_, i) => ({ surahNumber: 1 + Math.floor(i / 50), ayahNumber: (i % 50) + 1, pageNumber: 1 + Math.floor(i / 10),
    text: `كلمة${i} ثانية${i} ثالثة${i} رابعة${i} خامسة${i} سادسة${i} سابعة${i}` })) };
  const options = { cue: 'complete', reach: 'ayah', count: 5 };

  test('one place from each part of the scope, in shuffled order', () => {
    const places = choosePlaces(long, [{ start: 0, end: 100 }], options, () => 1, seededRandom(7));
    expect(places).toHaveLength(5);
    expect(places.map((p) => Math.floor(p.ayah / 20)).sort()).toEqual([0, 1, 2, 3, 4]);
    expect(choosePlaces(long, [{ start: 0, end: 100 }], options, () => 1, seededRandom(7))).toEqual(places);
    for (const p of places) expect(p.end).toBe(p.ayah + 1);
  });

  test('missed places are favoured and places never overlap', () => {
    const missed = new Set([3, 27, 45, 61, 98]);
    const places = choosePlaces(long, [{ start: 0, end: 100 }], options, (i) => missed.has(i) ? 1000 : 0.001, seededRandom(1));
    expect(places.map((p) => p.ayah).sort((a, b) => a - b)).toEqual([3, 27, 45, 61, 98]);
    const many = choosePlaces(long, [{ start: 0, end: 12 }], { ...options, reach: 'ayahs', count: 20 }, () => 1, seededRandom(3));
    const sorted = [...many].sort((a, b) => a.ayah - b.ayah);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].ayah).toBeGreaterThanOrEqual(sorted[i - 1].end);
    expect(many.length).toBeGreaterThan(1);
  });

  test('a small scope gives fewer places; places to review keep their ayahs', () => {
    expect(choosePlaces(long, [{ start: 10, end: 12 }], options, () => 1, seededRandom(2))).toHaveLength(2);
    expect(choosePlaces(long, [], options)).toEqual([]);
    expect(placesAt(source, [at(3, 6), -1], { cue: 'complete', reach: 'ayah' }).map((p) => p.key)).toEqual(['3:6']);
    // A place inside the text of an earlier one is left out.
    expect(placesAt(source, [at(3, 2), at(3, 3), at(3, 7)], { cue: 'next', reach: 'ayahs' }).map((p) => p.key)).toEqual(['3:2', '3:7']);
    expect(tally(['good', 'wrong', null, 'hesitant', 'good'])).toEqual({ good: 2, hesitant: 1, wrong: 1, graded: 4 });
  });
});

describe('practice records', () => {
  const day = '2026-10-11';
  const grade = (state, key, g, previous = null) => applyPractice(state, { type: 'grade', riwayah: 'warsh', key, grade: g, previous, date: day });

  test('grades count per place; a changed grade replaces the earlier one of the session', () => {
    let state = applyPractice(defaultPracticeState, { type: 'begin', riwayah: 'warsh' });
    state = grade(state, '2:255', 'wrong');
    state = grade(state, '2:255', 'hesitant', 'wrong');
    expect(riwayahPractice(state, 'warsh').places['2:255']).toEqual({ seen: 1, wrong: 0, hesitant: 1, last: 'hesitant', session: 1, date: day });
    state = applyPractice(state, { type: 'begin', riwayah: 'warsh' });
    state = grade(state, '2:255', 'good');
    expect(riwayahPractice(state, 'warsh').places['2:255']).toEqual({ seen: 2, wrong: 0, hesitant: 1, last: 'good', session: 2, date: day });
    expect(riwayahPractice(state, 'hafs').sessions).toBe(0);
  });

  test('places to review: missed first, then hesitant, newest first', () => {
    let state = applyPractice(defaultPracticeState, { type: 'begin', riwayah: 'warsh' });
    state = grade(grade(grade(state, '1:2', 'hesitant'), '1:3', 'wrong'), '1:4', 'good');
    state = applyPractice(state, { type: 'begin', riwayah: 'warsh' });
    state = grade(state, '1:5', 'hesitant');
    expect(placesToReview(riwayahPractice(state, 'warsh')).map((p) => p.key)).toEqual(['1:3', '1:5', '1:2']);
    const practice = riwayahPractice(state, 'warsh');
    expect(placeWeight(practice.places['1:3'], 2)).toBe(4);
    expect(placeWeight(practice.places['1:4'], 2)).toBeLessThan(1);
    expect(placeWeight(practice.places['1:4'], 5)).toBe(1);
    expect(placeWeight(undefined, 2)).toBe(1);
  });

  test('saved data keeps what is valid', () => {
    expect(decodePractice(null)).toEqual(defaultPracticeState);
    expect(decodePractice('nope')).toEqual(defaultPracticeState);
    const decoded = decodePractice(JSON.stringify({
      version: 1, settings: { scope: 'custom', cue: 'next', reach: 'far', count: 7 },
      riwayat: {
        warsh: { sessions: 3, total: 6214, custom: [{ start: 0, end: 7 }, { start: 9, end: 3 }, { start: 6000, end: 7000 }],
          places: { '2:255': { seen: 2, wrong: 1, hesitant: 0, last: 'wrong', session: 3, date: day }, bad: { seen: 1 }, '1:1': { seen: 1, wrong: 3, hesitant: 0, last: 'good', session: 1, date: day } } },
        __proto__: { sessions: 1 }, other: {},
      },
    }));
    expect(decoded.settings).toEqual({ scope: 'custom', cue: 'next', reach: 'ayah', count: 10 });
    expect(Object.keys(decoded.riwayat)).toEqual(['warsh']);
    expect(decoded.riwayat.warsh.custom).toEqual([{ start: 0, end: 7 }]);
    expect(Object.keys(decoded.riwayat.warsh.places)).toEqual(['2:255']);
  });
});
