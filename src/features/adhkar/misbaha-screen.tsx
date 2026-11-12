import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { PageBar, PageTitle } from '@/components/craft/page';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { isDarkColor, mixColor, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { formatList, formatNumber, t } from '@/i18n';
import { useAdhkar } from './provider';

/** Beads on one round of the misbaha. */
export const BEADS = 33;
const nativeDriver = Platform.OS !== 'web';

/**
 * The tasbih, drawn once in its own units (`W`×`H`) and scaled to the screen: a loop of 33 beads
 * hanging from the imam bead, a spacer after every eleven, and the tassel below. The loop is a
 * drop, round above and meeting in a point at the imam; the beads sit at equal steps along it.
 */
const W = 290, H = 430;
const CX = W / 2, CY = 168, A = 160, B = 148;
const loopPoint = (u: number) => ({ x: CX + A * Math.sin(u) * Math.sin(u / 2), y: CY + B * Math.cos(u) });
const tasbih = (() => {
  const samples = Array.from({ length: 721 }, (_, i) => loopPoint((i / 720) * 2 * Math.PI));
  const lengths = [0];
  for (let i = 1; i < samples.length; i++) lengths.push(lengths[i - 1] + Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y));
  const total = lengths[lengths.length - 1];
  /** The point and the direction of the thread at a distance along it. */
  const at = (distance: number) => {
    const i = Math.max(1, lengths.findIndex((l) => l >= distance));
    const a = samples[i - 1], b = samples[i];
    const k = (distance - lengths[i - 1]) / Math.max(1e-6, lengths[i] - lengths[i - 1]);
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI };
  };
  // The imam bead takes the place at the point of the drop; a spacer is a little under half a bead.
  const gap = 30, spacer = 0.5;
  const step = (total - gap) / (BEADS - 1 + 2 * spacer);
  const beads: { x: number; y: number }[] = [], spacers: { x: number; y: number; angle: number }[] = [];
  let distance = gap / 2;
  for (let i = 0; i < BEADS; i++) {
    beads.push(at(distance));
    if (i === 10 || i === 21) { spacers.push(at(distance + (step * (1 + spacer)) / 2)); distance += step * spacer; }
    distance += step;
  }
  const thread = `M ${samples.map((s) => `${s.x.toFixed(1)} ${s.y.toFixed(1)}`).join(' L ')} Z`;
  return { beads, spacers, thread, radius: step * 0.43 };
})();
const TIP = CY + B;
/** The tassel's strands, fanning out a little under the knot. */
const strands = Array.from({ length: 13 }, (_, i) => {
  const k = i / 12 - 0.5, top = TIP + 60, bottom = TIP + 134;
  return `M ${CX + k * 11} ${top} C ${CX + k * 16} ${top + 26} ${CX + k * 34} ${bottom - 26} ${CX + k * 42} ${bottom - Math.abs(k) * 8}`;
});

/** A tasbih counter: tap anywhere to count; each round of 33 beads closes with a firmer buzz. */
export function MisbahaScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, tasbih: countOne, setMisbaha } = useAdhkar();
  const count = state.misbaha;
  const [pulse] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0));
  // The glow of a finished round is drawn only while it fades.
  const [glowing, setGlowing] = useState(false);
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  // A restart can be taken back for a few seconds.
  const [restarted, setRestarted] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A finished round stays full for a moment before the beads start again from 0.
  const [finishing, setFinishing] = useState(false);
  const finish = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(finish.current); }, []);
  const press = () => {
    const next = count + 1;
    countOne();
    const round = next % BEADS === 0;
    clearTimeout(finish.current);
    setFinishing(round);
    if (round) finish.current = setTimeout(() => setFinishing(false), 900);
    if (Platform.OS === 'android') Vibration.vibrate(round ? 60 : 10);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.97, duration: 50, useNativeDriver: nativeDriver }),
      Animated.spring(pulse, { toValue: 1, speed: 40, bounciness: 6, useNativeDriver: nativeDriver }),
    ]).start();
    if (round) {
      glow.setValue(1);
      setGlowing(true);
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: nativeDriver }).start(({ finished }) => { if (finished) setGlowing(false); });
    }
  };
  const restart = () => {
    if (!count) return;
    setRestarted(count);
    setFinishing(false);
    setMisbaha(0);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setRestarted(null), 5000);
  };
  const undoRestart = () => {
    if (restarted === null) return;
    clearTimeout(timer.current);
    setMisbaha(restarted + count);
    setRestarted(null);
  };
  // This round's beads: 0 again once a round is done.
  const inRound = finishing ? BEADS : count % BEADS;
  const rounds = Math.floor(count / BEADS);
  // The tasbih fills what the totals leave, at its own size at most.
  const scale = area ? Math.max(0.4, Math.min(1.15, (area.width - 32) / W, (area.height - 120) / H)) : 0;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <PageBar title={t('adhkar.misbaha.title')} palette={p} back={{ label: t('adhkar.session.back'), onPress: () => router.canGoBack() ? router.back() : router.replace('/adhkar') }}
      actions={<Button variant="outline" palette={p} icon="restore" label={t('adhkar.misbaha.restartLabel')} disabled={!count} onPress={restart}>{t('adhkar.misbaha.restart')}</Button>} />
    <View style={s.title}><PageTitle subtitle={t('adhkar.misbaha.hint')} palette={p} /></View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.misbaha.label', { round: inRound, beads: BEADS, count })} accessibilityHint={t('adhkar.misbaha.tapHint')}
      onPress={press} style={s.surface} onLayout={(e) => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {scale > 0 && <Animated.View style={{ width: W * scale, height: H * scale, transform: [{ scale: pulse }] }}>
        <Tasbih inRound={inRound} scale={scale} palette={p} />
        {glowing && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: glow }]}>
          <Svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} aria-hidden>
            <Path d={tasbih.thread} fill="none" stroke={withAlpha(p.ornament, 0.35)} strokeWidth={tasbih.radius * 2 + 12} strokeLinejoin="round" />
          </Svg>
        </Animated.View>}
        <View pointerEvents="none" style={[s.count, { top: (CY - B * 0.62) * scale, height: B * 0.95 * scale }]}>
          <Text style={{ color: finishing ? p.ornament : p.foreground, fontSize: Math.round(64 * scale), lineHeight: Math.round(96 * scale), fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{formatNumber(inRound)}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: Math.max(12, Math.round(14 * scale)), lineHeight: Math.max(18, Math.round(22 * scale)), textAlign: 'center' }}>{t('adhkar.misbaha.of', { count: BEADS })}</Text>
        </View>
      </Animated.View>}
      <View style={s.stats} accessible accessibilityLabel={formatList([t('adhkar.misbaha.totalLabel', { count }), t('adhkar.misbaha.roundsLabel', { count: rounds })])}>
        <Stat label={t('adhkar.misbaha.total')} value={count} palette={p} />
        <View style={[s.divider, { backgroundColor: withAlpha(p.ornament, 0.45) }]} />
        <Stat label={t('adhkar.misbaha.rounds')} value={rounds} palette={p} />
      </View>
    </Pressable>
    {restarted !== null && <View style={s.toastWrap} pointerEvents="box-none">
      <View accessibilityLiveRegion="polite" style={[s.toast, { backgroundColor: p.foreground }]}>
        <Text style={{ flex: 1, color: p.background, fontSize: 14 }}>{t('adhkar.misbaha.restarted', { count: restarted })}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.misbaha.undo')} onPress={undoRestart} hitSlop={8}
          style={({ pressed }) => [s.undo, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: p.background, fontSize: 14, fontWeight: '600' }}>{t('adhkar.misbaha.undo')}</Text>
        </Pressable>
      </View>
    </View>}
  </SafeAreaView>;
}

