import { describe, expect, test } from 'bun:test';
import { ayahOf, candidates, chooseExam, choosePlaces, cueFor, endFor, examScore, placeFor, placesAt, reshuffled, seededRandom, startFor, surahChoices, surahQuestionFits, surahsOf, tally } from '../src/features/practice/engine';
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
    expect(placeFor(source, at(3, 2), { cue: 'next', reach: 'ayah' }, all)).toEqual({ key: '3:2', kind: 'next', ayah: at(3, 2), shown: 2, context: 0, surah: false, end: at(3, 4) });
  });

  test('candidates leave out what cannot open a place', () => {
    const span = [{ start: at(3, 1), end: at(3, 4) }];
    expect(candidates(source, span, 'next')).toEqual([at(3, 1), at(3, 2)]);
    expect(candidates(source, span, 'complete')).toEqual([at(3, 1), at(3, 2)]);
    expect(candidates(source, [{ start: at(4, 2), end: at(4, 3) }], 'complete')).toEqual([at(4, 2)]);
  });
});

describe('what comes before («ما قبلها»)', () => {
  test('the whole ayah is shown; a repeated one with the ayahs after it, else the place is named', () => {
    expect(cueFor(source, at(1, 3), 'previous')).toEqual({ shown: 5, context: 0, surah: false });
    // The refrain: what follows it tells it apart, not what precedes it (that is the answer).
    expect(cueFor(source, at(3, 6), 'previous')).toEqual({ shown: 4, context: 1, surah: false });
    // The last refrain ends its surah: nothing after it to tell it apart.
    expect(cueFor(source, at(3, 8), 'previous')).toEqual({ shown: 4, context: 0, surah: true });
  });

  test('the recitation starts one ayah back, three, or at the start of the page, inside the surah', () => {
    const mushaf = all[0];
    expect(startFor(source, at(1, 3), 'ayah', mushaf)).toBe(at(1, 2));
    // «علم القرآن» alone is too short: the ayah before it joins, but not across the surah's start.
    expect(startFor(source, at(3, 3), 'ayah', mushaf)).toBe(at(3, 1));
    expect(startFor(source, at(3, 7), 'ayahs', mushaf)).toBe(at(3, 4));
    expect(startFor(source, at(3, 7), 'page', mushaf)).toBe(at(3, 1));
    expect(startFor(source, at(3, 1), 'ayah', mushaf)).toBeNull();
    // Nor before the start of the scope.
    expect(startFor(source, at(3, 4), 'ayahs', { start: at(3, 3), end: at(3, 8) })).toBe(at(3, 3));
    expect(placeFor(source, at(1, 3), { cue: 'previous', reach: 'ayah' }, all))
      .toEqual({ key: '1:3', kind: 'previous', ayah: at(1, 3), shown: 5, context: 0, surah: false, end: at(1, 3) + 1, from: at(1, 2) });
    expect(candidates(source, [{ start: at(3, 1), end: at(3, 4) }], 'previous')).toEqual([at(3, 2), at(3, 3)]);
  });
});

