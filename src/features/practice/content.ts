import { useEffect, useState } from 'react';
import type { Quran } from '@/lib/quranpedia/types';
import { loadReaderContent } from '@/features/quran-reader/services/reader-service';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { usePlanIndex } from '@/features/plans/use-plan-index';
import { ayahRangeLabel, buildPlanIndex, type PlanIndex } from '@/features/plans/engine';
import { mergeSpans, spanCount } from '@/features/plans/memorization';
import type { AyahSpan } from '@/features/plans/types';
import { formatList, t } from '@/i18n';

/** The edition practised: its index (which re-links saved goals when the edition was corrected) and its Quran for listening. */
export function usePracticeContent(riwayah: Riwayah) {
  const { index, error, retry } = usePlanIndex(riwayah);
  const [loaded, setLoaded] = useState<{ riwayah: Riwayah; quran: Quran }>();
  useEffect(() => {
    if (!index) return;
    let active = true;
    // Already in memory once the index is built.
    void loadReaderContent(undefined, riwayah).then((content) => {
      if (active && buildPlanIndex(content.data).corpus === index.corpus) setLoaded({ riwayah, quran: content.data.quran });
    }).catch(() => {});
    return () => { active = false; };
  }, [riwayah, index]);
  return { index, quran: loaded?.riwayah === riwayah ? loaded.quran : undefined, error: error ? t('practice.loadFailed') : undefined, retry };
}

/** Whole units (surahs, juzs, hizbs) a selection is made of, or null when it cuts through one. */
function wholeUnits(bounds: number[], spans: AyahSpan[]) {
  const units: number[] = [];
  for (const span of spans) {
    const first = bounds.indexOf(span.start), last = bounds.indexOf(span.end);
    if (first < 0 || last < 0) return null;
    for (let i = first; i < last; i++) units.push(i + 1);
  }
  return units;
}

/** A short name for a selection: its surahs, juzs or hizbs when whole, else a segment or a count. */
export function scopeLabel(index: PlanIndex, ranges: AyahSpan[]) {
  const spans = mergeSpans(ranges);
  if (!spans.length) return '';
  const surahStarts = [...new Set(index.ayahs.map((a) => a.surahNumber))].map((n) => index.ayahs.findIndex((a) => a.surahNumber === n));
  const surahs = wholeUnits([...surahStarts, index.ayahs.length], spans);
  const names = surahs?.map((n) => index.surahNames[index.ayahs[surahStarts[n - 1]].surahNumber]);
  if (names) return names.length <= 3 ? formatList(names) : `${formatList(names.slice(0, 2))}${t('practice.scope.andMore', { count: names.length - 2 })}`;
  const juzs = wholeUnits(index.juzs, spans);
  if (juzs && juzs.length <= 3) return formatList(juzs.map((juz) => t('practice.scope.juz', { juz })));
  const hizbs = wholeUnits(index.hizbs, spans);
  if (hizbs && hizbs.length <= 3) return formatList(hizbs.map((hizb) => t('practice.scope.hizb', { hizb })));
  if (spans.length === 1) return ayahRangeLabel(index, spans[0].start, spans[0].end);
  return `${t('practice.scope.parts', { count: spans.length })} · ${t('practice.scope.ayahs', { count: spanCount(spans) })}`;
}
