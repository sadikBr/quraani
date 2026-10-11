import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import { hijriLabel } from './labels';
import { placeName } from './place';
import { usePrayers, useNow } from './provider';
import { clock, countdown, dayOf, dayTimes, PRAYERS, prayerWindow, type DayTimes, type PrayerId } from './times';

const MINUTE = 60_000;
/** The sun path's height: the arc rises this far above the horizon, and dips at most DIP of it below. */
const ARC = 50;
const DIP = 0.45;
const TOP = 16;
const HEIGHT = TOP + ARC + 22;
const SIDE = 10;

/**
 * The day as the sun's path: a curve from before Fajr to after Isha, high at noon and under the
 * horizon at night, each time at its place in the day. What has passed is drawn in the theme's
 * colour and the sun marks now. Right to left, like the times beneath it.
 */
function SunPath({ times, now, today, next, width, p }: { times: DayTimes; now: number; today: boolean; next: PrayerId; width: number; p: ReaderPalette }) {
  const at = (prayer: PrayerId) => times[prayer].getTime();
  const sunrise = at('sunrise'), sunset = at('maghrib');
  if (!width || !Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) return <View style={{ height: HEIGHT }} />;
  const first = Number.isFinite(at('fajr')) ? at('fajr') : sunrise - 90 * MINUTE;
  const last = Number.isFinite(at('isha')) ? at('isha') : sunset + 90 * MINUTE;
  const start = first - 40 * MINUTE, end = last + 40 * MINUTE;
  const horizon = TOP + ARC;
  // Right to left: the day starts at the right edge.
  const x = (time: number) => width - SIDE - ((time - start) / (end - start)) * (width - 2 * SIDE);
  const y = (time: number) => {
    const s = Math.sin(Math.PI * (time - sunrise) / (sunset - sunrise));
    return horizon - (s >= 0 ? s * ARC : s * ARC * DIP);
  };
  const path = (from: number, to: number) => {
    const steps = Math.max(2, Math.round(48 * (to - from) / (end - start)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const time = from + (to - from) * i / steps;
      return `${i ? 'L' : 'M'}${x(time).toFixed(1)} ${y(time).toFixed(1)}`;
    }).join(' ');
  };
  const daylight = `${path(sunrise, sunset)} L${x(sunset).toFixed(1)} ${horizon} L${x(sunrise).toFixed(1)} ${horizon} Z`;
  const passed = today && now > start ? Math.min(now, end) : null;
  const sun = today && now > start && now < end ? { cx: x(now), cy: y(now), up: y(now) <= horizon } : null;
  return <View style={{ height: HEIGHT }}>
    <Svg width={width} height={HEIGHT}>
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.primary} stopOpacity={0.16} />
          <Stop offset="1" stopColor={p.primary} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={daylight} fill="url(#sky)" />
      <Line x1={SIDE} y1={horizon} x2={width - SIDE} y2={horizon} stroke={p.border} strokeWidth={1} />
      <Path d={path(start, end)} stroke={p.border} strokeWidth={1.5} fill="none" />
      {passed && <Path d={path(start, passed)} stroke={p.primary} strokeWidth={2.5} strokeLinecap="round" fill="none" />}
      {PRAYERS.filter((prayer) => Number.isFinite(at(prayer))).map((prayer) => {
        const time = at(prayer), done = today && time <= now, isNext = prayer === next;
        return <Circle key={prayer} cx={x(time)} cy={y(time)} r={isNext ? 5 : 3.5}
          fill={done ? p.primary : p.card} stroke={done ? p.primary : isNext ? p.primary : p.mutedForeground} strokeWidth={isNext ? 2 : 1.5} />;
      })}
      {/* Drawn in the SVG, whose coordinates the app's right-to-left layout does not mirror. */}
      {sun?.up && <Circle cx={sun.cx} cy={sun.cy} r={15} fill={p.ornament} opacity={0.22} />}
      {sun && (sun.up
        ? <Circle cx={sun.cx} cy={sun.cy} r={7} fill={p.ornament} stroke={p.card} strokeWidth={2} />
        : <Circle cx={sun.cx} cy={sun.cy} r={5} fill={p.card} stroke={p.ornament} strokeWidth={2} />)}
    </Svg>
  </View>;
}

