import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { archPath, artColors, khatam } from '@/components/craft/art';
import { ArchPanel } from '@/components/craft/panels';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { isDarkColor, mixColor, withAlpha } from '@/features/quran-reader/design';
import { WEEKDAYS } from '@/features/plans/recurring';
import { t } from '@/i18n';
import { NAME_LIMIT, REMINDER_LEADS, type ReminderLead } from './model';
import { HalaqaMark } from './ring';

/**
 * The halaqa's name, written large in Naskh on an arched plate under its mark, a dotted line
 * under it as on a lawh (gold while it is being written), and how the halaqa reads so far under it
 * (`facts`: its riwayah, its days, its time).
 */
export function NamePlate({ value, onChange, facts, palette: p }: { value: string; onChange: (value: string) => void; facts: string; palette: ReaderPalette }) {
  const [focused, setFocused] = useState(false);
  const [width, setWidth] = useState(0);
  return <ArchPanel palette={p} rise={40} tone={focused ? p.ornament : undefined} contentStyle={s.plate}>
    <HalaqaMark palette={p} width={44} />
    <Text style={{ color: p.mutedForeground, fontSize: 12, fontWeight: '600', marginTop: 8 }}>{t('halaqat.form.name')}</Text>
    <TextInput accessibilityLabel={t('halaqat.form.name')} value={value} onChangeText={onChange} placeholder={t('halaqat.form.namePlaceholder')}
      placeholderTextColor={withAlpha(p.mutedForeground, 0.6)} maxLength={NAME_LIMIT} selectionColor={p.primary} returnKeyType="done"
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={[s.name, { color: p.foreground }]} />
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ alignSelf: 'stretch', marginHorizontal: 28, height: 4 }} aria-hidden>
      {width > 0 && <Svg width={width} height={4}>
        <Path d={`M 1 2 H ${width - 1}`} stroke={focused ? p.ornament : withAlpha(p.ornament, 0.5)} strokeWidth={focused ? 1.5 : 2} strokeLinecap="round" strokeDasharray={focused ? undefined : '1 7'} />
      </Svg>}
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: 8 }}>{facts}</Text>
  </ArchPanel>;
}

/**
 * The days of the week as an arcade of seven arches, from the reading start: a day the halaqa
 * meets on is a dark arch, its letter in gold; the others are drawn in a line, to be chosen.
 */
export function DayArcade({ days, onChange, palette: p }: { days: number[]; onChange: (days: number[]) => void; palette: ReaderPalette }) {
  const [width, setWidth] = useState(0);
  const colors = artColors(p);
  // A chosen day: the dark tile on a light page; on a dark page (where the tiles are the card
  // warmed by gold) the gold stronger still, so it stands apart from the days left out.
  const dark = isDarkColor(p.background);
  const chosen = dark ? { fill: mixColor(p.card, p.ornament, 0.32), letter: p.foreground, name: withAlpha(p.foreground, 0.8), edge: p.ornament }
    : { fill: colors.surface, letter: p.ornament, name: colors.soft, edge: colors.edge };
  const gap = 6, w = width ? (width - gap * 6) / 7 : 0, h = Math.round(w * 1.42), rise = Math.round(w * 0.5);
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={[s.arcade, { gap, minHeight: h || 64 }]}>
    {w > 0 && WEEKDAYS.map((day) => {
      const on = days.includes(day.value);
      return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityLabel={day.label} accessibilityState={{ checked: on }} aria-checked={on} hitSlop={{ top: 4, bottom: 4 }}
        onPress={() => onChange(on ? days.filter((d) => d !== day.value) : [...days, day.value].sort((a, b) => a - b))} style={{ width: w, height: h }}>
        {({ pressed }) => <>
          <Svg width={w} height={h} style={StyleSheet.absoluteFill} aria-hidden>
            <Path d={archPath(w - 2, h - 2, rise, 1, 1, 8)} fill={on ? chosen.fill : pressed ? p.accent : p.card}
              stroke={on ? chosen.edge : withAlpha(p.ornament, 0.45)} strokeWidth={1.2} />
            {on && <Path d={archPath(w - 10, h - 10, rise - 4, 5, 5, 5)} fill="none" stroke={colors.line} strokeWidth={1} />}
          </Svg>
          <View style={[StyleSheet.absoluteFill, s.day, { paddingTop: Math.round(rise * 0.45) }]}>
            <Text style={{ color: on ? chosen.letter : p.foreground, fontSize: 19, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{day.short}</Text>
            <Text numberOfLines={1} style={{ color: on ? chosen.name : p.mutedForeground, fontSize: 10, lineHeight: 14 }}>{t(`halaqat.form.dayNames.${day.value}`)}</Text>
          </View>
        </>}
      </Pressable>;
    })}
  </View>;
}

/**
 * When the reminder comes, as a thread running up to the session: from two hours before it (at
 * the reading start) to its start, a star. The chosen bead is gold, haloed.
 */
export function LeadTrack({ value, onChange, palette: p }: { value: ReminderLead; onChange: (lead: ReminderLead) => void; palette: ReaderPalette }) {
  const stops = [...REMINDER_LEADS].reverse();
  const inset = `${50 / stops.length}%` as const;
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('halaqat.reminders.lead')} style={s.track}>
    <View style={[s.thread, { backgroundColor: withAlpha(p.ornament, 0.4), start: inset, end: inset }]} />
    {stops.map((lead) => {
      const on = lead === value;
      return <Pressable key={lead} accessibilityRole="radio" accessibilityLabel={t(`halaqat.reminders.leads.${lead}`)} accessibilityState={{ checked: on }} aria-checked={on}
        onPress={() => onChange(lead)} style={({ pressed }) => [s.stop, { opacity: pressed ? 0.7 : 1 }]}>
        <Svg width={26} height={26} aria-hidden>
          {on && <Circle cx={13} cy={13} r={11.5} fill={p.card} stroke={withAlpha(p.ornament, 0.55)} strokeWidth={1} />}
          {lead === 0
            ? <Path d={khatam(13, 13, on ? 5.6 : 4.6)} fill={on ? p.ornament : p.card} stroke={p.ornament} strokeWidth={1.1} strokeLinejoin="round" />
            : <Circle cx={13} cy={13} r={on ? 7 : 5.5} fill={on ? p.ornament : p.card} stroke={p.ornament} strokeWidth={1.2} />}
        </Svg>
        <Text numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 11, lineHeight: 16, fontWeight: on ? '700' : '400', textAlign: 'center' }}>
          {t(`halaqat.reminders.short.${lead}`)}
        </Text>
      </Pressable>;
    })}
  </View>;
}

const s = StyleSheet.create({
  plate: { alignItems: 'center', paddingTop: 30, paddingHorizontal: 18, paddingBottom: 20 },
  name: { alignSelf: 'stretch', minHeight: 56, paddingVertical: 4, paddingHorizontal: 8, fontSize: 24, fontFamily: 'ReaderNaskhBold', textAlign: 'center', writingDirection: 'rtl' },
  arcade: { flexDirection: 'row' },
  day: { alignItems: 'center', justifyContent: 'center' },
  track: { flexDirection: 'row' },
  thread: { position: 'absolute', top: 16.25, height: 1.5 },
  stop: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, paddingTop: 4, paddingBottom: 2 },
});
