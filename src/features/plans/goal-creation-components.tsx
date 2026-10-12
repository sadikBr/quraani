import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { khatam } from '@/components/craft/art';
import { Lawh } from '@/components/craft/lawh';
import { BrushStroke, Medallion } from '@/components/craft/marks';
import { Row, Section, type Back } from '@/components/craft/page';
import { Button } from '@/components/ui';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { mixColor, readerLayout, readerShape, withAlpha } from '../quran-reader/design';
import { formatNumber, t } from '@/i18n';
import { GoalMark, type GoalKind } from './goal-card';
import { weekdayDateLabel } from './presentation';
import type { SequentialGoal, SequentialPlan } from './types';

/**
 * The bar of a creation screen, as the kit's page bar: the way back (an arrow), marked disabled
 * while the goal is being saved, and at its end the kind of goal being made, by its mark.
 */
export function CreationBar({ back, kind, label, disabled = false }: { back: Back; kind: GoalKind; label: string; disabled?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <View style={c.bar}>
    <Button variant="outline" icon="back" label={back.label} palette={p} disabled={disabled} onPress={back.onPress}>{back.text}</Button>
    <View style={{ flex: 1 }} />
    <View style={[c.row, { gap: 8 }]}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{label}</Text>
      <GoalMark kind={kind} width={30} />
    </View>
  </View>;
}

/** A part of a creation form: its title in Naskh, its fields on a card, and a line under the card. */
export function CreationSection({ title, children, description }: PropsWithChildren<{ title: string; description?: string }>) {
  const { palette: p } = useReadingPreferences();
  return <Section title={title} palette={p}>
    <View style={[c.panel, { backgroundColor: p.card, borderColor: p.border }]}>{children}</View>
    {!!description && <Text style={{ fontSize: 13, lineHeight: 21, color: p.mutedForeground, paddingHorizontal: 2, marginTop: -2 }}>{description}</Text>}
  </Section>;
}

/** The lawh of a creation form: the goal's main choice (how much, how long) written on the board. */
export function CreationBoard({ children }: PropsWithChildren) {
  const { palette: p } = useReadingPreferences();
  return <Lawh palette={p} contentStyle={{ gap: 16, paddingTop: 44 }}>{children}</Lawh>;
}

/** A label on the lawh, over the choice it names. */
export function BoardLabel({ children, center = false }: { children: string; center?: boolean }) {
  const { palette: p } = useReadingPreferences();
  return <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold', textAlign: center ? 'center' : undefined }}>{children}</Text>;
}

/**
 * The two ways of reading the whole mushaf, written as two words at the head of the lawh, the
 * chosen one underlined with the brushed stroke; what it means is said under them.
 */
export function GoalTypeChoices({ kind, onChange, existing }: { kind: SequentialGoal['type']; onChange: (kind: SequentialGoal['type']) => void; existing?: SequentialPlan }) {
  const { palette: p } = useReadingPreferences();
  const chosen = existing?.goal.type ?? kind;
  const options = [{ type: 'khatma', title: t('goals.types.khatma'), detail: t('plans.creation.goalType.khatmaDetail') }, { type: 'wird', title: t('goals.types.wird'), detail: t('plans.creation.goalType.wirdDetail') }] as const;
  const detail = options.find(option => option.type === chosen)!.detail;
  return <View style={{ gap: 6 }}>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('plans.creation.goalType.label')} style={c.words}>
      {options.map(option => {
        const selected = option.type === chosen;
        return <Pressable key={option.type} accessibilityRole="radio" accessibilityLabel={existing ? t('plans.creation.goalType.unavailableLabel', { goal: option.title }) : option.title}
          accessibilityHint={existing ? undefined : option.detail} accessibilityState={{ checked: selected, disabled: !!existing }} aria-checked={selected} disabled={!!existing} onPress={() => onChange(option.type)}
          hitSlop={6} style={({ pressed }) => [c.word, { opacity: existing && !selected ? 0.45 : pressed && !selected ? 0.7 : 1 }]}>
          <Text style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 22, lineHeight: 40, fontFamily: selected ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold', textAlign: 'center' }}>{option.title}</Text>
          <BrushStroke on={selected} color={p.ornament} />
          {/* With a reading goal in progress, each word says where it stands. */}
          {existing && <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{selected ? t('plans.creation.goalType.current') : t('plans.creation.goalType.later')}</Text>}
        </Pressable>;
      })}
    </View>
    {!existing && <Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{detail}</Text>}
  </View>;
}

