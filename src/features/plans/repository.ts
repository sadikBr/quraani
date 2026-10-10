import type { CacheStorage } from '@/lib/quranpedia/cache';
import { localDate, validDate } from './dates';
import { isMemorizationPlan, isRevisionPlan, type MemorizationRecord, type ReadingPlan } from './types';
import { mergeSpans, sameSpans, subtractSpans, validateMemorizationPlan, validateSpans } from './memorization';
import { currentMemorizationGoal, enforceGoalLimit } from './goal-limit';
import { validateRevisionPlan } from './revision';
import { maintainArchives, stampArchiveTransitions } from './archive';
import { validateRecurringPlan } from './recurring';
import type { PlanIndex } from './engine';
import { relinkPlans, relinkRecords } from './relink';

export const PLANS_KEY = 'plans:v1';
export function decodePlans(raw: string | null): ReadingPlan[] {
  if (raw === null) return [];
  const saved = JSON.parse(raw);
  if (saved?.version !== 1 || !Array.isArray(saved.plans)) throw new Error('نسخة بيانات الأهداف غير مدعومة');
  const ids = new Set<string>();
  for (const p of saved.plans) {
    if (!p || typeof p.id !== 'string' || !/^plan-[a-z0-9-]+$/.test(p.id) || ids.has(p.id) || typeof p.name !== 'string' || !p.name.trim() ||
      !['warsh', 'hafs'].includes(p.riwayah) || !['active', 'paused', 'completed', 'archived'].includes(p.status) ||
      !validDate(p.startDate) ||
      typeof p.corpus !== 'string' || !Number.isInteger(p.totalAyahs) || p.totalAyahs < 1 || p.totalAyahs > 10000 ||
      !Array.isArray(p.weekdays) || !p.weekdays.length || p.weekdays.some((d: number) => !Number.isInteger(d) || d < 0 || d > 6) ||
      !p.reminder || typeof p.reminder.enabled !== 'boolean' || !Number.isInteger(p.reminder.hour) || p.reminder.hour < 0 || p.reminder.hour > 23 ||
      !Number.isInteger(p.reminder.minute) || p.reminder.minute < 0 || p.reminder.minute > 59 ||
      (p.pausedOn !== undefined && !validDate(p.pausedOn)) ||
      (p.archivedOn !== undefined && !validDate(p.archivedOn))) throw new Error('تعذر التحقق من بيانات الأهداف المحفوظة');
    ids.add(p.id);
    if (p.goal?.type === 'memorization') { validateMemorizationPlan(p); continue; }
    if (p.goal?.type === 'recurring') { validateRecurringPlan(p); continue; }
    if (p.goal?.type === 'revision') { validateRevisionPlan(p); continue; }
    if (!['pages', 'hizbs', 'juzs'].includes(p.unit) || typeof p.repeat !== 'boolean') throw new Error('إعدادات هدف غير صالحة');
    if (!p.goal || !['khatma', 'wird'].includes(p.goal.type) ||
      (p.goal.type === 'khatma' && (!Number.isInteger(p.goal.weeks) || p.goal.weeks < 1 || p.goal.weeks > 52)) ||
      (p.goal.type === 'wird' && (!Number.isFinite(p.goal.amount) || p.goal.amount <= 0))) throw new Error('نوع هدف غير صالح');
    const c = p.cycle;
    if (!c || !Number.isInteger(c.number) || c.number < 1 || !Number.isInteger(c.start) || c.start < 0 || c.start >= p.totalAyahs ||
      !Number.isInteger(c.cursor) || c.cursor < c.start || c.cursor > p.totalAyahs || !validDate(c.availableDate) ||
      !Array.isArray(c.sessions) || !c.sessions.length || c.sessions.length > 10000 || !Array.isArray(c.progress) || !Array.isArray(p.history) ||
      (c.completedOn !== undefined && !validDate(c.completedOn))) throw new Error('تقدم هدف غير صالح');
    let cursor = c.start;
    for (const s of c.sessions) {
      if (!validDate(s.date) || s.start !== cursor || !Number.isInteger(s.end) || s.end <= cursor || s.end > p.totalAyahs) throw new Error('جدول هدف غير صالح');
      cursor = s.end;
    }
    if (cursor !== p.totalAyahs) throw new Error('جدول هدف غير مكتمل');
    cursor = c.start;
    for (const log of c.progress) {
      if (!validDate(log.date) || log.from !== cursor || !Number.isInteger(log.to) || log.to <= cursor || log.to > p.totalAyahs) throw new Error('سجل تقدم غير صالح');
      cursor = log.to;
    }
    if (cursor !== c.cursor || (p.status === 'completed' && (cursor !== p.totalAyahs || !c.completedOn))) throw new Error('سجل تقدم غير متطابق');
    for (const h of p.history) if (!Number.isInteger(h.number) || h.number < 1 || !validDate(h.startedOn) || !validDate(h.completedOn) || !Number.isInteger(h.ayahs) || h.ayahs < 1) throw new Error('سجل دورات غير صالح');
  }
  return saved.plans;
}

