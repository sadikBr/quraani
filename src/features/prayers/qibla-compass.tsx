import { memo, useEffect, useId, useRef, useState } from 'react';
import { Animated, AppState, Easing, Linking, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useIsFocused } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { artColors, khatam, star } from '@/components/craft/art';
import { Lozenge } from '@/components/craft/lawh';
import { Section } from '@/components/craft/page';
import { usePageShown } from '@/components/swipe-tabs';
import { Alert, Button } from '@/components/ui';
import { isDarkColor, mixColor, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import { headingSupported, useHeading } from './heading';
import { usePrayers } from './provider';
import { distanceToKaaba, facing, qiblaBearing, turn, windOf } from './qibla';

const nativeDriver = Platform.OS !== 'web';
/** The mihrab above the dial: its size, and how far the dial sits below the top. */
const MIHRAB = { w: 46, h: 58 };
const TOP = MIHRAB.h - 2;
/** The compass's size at most, and its bezel's breadth at that size. */
const MAX = 320, BEZEL = 34;

/** The qibla from the place of the prayer times, under its own heading on the prayer times page. */
export function QiblaSection() {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  if (!state.location) return null;
  return <Section title={t('prayers.qibla.title')} palette={p}>
    <QiblaCompass place={state.location} palette={p} />
  </Section>;
}

/** Whether the app is in front (the compass rests while it is not). */
function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const listener = AppState.addEventListener('change', (next) => setActive(next === 'active'));
    return () => listener.remove();
  }, []);
  return active;
}

/**
 * The qibla as a compass whose rose turns under a mihrab: the rose, its four winds and its
 * degrees, with a beam of gold from its heart to the Kaaba on its rim. At rest, north is up and
 * the words say where the qibla lies; with the phone's compass on, the rose turns with the phone,
 * and the reader turns until the Kaaba stands under the mihrab, which then lights up.
 */
