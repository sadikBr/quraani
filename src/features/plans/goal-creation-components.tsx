import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { arabicNumber } from './presentation';
import type { SequentialGoal, SequentialPlan } from './types';

export function CreationSection({ title, icon, children, description }: PropsWithChildren<{ title: string; icon: ReaderIconName; description?: string }>) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 12 }}>
    <View style={[c.row, { gap: 10 }]}><View style={[c.sectionIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={16} /></View><Text accessibilityRole="header" style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>{title}</Text></View>
    <View style={[c.panel, { backgroundColor: p.paper, borderColor: p.border }]}>{children}</View>
    {!!description && <Text style={{ fontSize: 13, lineHeight: 22, color: p.muted, paddingHorizontal: 4 }}>{description}</Text>}
  </View>;
}

export function GoalTypeChoices({ kind, onChange, existing }: { kind: SequentialGoal['type']; onChange: (kind: SequentialGoal['type']) => void; existing?: SequentialPlan }) {
  const { palette: p } = useReadingPreferences();
  return <View accessibilityRole="radiogroup" accessibilityLabel="نوع الهدف" style={{ flexDirection: 'row', gap: 12 }}>
    {([{ type: 'khatma', title: 'ختمة', detail: 'ورد محسوب حسب المدة', icon: 'calendar' }, { type: 'wird', title: 'ورد يومي', detail: 'مقدار تختاره، بلا مدة', icon: 'book' }] as const).map(option => {
      const selected = option.type === (existing?.goal.type ?? kind);
      return <Pressable key={option.type} accessibilityRole="radio" accessibilityLabel={`${option.title}${existing ? '، غير متاح أثناء هدف القراءة الحالي' : ''}`} accessibilityState={{ checked: selected, disabled: !!existing }} aria-checked={selected} disabled={!!existing} onPress={() => onChange(option.type)}
        style={({ pressed }) => [c.typeCard, { backgroundColor: selected ? p.accentSoft : p.paper, borderColor: selected ? p.accent : p.border, opacity: existing ? 0.5 : pressed ? 0.75 : 1 }]}>
        <View style={[c.row, { justifyContent: 'space-between', marginBottom: 8 }]}>
          <ReaderIcon name={option.icon} color={selected ? p.accent : p.muted} size={22} />
          <View style={[c.choiceMark, { borderColor: selected ? p.accent : p.border, backgroundColor: selected ? p.accent : 'transparent' }]}>{selected && <ReaderIcon name="check" color={p.paper} size={13} strokeWidth={2.4} />}</View>
        </View>
        <Text style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>{option.title}</Text>
        <Text style={{ color: p.muted, fontSize: 12, lineHeight: 18 }}>{existing ? selected ? 'هدفك الحالي' : 'متاح بعد إتمام هدفك' : option.detail}</Text>
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
      <View style={[c.stepBar, { backgroundColor: step >= i ? p.accent : withAlpha(p.text, 0.1) }]} />
      <View style={[c.row, { gap: 6 }]}>
        {step > i ? <ReaderIcon name="check" color={p.accent} size={14} strokeWidth={2.4} /> : <Text style={{ color: step === i ? p.accent : p.muted, fontSize: 13 }}>{arabicNumber(i + 1)}</Text>}
        <Text style={{ color: step === i ? p.text : p.muted, fontSize: 13, fontWeight: step === i ? '600' : '400' }}>{label}</Text>
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
          style={{ width: '100%', minHeight: 60, padding: 0, fontFamily: 'ReaderNaskhSemibold', fontSize: 36, color: p.text, textAlign: 'center', writingDirection: 'ltr' }} />
        <Text style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>{unit}</Text>
      </View>
      <AmountButton label={`تقليل ${label}`} disabled={amount <= minimum} onPress={() => change(-1)} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {presets.map(preset => {
        const selected = amount === Number(preset);
        return <Pressable key={preset} accessibilityRole="button" accessibilityLabel={`${arabicNumber(Number(preset))} ${unit}`} accessibilityState={{ selected }} aria-pressed={selected} onPress={() => onChange(preset)}
          style={({ pressed }) => [c.preset, { backgroundColor: selected ? p.accentSoft : 'transparent', borderColor: selected ? p.accent : p.border, opacity: pressed ? 0.65 : 1 }]}>
          <Text style={{ color: selected ? p.accent : p.muted, fontSize: 15, fontWeight: selected ? '600' : '400', textAlign: 'center' }}>{arabicNumber(Number(preset))}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
function AmountButton({ label, plus = false, disabled, onPress }: { label: string; plus?: boolean; disabled: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [c.amountButton, { borderColor: p.border, backgroundColor: pressed ? p.accentSoft : p.paper, opacity: disabled ? 0.3 : 1 }]}>
    <View style={{ width: 16, height: 2, backgroundColor: p.accent }} />
    {plus && <View style={{ position: 'absolute', width: 2, height: 16, backgroundColor: p.accent }} />}
  </Pressable>;
}

export function ExistingGoalCard({ goal, onOpen }: { goal: SequentialPlan; onOpen: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[c.panel, { backgroundColor: p.paper, borderColor: p.border, gap: 14 }]}>
    <View style={c.row}><View style={[c.existingIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name="check" color={p.accent} size={20} /></View>
      <View style={c.grow}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>{goal.goal.type === 'khatma' ? 'لديك ختمة بالفعل' : 'لديك ورد يومي بالفعل'}</Text></View>
    </View>
    <Text style={{ color: p.muted, fontSize: 13, lineHeight: 22 }}>تابع هدفك الحالي أو عدّل إعداداته من صفحته.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`عرض الهدف الحالي: ${goal.name}`} onPress={onOpen}
      style={({ pressed }) => [c.existingLink, { borderColor: p.border, backgroundColor: pressed ? p.accentSoft : 'transparent' }]}>
      <View style={c.grow}><Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>{goal.name}</Text><Text style={{ color: p.accent, fontSize: 13 }}>عرض الهدف الحالي</Text></View>
      <ReaderIcon name="chevron" color={p.accent} />
    </Pressable>
  </View>;
}

export const c = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingStart: 12, paddingEnd: 16, borderRadius: readerShape.control },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 20, paddingTop: 6, paddingBottom: 28, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  panel: { padding: 18, borderWidth: 1, borderRadius: readerShape.card, gap: 20 },
  sectionIcon: { width: 28, height: 28, borderRadius: readerShape.control - 2, alignItems: 'center', justifyContent: 'center' },
  typeCard: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: readerShape.card, padding: 16 },
  choiceMark: { width: 20, height: 20, borderRadius: readerShape.detail, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  step: { flex: 1, gap: 8, minHeight: 44, justifyContent: 'center' },
  stepBar: { height: 3, borderRadius: readerShape.detail },
  amountButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: readerShape.control },
  preset: { flex: 1, minWidth: 0, minHeight: 44, borderWidth: 1, borderRadius: readerShape.control, justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  existingIcon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  existingLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1, borderRadius: readerShape.control, padding: 14 },
  footer: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 20, paddingVertical: 12, gap: 6 },
});
