import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { formatList, formatNumber, t } from '@/i18n';
import { useAdhkar } from './provider';

/** Beads on one round of the misbaha. */
export const BEADS = 33;
const nativeDriver = Platform.OS !== 'web';

/** A tasbih counter: tap anywhere to count; each round of 33 beads closes with a firmer buzz. */
export function MisbahaScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, tasbih, setMisbaha } = useAdhkar();
  const count = state.misbaha;
  const [pulse] = useState(() => new Animated.Value(1));
  const [glow] = useState(() => new Animated.Value(0));
  // A restart can be taken back for a few seconds.
  const [restarted, setRestarted] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A finished round stays full for a moment before the beads start again from 0.
  const [finishing, setFinishing] = useState(false);
  const finish = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => { clearTimeout(timer.current); clearTimeout(finish.current); }, []);
  const press = () => {
    const next = count + 1;
    tasbih();
    const round = next % BEADS === 0;
    clearTimeout(finish.current);
    setFinishing(round);
    if (round) finish.current = setTimeout(() => setFinishing(false), 900);
    if (Platform.OS === 'android') Vibration.vibrate(round ? 60 : 10);
    Animated.sequence([
      Animated.timing(pulse, { toValue: 0.96, duration: 50, useNativeDriver: nativeDriver }),
      Animated.spring(pulse, { toValue: 1, speed: 40, bounciness: 6, useNativeDriver: nativeDriver }),
    ]).start();
    if (round) {
      glow.setValue(1);
      Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: nativeDriver }).start();
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
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <Button variant="outline" icon="back" label={t('adhkar.session.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/adhkar')} />
      <Text accessibilityRole="header" style={{ flex: 1, color: p.foreground, fontSize: 19, fontWeight: '600' }}>{t('adhkar.misbaha.title')}</Text>
      <Button variant="outline" icon="restore" label={t('adhkar.misbaha.restartLabel')} disabled={!count} onPress={restart}>{t('adhkar.misbaha.restart')}</Button>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.misbaha.label', { round: inRound, beads: BEADS, count })} accessibilityHint={t('adhkar.misbaha.tapHint')}
      onPress={press} style={s.surface}>
      <Text style={{ color: p.mutedForeground, fontSize: 14, textAlign: 'center' }}>{t('adhkar.misbaha.hint')}</Text>
      <Animated.View style={[s.ring, { transform: [{ scale: pulse }] }]}>
        <Animated.View style={[s.glow, { borderColor: p.ornament, opacity: glow }]} />
        <Beads inRound={inRound} palette={p} />
        <View style={[s.face, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
          <Text style={{ color: finishing ? p.ornament : p.foreground, fontSize: 58, fontWeight: '600', lineHeight: 72 }}>{formatNumber(inRound)}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('adhkar.misbaha.of', { count: BEADS })}</Text>
        </View>
      </Animated.View>
      <View style={s.stats} accessible accessibilityLabel={formatList([t('adhkar.misbaha.totalLabel', { count }), t('adhkar.misbaha.roundsLabel', { count: rounds })])}>
        <Stat label={t('adhkar.misbaha.total')} value={count} palette={p} />
        <View style={[s.divider, { backgroundColor: p.border }]} />
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
    <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{formatNumber(value)}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{label}</Text>
  </View>;
}

/** The round's 33 beads; those counted in this round are filled, the last one in gold. */
function Beads({ inRound, palette: p }: { inRound: number; palette: ReaderPalette }) {
  const size = SIZE, center = size / 2, radius = size / 2 - 12;
  return <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
    <Circle cx={center} cy={center} r={radius} stroke={withAlpha(p.primary, 0.08)} strokeWidth={2} fill="none" />
    {Array.from({ length: BEADS }, (_, i) => {
      // Clockwise from the top.
      const angle = (i / BEADS) * 2 * Math.PI - Math.PI / 2;
      const filled = i < inRound;
      const last = i === inRound - 1;
      return <Circle key={i} cx={center + radius * Math.cos(angle)} cy={center + radius * Math.sin(angle)} r={last ? 8.5 : 6.5}
        fill={last ? p.ornament : filled ? p.primary : p.muted} stroke={filled ? 'none' : withAlpha(p.primary, 0.12)} strokeWidth={1} />;
    })}
  </Svg>;
}

const SIZE = 290;
const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  surface: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28, paddingBottom: 40 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  stat: { alignItems: 'center', minWidth: 96 },
  divider: { width: StyleSheet.hairlineWidth, height: 36 },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: SIZE + 16, height: SIZE + 16, borderRadius: readerShape.pill, borderWidth: 3 },
  face: { width: SIZE - 76, height: SIZE - 76, borderRadius: readerShape.pill, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, bottom: 24, alignItems: 'center', paddingHorizontal: 16 },
  toast: { width: '100%', maxWidth: 520, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderRadius: readerShape.lg },
  undo: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
});