function Stat({ label, value, palette: p }: { label: string; value: number; palette: ReaderPalette }) {
  return <View style={s.stat}>
    <Text style={{ color: p.foreground, fontSize: 24, lineHeight: 38, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{formatNumber(value)}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{label}</Text>
  </View>;
}

/**
 * The tasbih: its thread, the beads counted in this round in gold (the last with a halo) and
 * the rest still to count, the two spacers, the imam bead, and the tassel.
 */
function Tasbih({ inRound, scale, palette: p }: { inRound: number; scale: number; palette: ReaderPalette }) {
  const r = tasbih.radius;
  const shine = isDarkColor(p.background) ? p.foreground : p.card;
  const gold = p.ornament;
  const deep = mixColor(gold, p.foreground, 0.25);
  const empty = mixColor(p.card, gold, 0.06);
  return <Svg width={W * scale} height={H * scale} viewBox={`0 0 ${W} ${H}`} style={StyleSheet.absoluteFill} aria-hidden>
    <Path d={tasbih.thread} fill="none" stroke={withAlpha(gold, 0.55)} strokeWidth={1.2} />
    {tasbih.spacers.map((x, i) => <G key={`s${i}`} transform={`rotate(${x.angle.toFixed(1)} ${x.x.toFixed(1)} ${x.y.toFixed(1)})`}>
      <Ellipse cx={x.x} cy={x.y} rx={2.6} ry={r * 0.78} fill={deep} stroke={deep} strokeWidth={0.8} />
    </G>)}
    {tasbih.beads.map((b, i) => {
      const on = i < inRound, last = i === inRound - 1;
      return <G key={i}>
        {last && <Circle cx={b.x} cy={b.y} r={r + 5} fill={withAlpha(gold, 0.22)} />}
        <Circle cx={b.x} cy={b.y} r={r} fill={on ? gold : empty} stroke={on ? deep : withAlpha(gold, 0.6)} strokeWidth={1.2} />
        {on && <Circle cx={b.x - r * 0.32} cy={b.y - r * 0.34} r={r * 0.28} fill={withAlpha(shine, 0.55)} />}
      </G>;
    })}
    {/* The imam bead, long, where the loop meets; a cap; then the knot and the tassel. */}
    <Ellipse cx={CX} cy={TIP + 16} rx={9.5} ry={17} fill={gold} stroke={deep} strokeWidth={1.2} />
    <Ellipse cx={CX - 3} cy={TIP + 9} rx={2.6} ry={6} fill={withAlpha(shine, 0.5)} />
    <Path d={`M ${CX - 7} ${TIP + 36} H ${CX + 7} L ${CX + 4} ${TIP + 42} H ${CX - 4} Z`} fill={deep} />
    <Circle cx={CX} cy={TIP + 49} r={6} fill={gold} stroke={deep} strokeWidth={1.1} />
    <Path d={`M ${CX - 7} ${TIP + 55} H ${CX + 7} V ${TIP + 63} H ${CX - 7} Z`} fill={deep} />
    {strands.map((d, i) => <Path key={`t${i}`} d={d} stroke={i % 2 ? deep : gold} strokeWidth={1.6} strokeLinecap="round" fill="none" />)}
  </Svg>;
}

const s = StyleSheet.create({
  title: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16 },
  surface: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18, paddingBottom: 24 },
  count: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  stat: { alignItems: 'center', minWidth: 104 },
  divider: { width: StyleSheet.hairlineWidth, height: 40 },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', paddingHorizontal: 16 },
  toast: { width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: readerShape.lg },
  undo: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
});
