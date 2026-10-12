import { describe, expect, test } from 'bun:test';
import { ayahOf, placeFor } from '../src/features/practice/engine';
import { placeView, placeWords } from '../src/features/practice/place-view';
import { placeDocument, placeState } from '../src/features/practice/place-document';
import { readerThemes } from '../src/features/quran-reader/theme';

// A refrain repeated word for word (3:2, 3:4, 3:6), so its places show the ayah before it.
const surahs = [
  ['الم', 'ذَٰلِكَ ٱلۡكِتَٰبُ لَا رَيۡبَۛ فِيهِۛ هُدٗى لِّلۡمُتَّقِينَ', 'ٱلَّذِينَ يُؤۡمِنُونَ بِٱلۡغَيۡبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ'],
  ['ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلۡحَيُّ ٱلۡقَيُّومُ', 'نَزَّلَ عَلَيۡكَ ٱلۡكِتَٰبَ بِٱلۡحَقِّ مُصَدِّقٗا لِّمَا بَيۡنَ يَدَيۡهِ'],
  ['ٱلرَّحۡمَٰنُ عَلَّمَ ٱلۡقُرۡءَانَ', 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ', 'ٱلشَّمۡسُ وَٱلۡقَمَرُ بِحُسۡبَانٖ', 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ',
    'وَٱلنَّجۡمُ وَٱلشَّجَرُ يَسۡجُدَانِ', 'فَبِأَيِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ'],
];
const source = { ayahs: surahs.flatMap((ayahs, s) => ayahs.map((text, a) => ({ surahNumber: s + 1, ayahNumber: a + 1, pageNumber: s + 1, text, marker: `﴿${a + 1}﴾` }))) };
const at = (surah, ayah) => ayahOf(source, `${surah}:${ayah}`);
const all = [{ start: 0, end: source.ayahs.length }];
const shown = (a) => a.words.slice(0, a.visible).join('');
const palette = readerThemes.light;

describe('what a place shows', () => {
  test('the cue, then words as they are revealed, stopping at the first ayah not yet whole', () => {
    const place = placeFor(source, at(1, 2), { cue: 'complete', reach: 'ayahs' }, all);
    const { total } = placeWords(source, place);
    const start = placeView(source, place, 0, false, false);
    expect(start.text[0].visible).toBe(place.shown);
    expect(start.text.slice(1).every((a) => a.visible === 0 && !a.marker)).toBe(true);
    expect(start.more).toBe(true);
    expect(start.label).toContain('كلمات مخفية');
    // Revealing the rest of the first ayah: its marker shows only once markers are shown.
    const rest = start.text[0].words.length - place.shown;
    expect(placeView(source, place, rest, false, false).text[0].marker).toBe(false);
    const first = placeView(source, place, rest, true, false);
    expect(first.text[0].marker).toBe(true);
    expect(first.text[1]).toMatchObject({ visible: 0, marker: false });
    const done = placeView(source, place, total, true, false);
    expect(done.more).toBe(false);
    expect(done.text.every((a) => a.visible === a.words.length && a.marker)).toBe(true);
    expect(done.label).toBe(done.text.map((a) => shown(a).trim()).join(' '));
  });

  test('a refrain shows the ayah before it, whole; in «ما قبلها» the one after it', () => {
    const complete = placeFor(source, at(3, 4), { cue: 'complete', reach: 'ayah' }, all);
    expect(complete.context).toBe(1);
    const view = placeView(source, complete, 0, false, false);
    expect(view.before.map((a) => a.ayah.ayahNumber)).toEqual([3]);
    expect(view.before[0].visible).toBe(view.before[0].words.length);
    expect(view.after).toEqual([]);
    const previous = placeFor(source, at(3, 2), { cue: 'previous', reach: 'ayah' }, all);
    expect(previous.context).toBe(1);
    const before = placeView(source, previous, 0, false, false);
    expect(before.after.map((a) => a.ayah.ayahNumber)).toEqual([3]);
    expect(before.before).toEqual([]);
    // Nothing recited yet: the cue alone shows, whole.
    expect(before.shown).toBe(false);
    expect(before.cue.visible).toBe(before.cue.words.length);
    expect(before.label).toBe('كلمات مخفية تتلوها من حفظك');
  });

  test('listening to someone else, the cue is highlighted; not in the surah question', () => {
    const complete = placeFor(source, at(1, 2), { cue: 'complete', reach: 'ayah' }, all);
    expect(placeView(source, complete, 0, false, true).text[0].marked).toBe(complete.shown);
    expect(placeView(source, complete, 0, false, false).text[0].marked).toBe(0);
    const previous = placeFor(source, at(1, 3), { cue: 'previous', reach: 'ayah' }, all);
    const cue = placeView(source, previous, 0, false, true).cue;
    expect(cue.marked).toBe(cue.words.length);
    const surah = placeFor(source, at(2, 2), { cue: 'surah', reach: 'ayah' }, all);
    if (surah) expect(placeView(source, surah, 0, false, true).text[0].marked).toBe(0);
  });
});

