import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, IconTile } from '@/components/ui';
import { useEmbedded } from '@/components/embedded';
import { withAlpha } from '@/features/quran-reader/colors';
import { readerElevation, readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { formatDate, t } from '@/i18n';
import { alertIcons, effectiveAlert, hijriLabel } from './format';
import { alertsSupported } from './notifications';
import { placeName } from './place';
import { AlertSheet, LocationSheet, useLocate } from './prayer-sheets';
import { usePrayers, useNow } from './provider';
import { clock, countdown, dayOf, dayTimes, PRAYERS, prayerWindow, shiftDay, type PrayerId } from './times';

type Sheet = 'location' | { alert: PrayerId };

/**
 * The prayer times at the chosen place: the next prayer with the time left, and the times of any
 * day, week by week. The alerts, the athan and the calculation are in the settings' «الصلاة» tab.
 */
export function PrayersScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, ready, error } = usePrayers();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const embedded = useEmbedded();
  const Frame = embedded ? View : SafeAreaView;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.backToReading')} onPress={() => router.dismissTo('/')}>{t('plans.list.mushaf')}</Button>
    </View>}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, embedded && { paddingTop: 16 }]}>
      {!embedded && <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('prayers.title')}</Text>}
      {error && <Alert variant="destructive" palette={p}>{t('prayers.storageError')}</Alert>}
      {!ready ? null : state.location ? <>
        <LocationRow onPress={() => setSheet('location')} />
        <NextPrayer />
        <WeekTimes onAlert={(prayer) => setSheet({ alert: prayer })} />
      </> : <LocationSetup onChoose={() => setSheet('location')} />}
      {ready && <SettingsLink />}
    </ScrollView>
    {sheet === 'location' && <LocationSheet onClose={() => setSheet(null)} />}
    {typeof sheet === 'object' && sheet && <AlertSheet prayer={sheet.alert} onClose={() => setSheet(null)} />}
  </Frame>;
}

