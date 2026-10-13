import { Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerShape } from '../quran-reader/design';
import { GoalCardFrame, GoalProgress, useGoalStart, type TrailState } from './goal-card';
import { shortDate } from './presentation';
import { t } from '@/i18n';
import { addDays } from './dates';
import { completedOccurrences, occurrenceProgress, scheduledOn, WEEKDAYS, weekdaysLabel } from './recurring';
import type { RecurringPlan } from './types';

/** Days of the week as chips, with quick choices above them and what is chosen said under them. */
export function WeekdayPicker({ days, onChange, quickOptions = [{ label: t('common.weekdays.everyDay'), value: [0, 1, 2, 3, 4, 5, 6] }, { label: t('recurring.weekdayPicker.fridayOnly'), value: [5] }], emptyLabel }: {
  days: number[]; onChange: (days: number[]) => void; quickOptions?: { label: string; value: number[] }[];
  /** Said when no day is chosen, where days are optional (otherwise choosing one is asked for). */
  emptyLabel?: string;
}) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{quickOptions.map(option => {
      const active = option.value.length === days.length && option.value.every(value => days.includes(value));
      return <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: active }} aria-pressed={active} onPress={() => onChange(option.value)} hitSlop={4}
        style={({ pressed }) => ({ minHeight: 32, paddingHorizontal: 12, justifyContent: 'center', borderRadius: readerShape.pill, borderWidth: 1, borderColor: active ? p.primary : p.border, backgroundColor: active ? p.secondary : pressed ? p.accent : 'transparent' })}>
        <Text style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: active ? '600' : '500' }}>{option.label}</Text>
      </Pressable>;
    })}</View>
    {[WEEKDAYS.slice(0, 4), WEEKDAYS.slice(4)].map((row, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}>{row.map(day => {
      const checked = days.includes(day.value);
      return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked }} aria-checked={checked} hitSlop={4}
        onPress={() => onChange(checked ? days.filter(d => d !== day.value) : [...days, day.value].sort((a, b) => a - b))}
        style={({ pressed }) => [w.day, { backgroundColor: checked ? p.secondary : pressed ? p.accent : p.background, borderColor: checked ? p.primary : p.input }]}>
        <Text numberOfLines={1} style={{ color: checked ? p.secondaryForeground : p.mutedForeground, fontSize: 14, fontWeight: checked ? '700' : '500', textAlign: 'center' }}>{day.label}</Text>
      </Pressable>;
    })}{i === 1 && <View style={{ flex: 1 }} />}</View>)}
    <Text accessibilityLiveRegion="polite" style={{ color: days.length || emptyLabel ? p.mutedForeground : p.destructive, fontSize: 13 }}>{days.length ? weekdaysLabel(days) : emptyLabel ?? t('recurring.weekdayPicker.chooseDay')}</Text>
  </View>;
}

/** A goal's last appointments (up to `count`, today's last when it is one), each as it went. */
export function recentAppointments(plan: RecurringPlan, today: string, count = 7) {
  const dates: string[] = [];
  for (let back = 1; back <= 7 * count && dates.length < count - 1; back++) {
    const date = addDays(today, -back);
    if (date < plan.startDate) break;
    if (scheduledOn(plan, date)) dates.unshift(date);
  }
  if (scheduledOn(plan, today)) dates.push(today);
  return dates.map(date => {
    const state = occurrenceProgress(plan, date);
    const trail: TrailState = state.done ? 'done' : state.read ? 'partial' : date === today ? 'today' : 'missed';
    return { date, state: trail };
  });
}

/** A recurring reading on the list: its last appointments as beads, today's ringed while it waits. */
export function RecurringGoalCard({ plan, today }: { plan: RecurringPlan; today: string }) {
  const { index, next, start } = useGoalStart(plan, today);
  const progress = occurrenceProgress(plan, today);
  const status = plan.status === 'paused' ? t('goals.status.paused') : progress.done ? t('recurring.card.status.done') : next?.due ? t('recurring.card.status.dueToday') : next ? t('recurring.card.status.upcoming', { date: shortDate(next.date) }) : t('goals.status.archived');
  const recent = recentAppointments(plan, today);
  return <GoalCardFrame id={plan.id} name={plan.name} kind="recurring" summary={t('recurring.summary', { days: weekdaysLabel(plan.weekdays) })}
    status={status} due={!!next?.due} done={progress.done} muted={plan.status !== 'active'} start={start}
    portion={next?.due && index ? index.surahNames[plan.ranges[next.slot].surah] : undefined}
    progress={<GoalProgress trail={recent.map(x => x.state)} label={t('recurring.card.completedOccurrences', { count: completedOccurrences(plan) })} quiet
      value={next?.due && progress.read ? t('recurring.card.todayProgress', { completed: progress.completed, count: plan.ranges.length }) : t('recurring.card.surahsPerOccurrence', { count: plan.ranges.length })} />} />;
}

const w = StyleSheet.create({
  day: { flex: 1, minWidth: 0, minHeight: 40, paddingHorizontal: 4, justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1 },
});
