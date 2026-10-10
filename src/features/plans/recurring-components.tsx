import { Pressable, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerShape, withAlpha } from '../quran-reader/design';
import { GoalCardFrame, GoalCardHeading, GoalProgress } from './goal-card';
import { arabicNumber, shortDate } from './presentation';
import { completedOccurrences, nextRecurringPortion, occurrenceProgress, WEEKDAYS, weekdaysLabel } from './recurring';
import type { RecurringPlan } from './types';

export function WeekdayPicker({ days, onChange, quickOptions = [{ label: 'كل يوم', value: [0, 1, 2, 3, 4, 5, 6] }, { label: 'الجمعة فقط', value: [5] }] }: { days: number[]; onChange: (days: number[]) => void; quickOptions?: { label: string; value: number[] }[] }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{quickOptions.map(option => {
      const active = option.value.length === days.length && option.value.every(value => days.includes(value));
      return <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: active }} aria-pressed={active} onPress={() => onChange(option.value)}
        style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1, borderColor: active ? p.accent : 'transparent', backgroundColor: active ? p.accentSoft : withAlpha(p.text, 0.05), opacity: pressed ? 0.6 : 1 })}>
        <Text style={{ color: active ? p.accent : p.muted, fontSize: 13, fontWeight: active ? '600' : '400' }}>{option.label}</Text>
      </Pressable>;
    })}</View>
    {[WEEKDAYS.slice(0, 4), WEEKDAYS.slice(4)].map((row, i) => <View key={i} style={{ flexDirection: 'row', gap: 6 }}>{row.map(day => {
      const checked = days.includes(day.value);
      return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked }} aria-checked={checked}
        onPress={() => onChange(checked ? days.filter(d => d !== day.value) : [...days, day.value].sort((a, b) => a - b))}
        style={({ pressed }) => ({ flex: 1, minHeight: 48, justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1, borderColor: checked ? p.accent : p.border, backgroundColor: checked ? p.accentSoft : p.paper, opacity: pressed ? 0.65 : 1 })}>
        <Text style={{ color: checked ? p.accent : p.muted, fontSize: 13, fontWeight: checked ? '600' : '400', textAlign: 'center' }}>{day.label}</Text>
      </Pressable>;
    })}</View>)}
    <Text accessibilityLiveRegion="polite" style={{ color: days.length ? p.muted : p.warning, fontSize: 12 }}>{days.length ? weekdaysLabel(days) : 'اختر يومًا واحدًا على الأقل.'}</Text>
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