export function decodeMemorization(raw: string | null): MemorizationRecord[] {
  if (!raw) return [];
  const saved = JSON.parse(raw);
  const records = saved.memorization ?? [];
  if (!Array.isArray(records) || records.length > 2) throw new Error('سجل المحفوظ غير صالح.');
  const seen = new Set<string>();
  for (const record of records) {
    if (!record || !['warsh', 'hafs'].includes(record.riwayah) || seen.has(record.riwayah) || typeof record.corpus !== 'string' || !Number.isInteger(record.totalAyahs) || record.totalAyahs < 1 || record.totalAyahs > 10000) throw new Error('سجل المحفوظ غير صالح.');
    validateSpans(record.ranges, record.totalAyahs); seen.add(record.riwayah);
  }
  return records;
}
/** Update the lifelong record and the goal in the same disk write. Deleting a goal
 * never deletes its memorized passages. Only explicit corrections/undo remove them. */
function syncMemorization(previous: ReadingPlan[], next: ReadingPlan[], records: MemorizationRecord[]): MemorizationRecord[] {
  let result = records;
  for (const plan of next) {
    if (!isMemorizationPlan(plan)) continue;
    const before = previous.find(p => p.id === plan.id);
    const old = before && isMemorizationPlan(before) ? before.memorized : plan.initialRecord;
    const saved = result.find(r => r.riwayah === plan.riwayah);
    if (before && sameSpans(old, plan.memorized)) {
      if ((plan.status === 'active' || plan.status === 'paused') && !sameSpans(saved?.ranges ?? [], plan.memorized)) throw new Error('تغيّر سجل محفوظك. أعد فتح الهدف لتحديثه.');
      continue;
    }
    if (saved && (saved.corpus !== plan.corpus || saved.totalAyahs !== plan.totalAyahs)) throw new Error('نسخة سجل الحفظ لا تطابق الهدف.');
    if (!before && !sameSpans(saved?.ranges ?? [], plan.initialRecord)) throw new Error('تغيّر محفوظك. أعد فتح إنشاء هدف الحفظ لتحديثه.');
    const added = subtractSpans(plan.memorized, old), removed = subtractSpans(old, plan.memorized);
    const ranges = mergeSpans([...subtractSpans(saved?.ranges ?? [], removed), ...added]);
    if ((plan.status === 'active' || plan.status === 'paused') && !sameSpans(ranges, plan.memorized)) throw new Error('تغيّر سجل محفوظك. أعد فتح الهدف لتحديثه.');
    result = [...result.filter(r => r.riwayah !== plan.riwayah), { riwayah: plan.riwayah, corpus: plan.corpus, totalAyahs: plan.totalAyahs, ranges }];
  }
  // A revision goal can set what is memorized (when it is created, or from its
  // settings) only while no memorization goal owns the record for that edition.
  for (const plan of next) {
    if (!isRevisionPlan(plan) || plan.status === 'archived') continue;
    const before = previous.find(p => p.id === plan.id);
    const saved = result.find(r => r.riwayah === plan.riwayah);
    const old = before && isRevisionPlan(before) ? before.memorized : saved?.ranges ?? [];
    if (sameSpans(old, plan.memorized) || (saved && sameSpans(saved.ranges, plan.memorized))) continue;
    if (currentMemorizationGoal(next.filter(p => p.riwayah === plan.riwayah))) throw new Error('محفوظك يتابعه هدف الحفظ. عدّله من هدف الحفظ.');
    if (saved && (saved.corpus !== plan.corpus || saved.totalAyahs !== plan.totalAyahs)) throw new Error('نسخة سجل الحفظ لا تطابق الهدف.');
    const added = subtractSpans(plan.memorized, old), removed = subtractSpans(old, plan.memorized);
    const ranges = mergeSpans([...subtractSpans(saved?.ranges ?? [], removed), ...added]);
    result = [...result.filter(r => r.riwayah !== plan.riwayah), { riwayah: plan.riwayah, corpus: plan.corpus, totalAyahs: plan.totalAyahs, ranges }];
  }
  return result;
}

