import { memorizationSchedule } from './memorization';
import { addDays, localDate } from './dates';
import { isMemorizationPlan, isRecurringPlan, type ReadingPlan } from './types';
import { occurrenceProgress, scheduledOn } from './recurring';

export const REMINDER_PREFIX = 'quranni-plan:';
export function planReminderQueue(plans: ReadingPlan[], now: Date) {
  const today = localDate(now);
  return plans.flatMap(plan => {
    if (isMemorizationPlan(plan)) {
      if (!plan.reminder.enabled || plan.status !== 'active') return [];
      return memorizationSchedule(plan, today).filter(s => s.date < addDays(today, 30)).flatMap(s => {
        const date = new Date(`${s.date}T${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}:00`);
        return date.getTime() > now.getTime() ? [{ id: `${REMINDER_PREFIX}${plan.id}:${s.date}:${date.getTime()}`, planId: plan.id, date, title: plan.name, body: 'حان موعد الحفظ. خطوة جديدة نحو القرآن في صدرك.' }] : [];
      });
    }
    if (!plan.reminder.enabled || plan.status === 'paused' || plan.status === 'archived' || (!isRecurringPlan(plan) && plan.status === 'completed' && !plan.repeat)) return [];
    const first = isRecurringPlan(plan) ? plan.startDate : plan.status === 'completed' && plan.cycle.completedOn ? addDays(plan.cycle.completedOn, 1)
      : plan.goal.type === 'khatma' ? plan.cycle.sessions.find(s => s.end > plan.cycle.cursor)?.date ?? plan.startDate : plan.startDate;
    return Array.from({ length: 30 }, (_, i) => addDays(today, i)).flatMap(day => {
      if (day < plan.startDate || day < first || (!isRecurringPlan(plan) && plan.goal.type === 'wird' && day < plan.cycle.availableDate)) return [];
      if (isRecurringPlan(plan) && (!scheduledOn(plan, day) || occurrenceProgress(plan, day).done)) return [];
      const date = new Date(`${day}T${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}:00`);
      if (date.getTime() <= now.getTime() || !plan.weekdays.includes(date.getDay())) return [];
      return [{ id: `${REMINDER_PREFIX}${plan.id}:${day}:${date.getTime()}`, planId: plan.id, date, title: plan.name, body: 'حان وقت وردك. افتح هدفك لمتابعة القراءة.' }];
    });
  }).sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)).slice(0, 48);
}
