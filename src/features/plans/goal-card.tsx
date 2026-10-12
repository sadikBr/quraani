import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchTile, artColors, Emblem, type EmblemName, type Motif } from '@/components/craft/art';
import { Beads } from '@/components/craft/marks';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '../quran-reader/design';
import type { ReaderPalette } from '../quran-reader/theme';
import { t } from '@/i18n';
import { assertPlanIndex, nextPortion } from './engine';
import type { ReadingPlan } from './types';
import { usePlanIndex } from './use-plan-index';

/** The five kinds of goal, each drawn with its own pattern and mark. */
export type GoalKind = 'khatma' | 'wird' | 'memorization' | 'revision' | 'recurring';
export function goalKind(plan: ReadingPlan): GoalKind {
  return plan.goal.type;
}
/**
 * Each kind's pattern, as on the home screen's tiles: the khatam's stars for the khatma, the sun's
 * rosette for the daily wird, the mashrabiya's lattice for memorizing, arches within arches for
 * revision (the same ground walked again), ripples for the surahs one returns to.
 */
export const goalMotifs: Record<GoalKind, Motif> = { khatma: 'khatam', wird: 'rosette', memorization: 'lattice', revision: 'arches', recurring: 'ripple' };
/** Each kind's mark: the khatam star, the sun of each day, a leaf that grows, a knot that holds, a lantern lit again. */
export const goalEmblems: Record<GoalKind, EmblemName> = { khatma: 'star', wird: 'sun', memorization: 'leaf', revision: 'knot', recurring: 'lantern' };

/** A goal's mark on a small arch drawn with its kind's pattern. `muted` for a goal set aside (archived). */
export function GoalMark({ kind, width = 46, muted = false }: { kind: GoalKind; width?: number; muted?: boolean }) {
  const { palette: p } = useReadingPreferences();
  const height = Math.round(width * 1.22), rise = Math.round(width * 0.48);
  return <View style={{ width, height, opacity: muted ? 0.55 : 1 }} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <ArchTile w={width} h={height} rise={rise} motif={goalMotifs[kind]} palette={p} faded={0.9} />
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: Math.round(width * 0.22) }]}>
      <Emblem name={goalEmblems[kind]} size={Math.round(width * 0.48)} color={artColors(p).ink} />
    </View>
  </View>;
}

/**
 * What a goal's card needs to start today's portion: the mushaf's index (once it has loaded and
 * matches the goal), the next portion, and the way into the reader when that portion is due.
 */
