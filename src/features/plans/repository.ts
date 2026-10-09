import type { CacheStorage } from '@/lib/quranpedia/cache';
import { localDate, validDate } from './dates';
import type { ReadingPlan } from './types';
import { enforceGoalLimit } from './goal-limit';
import { maintainArchives, stampArchiveTransitions } from './archive';
import { validateRecurringPlan } from './recurring';

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
    if (p.goal?.type === 'recurring') { validateRecurringPlan(p); continue; }
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

/** Persist before publishing. A failed disk write never reports successful completion. */
export function createPlansRepository(storage: CacheStorage, today: () => string = localDate) {
  let current: ReadingPlan[] | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  return {
    load() {
      const next = queue.then(async () => {
        const loaded = decodePlans(await storage.getItem(PLANS_KEY));
        const maintained = maintainArchives(loaded, today());
        if (maintained !== loaded) await storage.setItem(PLANS_KEY, JSON.stringify({ version: 1, plans: maintained }));
        current = maintained;
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
        const raw = JSON.stringify({ version: 1, plans: limited });
        await storage.setItem(PLANS_KEY, raw);
        current = limited;
        return current;
      });
      queue = next.catch(() => {});
      return next;
    },
  };
}