/** Revision goals follow the memorization record: newly memorized ayahs join
 * the cycle in mushaf order and removed ones leave it. */
export function mirrorRevision(plans: ReadingPlan[], records: MemorizationRecord[]): ReadingPlan[] {
  let changed = false;
  const next = plans.map(plan => {
    if (!isRevisionPlan(plan)) return plan;
    const record = records.find(r => r.riwayah === plan.riwayah);
    if (!record || record.corpus !== plan.corpus || record.totalAyahs !== plan.totalAyahs || sameSpans(record.ranges, plan.memorized)) return plan;
    changed = true;
    return { ...plan, memorized: mergeSpans(record.ranges), revision: plan.revision + 1 };
  });
  return changed ? next : plans;
}

/** Persist before publishing. A failed disk write never reports successful completion. */
export function createPlansRepository(storage: CacheStorage, today: () => string = localDate) {
  let current: ReadingPlan[] | undefined;
  let memorization: MemorizationRecord[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  return {
    memorization: () => memorization,
    load() {
      const next = queue.then(async () => {
        const raw = await storage.getItem(PLANS_KEY);
        const loaded = decodePlans(raw);
        const memory = decodeMemorization(raw);
        const maintained = maintainArchives(loaded, today());
        if (maintained !== loaded) await storage.setItem(PLANS_KEY, JSON.stringify({ version: 1, plans: maintained, memorization: memory }));
        current = maintained;
        memorization = memory;
        return current;
      });
      queue = next.catch(() => {});
      return next;
    },
    /** Re-link goals and the memorization record to a corrected edition fingerprint. */
    relink(index: PlanIndex) {
      const next = queue.then(async () => {
        if (!current) throw new Error('لم تُحمّل الأهداف بعد');
        const plans = relinkPlans(current, index), memory = relinkRecords(memorization, index);
        if (plans === current && memory === memorization) return current;
        const raw = JSON.stringify({ version: 1, plans, memorization: memory });
        decodePlans(raw); decodeMemorization(raw);
        await storage.setItem(PLANS_KEY, raw);
        current = plans; memorization = memory;
        return current;
      });
      queue = next.catch(() => {});
      return next;
    },
    update(change: (plans: ReadingPlan[]) => ReadingPlan[]) {
      const next = queue.then(async () => {
        if (!current) throw new Error('لم تُحمّل الأهداف بعد');
        const updated = change(current);
        if (updated === current) return current;
        decodePlans(JSON.stringify({ version: 1, plans: updated }));
        const date = today();
        const limited = maintainArchives(stampArchiveTransitions(current, enforceGoalLimit(current, updated), date), date);
        const memory = syncMemorization(current, updated, memorization);
        const mirrored = mirrorRevision(limited, memory);
        const raw = JSON.stringify({ version: 1, plans: mirrored, memorization: memory });
        decodePlans(raw); decodeMemorization(raw);
        await storage.setItem(PLANS_KEY, raw);
        current = mirrored;
        memorization = memory;
        return current;
      });
      queue = next.catch(() => {});
      return next;
    },
  };
}
