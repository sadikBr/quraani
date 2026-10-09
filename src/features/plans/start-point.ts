import type { PlanIndex } from './engine';
import type { PlanStart } from './types';
import { normalizeArabicSearch } from '../quran-reader/utils/search';

/** Resolve in the selected edition. Surah/hizb starts must never round to a page. */
export function resolvePlanStart(index: PlanIndex, start: PlanStart): number {
  if (!start || !Number.isInteger(start.number) || start.number < 1) throw new Error('اختر موضع بداية صالحًا.');
  const position = start.kind === 'page' ? index.ayahs.findIndex(a => a.pageNumber === start.number)
    : start.kind === 'surah' ? index.ayahs.findIndex(a => a.surahNumber === start.number)
      : start.kind === 'hizb' && start.number < index.hizbs.length ? index.hizbs[start.number - 1] : -1;
  if (position === undefined || position < 0 || position >= index.ayahs.length) throw new Error('موضع البداية غير موجود في هذه الرواية.');
  return position;
}

export interface StartChoice { number: number; position: number }
export function startChoices(index: PlanIndex, kind: PlanStart['kind']): StartChoice[] {
  if (kind === 'hizb') return index.hizbs.slice(0, -1).map((position, i) => ({ number: i + 1, position }));
  if (kind === 'page') return index.pages.slice(0, -1).map(position => ({ number: index.ayahs[position].pageNumber, position }));
  return index.ayahs.flatMap((ayah, position) => !position || ayah.surahNumber !== index.ayahs[position - 1].surahNumber
    ? [{ number: ayah.surahNumber, position }] : []);
}

export function startAtPosition(index: PlanIndex, kind: PlanStart['kind'], position: number): PlanStart {
  const choices = startChoices(index, kind);
  return { kind, number: choices.findLast(choice => choice.position <= position)?.number ?? choices[0].number };
}

/** Search normalization only; the displayed Quran labels remain untouched. */
export function filterStartChoices(choices: StartChoice[], index: PlanIndex, query: string): StartChoice[] {
  const text = normalizeArabicSearch(query).replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 1776));
  if (!text) return choices;
  if (/^\d+$/.test(text)) return choices.filter(choice => choice.number === Number(text));
  return choices.filter(choice => normalizeArabicSearch(index.surahNames[index.ayahs[choice.position].surahNumber]).includes(text));
}
