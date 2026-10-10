import { Pressable, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerShape } from '../quran-reader/design';
import { Chip } from '@/components/ui';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
import { arabicNumber, shortDate } from './presentation';
import { completedOccurrences, nextRecurringPortion, occurrenceProgress, WEEKDAYS, weekdaysLabel } from './recurring';
import type { RecurringPlan } from './types';

export function WeekdayPicker({ days, onChange, quickOptions = [{ label: 'كل يوم', value: [0, 1, 2, 3, 4, 5, 6] }, { label: 'الجمعة فقط', value: [5] }] }: { days: number[]; onChange: (days: number[]) => void; quickOptions?: { label: string; value: number[] }[] }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{quickOptions.map(option => {
      const active = option.value.length === days.length && option.value.every(value => days.includes(value));
      return <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: active }} aria-pressed={active} onPress={() => onChange(option.value)} hitSlop={4}
        style={({ pressed }) => ({ minHeight: 32, paddingHorizontal: 12, justifyContent: 'center', borderRadius: readerShape.pill, borderWidth: 1, borderColor: active ? p.primary : p.border, backgroundColor: active ? p.secondary : pressed ? p.accent : 'transparent' })}>
        <Text style={{ color: active ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: '500' }}>{option.label}</Text>
      </Pressable>;
    })}</View>
    {[WEEKDAYS.slice(0, 4), WEEKDAYS.slice(4)].map((row, i) => <View key={i} style={{ flexDirection: 'row', gap: 8 }}>{row.map(day => {
      const checked = days.includes(day.value);
      return <Chip key={day.value} flex soft accessibilityRole="checkbox" label={day.label} selected={checked}
        onPress={() => onChange(checked ? days.filter(d => d !== day.value) : [...days, day.value].sort((a, b) => a - b))} />;
    })}</View>)}
    <Text accessibilityLiveRegion="polite" style={{ color: days.length ? p.mutedForeground : p.destructive, fontSize: 13 }}>{days.length ? weekdaysLabel(days) : 'اختر يومًا واحدًا على الأقل.'}</Text>
  </View>;
}

export function RecurringGoalCard({ plan, today }: { plan: RecurringPlan; today: string }) {
  const next = nextRecurringPortion(plan, today), progress = occurrenceProgress(plan, today);
  const status = plan.status === 'paused' ? 'متوقف مؤقتًا' : progress.done ? 'أتممت قراءة اليوم' : next?.due ? 'موعدك اليوم' : next ? `الموعد القادم · ${shortDate(next.date)}` : 'مؤرشف';
  return <GoalCardFrame id={plan.id} name={plan.name} status={status} due={!!next?.due}>
    <GoalCardHeading name={plan.name} description={`قراءة متكررة · ${weekdaysLabel(plan.weekdays)}`} icon="restore" />
    <GoalProgress value={progress.done ? 1 : next?.due ? progress.completed / plan.ranges.length : 0} label={`${arabicNumber(completedOccurrences(plan))} قراءة مكتملة`}
      trailing={next?.due && progress.read ? `${arabicNumber(progress.completed)} من ${arabicNumber(plan.ranges.length)} سور اليوم` : `${arabicNumber(plan.ranges.length)} ${plan.ranges.length === 1 ? 'سورة' : 'سور'} في الموعد`} />
  </GoalCardFrame>;
}