function LocationSetup({ onChoose }: { onChoose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const locate = useLocate();
  return <View style={[s.setup, { borderColor: p.border }]}>
    <View style={[s.setupIcon, { backgroundColor: p.secondary }]}><ReaderIcon name="map-pin" color={p.primary} size={22} /></View>
    <Text style={{ color: p.foreground, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{t('prayers.location.emptyTitle')}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>{t('prayers.location.emptyText')}</Text>
    <View style={s.setupActions}>
      <Button palette={p} icon="locate" block disabled={locate.busy} onPress={() => void locate.run()}>{locate.busy ? t('prayers.location.locating') : t('prayers.location.useMine')}</Button>
      <Button palette={p} variant="outline" icon="search" block onPress={onChoose}>{t('prayers.location.chooseCity')}</Button>
    </View>
    {!!locate.message && <Alert variant="destructive" palette={p}>{locate.message}</Alert>}
  </View>;
}

function LocationRow({ onPress }: { onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const place = state.location ? placeName(state.location) : '';
  return <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.location.changeLabel', { place })} onPress={onPress}
    style={({ pressed }) => [s.locationRow, { opacity: pressed ? 0.7 : 1 }]}>
    <ReaderIcon name="map-pin" color={p.primary} size={18} />
    <Text numberOfLines={1} style={{ flexShrink: 1, color: p.foreground, fontSize: 16, fontWeight: '600' }}>{place}</Text>
    <View style={[s.changePill, { backgroundColor: p.secondary }]}>
      <Text style={{ color: p.secondaryForeground, fontSize: 13, fontWeight: '500' }}>{t('prayers.location.change')}</Text>
    </View>
  </Pressable>;
}

/** An eight-pointed star in faint lines at the hero's far side, cut by its edge. */
function HeroOrnament({ color }: { color: string }) {
  const star = (cx: number, cy: number, r: number) => {
    const points = Array.from({ length: 16 }, (_, i) => {
      const angle = Math.PI / 8 * i - Math.PI / 2, radius = i % 2 ? r * 0.76 : r;
      return `${(cx + radius * Math.cos(angle)).toFixed(1)} ${(cy + radius * Math.sin(angle)).toFixed(1)}`;
    });
    return `M${points.join(' L')} Z`;
  };
  // SVG coordinates are not mirrored by the right-to-left layout: it stays at the left, the lines' end.
  return <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
    <Path d={star(18, 118, 118)} stroke={color} strokeOpacity={0.1} strokeWidth={1.5} fill="none" />
    <Path d={star(18, 118, 82)} stroke={color} strokeOpacity={0.1} strokeWidth={1.5} fill="none" />
    <Circle cx={18} cy={118} r={46} stroke={color} strokeOpacity={0.1} strokeWidth={1.5} fill="none" />
  </Svg>;
}

/** The next prayer in the theme's colour: its name and time, the time left, and how far the present time has gone. */
function NextPrayer() {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const now = useNow(1000);
  if (!state.location) return null;
  const { current, next } = prayerWindow(state.location, now, state);
  if (!next) return null;
  const today = dayOf(now);
  const name = t(`prayers.names.${next.prayer}`), time = clock(next.at), left = countdown(now, next.at);
  const fg = p.primaryForeground, soft = withAlpha(fg, 0.75);
  const span = current ? next.at.getTime() - current.at.getTime() : 0;
  const progress = current && span > 0 ? Math.min(1, Math.max(0, (now.getTime() - current.at.getTime()) / span)) : 0;
  return <View style={[s.hero, { backgroundColor: p.primary }, readerElevation(3, p)]}>
    <HeroOrnament color={fg} />
    <View style={s.heroDates}>
      <Text numberOfLines={1} style={{ flexShrink: 1, color: soft, fontSize: 13 }}>{hijriLabel(today, state.hijriOffset)}</Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, color: soft, fontSize: 13 }}>{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
    </View>
    <View accessible accessibilityLabel={t('prayers.next.spoken', { prayer: name, time, countdown: left })}>
      <Text style={{ color: soft, fontSize: 14 }}>{next.prayer === 'sunrise' ? t('prayers.next.sunriseLabel') : t('prayers.next.label')}</Text>
      <View style={s.heroRow}>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: fg, fontSize: 34, lineHeight: 52, fontWeight: '700' }}>{name}</Text>
        <Text style={{ color: fg, fontSize: 34, lineHeight: 52, fontWeight: '600' }}>{time}</Text>
      </View>
    </View>
    <View style={{ gap: 10 }}>
      <View style={[s.track, { backgroundColor: withAlpha(fg, 0.22) }]}>
        <View style={[s.fill, { width: `${progress * 100}%`, backgroundColor: fg }]} />
      </View>
      <View style={s.heroRow}>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: soft, fontSize: 13 }}>
          {current ? t('prayers.next.since', { prayer: t(`prayers.names.${current.prayer}`), time: clock(current.at) }) : ''}
        </Text>
        <View style={s.countdown}>
          <Text style={{ color: soft, fontSize: 14 }}>{t('prayers.next.in')}</Text>
          <Text style={{ color: fg, fontSize: 20, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{left}</Text>
        </View>
      </View>
    </View>
  </View>;
}

/**
 * Weeks start on Monday, as Morocco's calendars do (the app's dates are formatted for ar-MA).
 * Days are 'YYYY-MM-DD'; their weekday does not depend on the time zone.
 */
const FIRST_WEEKDAY = 1;
/** How many weeks back and ahead the times can be browsed. */
const WEEK_LIMIT = 52;
const weekday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay();
const WEEKDAYS = ['d0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6'] as const;
const weekStart = (day: string) => shiftDay(day, -((weekday(day) - FIRST_WEEKDAY + 7) % 7));
const weeksBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / (7 * 86_400_000));
const yearOf = (day: string) => day.slice(0, 4);

