import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Section, page } from '@/components/craft/page';
import { ArchPanel } from '@/components/craft/panels';
import { IconTile } from '@/components/ui';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { weekdayDateLabel } from '@/features/plans/presentation';
import { formatDate, formatNumber, t } from '@/i18n';
import { monthWeeks, shiftMonth } from './log';
import { useActivity } from './provider';
import { streakMessage } from './streak-card';

/** Monday first, as the calendars of Morocco; indexed like `Date.getUTCDay()`. */
const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;

/**
 * The user's days («مواظبتك»): the run they are on with a word to keep it going, the longest run
 * and the count of all the days, then any month as a calendar with its days marked.
 */
export function ActivityScreen() {
  const { palette: p } = useReadingPreferences();
  const { days, streak, today } = useActivity();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const thisMonth = today.slice(0, 7);
  const first = Object.keys(days)[0]?.slice(0, 7) ?? thisMonth;
  const done = Object.keys(days).filter((date) => date.startsWith(month)).length;
  const lit = streak.current > 0;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar title={t('activity.title')} back={{ label: t('common.back'), onPress: () => router.back() }} palette={p} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 22 }]}>
      <PageTitle subtitle={t('activity.subtitle')} palette={p} />
      <ArchPanel palette={p} rise={40} tone={lit ? p.ornament : undefined} contentStyle={s.hero}>
        <IconTile name="flame" palette={p} size={48} tone={lit ? p.ornament : p.mutedForeground} />
        <NativeText accessible={false} style={{ color: lit ? p.foreground : p.mutedForeground, fontSize: 44, lineHeight: 54, fontFamily: 'UiNumericSemiBold' }}>{formatNumber(streak.current)}</NativeText>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{t('activity.run', { count: streak.current })}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 23, textAlign: 'center' }}>{streakMessage(streak)}</Text>
      </ArchPanel>
      <View style={[s.stats, { backgroundColor: p.card, borderColor: p.border }]}>
        <Stat label={t('activity.stats.best')} value={t('activity.days', { count: streak.best })} palette={p} />
        <View style={[s.divider, { backgroundColor: p.border }]} />
        <Stat label={t('activity.stats.total')} value={t('activity.days', { count: streak.total })} palette={p} />
      </View>
      <Section title={formatDate(`${month}-01`, { month: 'long', year: 'numeric' })} detail={done ? t('activity.month.count', { days: t('activity.days', { count: done }) }) : t('activity.month.none')} palette={p}
        action={<View style={{ flexDirection: 'row', gap: 6 }}>
          {/* Reading runs right to left: the earlier month is to the right. */}
          <Arrow icon="chevron-right" label={t('activity.month.previous')} disabled={month <= first} onPress={() => setMonth(shiftMonth(month, -1))} palette={p} />
          <Arrow icon="chevron" label={t('activity.month.next')} disabled={month >= thisMonth} onPress={() => setMonth(shiftMonth(month, 1))} palette={p} />
        </View>}>
        <View style={[s.calendar, { backgroundColor: p.card, borderColor: p.border }]}>
          <View style={s.week} aria-hidden>
            {WEEK.map((day) => <Text key={day} style={[s.cell, { color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }]}>{t(`common.weekdays.letter.${day}`)}</Text>)}
          </View>
          {monthWeeks(month).map((week, i) => <View key={i} style={s.week}>
            {week.map((date, j) => {
              if (!date) return <View key={j} style={s.cell} />;
              const read = !!days[date], now = date === today, ahead = date > today;
              return <View key={date} accessible accessibilityLabel={t(read ? 'activity.month.done' : 'activity.month.notDone', { date: now ? t('activity.month.today') : weekdayDateLabel(date) })} style={s.cell}>
                <View style={[s.day, { backgroundColor: read ? p.ornament : 'transparent', borderColor: now ? p.primary : 'transparent', borderWidth: now ? 2 : 0 }]}>
                  <NativeText style={{ color: read ? p.background : ahead ? withAlpha(p.mutedForeground, 0.5) : p.foreground, fontSize: 14, fontFamily: read || now ? 'UiNumericSemiBold' : 'UiNumeric' }}>{formatNumber(Number(date.slice(8)))}</NativeText>
                </View>
              </View>;
            })}
          </View>)}
        </View>
      </Section>
      <View style={{ gap: 4, alignItems: 'center', paddingHorizontal: 12 }}>
        <Text style={{ color: p.foreground, fontSize: 17, lineHeight: 32, fontFamily: 'ReaderNaskh', textAlign: 'center' }}>{t('activity.hadith')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{t('activity.hadithSource')}</Text>
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>{t('activity.note')}</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ label, value, palette: p }: { label: string; value: string; palette: ReaderPalette }) {
  return <View accessible style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{label}</Text>
    <Text style={{ color: p.foreground, fontSize: 17, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{value}</Text>
  </View>;
}

function Arrow({ icon, label, disabled, onPress, palette: p }: { icon: 'chevron' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [s.arrow, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.35 : 1 }]}>
    <ReaderIcon name={icon} color={p.foreground} size={16} />
  </Pressable>;
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 4, paddingTop: 46, paddingHorizontal: 18, paddingBottom: 20 },
  stats: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: readerShape.card, paddingVertical: 12 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  calendar: { borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 8, paddingVertical: 10, gap: 4 },
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40 },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 36, height: 36, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
