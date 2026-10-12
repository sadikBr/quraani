import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { archPath, Niche } from '@/components/craft/art';
import { page, PageBar, PageTitle, Row, RowGroup, Section } from '@/components/craft/page';
import { Alert, Button, SwitchMark, Tabs } from '@/components/ui';
import { isDarkColor, mixColor, readerElevation, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';
import { openScreenPreview, screenImage, upcomingScreenText } from './athan-screen';
import { fullAthanSupported } from './notifications';
import { usePrayers } from './provider';
import { isScreenPhoto, SCREEN_BACKGROUNDS, SCREEN_DIMS, SCREEN_MOTIONS, type AthanScreenStyle, type ScreenBackground } from './settings';

/*
 * The athan's screen is drawn natively (`AthanActivity.kt`); this page previews it in miniature with
 * the same proportions, colours and movements, so a change shows at once, and opens the real one.
 * Keep the numbers below in step with the activity.
 */
/** The width the activity's sizes are written for (a typical phone, in dp). */
const PHONE_WIDTH = 412;
/** Darkness of the veil at the top, upper middle, lower middle and bottom. */
const DIMS: Record<AthanScreenStyle['dim'], number[]> = { light: [0.3, 0.1, 0.25, 0.62], medium: [0.45, 0.22, 0.4, 0.75], strong: [0.62, 0.42, 0.55, 0.85] };
/** Plain backgrounds, top to bottom. */
const PLAIN: Record<'green' | 'night', string[]> = { green: ['#145446', '#092A23', '#041612'], night: ['#1C284A', '#0B1124', '#03050C'] };

function Gradient({ id, colors, opacities }: { id: string; colors: string[]; opacities?: number[] }) {
  return <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
    <Defs>
      <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        {colors.map((color, i) => <Stop key={i} offset={i / (colors.length - 1)} stopColor={color} stopOpacity={opacities?.[i] ?? 1} />)}
      </LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
  </Svg>;
}

/** The rings (or the glow) around the prayer and its time, as `PulseView` draws them, centred on (x, y). */
function Motion({ motion, base, span, x, y }: { motion: AthanScreenStyle['motion']; base: number; span: number; x: number; y: number }) {
  const [phase] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (motion === 'none') return;
    phase.setValue(0);
    const loop = Animated.loop(Animated.timing(phase, { toValue: 1, duration: motion === 'glow' ? 5000 : 3600, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [motion, phase]);
  if (motion === 'none') return null;
  const box = { position: 'absolute' as const, width: base * 2, height: base * 2, borderRadius: base, left: x - base, top: y - base };
  if (motion === 'glow') {
    const breath = phase.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
    const glow = base * 1.5;
    return <>
      <Animated.View pointerEvents="none" style={{ position: 'absolute', width: glow * 2, height: glow * 2, left: x - glow, top: y - glow,
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.59, 1] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1.1] }) }] }}>
        <Svg width={glow * 2} height={glow * 2}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#fff" stopOpacity={0.35} />
              <Stop offset="0.55" stopColor="#fff" stopOpacity={0.11} />
              <Stop offset="1" stopColor="#fff" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glow} cy={glow} r={glow} fill="url(#glow)" />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[box, { borderWidth: 1, borderColor: '#fff',
        opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.39] }), transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.02] }) }] }]} />
    </>;
  }
  return <>
    <View pointerEvents="none" style={[box, { backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.31)' }]} />
    {[0, 1, 2].map((i) => {
      const t = Animated.modulo(Animated.add(phase, i / 3), 1);
      return <Animated.View key={i} pointerEvents="none" style={[box, { borderWidth: 1, borderColor: '#fff',
        opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.47, 0.12, 0] }), transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, (base + span) / base] }) }] }]} />;
    })}
  </>;
}

