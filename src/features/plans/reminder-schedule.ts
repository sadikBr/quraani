import { addDays, localDate } from './dates';
import { isRecurringPlan, type ReadingPlan } from './types';
import { occurrenceProgress, scheduledOn } from './recurring';

export const REMINDER_PREFIX = 'quranni-plan:';
export function planReminderQueue(plans: ReadingPlan[], now: Date) {
  const today = localDate(now);
  return plans.flatMap(plan => {
    if (!plan.reminder.enabled || plan.status === 'paused' || plan.status === 'archived' || (!isRecurringPlan(plan) && plan.status === 'completed' && !plan.repeat)) return [];
    const first = isRecurringPlan(plan) ? plan.startDate : plan.status === 'completed' && plan.cycle.completedOn ? addDays(plan.cycle.completedOn, 1)
      : plan.goal.type === 'khatma' ? plan.cycle.sessions.find(s => s.end > plan.cycle.cursor)?.date ?? plan.startDate : plan.startDate;
    return Array.from({ length: 30 }, (_, i) => addDays(today, i)).flatMap(day => {
      if (day < plan.startDate || day < first || (!isRecurringPlan(plan) && plan.goal.type === 'wird' && day < plan.cycle.availableDate)) return [];
      if (isRecurringPlan(plan) && (!scheduledOn(plan, day) || occurrenceProgress(plan, day).done)) return [];
      const date = new Date(`${day}T${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}:00`);
      if (date.getTime() <= now.getTime() || !plan.weekdays.includes(date.getDay())) return [];
      return [{ id: `${REMINDER_PREFIX}${plan.id}:${day}:${date.getTime()}`, planId: plan.id, date, title: plan.name }];
    });
  }).sort((a, b) => a.date.getTime() - b.date.getTime() || a.id.localeCompare(b.id)).slice(0, 48);
}