/**
 * The two steps of making a goal, as two words with their numbers in stars: the step one is on
 * underlined with the brushed stroke, a step done filled with gold.
 */
export function CreationSteps({ step, canReview, onChange }: { step: 0 | 1; canReview: boolean; onChange: (step: 0 | 1) => void }) {
  const { palette: p } = useReadingPreferences();
  const steps = [['setup', t('goals.setup')], ['review', t('plans.creation.steps.review')]] as const;
  return <View accessibilityRole="tablist" accessibilityLabel={t('plans.creation.steps.label')} style={c.steps}>
    {steps.map(([id, label], i) => [
      i > 0 && <View key={`${id}-thread`} aria-hidden style={[c.thread, { borderColor: withAlpha(p.ornament, 0.5) }]} />,
      <Pressable key={id} accessibilityRole="tab" accessibilityLabel={label}
        accessibilityState={{ selected: step === i, disabled: i === 1 && !canReview }} aria-selected={step === i} disabled={i === 1 && !canReview} onPress={() => onChange(i as 0 | 1)}
        style={({ pressed }) => [c.step, { opacity: pressed ? 0.6 : i === 1 && !canReview ? 0.5 : 1 }]}>
        <View style={[c.row, { gap: 6 }]}>
          <Medallion value={i + 1} size={28} palette={p} current={step > i} tone={step >= i ? p.ornament : withAlpha(p.mutedForeground, 0.8)} />
          <Text style={{ color: step === i ? p.foreground : p.mutedForeground, fontSize: 16, lineHeight: 28, fontFamily: step === i ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{label}</Text>
        </View>
        <BrushStroke on={step === i} width={52} color={p.ornament} />
      </Pressable>,
    ])}
  </View>;
}

/**
 * An amount, written in a star between − and +, its unit under it, and quick choices beneath.
 * `presetLabel` gives each quick choice its spoken label ("٥ صفحات"); without it, the number is followed by `unit`.
 */
export function AmountPicker({ label, value, onChange, unit, presets, minimum, maximum, increment = 1, parse, presetLabel }: {
  label: string; value: string; onChange: (value: string) => void; unit: string; presets: string[]; minimum: number; maximum: number; increment?: number; parse: (value: string) => number; presetLabel?: (amount: number) => string;
}) {
  const { palette: p } = useReadingPreferences();
  const amount = parse(value);
  const change = (direction: number) => onChange(String(Math.max(minimum, Math.min(maximum, Math.round(((Number.isFinite(amount) ? amount : minimum) + direction * increment) * 1000) / 1000))));
  return <View style={{ gap: 16 }}>
    <View style={[c.row, { justifyContent: 'center', gap: 14 }]}>
      <AmountButton label={t('plans.creation.amount.increase', { label })} plus disabled={amount >= maximum} onPress={() => change(1)} />
      <View style={{ alignItems: 'center', width: 128 }}>
        <View style={c.star}>
          <Svg width={112} height={112} style={StyleSheet.absoluteFill} aria-hidden>
            <Path d={khatam(56, 56, 38)} fill={withAlpha(p.ornament, 0.1)} stroke={p.ornament} strokeWidth={1.3} strokeLinejoin="round" />
            <Circle cx={56} cy={56} r={35} fill="none" stroke={withAlpha(p.ornament, 0.45)} strokeWidth={1} />
          </Svg>
          <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} selectTextOnFocus keyboardType={increment === 1 ? 'number-pad' : 'decimal-pad'} maxLength={7} selectionColor={p.primary}
            style={{ width: 96, minHeight: 52, padding: 0, fontFamily: 'UiNumericSemiBold', fontSize: value.length > 4 ? 22 : 32, letterSpacing: -0.8, color: p.foreground, textAlign: 'center', writingDirection: 'ltr' }} />
        </View>
        <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center', marginTop: 2 }}>{unit}</Text>
      </View>
      <AmountButton label={t('plans.creation.amount.decrease', { label })} disabled={amount <= minimum} onPress={() => change(-1)} />
    </View>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {presets.map(preset => {
        const selected = amount === Number(preset);
        return <Pressable key={preset} accessibilityRole="button" accessibilityLabel={presetLabel ? presetLabel(Number(preset)) : t('plans.creation.amount.preset', { amount: Number(preset), unit })} accessibilityState={{ selected }} aria-pressed={selected} onPress={() => onChange(preset)} hitSlop={4}
          style={({ pressed }) => [c.preset, { backgroundColor: selected ? p.primary : pressed ? p.accent : p.background, borderColor: selected ? p.primary : p.input }]}>
          <Text style={{ color: selected ? p.primaryForeground : p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{formatNumber(Number(preset))}</Text>
        </Pressable>;
      })}
    </View>
  </View>;
}
function AmountButton({ label, plus = false, disabled, onPress }: { label: string; plus?: boolean; disabled: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [c.amountButton, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.4 : 1 }]}>
    <ReaderIcon name={plus ? 'plus' : 'minus'} color={p.foreground} size={20} />
  </Pressable>;
}

/** The reading goal already in progress, in place of the form: what it is, and the way to it. */
export function ExistingGoalCard({ goal, onOpen }: { goal: SequentialPlan; onOpen: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[c.panel, { backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.5), gap: 14 }]}>
    <View style={[c.row, { gap: 12 }]}><GoalMark kind={goal.goal.type} />
      <View style={c.grow}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{goal.goal.type === 'khatma' ? t('plans.creation.existing.khatma') : t('plans.creation.existing.wird')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('plans.creation.existing.detail')}</Text></View>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('plans.creation.existing.viewLabel', { name: goal.name })} onPress={onOpen}
      style={({ pressed }) => [c.existingLink, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background }]}>
      <View style={c.grow}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{goal.name}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('goals.viewCurrent')}</Text></View>
      <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
    </Pressable>
  </View>;
}

