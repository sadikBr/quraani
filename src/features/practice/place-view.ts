import { ayahWords } from '@/features/quran-reader/utils/page-practice';
import { formatList, t } from '@/i18n';
import type { PracticePlace, PracticeSource } from './engine';

export type PlaceAyah = PracticeSource['ayahs'][number] & { marker?: string };

/**
 * The words recited at a place, in reading order, with the cue's words counted out (`cue`):
 * the cue's ayah and those after it; in «ما قبلها», the ayahs before the cue (the cue is shown
 * whole after them); for the surah question, the ayah alone, all shown.
 */
export function placeWords(source: PracticeSource, place: PracticePlace) {
  const ayahs: { ayah: PlaceAyah; words: string[]; cue: number }[] = [];
  const first = place.kind === 'previous' ? place.from! : place.ayah;
  const last = place.kind === 'previous' ? place.ayah : place.kind === 'surah' ? place.ayah + 1 : place.end;
  for (let i = first; i < last; i++) {
    const words = ayahWords(source.ayahs[i].text);
    ayahs.push({ ayah: source.ayahs[i] as PlaceAyah, words, cue: i === place.ayah ? Math.min(place.shown, words.length) : 0 });
  }
  const total = ayahs.reduce((n, a) => n + a.words.length - a.cue, 0);
  return { ayahs, total };
}

/** An ayah as it shows at a place. */
export interface AyahView {
  ayah: PlaceAyah;
  words: string[];
  /** Words shown, from the first: the cue's, then those revealed. */
  visible: number;
  /** Words highlighted, from the first: the cue, read out to someone reciting. */
  marked: number;
  /** Its marker shows: the ayah is shown whole, and markers are shown. */
  marker: boolean;
}

/** What a place shows, the same however it is drawn (as text, or with tajweed colours). */
export interface PlaceView {
  /**
   * Ayahs shown to tell the place apart when its cue repeats in the Quran: before the text, or
   * after it (`after`) in «ما قبلها», where the ayahs before the cue are the answer.
   */
  before: AyahView[];
  after: AyahView[];
  /** What is recited, as revealed so far; but in «ما قبلها», it starts with the cue's words. */
  text: AyahView[];
  /** «ما قبلها»: the cue, shown whole below what is recited. */
  cue?: AyahView;
  /** Words are still hidden. */
  more: boolean;
  /** Something of `text` shows. */
  shown: boolean;
  /** `text` for a screen reader: what shows, and whether words are hidden. */
  label: string;
}

/**
 * A place with `revealed` words revealed. Revealing stops at the first ayah not yet whole: the
 * ayahs after it are not drawn. Ayah markers carry the ayah's number, so they show only when
 * `markers` (the hint is shown, or checking has started). `marked` (listening to someone else):
 * the cue's words are highlighted, the words to read out (not in the surah question, where the
 * ayah is read out whole).
 */
export function placeView(source: PracticeSource, place: PracticePlace, revealed: number, markers: boolean, marked: boolean): PlaceView {
  const { ayahs, total } = placeWords(source, place);
  const mark = marked && place.kind !== 'surah';
  const previous = place.kind === 'previous';
  const whole = (i: number): AyahView => {
    const ayah = source.ayahs[i] as PlaceAyah, words = ayahWords(ayah.text);
    return { ayah, words, visible: words.length, marked: 0, marker: markers && !!ayah.marker };
  };
  const text: AyahView[] = [];
  let left = revealed, more = false;
  for (const { ayah, words, cue } of ayahs) {
    if (more) { text.push({ ayah, words, visible: 0, marked: 0, marker: false }); continue; }
    const visible = cue + Math.max(0, Math.min(words.length - cue, left));
    left -= visible - cue;
    const complete = visible === words.length;
    text.push({ ayah, words, visible, marked: mark ? cue : 0, marker: complete && markers && !!ayah.marker });
    if (!complete) more = true;
  }
  if (revealed < total) more = true;
  const context = Array.from({ length: place.context }, (_, i) => whole(previous ? place.ayah + 1 + i : place.ayah - place.context + i));
  const cue = previous ? whole(place.ayah) : undefined;
  if (cue && mark) cue.marked = cue.words.length;
  const spoken = text.filter((a) => a.visible).map((a) => a.words.slice(0, a.visible).join('').trim()).join(' ');
  return {
    before: previous ? [] : context, after: previous ? context : [], text, cue, more, shown: !!spoken,
    label: !spoken ? t('practice.session.hidden') : more ? formatList([spoken, t('practice.session.hidden')]) : spoken,
  };
}