function QiblaCompass({ place, palette: p }: { place: { latitude: number; longitude: number }; palette: ReaderPalette }) {
  const bearing = qiblaBearing(place), distance = Math.round(distanceToKaaba(place));
  const [started, setStarted] = useState(false);
  const focused = useIsFocused(), shown = usePageShown(), awake = useAppActive();
  const live = started && focused && shown && awake;
  const [width, setWidth] = useState(0);
  // The rose's turn, in degrees, unwound (it goes on past 360 the shorter way round each time).
  const [rotation] = useState(() => new Animated.Value(0));
  const turned = useRef(0);
  const follow = (degrees: number) => {
    // The rose turns against the phone, so north stays north.
    const target = turned.current + turn(turned.current, -degrees);
    turned.current = target;
    Animated.timing(rotation, { toValue: target, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }).start();
  };
  const heading = useHeading(live, place, follow);
  // At rest, north goes back up the shorter way.
  useEffect(() => {
    if (live) return;
    const target = Math.round(turned.current / 360) * 360;
    turned.current = target;
    Animated.timing(rotation, { toValue: target, duration: 420, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }).start();
  }, [live, rotation]);

  const reading = heading.status === 'live' && heading.degrees !== null;
  const delta = reading ? turn(heading.degrees!, bearing) : null;
  // Facing holds until the needle is clearly off, so it does not flicker at the edge.
  const [faced, setFaced] = useState(false);
  const isFacing = delta !== null && facing(delta, faced);
  if (isFacing !== faced) setFaced(isFacing);

  const size = Math.min(MAX, Math.max(0, width - 8));
  const wind = t(`prayers.qibla.winds.${windOf(bearing)}`);
  const where = t('prayers.qibla.where', { bearing: Math.round(bearing), distance });
  const degrees = delta === null ? 0 : Math.round(Math.abs(delta));
  const title = !reading ? t('prayers.qibla.towards', { wind })
    : isFacing ? t('prayers.qibla.facing')
    : delta! > 0 ? t('prayers.qibla.right', { degrees }) : t('prayers.qibla.left', { degrees });
  return <View style={{ alignItems: 'center', gap: 14 }} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
    {size > 0 && <View accessible accessibilityRole="image" accessibilityLabel={reading ? title : t('prayers.qibla.spoken', { wind, bearing: Math.round(bearing) })}
      style={[s.compass, { width: size, height: size + TOP }]}>
      <Animated.View style={[s.rose, { top: TOP, width: size, height: size, transform: [{ rotate: rotation.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] }) }] }]}>
        <Rose size={size} bearing={bearing} palette={p} />
        <Bezel size={size} palette={p} />
      </Animated.View>
      <Mihrab size={size} lit={isFacing} palette={p} />
    </View>}
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text accessibilityLiveRegion={reading ? 'polite' : 'none'} style={{ color: isFacing ? p.ornament : p.foreground, fontSize: 24, lineHeight: 40, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>
        {heading.status === 'starting' ? t('prayers.qibla.starting') : title}
      </Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{where}</Text>
      {reading && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{t('prayers.qibla.phone', { degrees: Math.round(heading.degrees!) % 360, wind: t(`prayers.qibla.winds.${windOf(heading.degrees!)}`) })}</Text>}
    </View>
    {reading && heading.calibration === 'poor' && <View style={[s.note, { backgroundColor: withAlpha(p.ornament, 0.1), borderColor: withAlpha(p.ornament, 0.4) }]}>
      <ReaderIcon name="loop" color={p.ornament} size={16} />
      <Text style={{ flex: 1, color: p.foreground, fontSize: 13, lineHeight: 20 }}>{t('prayers.qibla.calibrate')}</Text>
    </View>}
    {heading.status === 'denied' && <Alert variant="destructive" palette={p}>{t('prayers.qibla.denied')}</Alert>}
    {heading.status === 'unavailable' && <Alert variant="destructive" palette={p}>{t('prayers.qibla.unavailable')}</Alert>}
    {headingSupported
      ? <View style={s.actions}>
        {heading.status === 'denied'
          ? <Button palette={p} variant="outline" icon="settings" block onPress={() => void Linking.openSettings().catch(() => {})}>{t('prayers.qibla.settings')}</Button>
          : <Button palette={p} variant={started ? 'outline' : 'default'} icon={started ? 'stop' : 'compass'} block onPress={() => setStarted(!started)}>
            {started ? t('prayers.qibla.stop') : t('prayers.qibla.start')}
          </Button>}
        <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>
          {!started ? t('prayers.qibla.how') : heading.calibration === 'unknown' ? t('prayers.qibla.flatCalibrate') : t('prayers.qibla.flat')}
        </Text>
      </View>
      : <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>{t('prayers.qibla.phoneOnly')}</Text>}
  </View>;
}

/**
 * The rose, drawn once for a place and a size, as the plate of a Maghribi astrolabe: a deep disc
 * (the arcade's tiles' colour) lit from its heart, rayed like a shamsa, with a sixteen-pointed
 * rosette round a golden khatam; the bezel around it ticked each 5°. From the heart, a two-toned
 * golden needle points to the Kaaba, which stands in its own light at the plate's edge.
 */
const Rose = memo(function Rose({ size, bearing, palette: p }: { size: number; bearing: number; palette: ReaderPalette }) {
  const id = useId().replace(/[^\w-]/g, '');
  const colors = artColors(p);
  const dark = isDarkColor(p.background);
  const shade = dark ? p.background : p.foreground;
  const bezel = mixColor(colors.surface, shade, 0.32), deep = mixColor(colors.surface, shade, 0.18);
  const light = mixColor(colors.surface, p.ornament, dark ? 0.16 : 0.2);
  const shine = mixColor(p.ornament, colors.ink, 0.35), shadow = mixColor(p.ornament, shade, 0.35);
  const c = size / 2, k = size / MAX, R0 = c - 2, R1 = R0 - BEZEL * k, Rr = R1 * 0.5;
  const at = (degrees: number, r: number) => { const a = (degrees * Math.PI) / 180; return [c + r * Math.sin(a), c - r * Math.cos(a)] as const; };
  const pt = (degrees: number, r: number) => at(degrees, r).map((v) => v.toFixed(1)).join(' ');
  const minor: string[] = [], major: string[] = [], rays: string[] = [];
  for (let d = 0; d < 360; d += 5) (d % 15 === 0 ? major : minor).push(`M ${pt(d, R1 + 1)} L ${pt(d, R1 + (d % 15 === 0 ? 10 : 6) * k)}`);
  for (let d = 0; d < 360; d += 11.25) rays.push(`M ${pt(d, Rr + 4 * k)} L ${pt(d, R1 - ((d / 11.25) % 2 ? 26 : 12) * k)}`);
  // The needle: a lozenge from the heart to near the Kaaba, its two halves in light and shadow.
  const tip = R1 - 34 * k, waist = Rr * 0.16, width = 7 * k, tail = Rr * 0.45;
  const side = (sign: number) => { const a = ((bearing + sign * 90) * Math.PI) / 180, [wx, wy] = at(bearing, waist); return `${(wx + width * Math.sin(a)).toFixed(1)} ${(wy - width * Math.cos(a)).toFixed(1)}`; };
  const kaabaAt = R1 - 17 * k, [kx, ky] = at(bearing, kaabaAt), cube = 11 * k, lift = 4.5 * k;
  const kaaba = dark ? p.background : p.foreground;
  return <Svg width={size} height={size} aria-hidden>
    <Defs>
      <RadialGradient id={`plate${id}`} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={light} />
        <Stop offset="0.6" stopColor={colors.surface} />
        <Stop offset="1" stopColor={deep} />
      </RadialGradient>
      <RadialGradient id={`glow${id}`} cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor={p.ornament} stopOpacity={0.55} />
        <Stop offset="1" stopColor={p.ornament} stopOpacity={0} />
      </RadialGradient>
      <LinearGradient id={`rim${id}`} x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor={shine} />
        <Stop offset="0.5" stopColor={p.ornament} />
        <Stop offset="1" stopColor={shadow} />
      </LinearGradient>
    </Defs>
    {/* The bezel, its double rim, and its ticks. */}
    <Circle cx={c} cy={c} r={R0} fill={bezel} stroke={`url(#rim${id})`} strokeWidth={2.2} />
    <Circle cx={c} cy={c} r={R0 - 4 * k} fill="none" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={0.8} />
    <Path d={minor.join(' ')} stroke={colors.line} strokeWidth={1} strokeLinecap="round" />
    <Path d={major.join(' ')} stroke={colors.edge} strokeWidth={1.5} strokeLinecap="round" />
    {/* The plate, lit from its heart, and its rays. */}
    <Circle cx={c} cy={c} r={R1} fill={`url(#plate${id})`} stroke={`url(#rim${id})`} strokeWidth={1.4} />
    <Path d={rays.join(' ')} stroke={withAlpha(p.ornament, 0.16)} strokeWidth={1} strokeLinecap="round" />
    {/* The rosette: a ring of dots, sixteen points, two interlaced eights, and the khatam. */}
    <Circle cx={c} cy={c} r={Rr + 2 * k} fill="none" stroke={colors.line} strokeWidth={1.2} strokeDasharray={`0.1 ${5 * k}`} strokeLinecap="round" />
    <Path d={star(c, c, 16, Rr, Rr * 0.7)} fill={withAlpha(p.ornament, 0.08)} stroke={colors.edge} strokeWidth={1} strokeLinejoin="round" />
    <Path d={star(c, c, 8, Rr * 0.7, Rr * 0.4)} fill="none" stroke={colors.line} strokeWidth={1} strokeLinejoin="round" />
    <Path d={star(c, c, 8, Rr * 0.7, Rr * 0.4, Math.PI / 8)} fill="none" stroke={colors.line} strokeWidth={1} strokeLinejoin="round" />
    {/* The Kaaba's light, under the needle. */}
    <Circle cx={kx} cy={ky} r={30 * k} fill={`url(#glow${id})`} />
    <Path d={`M ${pt(bearing + 180, tail)} L ${side(-1)} L ${pt(bearing, waist * 0.2)} L ${side(1)} Z`} fill={withAlpha(colors.ink, 0.25)} />
    <Path d={`M ${pt(bearing, tip)} L ${side(1)} L ${pt(bearing, waist * 0.2)} Z`} fill={shine} />
    <Path d={`M ${pt(bearing, tip)} L ${side(-1)} L ${pt(bearing, waist * 0.2)} Z`} fill={shadow} />
    <Path d={khatam(c, c, Rr * 0.22)} fill={`url(#rim${id})`} stroke={bezel} strokeWidth={1.2} strokeLinejoin="round" />
    <Circle cx={c} cy={c} r={2.6 * k} fill={bezel} />
    {/* The Kaaba: its front, its side and roof in a little depth, its golden band and door. */}
    <G transform={`translate(${kx.toFixed(1)} ${ky.toFixed(1)}) rotate(${bearing.toFixed(1)})`}>
      <Path d={`M ${-cube} ${-cube} L ${cube} ${-cube} L ${cube + lift} ${-cube - lift} L ${-cube + lift} ${-cube - lift} Z`} fill={mixColor(kaaba, p.ornament, 0.3)} />
      <Path d={`M ${cube} ${-cube} L ${cube + lift} ${-cube - lift} L ${cube + lift} ${cube - lift} L ${cube} ${cube} Z`} fill={mixColor(kaaba, p.ornament, 0.14)} />
      <Path d={`M ${cube} ${-cube * 0.52} L ${cube + lift} ${-cube * 0.52 - lift} L ${cube + lift} ${-cube * 0.2 - lift} L ${cube} ${-cube * 0.2} Z`} fill={shadow} />
      <Rect x={-cube} y={-cube} width={cube * 2} height={cube * 2} fill={kaaba} stroke={withAlpha(p.ornament, 0.9)} strokeWidth={0.8} />
      <Rect x={-cube} y={-cube * 0.52} width={cube * 2} height={cube * 0.32} fill={p.ornament} />
      <Rect x={cube * 0.18} y={cube * 0.1} width={cube * 0.5} height={cube * 0.9} rx={0.8} fill={shine} />
    </G>
  </Svg>;
});

/**
 * What is written on the bezel, turning with it and set along its circle: the four winds in
 * letters (north in gold), the degrees between them, and a lozenge at each corner wind.
 */
const Bezel = memo(function Bezel({ size, palette: p }: { size: number; palette: ReaderPalette }) {
  const colors = artColors(p);
  const k = size / MAX, c = size / 2, r = c - 2 - (BEZEL - 21) * k, box = 30;
  const marks: { degrees: number; text?: string; wind?: 'n' | 'e' | 's' | 'w' }[] = [];
  for (let d = 0; d < 360; d += 30) marks.push(d % 90 === 0 ? { degrees: d, wind: (['n', 'e', 's', 'w'] as const)[d / 90] } : { degrees: d, text: String(d) });
  return <View style={StyleSheet.absoluteFill} pointerEvents="none">
    {marks.map(({ degrees, text, wind }) => {
      const a = (degrees * Math.PI) / 180;
      return <View key={degrees} style={[s.mark, { width: box, height: box, left: c + r * Math.sin(a) - box / 2, top: c - r * Math.cos(a) - box / 2, transform: [{ rotate: `${degrees}deg` }] }]}>
        {wind
          ? <Text style={{ color: wind === 'n' ? p.ornament : colors.ink, fontSize: wind === 'n' ? 17 : 15, lineHeight: 26, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{t(`prayers.qibla.letters.${wind}`)}</Text>
          : <Text style={{ color: colors.soft, fontSize: 9.5, lineHeight: 14, fontWeight: '600', textAlign: 'center' }}>{text}</Text>}
      </View>;
    })}
    {[45, 135, 225, 315].map((degrees) => {
      const a = (degrees * Math.PI) / 180;
      return <View key={degrees} style={[s.mark, { width: 10, height: 10, left: c + r * Math.sin(a) - 5, top: c - r * Math.cos(a) - 5, transform: [{ rotate: `${degrees}deg` }] }]}>
        <Lozenge size={8} fill={withAlpha(p.ornament, 0.85)} />
      </View>;
    })}
  </View>;
});

/**
 * The mihrab over the compass, where the phone points: a horseshoe arch in its square frame, as
 * in the mosques of the Maghrib, a lamp hanging in it and a golden pointer under it. When the Kaaba
 * stands under it, the niche fills with gold and glows.
 */
function Mihrab({ size, lit, palette: p }: { size: number; lit: boolean; palette: ReaderPalette }) {
  const id = useId().replace(/[^\w-]/g, '');
  const c = size / 2, { w, h } = MIHRAB, x = c - w / 2;
  const cy = 25, r = 16, f = (30 * Math.PI) / 180, base = h - 6;
  const left = c - r * Math.cos(f), right = c + r * Math.cos(f), spring = cy + r * Math.sin(f);
  const arch = `M ${left.toFixed(1)} ${base} V ${spring.toFixed(1)} A ${r} ${r} 0 1 1 ${right.toFixed(1)} ${spring.toFixed(1)} V ${base} Z`;
  return <View pointerEvents="none" style={[s.mihrab, { width: size, height: TOP + 20 }]}>
    <Svg width={size} height={TOP + 20} aria-hidden>
      <Defs>
        <RadialGradient id={`aura${id}`} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={p.ornament} stopOpacity={0.45} />
          <Stop offset="1" stopColor={p.ornament} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {lit && <Circle cx={c} cy={h / 2} r={w} fill={`url(#aura${id})`} />}
      <Rect x={x} y={1} width={w} height={h - 2} rx={4} fill={lit ? mixColor(p.card, p.ornament, 0.25) : p.card} stroke={p.ornament} strokeWidth={1.3} />
      <Rect x={x + 3.5} y={4.5} width={w - 7} height={h - 9} rx={2} fill="none" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={0.8} />
      <Path d={arch} fill={lit ? p.ornament : withAlpha(p.ornament, 0.12)} stroke={p.ornament} strokeWidth={1.1} />
      {/* The lamp. */}
      <Path d={`M ${c} ${cy - r + 1} V ${cy + 2}`} stroke={lit ? p.card : withAlpha(p.ornament, 0.8)} strokeWidth={1} />
      <Path d={`M ${c - 4} ${cy + 3} H ${c + 4} L ${c + 2.5} ${cy + 9} H ${c - 2.5} Z`} fill={lit ? p.card : withAlpha(p.ornament, 0.85)} />
      {/* The pointer into the bezel, where the Kaaba is to stand. */}
      <Path d={`M ${c - 6} ${h - 1} L ${c + 6} ${h - 1} L ${c} ${TOP + 6} Z`} fill={p.ornament} stroke={p.card} strokeWidth={1} strokeLinejoin="round" />
    </Svg>
  </View>;
}

const s = StyleSheet.create({
  compass: Platform.select({ native: { direction: 'ltr' as const }, default: {} }),
  rose: { position: 'absolute', left: 0 },
  mihrab: { position: 'absolute', left: 0, top: 0 },
  mark: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'stretch', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  actions: { alignSelf: 'stretch', gap: 8 },
});
