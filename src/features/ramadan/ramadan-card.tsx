import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button, IconTile } from '@/components/ui';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { currentGoal } from '@/features/plans/goal-limit';
import { usePlans } from '@/features/plans/provider';
import { useNow, usePrayers } from '@/features/prayers/provider';
import { clock, countdown, dayOf, dayTimes } from '@/features/prayers/times';
import { formatList, t } from '@/i18n';
import { fastAt, ramadanDay } from './ramadan';

/**
 * In Ramadan, on the home screen: which day of the month it is, when the fast stops and when it
 * is broken at the user's place, the time left to the one that comes next, and a khatma for the
 * month (a juz' a day) while no khatma or daily wird is under way. Nothing outside Ramadan.
 */
export function RamadanCard() {
  const { palette: p } = useReadingPreferences();
  const { state, ready } = usePrayers();
  const { plans, ready: plansReady } = usePlans();
  const now = useNow(30_000);
  const today = dayOf(now);
  const day = ready ? ramadanDay(today, state.hijriOffset) : null;
  if (!day) return null;
  const place = state.location;
  const fast = place ? fastAt((date) => dayTimes(place, date, state), today, now) : null;
  const goal = plansReady ? currentGoal(plans) : undefined;
  return <View accessibilityLabel={t('ramadan.label', { day })} style={[s.card, { backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.5) }, readerElevation(1, p)]}>
    <View style={s.head}>
      <IconTile name="moon-star" palette={p} />
      <Text accessibilityRole="header" style={{ flex: 1, color: p.foreground, fontSize: 19, lineHeight: 32, fontFamily: 'ReaderNaskhBold' }}>{formatList([t('ramadan.title'), t('ramadan.day', { day })])}</Text>
    </View>
    {fast ? <>
      <View style={[s.times, { borderColor: p.border }]}>
        <Time label={t('ramadan.imsak')} time={clock(fast.imsak)} awaited={!fast.fasting} palette={p} />
        <View style={[s.divider, { backgroundColor: p.border }]} />
        <Time label={t('ramadan.iftar')} time={clock(fast.iftar)} awaited={fast.fasting} palette={p} />
      </View>
      <View accessible style={s.left}>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{fast.fasting ? t('ramadan.untilIftar') : t('ramadan.untilImsak')}</Text>
        <Text style={{ color: p.primary, fontSize: 18, fontWeight: '700' }}>{countdown(now, fast.fasting ? fast.iftar : fast.imsak, false)}</Text>
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>{t('ramadan.note')}</Text>
    </> : <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('ramadan.noPlace')}</Text>}
    {plansReady && <View style={[s.khatma, { borderColor: p.border }]}>
      {goal ? <Button variant="outline" icon="book" palette={p} block onPress={() => router.push({ pathname: '/plans/[id]', params: { id: goal.id } })}>{t('ramadan.khatma.open')}</Button> : <>
        <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontWeight: '600' }}>{t('ramadan.khatma.title')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('ramadan.khatma.detail')}</Text>
        <Button icon="plus" palette={p} block onPress={() => router.push({ pathname: '/plans/new', params: { type: 'wird', preset: 'ramadan' } })}>{t('ramadan.khatma.action')}</Button>
      </>}
    </View>}
  </View>;
}

function Time({ label, time, awaited, palette: p }: { label: string; time: string; awaited: boolean; palette: ReaderPalette }) {
  return <View accessible style={{ flex: 1, alignItems: 'center', gap: 2 }}>
    <Text style={{ color: awaited ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: awaited ? '700' : '400' }}>{label}</Text>
    <Text style={{ color: awaited ? p.primary : p.foreground, fontSize: 24, lineHeight: 34, fontWeight: '700' }}>{time}</Text>
  </View>;
}

const s = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  times: { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  left: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6 },
  khatma: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 6 },
});