/** The athan's screen in miniature, `width` wide and twice as tall. */
function ScreenPreview({ style, width }: { style: AthanScreenStyle; width: number }) {
  const { state } = usePrayers();
  const [drift] = useState(() => new Animated.Value(0));
  const moving = style.motion !== 'none';
  useEffect(() => {
    drift.setValue(0);
    if (!moving) return;
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, { toValue: 1, duration: 30_000, easing: ease, useNativeDriver: true }),
      Animated.timing(drift, { toValue: 0, duration: 30_000, easing: ease, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [moving, drift]);
  const k = width / PHONE_WIDTH;
  // Where the rings open: the middle of the prayer's name and time (block, then group, within the frame).
  const [blockY, setBlockY] = useState(0);
  const [group, setGroup] = useState<{ y: number; height: number } | null>(null);
  const text = upcomingScreenText(state);
  const photo = isScreenPhoto(style.background) ? style.background : null;
  const shadow = { textShadowColor: 'rgba(0,0,0,0.43)', textShadowRadius: 14 * k, textShadowOffset: { width: 0, height: k } };
  const line = { color: '#fff', textAlign: 'center' as const, includeFontPadding: false, ...shadow };
  return <View accessible accessibilityLabel={t('prayers.screen.previewLabel')} style={[s.phone, { width, height: width * 2, borderRadius: 22 * k + 8 }]}>
    {photo
      ? <Animated.Image source={screenImage(photo)} resizeMode="cover" resizeMethod="resize" style={[StyleSheet.absoluteFill, { width, height: width * 2, transform: [{ scale: drift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }] }]} />
      : <Gradient id="plain" colors={PLAIN[style.background as 'green' | 'night']} />}
    <Gradient id="veil" colors={['#000', '#000', '#000', '#000']} opacities={DIMS[style.dim].map((a) => (photo ? a : a * 120 / 255))} />
    {group && <Motion motion={style.motion} base={0.36 * width} span={0.3 * width} x={width / 2} y={blockY + group.y + group.height / 2} />}
    <View style={[StyleSheet.absoluteFill, { paddingHorizontal: 28 * k, paddingTop: 44 * k, paddingBottom: 40 * k }]}>
      <View style={{ flex: 0.82 }} />
      <View style={{ alignItems: 'center' }} onLayout={(e) => setBlockY(e.nativeEvent.layout.y)}>
        <Text style={[line, { fontSize: 17 * k, opacity: 0.86, fontWeight: '500' }]}>{text.heading}</Text>
        <View style={{ alignItems: 'center', marginTop: 10 * k }} onLayout={(e) => setGroup({ y: e.nativeEvent.layout.y, height: e.nativeEvent.layout.height })}>
          <Text style={[line, { fontSize: 46 * k, lineHeight: 58 * k, fontWeight: '700' }]}>{text.name}</Text>
          <Text style={[line, { fontSize: 92 * k, lineHeight: 104 * k, marginTop: 2 * k, letterSpacing: -0.02 * 92 * k, writingDirection: 'ltr',
            ...Platform.select({ android: { fontFamily: 'sans-serif-thin' }, default: { fontFamily: 'System', fontWeight: '200' as const } }) }]}>{text.time}</Text>
        </View>
        {style.date && !!text.date && <Text style={[line, { fontSize: 17 * k, marginTop: 14 * k, opacity: 0.92 }]}>{text.date}</Text>}
        {!!text.place && <Text style={[line, { fontSize: 15 * k, marginTop: 6 * k, opacity: 0.75 }]}>{text.place}</Text>}
      </View>
      <View style={{ flex: 1.18 }} />
      <View style={{ height: 60 * k, borderRadius: 18 * k, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 19 * k, fontWeight: '500' }}>{t('prayers.notification.stop')}</Text>
      </View>
    </View>
  </View>;
}

/** A background's thumbnail and the arch it is framed in. */
const TILE = { width: 78, height: 112, rise: 34 };

/**
 * One background to choose: its photo (or colour) seen through a niche, as the athan's screen is
 * seen through the phone, and its name. The chosen one is outlined in the theme's colour.
 */
function BackgroundTile({ id, selected, onPress }: { id: ScreenBackground; selected: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  const name = t(`prayers.screen.backgrounds.${id}`);
  const { width: w, height: h, rise } = TILE;
  // The photo in an arch a little inside the tile, and round it, when chosen, a ring in the theme's colour.
  const arch = archPath(w - 10, h - 10, rise - 4, 5, 5, 9);
  return <Pressable accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [s.tile, { opacity: pressed ? 0.75 : 1 }]}>
    <View style={{ width: w, height: h }}>
      <View style={[StyleSheet.absoluteFill, s.thumb]}>
        {isScreenPhoto(id)
          ? <Image source={screenImage(id, true)} resizeMode="cover" resizeMethod="resize" style={{ width: '100%', height: '100%' }} />
          : <Gradient id={`tile-${id}`} colors={PLAIN[id as 'green' | 'night']} />}
      </View>
      <Svg width={w} height={h} style={StyleSheet.absoluteFill} aria-hidden>
        {/* The page around the arch, so the photo shows through the niche alone. */}
        <Path d={`M 0 0 H ${w} V ${h} H 0 Z ${arch}`} fill={p.background} fillRule="evenodd" />
        <Path d={arch} fill="none" stroke={withAlpha(p.ornament, 0.7)} strokeWidth={1} />
        <Path d={archPath(w - 20, h - 20, rise - 10, 10, 10, 5)} fill="none" stroke={withAlpha(p.ornament, 0.5)} strokeWidth={0.8} />
        {selected && <Path d={archPath(w - 2, h - 2, rise + 1, 1, 1, 12)} fill="none" stroke={p.primary} strokeWidth={2} />}
      </Svg>
      {selected && <View style={[s.check, { backgroundColor: p.primary, borderColor: p.background }]}><ReaderIcon name="done" color={p.primaryForeground} size={12} /></View>}
    </View>
    <Text numberOfLines={2} style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: selected ? '600' : '400' }}>{name}</Text>
  </Pressable>;
}

