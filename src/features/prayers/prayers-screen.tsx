import { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { star } from '@/components/craft/art';
import { BrushStroke } from '@/components/craft/marks';
import { page, PageBar, PageTitle, Row, RowGroup } from '@/components/craft/page';
import { ArchPanel } from '@/components/craft/panels';
import { Alert, Button } from '@/components/ui';
import { useEmbedded } from '@/components/embedded';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { formatDate, t } from '@/i18n';
import { alertIcons, effectiveAlert, hijriLabel } from './format';
import { alertsSupported } from './notifications';
import { placeName } from './place';
import { AlertSheet, LocationSheet, useLocate } from './prayer-sheets';
import { usePrayers, useNow } from './provider';
import { QiblaSection } from './qibla-compass';
import type { PrayerState } from './settings';
import { sunPath, SunMark } from './sheet';
import { clock, countdown, dayOf, dayTimes, PRAYERS, prayerWindow, shiftDay, type PrayerId } from './times';

type Sheet = 'location' | { alert: PrayerId };

/**
 * The prayer times at the chosen place. The day seen through an arched window, as on the home
 * screen but the whole page's: the sun's path across the sky in the arch, the next prayer and the
 * time left under it. Then any day's six times, week by week, each with the sun's place and its
 * alert, and the qibla's compass. The alerts, the athan and the calculation are in the settings'
 * «الصلاة» tab.
 */
export function PrayersScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, ready, error } = usePrayers();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const embedded = useEmbedded();
  const Frame = embedded ? View : SafeAreaView;
  const place = ready && state.location ? <PlaceButton onPress={() => setSheet('location')} /> : null;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar title={t('prayers.title')} palette={p} back={{ label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.dismissTo('/') }} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, embedded && { paddingTop: 14 }]}>
      {embedded ? place : <PageTitle palette={p}>{place}</PageTitle>}
      {error && <Alert variant="destructive" palette={p}>{t('prayers.storageError')}</Alert>}
      {!ready ? null : state.location ? <>
        <DayWindow />
        <DayTimes onAlert={(prayer) => setSheet({ alert: prayer })} />
        <QiblaSection />
      </> : <LocationSetup onChoose={() => setSheet('location')} />}
      {ready && <RowGroup palette={p}>
        <Row palette={p} icon="settings" role="link" title={t('prayers.settingsLink.title')} detail={t('prayers.settingsLink.detail')}
          onPress={() => router.push({ pathname: '/settings', params: { tab: 'prayers' } })} />
      </RowGroup>}
    </ScrollView>
    {sheet === 'location' && <LocationSheet onClose={() => setSheet(null)} />}
    {typeof sheet === 'object' && sheet && <AlertSheet prayer={sheet.alert} onClose={() => setSheet(null)} />}
  </Frame>;
}