describe('which surah («في أي سورة؟»)', () => {
  test('asked of ayahs of a few words found in one surah only', () => {
    expect(placeFor(source, at(1, 2), { cue: 'surah', reach: 'ayah' }, all)).toEqual({ key: '1:2', kind: 'surah', ayah: at(1, 2), shown: 7, context: 0, surah: false, end: at(1, 2) + 1 });
    // A refrain of one surah still names it.
    expect(placeFor(source, at(3, 4), { cue: 'surah', reach: 'ayah' }, all)?.kind).toBe('surah');
    // «الم» is too short to ask about.
    expect(placeFor(source, at(1, 1), { cue: 'surah', reach: 'ayah' }, all)).toBeNull();
    const twice = { ayahs: [...source.ayahs, { surahNumber: 5, ayahNumber: 1, pageNumber: 5, text: 'عَلَّمَ ٱلۡقُرۡءَانَ خَلَقَ' }, { surahNumber: 6, ayahNumber: 1, pageNumber: 6, text: 'عَلَّمَ ٱلۡقُرۡءَانَ خَلَقَ' }] };
    expect(placeFor(twice, twice.ayahs.length - 1, { cue: 'surah', reach: 'ayah' }, [{ start: 0, end: twice.ayahs.length }])).toBeNull();
  });

  test('its own surah among others of the scope, the nearer likelier; neighbours fill in', () => {
    const many = { ayahs: Array.from({ length: 40 }, (_, i) => ({ surahNumber: 1 + Math.floor(i / 4), ayahNumber: (i % 4) + 1, pageNumber: 1, text: `ا${i} ب${i} ج${i}` })) };
    const choices = surahChoices(many, 21, [3, 4, 5, 6, 7, 9], seededRandom(4));
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(6);
    for (const n of choices) expect([3, 4, 5, 6, 7, 9]).toContain(n);
    // A scope of one surah: the surahs around it.
    const alone = surahChoices(many, 21, [6], seededRandom(4));
    expect(alone).toContain(6);
    expect(alone).toHaveLength(4);
    for (const n of alone) expect(Math.abs(n - 6)).toBeLessThanOrEqual(4);
    expect(surahChoices(source, at(1, 2), [1], seededRandom(1)).sort()).toEqual([1, 2, 3, 4]);
    expect(surahsOf(many, [{ start: 2, end: 9 }])).toEqual([1, 2, 3]);
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

describe('exams', () => {
  const long = { ayahs: Array.from({ length: 120 }, (_, i) => ({ surahNumber: 1 + Math.floor(i / 20), ayahNumber: (i % 20) + 1, pageNumber: 1 + Math.floor(i / 10),
    text: `كلمة${i} ثانية${i} ثالثة${i} رابعة${i} خامسة${i} سادسة${i} سابعة${i}` })) };

  test('every kind of question, taking turns, spread over the scope, never overlapping', () => {
    const exam = chooseExam(long, [{ start: 0, end: 120 }], 12, () => 1, seededRandom(9));
    expect(exam).toHaveLength(12);
    const kinds = exam.map((p) => p.kind);
    for (const kind of ['complete', 'next', 'previous', 'surah']) expect(kinds.filter((k) => k === kind)).toHaveLength(3);
    const extents = exam.map((p) => [p.kind === 'previous' ? p.from : p.ayah - p.context, p.end]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < extents.length; i++) expect(extents[i][0]).toBeGreaterThanOrEqual(extents[i - 1][1]);
    for (const p of exam.filter((q) => q.kind === 'surah')) {
      expect(p.choices).toHaveLength(4);
      expect(p.choices).toContain(long.ayahs[p.ayah].surahNumber);
    }
    expect(chooseExam(long, [{ start: 0, end: 120 }], 12, () => 1, seededRandom(9))).toEqual(exam);
  });

  test('no surah question over one or two surahs: the answer would be known', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const kinds = chooseExam(long, [{ start: 20, end: 60 }], 10, () => 1, seededRandom(seed)).map((p) => p.kind);
      expect(kinds).not.toContain('surah');
      expect(kinds.length).toBeGreaterThan(5);
    }
    expect(surahQuestionFits(long, [{ start: 20, end: 60 }])).toBe(false);
    expect(surahQuestionFits(long, [{ start: 20, end: 61 }])).toBe(true);
    const asked = chooseExam(long, [{ start: 0, end: 120 }], 12, () => 1, seededRandom(9)).filter((p) => p.kind === 'surah');
    const again = reshuffled(asked, seededRandom(5));
    expect(again.map((p) => [...p.choices].sort())).toEqual(asked.map((p) => [...p.choices].sort()));
    expect(again.map((p) => p.choices)).not.toEqual(asked.map((p) => p.choices));
  });

  test('a long ayah is not shown whole: it is asked to be completed', () => {
    const page = { ayahs: [...long.ayahs.slice(0, 3), { surahNumber: 1, ayahNumber: 4, pageNumber: 1, text: Array.from({ length: 60 }, (_, i) => `طويلة${i}`).join(' ') }, ...long.ayahs.slice(4, 6)] };
    for (let seed = 1; seed <= 12; seed++) {
      const exam = chooseExam(page, [{ start: 3, end: 4 }], 1, () => 1, seededRandom(seed));
      expect(exam.map((p) => p.kind)).toEqual(['complete']);
    }
    expect(placeFor(page, 3, { cue: 'surah', reach: 'ayah' }, [{ start: 0, end: 6 }])).toBeNull();
  });

  test('a kind that cannot be asked at an ayah gives way to another', () => {
    // One ayah: nothing before or after it, so it is completed or asked about.
    const exam = chooseExam(long, [{ start: 40, end: 41 }], 10, () => 1, seededRandom(2));
    expect(exam).toHaveLength(1);
    expect(['complete', 'surah']).toContain(exam[0].kind);
    expect(chooseExam(long, [], 10)).toEqual([]);
  });

  test('a score as a teacher gives it: a hesitation counts half', () => {
    expect(examScore({ good: 7, hesitant: 2 }, 10)).toEqual({ points: 8, share: 0.8, grade: 'veryGood' });
    expect(examScore({ good: 9, hesitant: 0 }, 10).grade).toBe('excellent');
    expect(examScore({ good: 6, hesitant: 1 }, 10).grade).toBe('good');
    expect(examScore({ good: 4, hesitant: 2 }, 10).grade).toBe('pass');
    expect(examScore({ good: 2, hesitant: 1 }, 10).grade).toBe('review');
    expect(examScore({ good: 0, hesitant: 0 }, 0).grade).toBe('review');
  });

  test('places to review keep their kind, or are completed when they cannot be asked so', () => {
    const review = placesAt(source, [at(3, 1), at(1, 3)], { cue: 'previous', reach: 'ayah' }, seededRandom(1));
    expect(review.map((p) => [p.key, p.kind])).toEqual([['3:1', 'complete'], ['1:3', 'previous']]);
    const asked = placesAt(source, [at(1, 2)], { cue: 'surah', reach: 'ayah' }, seededRandom(1));
    expect(asked[0].choices).toContain(1);
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

  test('exams are kept, the latest thirty, with what is valid', () => {
    let state = defaultPracticeState;
    for (let i = 0; i < 32; i++) state = applyPractice(state, { type: 'exam', riwayah: 'warsh', result: { date: day, total: 10, good: i % 10, hesitant: 0, wrong: 10 - (i % 10) } });
    const exams = riwayahPractice(state, 'warsh').exams;
    expect(exams).toHaveLength(30);
    expect(exams[29].good).toBe(1);
    expect(applyPractice(state, { type: 'exam', riwayah: 'warsh', result: { date: day, total: 2, good: 3, hesitant: 0, wrong: 0 } })).toBe(state);
    const saved = decodePractice(JSON.stringify({ version: 1, settings: { examCount: 20, cue: 'previous' }, riwayat: { warsh: { exams: [exams[0], { date: 'x', total: 1 }, null] } } }));
    expect(saved.riwayat.warsh.exams).toEqual([exams[0]]);
    expect(saved.settings).toMatchObject({ examCount: 20, cue: 'previous' });
    expect(decodePractice(JSON.stringify({ version: 1, riwayat: { warsh: { sessions: 2 } } })).riwayat.warsh.exams).toEqual([]);
  });

  test('selections are saved under a name, replaced by id, removed, and capped', () => {
    const pick = (id, ranges, name = '') => ({ id, name, emblem: 'leaf', ranges });
    let state = applyPractice(defaultPracticeState, { type: 'pick', riwayah: 'warsh', pick: pick('a', [{ start: 7, end: 9 }, { start: 0, end: 8 }], '  حفظ يوسف  '), total: 6214 });
    state = applyPractice(state, { type: 'pick', riwayah: 'warsh', pick: pick('b', [{ start: 100, end: 200 }]), total: 6214 });
    // Spans are merged, the name trimmed.
    expect(riwayahPractice(state, 'warsh').picks).toEqual([pick('a', [{ start: 0, end: 9 }], 'حفظ يوسف'), pick('b', [{ start: 100, end: 200 }])]);
    state = applyPractice(state, { type: 'pick', riwayah: 'warsh', pick: pick('a', [{ start: 300, end: 310 }], 'مراجعة'), total: 6214 });
    expect(riwayahPractice(state, 'warsh').picks.map((p) => p.name)).toEqual(['مراجعة', '']);
    // Nothing chosen, or out of the edition: not saved.
    expect(applyPractice(state, { type: 'pick', riwayah: 'warsh', pick: pick('c', []), total: 6214 })).toBe(state);
    expect(applyPractice(state, { type: 'pick', riwayah: 'warsh', pick: pick('c', [{ start: 6000, end: 7000 }]), total: 6214 })).toBe(state);
    state = applyPractice(state, { type: 'unpick', riwayah: 'warsh', id: 'b' });
    expect(riwayahPractice(state, 'warsh').picks.map((p) => p.id)).toEqual(['a']);
    let full = state;
    for (let i = 0; i < 20; i++) full = applyPractice(full, { type: 'pick', riwayah: 'warsh', pick: pick(`p${i}`, [{ start: i, end: i + 1 }]), total: 6214 });
    expect(riwayahPractice(full, 'warsh').picks).toHaveLength(12);
    // Another edition: the others no longer point anywhere.
    state = applyPractice(state, { type: 'pick', riwayah: 'warsh', pick: pick('d', [{ start: 5, end: 9 }]), total: 6236 });
    expect(riwayahPractice(state, 'warsh')).toMatchObject({ total: 6236, picks: [pick('d', [{ start: 5, end: 9 }])] });
  });

  test('the selections kept before become the first saved ones', () => {
    const saved = decodePractice(JSON.stringify({ version: 1, settings: { helper: true, scope: 'custom' }, riwayat: { warsh: { total: 300,
      custom: [{ start: 0, end: 7 }], helperCustom: [{ start: 1, end: 9 }, { start: 250, end: 400 }] } } }));
    expect(saved.settings.helper).toBe(true);
    expect(saved.riwayat.warsh.picks).toEqual([
      { id: 'mine', name: '', emblem: 'star', ranges: [{ start: 0, end: 7 }] },
      { id: 'listening', name: '', emblem: 'crescent', ranges: [{ start: 1, end: 9 }] },
    ]);
    // Once saved selections exist, they are read as they are: bad ones and repeated ids are left out.
    const picks = decodePractice(JSON.stringify({ version: 1, riwayat: { warsh: { total: 300, custom: [{ start: 0, end: 7 }], picks: [
      { id: 'x', name: 5, emblem: 'dragon', ranges: [{ start: 3, end: 4 }] }, { id: 'x', ranges: [{ start: 9, end: 10 }] }, { id: 'bad id!', ranges: [{ start: 1, end: 2 }] }, { id: 'y', ranges: [] },
    ] } } })).riwayat.warsh.picks;
    expect(picks).toEqual([{ id: 'x', name: '', emblem: 'star', ranges: [{ start: 3, end: 4 }] }]);
    expect(decodePractice(JSON.stringify({ version: 1, settings: { helper: 'yes', exam: 1 } })).settings).toMatchObject({ helper: false, exam: false });
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
    expect(decoded.settings).toEqual({ cue: 'next', reach: 'ayah', count: 10, exam: false, examCount: 10, helper: false });
    expect(Object.keys(decoded.riwayat)).toEqual(['warsh']);
    expect(decoded.riwayat.warsh.picks).toEqual([{ id: 'mine', name: '', emblem: 'star', ranges: [{ start: 0, end: 7 }] }]);
    expect(Object.keys(decoded.riwayat.warsh.places)).toEqual(['2:255']);
  });
});
