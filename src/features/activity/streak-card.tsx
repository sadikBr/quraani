import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { formatList, t } from '@/i18n';
import { recentDays, type Streak } from './log';
import { useActivity } from './provider';

/** What to say of the run: an invitation, thanks for today, or what today's reading would reach. */
export function streakMessage(streak: Streak): string {
  if (!streak.total) return t('activity.message.start');
  if (streak.today) return t('activity.message.done', { reach: t('activity.reach', { count: streak.current + 1 }) });
  if (streak.current) return t('activity.message.keep', { reach: t('activity.reach', { count: streak.current + 1 }) });
  return t('activity.message.again');
}

/** The last seven days as beads, oldest first (to the right): filled where something was recorded, today ringed. */
export function WeekBeads({ days, today, palette: p }: { days: Record<string, number>; today: string; palette: ReaderPalette }) {
  const week = recentDays(days, today);
  return <View accessible accessibilityLabel={t('activity.week', { days: t('activity.days', { count: week.filter((d) => d.done).length }) })} style={s.week}>
    {week.map(({ date, done }) => <View key={date} style={{ alignItems: 'center', gap: 4 }}>
      <View style={[s.bead, { backgroundColor: done ? p.ornament : 'transparent', borderColor: done ? p.ornament : date === today ? p.primary : p.input, borderWidth: date === today && !done ? 2 : 1 }]}>
        {done && <ReaderIcon name="check" color={p.background} size={12} />}
      </View>
      <Text aria-hidden style={{ color: date === today ? p.foreground : p.mutedForeground, fontSize: 11, lineHeight: 16, fontWeight: date === today ? '700' : '400' }}>
        {t(`common.weekdays.letter.${new Date(`${date}T12:00:00Z`).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6}`)}
      </Text>
    </View>)}
  </View>;
}

/**
 * The run of days on the home screen: the flame and its count, the last seven days, and a word
 * to keep going. It opens the page of all the days.
 */
export function StreakCard() {
  const { palette: p } = useReadingPreferences();
  const { days, streak, ready, today } = useActivity();
  if (!ready) return null;
  const lit = streak.current > 0;
  const title = lit ? t('activity.run', { count: streak.current }) : t('activity.title');
  const message = streakMessage(streak);
  return <Pressable accessibilityRole="button" accessibilityLabel={formatList([t('activity.title'), ...(lit ? [title] : []), message])} accessibilityHint={t('activity.open')}
    onPress={() => router.push('/activity')}
    style={({ pressed }) => [s.card, { backgroundColor: pressed ? p.accent : p.card, borderColor: lit ? withAlpha(p.ornament, 0.5) : p.border }, readerElevation(1, p)]}>
    <View style={s.head}>
      <IconTile name="flame" palette={p} tone={lit ? p.ornament : p.mutedForeground} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{message}</Text>
      </View>
      <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
    </View>
    <WeekBeads days={days} today={today} palette={p} />
  </Pressable>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  week: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  bead: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