/** The place, under the page's title: its name, and the way to change it. */
function PlaceButton({ onPress }: { onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const place = state.location ? placeName(state.location) : '';
  return <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.location.changeLabel', { place })} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.place, { opacity: pressed ? 0.7 : 1 }]}>
    <ReaderIcon name="map-pin" color={p.ornament} size={17} />
    <Text numberOfLines={1} style={{ flexShrink: 1, color: p.foreground, fontSize: 16, fontWeight: '600' }}>{place}</Text>
    <View style={[s.change, { borderColor: withAlpha(p.ornament, 0.55) }]}>
      <Text style={{ color: p.foreground, fontSize: 12, fontWeight: '500' }}>{t('prayers.location.change')}</Text>
    </View>
  </Pressable>;
}

/** The arch's rise, and where the sky's path sits in it. */
const RISE = 64;
const SKY = { top: 18, arc: 62, side: 8 };
const SKY_HEIGHT = SKY.top + SKY.arc + 30;
/** Stars in the arch at night, clear of the sun's path: where (a share of the width, a height in the sky) and how large. */
const STARS = [[0.5, 46, 3.4], [0.41, 31, 2.3], [0.6, 34, 2.8], [0.54, 64, 2], [0.45, 60, 2.2], [0.23, 26, 2.6], [0.78, 20, 2.2], [0.69, 4, 1.8]] as const;

/**
 * The sky in the arched window: the day's path, the daylight under its arc, a mark at each time
 * (the next one ringed, those passed filled), and the sun where it is now; stars when it is night.
 * Redrawn each minute, not each second with the countdown.
 */
const Sky = memo(function Sky({ state, day, minute, today, next, width, p }: {
  state: PrayerState; day: string; minute: number; today: boolean; next: PrayerId; width: number; p: ReaderPalette;
}) {
  const times = state.location ? dayTimes(state.location, day, state) : null;
  const sun = times && sunPath(times, { width, ...SKY });
  if (!times || !sun) return <View style={{ height: SKY_HEIGHT }} />;
  const now = minute;
  const night = now < sun.sunrise || now > sun.sunset;
  const daylight = `${sun.line(sun.sunrise, sun.sunset)} L${sun.x(sun.sunset).toFixed(1)} ${sun.horizon} L${sun.x(sun.sunrise).toFixed(1)} ${sun.horizon} Z`;
  const passed = today && now > sun.start ? Math.min(now, sun.end) : null;
  const here = today && now > sun.start && now < sun.end ? { cx: sun.x(now), cy: sun.y(now), up: sun.y(now) <= sun.horizon } : null;
  return <Svg width={width} height={SKY_HEIGHT} aria-hidden>
    <Defs>
      <LinearGradient id="daylight" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={p.primary} stopOpacity={night ? 0.07 : 0.18} />
        <Stop offset="1" stopColor={p.primary} stopOpacity={0} />
      </LinearGradient>
    </Defs>
    {night && STARS.map(([share, top, size], i) => <Path key={i} d={star(width * share, top, 4, size, size * 0.38)} fill={withAlpha(p.ornament, 0.7)} />)}
    <Path d={daylight} fill="url(#daylight)" />
    <Line x1={2} y1={sun.horizon} x2={width - 2} y2={sun.horizon} stroke={p.border} strokeWidth={1} />
    <Path d={sun.line(sun.start, sun.end, 64)} stroke={p.border} strokeWidth={1.5} fill="none" />
    {passed && <Path d={sun.line(sun.start, passed, 64)} stroke={p.primary} strokeWidth={2.5} strokeLinecap="round" fill="none" />}
    {PRAYERS.filter((prayer) => Number.isFinite(sun.at(prayer))).map((prayer) => {
      const time = sun.at(prayer), done = today && time <= now, isNext = prayer === next;
      return <Circle key={prayer} cx={sun.x(time)} cy={sun.y(time)} r={isNext ? 5.5 : 3.8}
        fill={done ? p.primary : p.card} stroke={done || isNext ? p.primary : p.mutedForeground} strokeWidth={isNext ? 2.2 : 1.5} />;
    })}
    {/* Drawn in the SVG, whose coordinates the app's right-to-left layout does not mirror. */}
    {here?.up && <Circle cx={here.cx} cy={here.cy} r={17} fill={p.ornament} opacity={0.2} />}
    {here && (here.up
      ? <Circle cx={here.cx} cy={here.cy} r={8} fill={p.ornament} stroke={p.card} strokeWidth={2} />
      : <Circle cx={here.cx} cy={here.cy} r={5.5} fill={p.card} stroke={p.ornament} strokeWidth={2} />)}
  </Svg>;
});

/**
 * The window: the sky with the sun's path in the arch, then the next prayer and its time, the time
 * left to the second, and the day's date in both calendars. After Isha, the next day's.
 */
function DayWindow() {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const now = useNow(1000);
  const [width, setWidth] = useState(0);
  if (!state.location) return null;
  const { next } = prayerWindow(state.location, now, state);
  if (!next) return null;
  const today = next.day === dayOf(now);
  const name = t(`prayers.names.${next.prayer}`), time = clock(next.at), left = countdown(now, next.at);
  const date = formatDate(next.day, { weekday: 'long', day: 'numeric', month: 'long' });
  return <ArchPanel palette={p} rise={RISE} contentStyle={s.window}>
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
      <Sky state={state} day={next.day} minute={Math.floor(now.getTime() / 60_000) * 60_000} today={today} next={next.prayer} width={width} p={p} />
    </View>
    <View accessible accessibilityLabel={t('prayers.next.spoken', { prayer: name, time, countdown: left })} style={s.next}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{next.prayer === 'sunrise' ? t('prayers.next.sunriseLabel') : t('prayers.next.label')}</Text>
      <View style={s.nextName}>
        <Text numberOfLines={1} style={{ flexShrink: 1, color: p.foreground, fontSize: 34, lineHeight: 56, fontFamily: 'ReaderNaskhBold' }}>{name}</Text>
        <Text style={{ color: p.foreground, fontSize: 34, lineHeight: 56, fontFamily: 'ReaderNaskhBold' }}>{time}</Text>
      </View>
      <View style={s.left}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('prayers.next.in')}</Text>
        <Text style={{ color: p.primary, fontSize: 22, lineHeight: 30, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{left}</Text>
      </View>
    </View>
    <View style={[s.dates, { borderColor: withAlpha(p.ornament, 0.35) }]}>
      <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{today ? date : t('prayers.home.tomorrow', { date })}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{hijriLabel(next.day, state.hijriOffset)}</Text>
    </View>
  </ArchPanel>;
}

/** Before a place is chosen: the window's sky with the sun's path waiting, and the two ways to set the place. */
function LocationSetup({ onChoose }: { onChoose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const locate = useLocate();
  const [width, setWidth] = useState(0);
  return <ArchPanel palette={p} rise={RISE} contentStyle={s.setup}>
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ alignSelf: 'stretch', height: 96 }}>
      {width > 0 && <Svg width={width} height={96} aria-hidden>
        <Line x1={2} y1={84} x2={width - 2} y2={84} stroke={p.border} strokeWidth={1} />
        <Path d={`M ${width * 0.08} 92 C ${width * 0.2} 88 ${width * 0.24} 18 ${width / 2} 18 C ${width * 0.76} 18 ${width * 0.8} 88 ${width * 0.92} 92`}
          stroke={withAlpha(p.ornament, 0.7)} strokeWidth={1.5} strokeDasharray="1 6" strokeLinecap="round" fill="none" />
      </Svg>}
      {/* Where the sun would stand at noon; centred, so the same from either side. */}
      {width > 0 && <View style={[s.pin, { left: width / 2 - 24, backgroundColor: p.card, borderColor: withAlpha(p.ornament, 0.7) }]}>
        <ReaderIcon name="map-pin" color={p.ornament} size={22} />
      </View>}
    </View>
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold', textAlign: 'center', marginTop: 4 }}>{t('prayers.location.emptyTitle')}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 300 }}>{t('prayers.location.emptyText')}</Text>
    <View style={s.setupActions}>
      <Button palette={p} icon="locate" block disabled={locate.busy} onPress={() => void locate.run()}>{locate.busy ? t('prayers.location.locating') : t('prayers.location.useMine')}</Button>
      <Button palette={p} variant="outline" icon="search" block onPress={onChoose}>{t('prayers.location.chooseCity')}</Button>
    </View>
    {!!locate.message && <Alert variant="destructive" palette={p}>{locate.message}</Alert>}
  </ArchPanel>;
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

/**
 * The times of any day, on one card: the week at its head (the chosen day underlined, as a word
 * on the lawh), then the day's six times, each with the sun's place at it and its alert.
 */
function DayTimes({ onAlert }: { onAlert: (prayer: PrayerId) => void }) {
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
  return <View style={{ gap: 12 }}>
    <View style={s.dayHeading}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 20, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
        {!isToday && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{relative ? `${longDate} · ${hijri}` : hijri}</Text>}
      </View>
      {!isToday && <Button size="sm" variant="outline" palette={p} icon="undo" label={t('prayers.week.backToToday')} onPress={() => setChosen(null)}>{t('prayers.week.today')}</Button>}
    </View>
    <RowGroup palette={p}>
      <View style={s.week}>
        <View style={s.weekNavigation}>
          <WeekArrow icon="chevron-right" label={t('prayers.week.previous')} disabled={offset <= -WEEK_LIMIT} onPress={() => choose(shiftDay(day, -7))} />
          <Text accessibilityLiveRegion="polite" accessibilityLabel={t('prayers.week.label', { range })} numberOfLines={1}
            style={{ flex: 1, textAlign: 'center', color: p.foreground, fontSize: 14, fontWeight: '600' }}>{range}</Text>
          <WeekArrow icon="chevron" label={t('prayers.week.next')} disabled={offset >= WEEK_LIMIT} onPress={() => choose(shiftDay(day, 7))} />
        </View>
        <View accessibilityRole="tablist" style={s.days}>
          {days.map((d) => {
            const selected = d === day, isTodayPill = d === today;
            const label = formatDate(d, { weekday: 'long', day: 'numeric', month: 'long' });
            return <Pressable key={d} accessibilityRole="tab" accessibilityState={{ selected }} aria-selected={selected}
              accessibilityLabel={isTodayPill ? t('prayers.week.todayLabel', { date: label }) : label} onPress={() => choose(d)}
              style={({ pressed }) => [s.day, { backgroundColor: pressed && !selected ? p.accent : 'transparent' }]}>
              <Text numberOfLines={1} style={{ color: isTodayPill ? p.ornament : p.mutedForeground, fontSize: 11, fontWeight: isTodayPill ? '700' : '500' }}>
                {isTodayPill ? t('prayers.week.today') : t(`prayers.week.days.${WEEKDAYS[weekday(d)]}`)}
              </Text>
              <Text style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 18, lineHeight: 26, fontWeight: selected ? '700' : '500' }}>{String(Number(d.slice(8)))}</Text>
              <BrushStroke on={selected} width={28} color={p.ornament} />
            </Pressable>;
          })}
        </View>
      </View>
      {PRAYERS.map((prayer) => {
        const at = times[prayer], valid = Number.isFinite(at.getTime());
        const isCurrent = isToday && current?.day === today && current.prayer === prayer;
        const past = isToday && !isCurrent && valid && at.getTime() <= now.getTime();
        const quiet = past || prayer === 'sunrise';
        // With alerts off, each bell still shows its setting, dimmed.
        const kind = effectiveAlert(state.alerts[prayer]), on = state.enabled && kind !== 'off';
        const alert = state.enabled ? t(`prayers.alerts.kinds.${kind}`) : t('prayers.today.alertsOff'), name = t(`prayers.names.${prayer}`);
        const time = valid ? clock(at) : '—';
        return <View key={prayer} style={[s.row, isCurrent && { backgroundColor: withAlpha(p.ornament, 0.1) }]}>
          <View accessible accessibilityLabel={t('prayers.today.row', { prayer: name, time, alert })} style={s.rowText}>
            <SunMark times={times} prayer={prayer} palette={p} tone={isCurrent ? p.ornament : quiet ? p.mutedForeground : p.foreground} />
            <Text style={{ color: quiet ? p.mutedForeground : p.foreground, fontSize: 16, fontWeight: isCurrent ? '700' : '600' }}>{name}</Text>
            {isCurrent && <View style={[s.current, { backgroundColor: withAlpha(p.ornament, 0.18) }]}>
              <Text style={{ color: p.foreground, fontSize: 11, fontWeight: '600' }}>{t('prayers.today.current')}</Text>
            </View>}
            <View style={{ flex: 1 }} />
            <Text style={{ color: isCurrent ? p.foreground : quiet ? p.mutedForeground : p.foreground, fontSize: 17, fontWeight: isCurrent ? '700' : '500', fontVariant: ['tabular-nums'] }}>{time}</Text>
          </View>
          {alertsSupported && <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.today.alertLabel', { prayer: name, alert })} hitSlop={4} onPress={() => onAlert(prayer)}
            style={({ pressed }) => [s.alert, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
            <ReaderIcon name={alertIcons[kind]} color={on ? p.ornament : withAlpha(p.mutedForeground, 0.7)} size={18} />
          </Pressable>}
        </View>;
      })}
    </RowGroup>
  </View>;
}

function WeekArrow({ icon, label, disabled, onPress }: { icon: 'chevron' | 'chevron-right'; label: string; disabled: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={onPress}
    style={({ pressed }) => [s.arrow, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.35 : 1 }]}>
    <ReaderIcon name={icon} color={p.foreground} size={16} />
  </Pressable>;
}

const s = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, alignSelf: 'flex-start' },
  change: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: readerShape.pill, borderWidth: 1 },
  window: { paddingTop: 16, paddingHorizontal: 14, paddingBottom: 18 },
  next: { alignItems: 'center', marginTop: -2 },
  nextName: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 14 },
  left: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 6, marginTop: -6 },
  dates: { alignItems: 'center', gap: 2, marginTop: 14, paddingTop: 12, marginHorizontal: 24, borderTopWidth: StyleSheet.hairlineWidth },
  setup: { alignItems: 'center', gap: 8, paddingTop: 32, paddingBottom: 22 },
  pin: { position: 'absolute', top: 18 - 24, width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  setupActions: { alignSelf: 'stretch', gap: 8, marginTop: 10 },
  dayHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  week: { paddingHorizontal: 8, paddingTop: 10, paddingBottom: 4, gap: 6 },
  weekNavigation: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 },
  arrow: { width: 34, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  days: { flexDirection: 'row', gap: 2 },
  day: { flex: 1, minWidth: 0, alignItems: 'center', paddingTop: 6, paddingBottom: 2, borderRadius: readerShape.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingEnd: 6, minHeight: 58 },
  rowText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingStart: 12, paddingEnd: 8, paddingVertical: 12 },
  current: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: readerShape.pill },
  alert: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