/**
 * The home screen's first card: the next prayer and the time left, the day drawn as the sun's
 * path, and the day's six times. After Isha it shows the next day. It opens the prayer times
 * (`onOpen`: the home screen's prayer tab).
 */
export function PrayerHomeCard({ onOpen }: { onOpen?: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, ready } = usePrayers();
  const nowDate = useNow(30_000);
  const [width, setWidth] = useState(0);
  if (!ready) return null;
  const open = onOpen ?? (() => router.push('/prayers'));
  const location = state.location;
  const next = location ? prayerWindow(location, nowDate, state).next : undefined;
  if (!location || !next) {
    return <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.home.setupLabel')} onPress={open}
      style={({ pressed }) => [s.card, { backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(2, p)]}>
      <View style={s.setupIcon}><ReaderIcon name="mosque" color={p.primary} size={22} /></View>
      <Text style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('prayers.home.setupTitle')}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('prayers.home.setup')}</Text>
      <View style={s.setupAction}><ReaderIcon name="map-pin" color={p.primary} size={16} /><Text style={{ color: p.primary, fontSize: 15, fontWeight: '600' }}>{t('prayers.home.setupAction')}</Text></View>
    </Pressable>;
  }
  const now = nowDate.getTime();
  const today = next.day === dayOf(nowDate);
  const times = dayTimes(location, next.day, state);
  const name = t(`prayers.names.${next.prayer}`), time = clock(next.at), left = countdown(nowDate, next.at, false), place = placeName(location);
  const hijri = hijriLabel(next.day, state.hijriOffset);
  return <Pressable accessibilityRole="link" accessibilityLabel={t('prayers.home.label', { prayer: name, time, countdown: left, place })} onPress={open}
    style={({ pressed }) => [s.card, { backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(2, p)]}>
    <View style={s.meta}>
      <Text numberOfLines={1} style={{ flexShrink: 1, color: p.mutedForeground, fontSize: 13 }}>{today ? hijri : t('prayers.home.tomorrow', { date: hijri })}</Text>
      <View style={s.place}>
        <ReaderIcon name="map-pin" color={p.mutedForeground} size={13} />
        <Text numberOfLines={1} style={{ flexShrink: 1, color: p.mutedForeground, fontSize: 13 }}>{place}</Text>
      </View>
    </View>
    <View style={s.next}>
      <View style={s.nextName}>
        <Text style={{ color: p.foreground, fontSize: 28, lineHeight: 38, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: p.foreground, fontSize: 28, lineHeight: 38, fontWeight: '500' }}>{time}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('prayers.next.in')}</Text>
        <Text style={{ color: p.primary, fontSize: 22, lineHeight: 28, fontWeight: '600' }}>{left}</Text>
      </View>
    </View>
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ marginHorizontal: -6 }}>
      <SunPath times={times} now={now} today={today} next={next.prayer} width={width} p={p} />
    </View>
    <View style={s.times}>
      {PRAYERS.map((prayer) => {
        const at = times[prayer], valid = Number.isFinite(at.getTime());
        const isNext = prayer === next.prayer, done = today && valid && at.getTime() <= now;
        return <View key={prayer} style={s.time}>
          <Text numberOfLines={1} style={{ color: isNext ? p.primary : p.mutedForeground, fontSize: 12, fontWeight: isNext ? '600' : '400' }}>{t(`prayers.names.${prayer}`)}</Text>
          <Text numberOfLines={1} style={{ color: isNext ? p.primary : done ? p.mutedForeground : p.foreground, fontSize: 15, fontWeight: isNext ? '700' : '500' }}>{valid ? clock(at) : '—'}</Text>
        </View>;
      })}
    </View>
  </Pressable>;
}

const s = StyleSheet.create({
  card: { borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 18, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  next: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginTop: 6 },
  nextName: { flexDirection: 'row', alignItems: 'baseline', gap: 10, flexShrink: 1 },
  times: { flexDirection: 'row', marginTop: 2 },
  time: { flex: 1, alignItems: 'center', gap: 2 },
  setupIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  setupAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
});
