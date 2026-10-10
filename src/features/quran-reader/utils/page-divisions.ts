import type { QuranPage } from '../types/reader';
import { formatList, t } from '@/i18n';

/** A page can cross a juz or quarter boundary; retain every known division. */
export function pageDivisions(page: QuranPage) {
  const juz = [...new Set(page.ayahs.flatMap((ayah) => ayah.juzNumber === null ? [] : [ayah.juzNumber]))];
  const quarters = [...new Set(page.ayahs.flatMap((ayah) => ayah.hizbQuarter === null ? [] : [ayah.hizbQuarter]))]
    .map((position) => ({ hizb: Math.ceil(position / 4), rub: ((position - 1) % 4) + 1 }));
  return { juz, quarters };
}

export function quarterLabel(quarter: { hizb: number; rub: number }): string {
  return t('reader.divisions.quarter', { hizb: String(quarter.hizb), rub: String(quarter.rub) });
}

/** Combine quarters in the same hizb without hiding a boundary crossing. */
export function quarterRangeLabels(quarters: { hizb: number; rub: number }[], compact = false): string[] {
  const groups = new Map<number, number[]>();
  for (const { hizb, rub } of quarters) {
    const rubs = groups.get(hizb) ?? [];
    if (!rubs.includes(rub)) rubs.push(rub);
    groups.set(hizb, rubs);
  }
  return [...groups].map(([hizb, rubs]) => {
    rubs.sort((a, b) => a - b);
    const consecutive = rubs.every((rub, index) => index === 0 || rub === rubs[index - 1] + 1);
    const range = rubs.length > 1 && consecutive
      ? `${String(rubs[0])}–${String(rubs[rubs.length - 1])}`
      : formatList(rubs.map(String));
    // Isolate numeric ranges so RTL does not reverse their endpoints or slash.
    return compact ? `\u2066${String(hizb)} (${range}/4)\u2069` : t('reader.divisions.quarterRange', { hizb: String(hizb), range });
  });
}

/** Keep boundary summaries on one line while retaining each hizb/quarter pair. */
export function quarterSummary(quarters: { hizb: number; rub: number }[]): string {
  const labels = quarterRangeLabels(quarters);
  return labels.length > 1 ? t('reader.divisions.hizb', { hizb: formatList(quarterRangeLabels(quarters, true)) }) : labels.join('');
}
