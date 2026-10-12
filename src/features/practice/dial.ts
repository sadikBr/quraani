import type { PlanIndex } from '@/features/plans/engine';
import { coversSpan, mergeSpans, subtractSpans } from '@/features/plans/memorization';
import type { AyahSpan } from '@/features/plans/types';
import { t } from '@/i18n';

/** What the dial turns through: the surahs, the juz, or the hizbs. */
export type DialKind = 'surah' | 'juz' | 'hizb';
export const DIAL_KINDS = ['surah', 'juz', 'hizb'] as const satisfies readonly DialKind[];

/** One step of the dial: a surah, juz or hizb, as ayah positions, with its number and name. */
export interface DialUnit extends AyahSpan { number: number; label: string }

// The surah names carry the word «سورة», which the dial leaves out.
const surahWord = /^سورة\s+/;

export function dialUnits(index: PlanIndex, kind: DialKind): DialUnit[] {
  if (kind === 'surah') {
    const units: DialUnit[] = [];
    index.ayahs.forEach((ayah, i) => {
      const last = units[units.length - 1];
      if (last && last.number === ayah.surahNumber) last.end = i + 1;
      else units.push({ start: i, end: i + 1, number: ayah.surahNumber, label: (index.surahNames[ayah.surahNumber] ?? '').replace(surahWord, '') });
    });
    return units;
  }
  const bounds = kind === 'juz' ? index.juzs : index.hizbs;
  return bounds.slice(0, -1).map((start, i) => ({ start, end: bounds[i + 1], number: i + 1,
    label: kind === 'juz' ? t('practice.scope.juz', { juz: i + 1 }) : t('practice.scope.hizb', { hizb: i + 1 }) }));
}

/** How much of a unit is chosen. */
export function unitState(selected: AyahSpan[], unit: AyahSpan): 'full' | 'part' | 'none' {
  if (coversSpan(selected, unit)) return 'full';
  return selected.some((s) => s.start < unit.end && s.end > unit.start) ? 'part' : 'none';
}

/** A unit tapped: chosen whole, or taken out when it already was. */
export function toggleUnit(selected: AyahSpan[], unit: AyahSpan): AyahSpan[] {
  return coversSpan(selected, unit) ? subtractSpans(selected, [unit]) : mergeSpans([...selected, { start: unit.start, end: unit.end }]);
}

/**
 * A stretch drawn over the dial, from unit `from` to unit `to`, the short way round (across the
 * seam between the last unit and the first, too): added to what was chosen when it began
 * (`before`), or taken out of it (`add` false).
 */
export function rangeUnits(before: AyahSpan[], units: DialUnit[], from: number, to: number, add: boolean): AyahSpan[] {
  const n = units.length;
  const steps = ((((to - from) % n) + n + Math.floor(n / 2)) % n) - Math.floor(n / 2);
  const [a, b] = steps < 0 ? [from + steps, from] : [from, from + steps];
  const spans = a < 0 ? [{ start: units[a + n].start, end: units[n - 1].end }, { start: units[0].start, end: units[b].end }]
    : b >= n ? [{ start: units[a].start, end: units[n - 1].end }, { start: units[0].start, end: units[b - n].end }]
      : [{ start: units[a].start, end: units[b].end }];
  return add ? mergeSpans([...before, ...spans]) : subtractSpans(before, spans);
}

/**
 * Angles are in degrees, in screen space (y down, so clockwise): unit `i` of `count` sits at
 * 180° (the pointer, to the left of the centre) less `i` steps, so the next unit lies below it.
 * The dial turned by `rotation` brings unit `rotation / step` to the pointer.
 */
export const unitAngle = (i: number, count: number) => 180 - (i * 360) / count;
export const stepOf = (count: number) => 360 / count;
const wrap = (i: number, count: number) => ((i % count) + count) % count;

/** The unit at a screen angle, with the dial turned by `rotation`. */
export function unitAt(angle: number, rotation: number, count: number) {
  return wrap(Math.round((180 - (angle - rotation)) / stepOf(count)), count);
}

/** Where a wheel opens: at the first unit chosen, else the first memorized, else the first. */
export function initialFocus(units: DialUnit[], selected: AyahSpan[], memorized: AyahSpan[]) {
  const first = (spans: AyahSpan[]) => spans.length ? units.findIndex((u) => u.end > spans[0].start) : -1;
  return Math.max(0, first(selected) >= 0 ? first(selected) : first(memorized));
}

/** The unit at the pointer. */
export const unitAtPointer = (rotation: number, count: number) => wrap(Math.round(rotation / stepOf(count)), count);

/** The turn that brings unit `i` to the pointer, nearest to `rotation`. */
export function rotationFor(i: number, count: number, rotation = 0) {
  const step = stepOf(count), target = i * step;
  return target + Math.round((rotation - target) / 360) * 360;
}

/** Where an ayah falls on the dial, in units (its unit's index, plus how far into it). */
export function ayahPosition(units: DialUnit[], ayah: number) {
  let lo = 0, hi = units.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (units[mid].start <= ayah) lo = mid; else hi = mid - 1;
  }
  const unit = units[lo];
  return lo + (ayah - unit.start) / (unit.end - unit.start) - 0.5;
}
