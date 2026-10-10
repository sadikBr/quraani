import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { Button, Card, CheckMark, IconTile } from '@/components/ui';
import { arabicNumber } from './presentation';
import type { SequentialGoal, SequentialPlan } from './types';

export function CreationSection({ title, icon, children, description }: PropsWithChildren<{ title: string; icon: ReaderIconName; description?: string }>) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 12 }}>
    <View style={[c.row, { gap: 8 }]}><ReaderIcon name={icon} color={p.mutedForeground} size={16} /><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text></View>
    <Card style={c.panel}>{children}</Card>
    {!!description && <Text style={{ fontSize: 14, lineHeight: 22, color: p.mutedForeground, paddingHorizontal: 4 }}>{description}</Text>}
  </View>;
}

export function GoalTypeChoices({ kind, onChange, existing }: { kind: SequentialGoal['type']; onChange: (kind: SequentialGoal['type']) => void; existing?: SequentialPlan }) {
  const { palette: p } = useReadingPreferences();
  return <View accessibilityRole="radiogroup" accessibilityLabel="نوع الهدف" style={{ flexDirection: 'row', gap: 12 }}>
    {([{ type: 'khatma', title: 'ختمة', detail: 'ورد محسوب حسب المدة', icon: 'calendar' }, { type: 'wird', title: 'ورد يومي', detail: 'مقدار تختاره، بلا مدة', icon: 'book' }] as const).map(option => {
      const selected = option.type === (existing?.goal.type ?? kind);
      return <Pressable key={option.type} accessibilityRole="radio" accessibilityLabel={`${option.title}${existing ? '، غير متاح أثناء هدف القراءة الحالي' : ''}`} accessibilityState={{ checked: selected, disabled: !!existing }} aria-checked={selected} disabled={!!existing} onPress={() => onChange(option.type)}
        style={({ pressed }) => [c.typeCard, { backgroundColor: pressed ? p.accent : p.card, borderColor: selected ? p.primary : p.border, borderWidth: selected ? 2 : 1, opacity: existing ? 0.5 : 1 }, readerElevation(2, p)]}>
        <View style={[c.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <IconTile name={option.icon} size={36} />
          <CheckMark checked={selected} radio />
        </View>
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{option.title}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{existing ? selected ? 'هدفك الحالي' : 'متاح بعد إتمام هدفك' : option.detail}</Text>
      </Pressable>;
    })}
  </View>;
}

export function CreationSteps({ step, canReview, onChange }: { step: 0 | 1; canReview: boolean; onChange: (step: 0 | 1) => void }) {
  const { palette: p } = useReadingPreferences();
  return <View accessibilityRole="tablist" accessibilityLabel="خطوات إنشاء الهدف" style={{ flexDirection: 'row', gap: 10 }}>
    {(['الإعداد', 'المراجعة'] as const).map((label, i) => <Pressable key={label} accessibilityRole="tab" accessibilityLabel={label}
      accessibilityState={{ selected: step === i, disabled: i === 1 && !canReview }} aria-selected={step === i} disabled={i === 1 && !canReview} onPress={() => onChange(i as 0 | 1)}
      style={({ pressed }) => [c.step, { opacity: pressed ? 0.6 : i === 1 && !canReview ? 0.5 : 1 }]}>
      <View style={[c.stepBar, { backgroundColor: step >= i ? p.primary : withAlpha(p.primary, 0.2) }]} />
      <View style={[c.row, { gap: 6 }]}>
        {step > i ? <ReaderIcon name="check" color={p.foreground} size={14} /> : <Text style={{ color: step === i ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: '500' }}>{arabicNumber(i + 1)}</Text>}
        <Text style={{ color: step === i ? p.foreground : p.mutedForeground, fontSize: 14, fontWeight: '500' }}>{label}</Text>
      </View>
    </Pressable>)}
  </View>;
}

export function AmountPicker({ label, value, onChange, unit, presets, minimum, maximum, increment = 1, parse }: {
  label: string; value: string; onChange: (value: string) => void; unit: string; presets: string[]; minimum: number; maximum: number; increment?: number; parse: (value: string) => number;
}) {
  const { palette: p } = useReadingPreferences();
  const amount = parse(value);
  const change = (direction: number) => onChange(String(Math.max(minimum, Math.min(maximum, Math.round(((Number.isFinite(amount) ? amount : minimum) + direction * increment) * 1000) / 1000))));
  return <View style={{ gap: 16 }}>
    <View style={[c.row, { justifyContent: 'space-between', gap: 12 }]}>
      <AmountButton label={`زيادة ${label}`} plus disabled={amount >= maximum} onPress={() => change(1)} />
      <View style={{ alignItems: 'center', flex: 1, minWidth: 0 }}>
        <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} selectTextOnFocus keyboardType={increment === 1 ? 'number-pad' : 'decimal-pad'} maxLength={7}
          style={{ width: '100%', minHeight: 56, padding: 0, fontFamily: 'UiNumericSemiBold', fontSize: 36, letterSpacing: -0.9, color: p.foreground, textAlign: 'center', writingDirection: 'ltr' }} />
        <Text style={{ color: p.mutedForeground, fontSize: 14, textAlign: 'center' }}>{unit}</Text>
      </View>
      <AmountButton label={`تقليل ${label}`} disabled={amount <= minimum} onPress={() => change(-1)} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {presets.map(preset => {
        const selected = amount === Number(preset);
        return <Pressable key={preset} accessibilityRole="button" accessibilityLabel={`${arabicNumber(Number(preset))} ${unit}`} accessibilityState={{ selected }} aria-pressed={selected} onPress={() => onChange(preset)} hitSlop={4}
          style={({ pressed }) => [c.preset, { backgroundColor: selected ? p.primary : pressed ? p.accent : p.background, borderColor: selected ? p.primary : p.input }, !selected && readerElevation(1, p)]}>
          <Text style={{ color: selected ? p.primaryForeground : p.foreground, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{arabicNumber(Number(preset))}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
function AmountButton({ label, plus = false, disabled, onPress }: { label: string; plus?: boolean; disabled: boolean; onPress: () => void }) {
  return <Button variant="outline" size="lg" icon={plus ? 'plus' : 'minus'} label={label} disabled={disabled} onPress={onPress} />;
}

export function ExistingGoalCard({ goal, onOpen }: { goal: SequentialPlan; onOpen: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Card style={[c.panel, { gap: 14 }]}>
    <View style={c.row}><IconTile name="check" />
      <View style={c.grow}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{goal.goal.type === 'khatma' ? 'لديك ختمة بالفعل' : 'لديك ورد يومي بالفعل'}</Text></View>
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>تابع هدفك الحالي أو عدّل إعداداته من صفحته.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`عرض الهدف الحالي: ${goal.name}`} onPress={onOpen}
      style={({ pressed }) => [c.existingLink, { borderColor: p.border, backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={c.grow}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{goal.name}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>عرض الهدف الحالي</Text></View>
      <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
    </Pressable>
  </Card>;
}

export const c = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingStart: 12, paddingEnd: 16, borderRadius: readerShape.control },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 6, paddingBottom: 28, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  panel: { padding: 16, gap: 20 },
  sectionIcon: { width: 28, height: 28, borderRadius: readerShape.control - 2, alignItems: 'center', justifyContent: 'center' },
  typeCard: { flex: 1, minWidth: 0, borderRadius: readerShape.card, padding: 16 },
  choiceMark: { width: 20, height: 20, borderRadius: readerShape.detail, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  step: { flex: 1, gap: 8, minHeight: 44, justifyContent: 'center' },
  stepBar: { height: 4, borderRadius: readerShape.pill },
  amountButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: readerShape.control },
  preset: { flex: 1, minWidth: 0, minHeight: 40, borderWidth: 1, borderRadius: readerShape.control, justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  existingIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  existingLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1, borderRadius: readerShape.control, padding: 14 },
  footer: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
});