/** «5 – 11 أكتوبر», «28 سبتمبر – 4 أكتوبر», with the year when it is not this one. */
function weekRange(first: string, last: string, today: string) {
  const withYear = yearOf(first) !== yearOf(today) || yearOf(last) !== yearOf(today);
  const to = formatDate(last, withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
  const from = first.slice(0, 7) === last.slice(0, 7) ? formatDate(first, { day: 'numeric' })
    : formatDate(first, yearOf(first) !== yearOf(last) ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' });
  return t('prayers.week.range', { from, to });
}

/** The times of any day: a week of days to choose from, and the chosen day's six times with their alerts. */
function WeekTimes({ onAlert }: { onAlert: (prayer: PrayerId) => void }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const now = useNow(30_000);
  // Without a choice, the day shown is today, also past midnight.
  const [chosen, setChosen] = useState<string | null>(null);
  if (!state.location) return null;
  const today = dayOf(now);
  const day = chosen ?? today;
  const start = weekStart(day);
  const days = Array.from({ length: 7 }, (_, i) => shiftDay(start, i));
  const offset = weeksBetween(weekStart(today), start);
  const isToday = day === today;
  const choose = (next: string) => setChosen(next === today ? null : next);
  const times = dayTimes(state.location, day, state);
  const { current } = prayerWindow(state.location, now, state);
  const relative = isToday ? 'today' : day === shiftDay(today, 1) ? 'tomorrow' : day === shiftDay(today, -1) ? 'yesterday' : null;
  const longDate = formatDate(day, yearOf(day) === yearOf(today) ? { weekday: 'long', day: 'numeric', month: 'long' } : { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const title = relative ? t(`prayers.week.titles.${relative}`) : longDate;
  const hijri = hijriLabel(day, state.hijriOffset);
  const range = weekRange(days[0], days[6], today);
  return <View style={{ gap: 14 }}>
    <View style={[s.week, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
      <View style={s.weekNavigation}>
        <WeekArrow icon="chevron-right" label={t('prayers.week.previous')} disabled={offset <= -WEEK_LIMIT} onPress={() => choose(shiftDay(day, -7))} />
        <Text accessibilityLiveRegion="polite" accessibilityLabel={t('prayers.week.label', { range })} numberOfLines={1}
          style={{ flex: 1, textAlign: 'center', color: p.foreground, fontSize: 15, fontWeight: '600' }}>{range}</Text>
        <WeekArrow icon="chevron" label={t('prayers.week.next')} disabled={offset >= WEEK_LIMIT} onPress={() => choose(shiftDay(day, 7))} />
      </View>
      <View accessibilityRole="tablist" style={s.days}>
        {days.map((d) => {
          const selected = d === day, isTodayPill = d === today;
          const label = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
          return <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected}
            accessibilityLabel={isTodayPill ? t('prayers.week.todayLabel', { date: label }) : label} onPress={() => choose(d)}
            style={({ pressed }) => [s.day, { backgroundColor: selected ? p.primary : pressed ? p.accent : 'transparent' }]}>
            <Text numberOfLines={1} style={{ color: selected ? withAlpha(p.primaryForeground, 0.8) : isTodayPill ? p.primary : p.mutedForeground, fontSize: 11, fontWeight: '500' }}>{t(`prayers.week.days.${WEEKDAYS[weekday(d)]}`)}</Text>
            <Text style={{ color: selected ? p.primaryForeground : isTodayPill ? p.primary : p.foreground, fontSize: 17, lineHeight: 24, fontWeight: selected || isTodayPill ? '700' : '500' }}>{String(Number(d.slice(8)))}</Text>
            <View style={[s.todayDot, { backgroundColor: isTodayPill ? (selected ? p.primaryForeground : p.primary) : 'transparent' }]} />
          </Pressable>;
        })}
      </View>
    </View>
    <View style={s.dayHeading}>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{title}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{relative ? `${longDate} · ${hijri}` : hijri}</Text>
      </View>
      {!isToday && <Button size="sm" variant="outline" palette={p} icon="undo" label={t('prayers.week.backToToday')} onPress={() => setChosen(null)}>{t('prayers.week.today')}</Button>}
    </View>
    <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
      {PRAYERS.map((prayer, i) => {
        const at = times[prayer], valid = Number.isFinite(at.getTime());
        const isCurrent = isToday && current?.day === today && current.prayer === prayer;
        const past = isToday && !isCurrent && valid && at.getTime() <= now.getTime();
        // With alerts off, each bell still shows its setting, dimmed.
        const kind = effectiveAlert(state.alerts[prayer]), on = state.enabled && kind !== 'off';
        const alert = state.enabled ? t(`prayers.alerts.kinds.${kind}`) : t('prayers.today.alertsOff'), name = t(`prayers.names.${prayer}`);
        const time = valid ? clock(at) : '—';
        return <View key={prayer} style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, isCurrent && { backgroundColor: withAlpha(p.primary, 0.08) }]}>
          <View style={[s.currentBar, { backgroundColor: isCurrent ? p.primary : 'transparent' }]} />
          <View accessible accessibilityLabel={t('prayers.today.row', { prayer: name, time, alert })} style={s.rowText}>
            <Text style={{ flex: 1, color: past || prayer === 'sunrise' ? p.mutedForeground : p.foreground, fontSize: 16, fontWeight: isCurrent ? '700' : '500' }}>{name}</Text>
            {isCurrent && <View style={[s.currentBadge, { backgroundColor: withAlpha(p.primary, 0.14) }]}>
              <Text style={{ color: p.primary, fontSize: 11, fontWeight: '600' }}>{t('prayers.today.current')}</Text>
            </View>}
            <Text style={{ color: isCurrent ? p.primary : past ? p.mutedForeground : p.foreground, fontSize: 17, fontWeight: isCurrent ? '700' : '500', fontVariant: ['tabular-nums'] }}>{time}</Text>
          </View>
          {alertsSupported && <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.today.alertLabel', { prayer: name, alert })} hitSlop={4} onPress={() => onAlert(prayer)}
            style={({ pressed }) => [s.alertButton, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
            <ReaderIcon name={alertIcons[kind]} color={on ? p.primary : p.mutedForeground} size={20} />
          </Pressable>}
        </View>;
      })}
    </View>
  </View>;
}

function WeekArrow({ icon, label, disabled, onPress }: { icon: 'chevron' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={4} onPress={onPress}
    style={({ pressed }) => [s.arrow, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.35 : 1 }]}>
    <ReaderIcon name={icon} color={p.foreground} size={18} />
  </Pressable>;
}

/** The way to the alerts, the athan and the calculation, in the settings. */
function SettingsLink() {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="link" accessibilityLabel={`${t('prayers.settingsLink.title')}: ${t('prayers.settingsLink.detail')}`}
    onPress={() => router.push({ pathname: '/settings', params: { tab: 'prayers' } })}
    style={({ pressed }) => [s.settingsLink, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.card }]}>
    <IconTile name="settings" palette={p} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('prayers.settingsLink.title')}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('prayers.settingsLink.detail')}</Text>
    </View>
    <ReaderIcon name="chevron" color={p.mutedForeground} size={18} />
  </Pressable>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 18 },
  setup: { alignItems: 'center', gap: 10, padding: 20, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg },
  setupIcon: { width: 48, height: 48, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  setupActions: { alignSelf: 'stretch', gap: 8, marginTop: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', marginVertical: -6 },
  changePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: readerShape.pill },
  hero: { borderRadius: readerShape.card, padding: 20, paddingTop: 16, gap: 14, overflow: 'hidden' },
  heroDates: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row' },
  fill: { height: 6, borderRadius: 3 },
  countdown: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  week: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 10, gap: 8 },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  arrow: { width: 36, height: 36, borderRadius: readerShape.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 2 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 8, paddingBottom: 6, borderRadius: readerShape.lg, gap: 1 },
  todayDot: { width: 4, height: 4, borderRadius: 2 },
  dayHeading: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingEnd: 6, minHeight: 56 },
  currentBar: { width: 3, alignSelf: 'stretch', marginVertical: 12, borderRadius: 2, marginEnd: 9 },
  rowText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  currentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: readerShape.pill },
  alertButton: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  settingsLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card },
});