describe('a place with tajweed colours', () => {
  const place = placeFor(source, at(3, 4), { cue: 'complete', reach: 'ayahs' }, all);
  const view = placeView(source, place, 2, false, false);

  test('the document holds every ayah of the place, escaped, on the colour below it', () => {
    const html = placeDocument(placeView(source, place, 0, false, false), 'data:font/ttf;base64,AA==', 36, 69, palette, palette.card);
    for (const id of ['b0', 't0', 't1', 't2']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('font:400 36px/69px quran');
    expect(html).toContain(`background:${palette.card}`);
    expect(html).toContain("default-src 'none'");
    expect(html).not.toContain('<script src');
    const hostile = placeDocument({ ...view, before: [], text: [{ ...view.text[0], words: ['<img src=x>'] }] }, 'data:font/ttf;base64,AA==', 36, 69, palette, palette.card);
    expect(hostile).toContain('&lt;img src=x&gt;');
    expect(hostile).not.toContain('<img');
  });

  test('the state colours each word and says what shows', () => {
    const ayah = source.ayahs[place.ayah];
    const runs = { 3: { [ayah.ayahNumber]: [{ text: ayah.text.slice(0, 3), rule: 'qlq' }, { text: ayah.text.slice(3) }] } };
    const state = JSON.parse(placeState(view, runs, false, palette, false));
    expect(state.ayahs.map((a) => a.id)).toEqual(['b0', 't0', 't1', 't2']);
    const cue = state.ayahs[1];
    // Two words revealed: the one left in the refrain, then the first of the next ayah.
    expect(place.shown).toBe(3);
    expect(cue.visible).toBe(4);
    expect(state.ayahs[2].visible).toBe(1);
    expect(state.ayahs[3].visible).toBe(0);
    expect(cue.words[0]).toContain('color:#dd0008');
    expect(cue.words.join('').replace(/<[^>]+>/g, '')).toBe(ayah.text);
    expect(state).toMatchObject({ shown: true, more: true, hidden: true, placeholder: false });
    // An exam draws dotted rules for the hidden words, not «…»; the words stay hidden all the same.
    expect(JSON.parse(placeState(view, {}, false, palette, true))).toMatchObject({ more: false, hidden: true });
    // Without colours yet, the words are plain, in the page's ink.
    expect(JSON.parse(placeState(view, {}, false, palette, false)).ayahs[1].words[0]).toContain(`color:${palette.foreground}`);
  });

  test('«ما قبلها» before anything is recited: «…» stands above the cue, but not in an exam', () => {
    const previous = placeFor(source, at(1, 3), { cue: 'previous', reach: 'ayah' }, all);
    const start = placeView(source, previous, 0, false, false);
    expect(JSON.parse(placeState(start, {}, false, palette, false))).toMatchObject({ shown: false, placeholder: true });
    expect(JSON.parse(placeState(start, {}, false, palette, true))).toMatchObject({ shown: false, placeholder: false });
    expect(placeDocument(start, 'data:font/ttf;base64,AA==', 32, 61, palette, palette.card)).toContain('id="c0"');
  });
});