export function useGoalStart(plan: ReadingPlan, today: string) {
  const { update } = useReadingPreferences();
  const { index, error } = usePlanIndex(plan.riwayah);
  const next = nextPortion(plan, today);
  let valid = !!index;
  if (index) { try { assertPlanIndex(plan, index); } catch { valid = false; } }
  const open = () => {
    if (!index || !valid || !next?.due) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const start = next?.due && plan.status === 'active' && !error && !(index && !valid)
    ? { label: t('home.today.startGoal', { name: plan.name }), ready: !!index, onPress: open } : undefined;
  return { index: valid ? index : undefined, next, start };
}

/**
 * A goal on the list: its mark, its name and what kind of goal it is; how far along it is, as beads;
 * and at its foot, what is due (today's portion) or when the next one comes. The whole card opens
 * the goal; a due goal also carries the way straight into today's reading.
 */
export function GoalCardFrame({ id, name, kind, summary, status, due, done = false, portion, progress, start, accessibilityDetail = '', muted = false }: {
  id: string; name: string; kind: GoalKind; summary: string; status: string; due: boolean;
  /** Today's portion is done: the status is marked with a check. */
  done?: boolean;
  /** Today's portion, said after the status ("الصفحات ١٩٦–٢١٦"). */
  portion?: string;
  progress?: ReactNode;
  /** Starts today's portion in the mushaf; `ready` is false while the mushaf's index loads. */
  start?: { label: string; ready: boolean; onPress: () => void };
  accessibilityDetail?: string; muted?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  return <View style={[g.card, { backgroundColor: p.card, borderColor: due ? withAlpha(p.ornament, 0.45) : p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('plans.card.openLabel', { name, status, detail: accessibilityDetail })} accessibilityHint={portion}
      onPress={() => router.push({ pathname: '/plans/[id]', params: { id } })}
      style={({ pressed }) => [g.main, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <View style={g.head}>
        <GoalMark kind={kind} muted={muted} />
        <View style={g.grow}>
          <Text numberOfLines={2} style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{name}</Text>
          <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{summary}</Text>
        </View>
        {/* Room for the start button laid over the card's corner. */}
        {start && <View style={{ width: 44 }} />}
      </View>
      {progress}
      <View style={[g.foot, { borderColor: p.border }]}>
        {due ? <View style={[g.dot, { backgroundColor: p.ornament }]} /> : done ? <ReaderIcon name="check" color={p.ornament} size={15} /> : <ReaderIcon name="calendar" color={p.mutedForeground} size={14} />}
        <Text numberOfLines={1} style={{ color: due || done ? p.foreground : p.mutedForeground, fontSize: 13, fontWeight: due ? '700' : done ? '600' : '400', flexShrink: portion ? 0 : 1 }}>{status}</Text>
        {!!portion && <Text numberOfLines={2} style={{ flex: 1, minWidth: 0, color: p.mutedForeground, fontSize: 13, paddingVertical: 4 }}>{portion}</Text>}
        {!portion && <View style={{ flex: 1 }} />}
        <ReaderIcon name="chevron" color={p.mutedForeground} size={15} />
      </View>
    </Pressable>
    {start && <Pressable accessibilityRole="button" accessibilityLabel={start.label} disabled={!start.ready} onPress={start.onPress} hitSlop={4}
      style={({ pressed }) => [g.play, { backgroundColor: p.primary, opacity: pressed ? 0.85 : 1 }]}>
      {start.ready ? <ReaderIcon name="play" color={p.primaryForeground} size={17} /> : <ActivityIndicator size="small" color={p.primaryForeground} />}
    </Pressable>}
  </View>;
}

/**
 * How far along a goal is: beads on a thread (one a portion, or equal shares past two dozen), or
 * a `trail` of days each in its own state; a line under it says it in words, and `value` (a
 * percentage) closes the line.
 */
export function GoalProgress({ count = 0, done = 0, size = 9, max = 24, trail, label, value, quiet = false }: {
  count?: number; done?: number; size?: number; max?: number; trail?: TrailState[]; label: string; value?: string;
  /** `value` is words, not a percentage: written small, as the label is. */
  quiet?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 8 }}>
    {/* A trail of fewer than two days says nothing yet: only the words under it are shown. */}
    {trail ? trail.length > 1 && <Trail states={trail} palette={p} /> : <Beads count={Math.max(1, count)} done={done} palette={p} size={size} max={max} />}
    <View style={[g.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
      <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, flexShrink: 1 }}>{label}</Text>
      {!!value && (quiet ? <Text numberOfLines={2} style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, flexShrink: 1 }}>{value}</Text>
        : <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontFamily: 'ReaderNaskhBold' }}>{value}</Text>)}
    </View>
  </View>;
}

/** A day on a trail: read, read in part, missed, today (waiting), or not a day of the goal. */
export type TrailState = 'done' | 'partial' | 'missed' | 'today' | 'off';

/**
 * Days as beads on a thread, laid from the reading start (right), the oldest first: a read day is
 * a full bead, a day begun is half filled, a missed day an empty one, today ringed, and a day the
 * goal does not fall on only a small dot on the thread.
 */
export function Trail({ states, palette: p, size = 12, labels }: { states: TrailState[]; palette: ReaderPalette; size?: number; labels?: string[] }) {
  const [width, setWidth] = useState(0);
  const n = states.length, r = size / 2, step = n > 1 ? (width - size) / (n - 1) : 0;
  const x = (i: number) => width - r - i * step;
  return <View style={{ gap: 4 }}>
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: size + 4, alignSelf: 'stretch' }} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {width > 0 && <Svg width={width} height={size + 4}>
        <Path d={`M ${x(0)} ${r + 2} H ${x(n - 1)}`} stroke={withAlpha(p.ornament, 0.35)} strokeWidth={1} />
        {states.map((state, i) => {
          const cx = x(i), cy = r + 2, rr = r - 0.6;
          if (state === 'off') return <Circle key={i} cx={cx} cy={cy} r={1.8} fill={withAlpha(p.ornament, 0.5)} />;
          return <G key={i}>
            <Circle cx={cx} cy={cy} r={rr} fill={state === 'done' ? p.ornament : p.card}
              stroke={state === 'today' ? p.primary : state === 'missed' ? withAlpha(p.ornament, 0.45) : p.ornament} strokeWidth={state === 'today' ? 2 : 1.1} />
            {/* A day begun: the bead filled from the reading start (its right half). */}
            {state === 'partial' && <Path d={`M ${cx} ${cy - rr} A ${rr} ${rr} 0 0 1 ${cx} ${cy + rr} Z`} fill={p.ornament} />}
          </G>;
        })}
      </Svg>}
    </View>
    {/* From the reading start, as the beads: each label centred under its bead. */}
    {labels && <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: r - 22 }}>
      {labels.map((label, i) => <Text key={i} numberOfLines={1} style={{ width: 44, textAlign: 'center', color: states[i] === 'today' ? p.foreground : p.mutedForeground, fontSize: 10, fontWeight: states[i] === 'today' ? '700' : '400' }}>{label}</Text>)}
    </View>}
  </View>;
}

const g = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, overflow: 'hidden' },
  main: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 0, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  foot: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, minHeight: 44, marginHorizontal: -14, paddingHorizontal: 14 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  play: { position: 'absolute', top: 20, end: 12, width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
});