/** The phone the preview is shown in: a body round the screen, dark on a light page and light on a dark one. */
function Phone({ width, children }: { width: number; children: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  const dark = isDarkColor(p.background);
  const radius = 22 * (width / PHONE_WIDTH) + 8;
  return <View style={[s.phoneBody, { borderRadius: radius + BEZEL, borderColor: withAlpha(p.ornament, 0.5),
    backgroundColor: dark ? mixColor(p.card, p.foreground, 0.16) : mixColor(p.foreground, p.card, 0.06) }, readerElevation(3, p)]}>
    {children}
  </View>;
}
const BEZEL = 7;

/** «شاشة الأذان»: choose the background, its darkness, the movement and the date, with a live preview. */
export function AthanScreenDesigner() {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const style = state.screen;
  const set = (change: Partial<AthanScreenStyle>) => update({ screen: { ...style, ...change } });
  const previewWidth = Math.round(Math.min(224, width * 0.56));
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar palette={p} back={{ label: t('common.back'), onPress: () => { if (router.canGoBack()) router.back(); else router.replace('/prayers'); } }} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={page.content}>
      <PageTitle title={t('prayers.screen.title')} subtitle={t('prayers.screen.subtitle')} palette={p} />
      {!fullAthanSupported ? <View style={s.unavailable}>
        <Niche palette={p} motif="arches" w={72} h={90}><ReaderIcon name="mosque" color={p.ornament} size={24} /></Niche>
        <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 280 }}>{t('prayers.screen.unavailable')}</Text>
      </View> : <>
        <View style={s.hero}>
          <Phone width={previewWidth}><ScreenPreview style={style} width={previewWidth} /></Phone>
          <Button palette={p} icon="eye" onPress={() => setFailed(!openScreenPreview(state))}>{t('prayers.screen.preview')}</Button>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: -4 }}>{t('prayers.screen.previewHint')}</Text>
          {failed && <Alert variant="destructive" palette={p}>{t('prayers.screen.previewFailed')}</Alert>}
        </View>
        <Section title={t('prayers.screen.background')} palette={p}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('prayers.screen.background')}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={s.tiles}>
              {SCREEN_BACKGROUNDS.map((id) => <BackgroundTile key={id} id={id} selected={style.background === id} onPress={() => set({ background: id })} />)}
            </ScrollView>
          </View>
        </Section>
        <Section title={t('prayers.screen.dim')} palette={p}>
          <Tabs palette={p} role="radio" label={t('prayers.screen.dim')} value={style.dim} onChange={(dim) => set({ dim })}
            options={SCREEN_DIMS.map((dim) => ({ value: dim, label: t(`prayers.screen.dims.${dim}`) }))} />
        </Section>
        <Section title={t('prayers.screen.motion')} palette={p}>
          <Tabs palette={p} role="radio" label={t('prayers.screen.motion')} value={style.motion} onChange={(motion) => set({ motion })}
            options={SCREEN_MOTIONS.map((motion) => ({ value: motion, label: t(`prayers.screen.motions.${motion}`) }))} />
        </Section>
        <RowGroup palette={p}>
          <Row palette={p} icon="moon-star" role="switch" selected={style.date} title={t('prayers.screen.date')} detail={t('prayers.screen.dateDetail')}
            trailing={<SwitchMark checked={style.date} palette={p} />} onPress={() => set({ date: !style.date })} />
        </RowGroup>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  phone: { overflow: 'hidden', backgroundColor: '#000' },
  phoneBody: { padding: BEZEL, borderWidth: 1 },
  hero: { alignItems: 'center', gap: 14, paddingTop: 4 },
  tiles: { paddingHorizontal: 16, gap: 12 },
  tile: { width: TILE.width, gap: 10, alignItems: 'center' },
  thumb: { borderRadius: 12, overflow: 'hidden', backgroundColor: '#000' },
  check: { position: 'absolute', bottom: -4, alignSelf: 'center', width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  unavailable: { alignItems: 'center', gap: 12, paddingVertical: 24 },
});