/**
 * What is memorized, as one choice that opens the list: a star, how much it holds, and the way to
 * change it. Without `onPress` it only says it (a memorization goal keeps the record).
 */
export function MemoryPicker({ title, detail, action, label, disabled = false, onPress }: { title: string; detail: string; action?: string; label?: string; disabled?: boolean; onPress?: () => void }) {
  const { palette: p } = useReadingPreferences();
  const body = <>
    <View style={[c.row, { gap: 12 }]}>
      <View style={[c.memoryMark, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name="check" color={p.ornament} size={20} /></View>
      <View style={c.grow}>
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{detail}</Text>
      </View>
      {onPress && <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />}
    </View>
    {onPress && !!action && <View style={[c.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 10 }]}>
      <ReaderIcon name="pencil" size={14} color={p.primary} /><Text style={{ color: p.primary, fontSize: 14, fontWeight: '600' }}>{action}</Text>
    </View>}
  </>;
  if (!onPress) return <View style={[c.memory, { borderColor: p.border, backgroundColor: p.background }]}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [c.memory, { borderColor: withAlpha(p.ornament, 0.45), backgroundColor: pressed ? p.accent : mixColor(p.card, p.ornament, 0.04), opacity: disabled ? 0.55 : 1 }]}>{body}</Pressable>;
}

/** A day of a first schedule, as a row: the day of the month in a star, the day, what it holds, and how many ayahs. */
export function ScheduleRow({ date, lines, count }: { date: string; lines: string[]; count: string }) {
  const { palette: p } = useReadingPreferences();
  return <Row palette={p} leading={<Medallion value={Number(date.slice(8))} size={38} palette={p} />} title={weekdayDateLabel(date)} detail={lines.join('\n')}
    trailing={<Text style={{ color: p.mutedForeground, fontSize: 12, alignSelf: 'flex-start', marginTop: 4 }}>{count}</Text>} />;
}

/** The foot of a creation form: what to know, then the button to the next step. */
export function CreationFooter({ children }: { children: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[c.footer, { backgroundColor: p.card, borderColor: p.border }]}>{children}</View>;
}

export const c = StyleSheet.create({
  bar: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 28, gap: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  panel: { borderWidth: 1, borderRadius: readerShape.card, padding: 16, gap: 18 },
  words: { flexDirection: 'row', justifyContent: 'center', gap: 32 },
  word: { alignItems: 'center' },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  thread: { flex: 1, borderTopWidth: 1.5, borderStyle: 'dashed', marginBottom: 8 },
  star: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  amountButton: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  preset: { flex: 1, minWidth: 0, minHeight: 40, borderWidth: 1, borderRadius: readerShape.control, justifyContent: 'center', paddingHorizontal: 4, paddingVertical: 4 },
  memory: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 10 },
  memoryMark: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  existingLink: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderWidth: 1, borderRadius: readerShape.control, padding: 14 },
  footer: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
});
