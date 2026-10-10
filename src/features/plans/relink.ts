import { RIWAYAT, type Riwayah } from '../quran-reader/riwayat';
import type { PlanIndex } from './engine';
import { isRecurringPlan, type MemorizationRecord, type ReadingPlan } from './types';

/**
 * The edition fingerprint covers page/hizb/juz metadata as well as the ayah
 * sequence. When the source corrects metadata only, the ayah ordinals that
 * goals store are still valid; re-link those goals instead of locking them.
 * An edition with a different ayah count can never be re-linked.
 */
export function canRelink(plan: Pick<ReadingPlan, 'riwayah' | 'corpus' | 'totalAyahs'>, index: PlanIndex) {
  return index.mushafId === RIWAYAT[plan.riwayah].mushafId && plan.corpus !== index.corpus && plan.totalAyahs === index.ayahs.length;
}

function relinkRecurring(plan: ReadingPlan, index: PlanIndex): ReadingPlan | null {
  if (!isRecurringPlan(plan)) return { ...plan, corpus: index.corpus };
  const ranges = plan.ranges.map(range => ({ surah: range.surah,
    start: index.ayahs.findIndex(a => a.surahNumber === range.surah), end: index.ayahs.findLastIndex(a => a.surahNumber === range.surah) + 1 }));
  // Logged progress points at these ordinals; only re-link when they are unchanged.
  return ranges.every((range, i) => range.start === plan.ranges[i].start && range.end === plan.ranges[i].end) ? { ...plan, corpus: index.corpus } : null;
}

export function relinkPlans(plans: ReadingPlan[], index: PlanIndex): ReadingPlan[] {
  let changed = false;
  const next = plans.map(plan => {
    if (!canRelink(plan, index)) return plan;
    const relinked = relinkRecurring(plan, index);
    if (!relinked) return plan;
    changed = true;
    return relinked;
  });
  return changed ? next : plans;
}

export function relinkRecords(records: MemorizationRecord[], index: PlanIndex): MemorizationRecord[] {
  let changed = false;
  const next = records.map(record => {
    if (!canRelink(record, index)) return record;
    changed = true;
    return { ...record, corpus: index.corpus };
  });
  return changed ? next : records;
}

export function needsRelink(plans: ReadingPlan[], records: MemorizationRecord[], riwayah: Riwayah, index: PlanIndex) {
  return plans.some(p => p.riwayah === riwayah && canRelink(p, index)) || records.some(r => r.riwayah === riwayah && canRelink(r, index));
}
