import type { PlanIndex } from '@/features/plans/engine';
import { addDays } from '@/features/plans/dates';
import { mergeSpans, sameSpans, subtractSpans } from '@/features/plans/memorization';
import { isMemorizationPlan, type AyahSpan, type ReadingPlan } from '@/features/plans/types';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import type { Motif } from '@/components/craft/art';

/** The pattern a suggestion is drawn with (see `Pattern` in `components/craft/art.tsx`). */
export type { Motif };

/**
 * A portion offered ready to recite («مقترح لك»): the places to review; everything memorized;
 * what was memorized lately, or before that; or a portion often recited (a juz, a surah).
 */
export interface Preset {
  id: string;
  kind: 'review' | 'memorized' | 'recent' | 'old' | 'juz' | 'surah';
  /** What is recited (none for the review, which recites its own places). */
  ranges: AyahSpan[];
  motif: Motif;
  /** The juz or surah, for those kinds. */
  number?: number;
}

/** What was memorized in the last two weeks is «جديد حفظك»; before the last month, «قديم حفظك». */
const RECENT_DAYS = 14;
const OLD_DAYS = 30;
/** Portions offered to everyone: the last two juz (where memorizing starts, in the Maghrib too). */
const JUZ = [30, 29];
/** Listening to someone else (whose record is unknown here): surahs often learnt by heart, too. */
const SURAHS = [18, 36];

/** The ayahs memorized on or after `since`, from the memorization goals of this edition. */
export function memorizedSince(plans: readonly ReadingPlan[], riwayah: Riwayah, index: PlanIndex, since: string): AyahSpan[] {
  const spans: AyahSpan[] = [];
  for (const plan of plans) {
    if (!isMemorizationPlan(plan) || plan.riwayah !== riwayah || plan.corpus !== index.corpus || plan.totalAyahs !== index.ayahs.length) continue;
    for (const entry of plan.progress) {
      if (entry.date >= since && Number.isSafeInteger(entry.from) && Number.isSafeInteger(entry.to) && entry.from >= 0 && entry.to > entry.from && entry.to <= index.ayahs.length) spans.push({ start: entry.from, end: entry.to });
    }
  }
  return mergeSpans(spans);
}

const juzSpan = (index: PlanIndex, juz: number): AyahSpan | null => index.juzs[juz] !== undefined ? { start: index.juzs[juz - 1], end: index.juzs[juz] } : null;
function surahSpan(index: PlanIndex, surah: number): AyahSpan | null {
  const start = index.ayahs.findIndex((a) => a.surahNumber === surah);
  if (start < 0) return null;
  let end = start;
  while (end < index.ayahs.length && index.ayahs[end].surahNumber === surah) end++;
  return { start, end };
}

/**
 * The suggestions, in order. One's own: the places to review (`review` of them), everything
 * memorized, then what was memorized lately and what was memorized long before (only when both
 * exist, so neither repeats «محفوظك كله»), then the last two juz. Listening to someone else:
 * the last two juz and two surahs often learnt by heart.
 */
export function presetsFor({ index, memorized, plans, riwayah, review, helper, today }: {
  index: PlanIndex; memorized: AyahSpan[]; plans: readonly ReadingPlan[]; riwayah: Riwayah; review: number; helper: boolean; today: string;
}): Preset[] {
  const list: Preset[] = [];
  if (!helper) {
    if (review) list.push({ id: 'review', kind: 'review', ranges: [], motif: 'ripple' });
    const all = mergeSpans(memorized);
    if (all.length) {
      list.push({ id: 'memorized', kind: 'memorized', ranges: all, motif: 'rosette' });
      const recent = subtractSpans(memorizedSince(plans, riwayah, index, addDays(today, -RECENT_DAYS)), subtractSpans(index.ayahs.length ? [{ start: 0, end: index.ayahs.length }] : [], all));
      const old = subtractSpans(all, memorizedSince(plans, riwayah, index, addDays(today, -OLD_DAYS)));
      if (recent.length && !sameSpans(recent, all)) list.push({ id: 'recent', kind: 'recent', ranges: recent, motif: 'lattice' });
      if (old.length && !sameSpans(old, all)) list.push({ id: 'old', kind: 'old', ranges: old, motif: 'arches' });
    }
  }
  for (const juz of JUZ) {
    const span = juzSpan(index, juz);
    if (span) list.push({ id: `juz-${juz}`, kind: 'juz', ranges: [span], number: juz, motif: juz === 30 ? 'crescent' : 'khatam' });
  }
  if (helper) for (const surah of SURAHS) {
    const span = surahSpan(index, surah);
    if (span) list.push({ id: `surah-${surah}`, kind: 'surah', ranges: [span], number: surah, motif: surah === 18 ? 'arches' : 'lattice' });
  }
  return list;
}
