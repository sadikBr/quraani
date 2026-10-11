import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Chip } from '@/components/ui';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { PlanSwitch } from '@/features/plans/components';
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

/** One background to choose: its photo (or colour) and its name. */
function BackgroundTile({ id, selected, size, onPress }: { id: ScreenBackground; selected: boolean; size: number; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  const name = t(`prayers.screen.backgrounds.${id}`);
  return <Pressable accessibilityRole="radio" accessibilityLabel={name} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={onPress}
    style={({ pressed }) => [s.tile, { width: size, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[s.thumb, { width: size, height: Math.round(size * 1.45), borderColor: selected ? p.primary : p.border, borderWidth: selected ? 2 : StyleSheet.hairlineWidth }]}>
      {isScreenPhoto(id)
        ? <Image source={screenImage(id, true)} resizeMode="cover" resizeMethod="resize" style={{ width: '100%', height: '100%' }} />
        : <Gradient id={`tile-${id}`} colors={PLAIN[id as 'green' | 'night']} />}
      {selected && <View style={[s.check, { backgroundColor: p.primary }]}><ReaderIcon name="done" color={p.primaryForeground} size={12} /></View>}
    </View>
    <Text numberOfLines={2} style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 12, lineHeight: 17, textAlign: 'center', fontWeight: selected ? '600' : '400' }}>{name}</Text>
  </Pressable>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 10 }}>
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>
    {children}
  </View>;
}

/** «شاشة الأذان»: choose the background, its darkness, the movement and the date, with a live preview. */
export function AthanScreenDesigner() {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const { width } = useWindowDimensions();
  const [failed, setFailed] = useState(false);
  const style = state.screen;
  const set = (change: Partial<AthanScreenStyle>) => update({ screen: { ...style, ...change } });
  const previewWidth = Math.round(Math.min(230, width * 0.56));
  // Three backgrounds a row, across the page.
  const tile = Math.floor((Math.min(width, readerLayout.maxWidth) - 32 - 2 * 12) / 3);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.back')} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/prayers'); }} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('prayers.screen.title')}</Text>
        <Text style={{ fontSize: 15, lineHeight: 24, color: p.mutedForeground }}>{t('prayers.screen.subtitle')}</Text>
      </View>
      {!fullAthanSupported ? <Alert palette={p}>{t('prayers.screen.unavailable')}</Alert> : <>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ScreenPreview style={style} width={previewWidth} />
          <Button palette={p} icon="eye" onPress={() => setFailed(!openScreenPreview(state))}>{t('prayers.screen.preview')}</Button>
          <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('prayers.screen.previewHint')}</Text>
          {failed && <Alert variant="destructive" palette={p}>{t('prayers.screen.previewFailed')}</Alert>}
        </View>
        <Section title={t('prayers.screen.background')}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('prayers.screen.background')} style={s.tiles}>
            {SCREEN_BACKGROUNDS.map((id) => <BackgroundTile key={id} id={id} size={tile} selected={style.background === id} onPress={() => set({ background: id })} />)}
          </View>
        </Section>
        <Section title={t('prayers.screen.dim')}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('prayers.screen.dim')} style={s.chips}>
            {SCREEN_DIMS.map((dim) => <Chip key={dim} accessibilityRole="radio" flex palette={p} selected={style.dim === dim} label={t(`prayers.screen.dims.${dim}`)} onPress={() => set({ dim })} />)}
          </View>
        </Section>
        <Section title={t('prayers.screen.motion')}>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('prayers.screen.motion')} style={s.chips}>
            {SCREEN_MOTIONS.map((motion) => <Chip key={motion} accessibilityRole="radio" flex palette={p} selected={style.motion === motion} label={t(`prayers.screen.motions.${motion}`)} onPress={() => set({ motion })} />)}
          </View>
        </Section>
        <PlanSwitch label={t('prayers.screen.date')} detail={t('prayers.screen.dateDetail')} checked={style.date} onChange={(date) => set({ date })} />
      </>}
    </ScrollView>
  </SafeAreaView>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 24 },
  phone: { overflow: 'hidden', backgroundColor: '#000' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 16 },
  tile: { gap: 6, alignItems: 'center' },
  thumb: { borderRadius: readerShape.control, overflow: 'hidden', backgroundColor: '#000' },
  check: { position: 'absolute', top: 8, left: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', gap: 8 },
});
