import { memo, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { withAlpha } from '@/features/quran-reader/colors';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import type { AyahSpan } from '@/features/plans/types';
import { formatList, formatNumber, t } from '@/i18n';
import { ayahPosition, rangeUnits, rotationFor, stepOf, toggleUnit, unitAngle, unitAt, unitAtPointer, unitState, type DialKind, type DialUnit } from './dial';

const rad = (deg: number) => (deg * Math.PI) / 180;
/** The wheel turns on the UI thread where there is one (not on the web). */
const native = Platform.OS !== 'web';
const ease = Easing.out(Easing.cubic);
/** Space around the wheel for the selection band and the juz marks. */
const RING = 46;
/** The height a unit takes at the middle of the band of names, at least. */
const STEP = 29;
/** How near the top or bottom a sweep turns the wheel on its own, and how fast at most (points a second, at the names). */
const EDGE = 72;
const EDGE_SPEED = 720;

/**
 * The unit at the pointer, shared with what shows it: they alone are drawn again as the wheel
 * turns, not the whole editor.
 */
export function createFocusStore(initial: number) {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next: number) => { if (next !== value) { value = next; listeners.forEach((listener) => listener()); } },
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type FocusStore = ReturnType<typeof createFocusStore>;
export const useFocus = (store: FocusStore) => useSyncExternalStore(store.subscribe, store.get, store.get);

/**
 * The wheel's turning and gestures, made once per wheel. What they read is kept in one mutable
 * object that the wheel keeps current on every render (gesture callbacks may be compiled as
 * worklets, which copy the plain variables they capture), as the pager does.
 *
 * The turn is a native animated value: each move of the finger sets it on the UI thread directly,
 * with no render; a release glides on (natively) to rest on a unit. Its value is kept here too
 * (`state.rotation`, where a glide ends; `current` works out where a glide has got to), so nothing
 * listens to the value frame by frame.
 */
function createDial(at: number, count: number, focus: FocusStore) {
  const start = rotationFor(at, count);
  const rotation = new Animated.Value(start);
  const state = {
    rotation: start, units: [] as DialUnit[], selected: [] as AyahSpan[], n: count, cx: 0, cy: 0, radius: 0, inner: 0, height: 0,
    onChange: (_: AyahSpan[]) => {}, focus,
    glide: null as null | { from: number; to: number; at: number; duration: number },
    turn: { last: 0, total: 0, base: 0 },
    range: { anchor: -1, at: -1, before: [] as AyahSpan[], add: true, x: 0, y: 0, frame: 0, last: 0 },
  };
  const current = () => {
    const g = state.glide;
    if (!g) return state.rotation;
    const progress = Math.min(1, (Date.now() - g.at) / g.duration);
    return g.from + (g.to - g.from) * ease(progress);
  };
  const set = (value: number) => {
    state.rotation = value;
    rotation.setValue(value);
    focus.set(unitAtPointer(value, state.n));
  };
  /** A glide caught by the finger stops where it has got to. */
  const hold = () => {
    if (!state.glide) return;
    const value = current();
    state.glide = null;
    rotation.stopAnimation();
    set(value);
  };
  const glideTo = (target: number, duration = 320) => {
    const from = current();
    rotation.stopAnimation();
    state.glide = { from, to: target, at: Date.now(), duration };
    state.rotation = target;
    // The unit it will rest on is named at once.
    focus.set(unitAtPointer(target, state.n));
    Animated.timing(rotation, { toValue: target, duration, easing: ease, useNativeDriver: native })
      .start(() => { if (state.glide?.to === target) state.glide = null; });
  };
  const settle = () => { const s = stepOf(state.n); glideTo(Math.round(current() / s) * s, 220); };
  // Made native once the wheel is drawn, so that a move sets it on the UI thread.
  const prime = () => Animated.timing(rotation, { toValue: state.rotation, duration: 0, useNativeDriver: native }).start();

  const angleOf = (x: number, y: number) => (Math.atan2(y - state.cy, x - state.cx) * 180) / Math.PI;
  const onWheel = (x: number, y: number) => { const r = Math.hypot(x - state.cx, y - state.cy); return r > state.inner - 40 && r < state.radius + 14; };
  const unitUnder = (x: number, y: number) => onWheel(x, y) ? unitAt(angleOf(x, y), state.rotation, state.n) : -1;
  const sweepTo = (i: number) => {
    if (state.range.anchor < 0 || i < 0 || i === state.range.at) return;
    state.range.at = i;
    state.onChange(rangeUnits(state.range.before, state.units, state.range.anchor, i, state.range.add));
  };
  // While a sweep is held near the top or bottom, the wheel turns on its own to bring more units
  // under the finger: slowly at first, faster the nearer the edge, at the same pace on screen
  // whatever the units and however often the screen is drawn.
  const edgeTurn = (now: number) => {
    const { y } = state.range;
    const elapsed = state.range.last ? Math.min(48, now - state.range.last) : 16;
    state.range.last = now;
    const near = y < EDGE ? -(EDGE - y) / EDGE : y > state.height - EDGE ? (y - (state.height - EDGE)) / EDGE : 0;
    if (near) {
      const push = Math.max(-1, Math.min(1, near)), mid = (state.inner + state.radius) / 2;
      set(state.rotation + Math.sign(push) * push * push * EDGE_SPEED * (elapsed / 1000) * (180 / (Math.PI * mid)));
      sweepTo(unitUnder(state.range.x, state.range.y));
    }
    state.range.frame = requestAnimationFrame(edgeTurn);
  };
  const endSweep = () => {
    if (state.range.frame) cancelAnimationFrame(state.range.frame);
    const swept = state.range.anchor >= 0;
    state.range.frame = 0; state.range.last = 0; state.range.anchor = -1;
    if (swept) settle();
  };

  const turn = Gesture.Pan().runOnJS(true).minDistance(10)
    .onStart((e) => { hold(); state.turn = { last: angleOf(e.x, e.y), total: 0, base: state.rotation }; })
    .onUpdate((e) => {
      const a = angleOf(e.x, e.y);
      let d = a - state.turn.last;
      if (d > 180) d -= 360; else if (d < -180) d += 360;
      state.turn.last = a; state.turn.total += d;
      set(state.turn.base + state.turn.total);
    })
    .onEnd((e) => {
      // A flick glides on, slowing, and rests on a unit.
      const dx = e.x - state.cx, dy = e.y - state.cy, r2 = Math.max(1, dx * dx + dy * dy);
      const spin = ((dx * e.velocityY - dy * e.velocityX) / r2) * (180 / Math.PI);
      const s = stepOf(state.n), reach = s * 18;
      const target = Math.round((state.rotation + Math.max(-reach, Math.min(reach, spin * 0.24))) / s) * s;
      glideTo(target, Math.max(240, Math.min(760, 220 + Math.abs(target - state.rotation) * 5)));
    });
  const tap = Gesture.Tap().runOnJS(true).maxDuration(320).onEnd((e, success) => {
    if (!success) return;
    hold();
    const i = unitUnder(e.x, e.y);
    if (i >= 0) state.onChange(toggleUnit(state.selected, state.units[i]));
  });
  const sweep = Gesture.Pan().runOnJS(true).activateAfterLongPress(380)
    .onStart((e) => {
      hold();
      const i = unitUnder(e.x, e.y);
      if (i < 0) { state.range.anchor = -1; return; }
      state.range = { ...state.range, anchor: i, at: i, before: state.selected, add: unitState(state.selected, state.units[i]) !== 'full', x: e.x, y: e.y, last: 0 };
      state.onChange(rangeUnits(state.range.before, state.units, i, i, state.range.add));
      state.range.frame = requestAnimationFrame(edgeTurn);
    })
    .onUpdate((e) => { state.range.x = e.x; state.range.y = e.y; sweepTo(unitUnder(e.x, e.y)); })
    .onFinalize(endSweep);
  return { rotation, state, glideTo, prime, gesture: Gesture.Race(sweep, turn, tap) };
}

/**
 * The Quran as a wheel, its centre beyond the right edge: the surahs (or juz, or hizbs) around it,
 * the one at the pointer on the left. Turning it brings the others round; a tap chooses a unit, or
 * takes it out; a long press then a drag chooses (or takes out) every unit it passes, the wheel
 * turning on its own when the finger nears the top or bottom. Around the edge, what is chosen is
 * marked in the primary colour, what is memorized (`memorized`) in dashed gold, and the juz
 * boundaries. For a screen reader the wheel is one adjustable control: swiping up or down moves
 * to the next unit, a double tap chooses it.
 *
 * Everything that turns is plain views (no drawing that would be painted again whole), and each
 * unit is drawn again only when its own state changes.
 */
export function RangeDial({ units, kind, selected, memorized = [], juzStarts = [], focus, width, height, palette: p, onChange }: {
  units: DialUnit[]; kind: DialKind; selected: AyahSpan[]; memorized?: AyahSpan[]; width: number; height: number; palette: ReaderPalette;
  /** Where each juz begins (ayah positions), marked round a wheel of surahs or hizbs. */
  juzStarts?: number[];
  /** The unit at the pointer: the wheel opens at it (give the wheel a `key` per set of units), and sets it as it turns. */
  focus: FocusStore;
  onChange: (selected: AyahSpan[]) => void;
}) {
  const n = units.length;
  // The geometry: the centre beyond the right edge, so the wheel is large and its edge runs down
  // the screen nearly straight, as a page's margin; on the left, room for the pointer and the
  // juz marks. The names sit in a band by the edge, where the steps are widest. The wheel is as
  // large as it takes for each step to be a comfortable height (`STEP`): the 114 surahs make the
  // largest wheel, and the flattest.
  const radius = Math.max(200, width * 1.28 - 60, (STEP * n) / (2 * Math.PI) + 90);
  const cx = radius + 60, cy = height / 2;
  const inner = radius - Math.min(180, radius * 0.45);
  const c = radius + RING;
  const [dial] = useState(() => createDial(Math.min(focus.get(), n - 1), n, focus));
  Object.assign(dial.state, { units, selected, n, cx, cy, radius, inner, height, onChange });
  useEffect(() => { dial.prime(); }, [dial]);
  const at = useFocus(focus);
  const spin = useMemo(() => dial.rotation.interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] }), [dial]);

  const label = units[at]?.label ?? '';
  const atState = units[at] ? unitState(selected, units[at]) : 'none';
  const chosen = atState === 'full' ? t('practice.dial.chosen') : atState === 'part' ? t('practice.dial.partly') : t('practice.dial.notChosen');
  const slot = useMemo(() => {
    const step = stepOf(n), frame = frameOf(180, step, inner, radius + 2, 2);
    return { frame, d: wedge(frame, inner, radius + 2, 180 - step / 2, 180 + step / 2) };
  }, [n, inner, radius]);

  // Laid out left to right: positions here are physical (with the app's right-to-left layout,
  // native swaps left and right), as the gestures' coordinates are.
  return <View style={{ width, height, overflow: 'hidden', direction: 'ltr' }}>
    <GestureDetector gesture={dial.gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false} accessible accessibilityRole="adjustable"
        accessibilityLabel={t('practice.dial.label', { kind: t(`practice.dial.kinds.${kind}`) })} accessibilityValue={{ text: formatList([label, chosen]) }}
        accessibilityHint={t('practice.dial.hint')}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === 'activate') onChange(toggleUnit(selected, units[at]));
          else dial.glideTo(rotationFor((at + (name === 'increment' ? 1 : -1) + n) % n, n, dial.state.rotation));
        }}>
        {/* The slot at the pointer, under the wheel. */}
        <Tile cx={cx} cy={cy} {...slot.frame} fill={slot.d} fillColor={withAlpha(p.ornament, 0.14)} />
        <Turning spin={spin} left={cx - c} top={cy - c} units={units} kind={kind} selected={selected} memorized={memorized} juzStarts={juzStarts} radius={radius} inner={inner} palette={p} />
        {/* The pointer, outside the wheel on the left. */}
        <View pointerEvents="none" style={{ position: 'absolute', left: cx - radius - 54, top: cy - 9 }}>
          <Svg width={16} height={18}><Path d="M 2 1 L 15 9 L 2 17 Z" fill={p.ornament} /></Svg>
        </View>
      </View>
    </GestureDetector>
  </View>;
}

/**
 * The turning layer, on its own: the wheel redraws as it turns (to name the unit at the pointer),
 * and this is left as it is. Drawn again, an animated view takes up its native animation anew.
 */
const Turning = memo(function Turning({ spin, left, top, radius, ...face }: {
  spin: Animated.AnimatedInterpolation<string>; left: number; top: number; units: DialUnit[]; kind: DialKind; selected: AyahSpan[]; memorized: AyahSpan[];
  juzStarts: number[]; radius: number; inner: number; palette: ReaderPalette;
}) {
  const size = (radius + RING) * 2;
  return <Animated.View pointerEvents="none" style={{ position: 'absolute', left, top, width: size, height: size, transform: [{ rotate: spin }] }}>
    <WheelFace radius={radius} {...face} />
  </Animated.View>;
});

/**
 * The face is drawn in sectors of the wheel (degrees), each its own small drawing: a change
 * redraws only the sectors it touches, and none is large (a drawing is painted whole, as an
 * image). The units' fills, wide, in narrow sectors; the rim's band and beads, narrow, in wide ones.
 */
const SECTOR = 12;
const RIM_SECTOR = 30;
/** The selection band round the rim, and the beads of what is memorized outside it. */
const BAND = { r: 5, width: 5 };
const BEAD = { r: 14, size: 1.6, gap: 7 };

/**
 * The frame of a drawing of the wheel from radius `r0` to `r1`, `span` degrees about the angle
 * `mid` (and `margin` points more): the drawing is turned so that its middle lies to the left of
 * the wheel's centre (at 180°), as small as can be.
 */
type Frame = { mid: number; r1: number; w: number; h: number };
function frameOf(mid: number, span: number, r0: number, r1: number, margin: number): Frame {
  const half = rad(span / 2) + margin / r0;
  return { mid, r1, w: r1 - r0 * Math.cos(half), h: 2 * r1 * Math.sin(half) };
}
const sectorOf = (angle: number, size: number) => Math.min(360 / size - 1, Math.max(0, Math.floor((angle + 180) / size)));
const xy = (f: Frame, r: number, angle: number) => {
  const a = rad(angle - f.mid + 180);
  return [f.r1 + r * Math.cos(a), f.h / 2 + r * Math.sin(a)];
};
const at = (f: Frame, r: number, angle: number) => xy(f, r, angle).map((v) => v.toFixed(2)).join(' ');
/** The wheel between radii `ri` and `ro`, from angle `lo` to `hi`. */
const wedge = (f: Frame, ri: number, ro: number, lo: number, hi: number) =>
  `M ${at(f, ro, hi)} A ${ro} ${ro} 0 0 0 ${at(f, ro, lo)} L ${at(f, ri, lo)} A ${ri} ${ri} 0 0 1 ${at(f, ri, hi)} Z`;
const arc = (f: Frame, r: number, lo: number, hi: number) => `M ${at(f, r, hi)} A ${r} ${r} 0 0 0 ${at(f, r, lo)}`;
const dot = (f: Frame, r: number, angle: number, size: number) => {
  const [x, y] = xy(f, r, angle);
  return `M ${(x - size).toFixed(2)} ${y.toFixed(2)} a ${size} ${size} 0 1 0 ${size * 2} 0 a ${size} ${size} 0 1 0 ${-size * 2} 0 Z`;
};

/**
 * A stretch of the wheel (angles, `lo` < `hi`, within a turn) cut into the sectors of `size`
 * degrees it crosses, the angles brought within -180°…180°.
 */
function bySector(lo: number, hi: number, size: number, add: (sector: number, lo: number, hi: number) => void) {
  const cut = (a: number, b: number) => {
    for (let k = sectorOf(a, size); k < 360 / size && -180 + k * size < b; k++) {
      const from = Math.max(a, -180 + k * size), to = Math.min(b, -180 + (k + 1) * size);
      if (to > from) add(k, from, to);
    }
  };
  if (hi > 180) { cut(Math.max(lo, 180) - 360, hi - 360); hi = 180; }
  if (lo < -180) { cut(lo + 360, Math.min(hi, -180) + 360); lo = -180; }
  if (hi > lo) cut(lo, hi);
}

/** The angles a run of ayahs covers round the wheel, from where its first ayah falls to where its end does. */
function stretches(units: DialUnit[], spans: AyahSpan[]) {
  const n = units.length, last = units[n - 1]?.end ?? 0, list: [number, number][] = [];
  for (const span of spans) {
    const from = unitAngle(ayahPosition(units, span.start), n), to = unitAngle(span.end >= last ? n - 0.5 : ayahPosition(units, span.end), n);
    if (to < from) list.push([Math.max(to, from - 360), from]);
  }
  return list;
}

/** Collects paths per sector, then gives each sector's as one path. */
function sectors() {
  const map = new Map<number, string[]>();
  return {
    add: (k: number, d: string) => { const list = map.get(k); if (list) list.push(d); else map.set(k, [d]); },
    get: (k: number) => map.get(k)?.join(' '),
    keys: () => map.keys(),
  };
}

/**
 * What turns: the wheel, its units, the bands round its rim and the juz marks. Drawn again only
 * when what it shows changes, not as the wheel turns; and then only the units and sectors whose
 * state changed.
 */
const WheelFace = memo(function WheelFace({ units, kind, selected, memorized, juzStarts, radius, inner, palette: p }: {
  units: DialUnit[]; kind: DialKind; selected: AyahSpan[]; memorized: AyahSpan[]; juzStarts: number[]; radius: number; inner: number; palette: ReaderPalette;
}) {
  const n = units.length, c = radius + RING, step = stepOf(n);
  const length = radius - inner - 10, mid = inner + 4 + length / 2;
  const h = Math.max(14, (2 * Math.PI * mid) / n);
  const fontSize = n > 90 ? 16 : n > 40 ? 17 : 18;
  const states = useMemo(() => units.map((u) => unitState(selected, u)), [units, selected]);
  // Where each juz begins, round a wheel of surahs or hizbs: a tick at each, and its number where
  // there is room (several begin within al-Baqara).
  const juzMarks = useMemo(() => {
    const marks = kind === 'juz' || !units.length ? [] : juzStarts.slice(1).map((start, i) => ({ juz: i + 2, angle: unitAngle(ayahPosition(units, start), units.length), shown: true }));
    marks.forEach((m, i) => { const before = marks.slice(0, i).reverse().find((x) => x.shown); m.shown = !before || before.angle - m.angle >= 7; });
    return marks;
  }, [kind, units, juzStarts]);

  // The chosen units, filled. Each unit whole in the sector of its middle, and a run of them in a
  // sector in one piece: where sectors meet, a line between units lies over the join.
  const fills = useMemo(() => {
    const full = sectors(), part = sectors(), frames = new Map<number, Frame>();
    const frame = (k: number) => {
      let f = frames.get(k);
      if (!f) { f = frameOf(-180 + SECTOR * k + SECTOR / 2, SECTOR + step, inner - 1, radius + 1, 2); frames.set(k, f); }
      return f;
    };
    let run: { k: number; state: 'full' | 'part'; lo: number; hi: number; next: number } | null = null;
    const flush = () => { if (run) (run.state === 'full' ? full : part).add(run.k, wedge(frame(run.k), inner, radius, run.lo, run.hi)); run = null; };
    states.forEach((state, i) => {
      if (state === 'none') { flush(); return; }
      let a = unitAngle(i, n);
      if (a >= 180) a -= 360;
      const k = sectorOf(a, SECTOR);
      if (run && run.k === k && run.state === state && run.next === i) { run.lo = a - step / 2; run.next++; return; }
      flush();
      run = { k, state, lo: a - step / 2, hi: a + step / 2, next: i + 1 };
    });
    flush();
    return [...frames.entries()].map(([k, f]) => ({ k, f, full: full.get(k), part: part.get(k) }));
  }, [states, n, step, inner, radius]);

  // Round the rim: what is chosen as a band, what is memorized as a string of beads, evenly spaced
  // all the way round.
  const rim = useMemo(() => {
    const band = sectors(), beads = sectors(), frames = new Map<number, Frame>();
    const frame = (k: number) => {
      let f = frames.get(k);
      if (!f) { f = frameOf(-180 + RIM_SECTOR * k + RIM_SECTOR / 2, RIM_SECTOR, radius + 1, radius + BEAD.r + 4, 6); frames.set(k, f); }
      return f;
    };
    for (const [lo, hi] of stretches(units, selected)) bySector(lo, hi, RIM_SECTOR, (k, a, b) => band.add(k, arc(frame(k), radius + BAND.r, a, b)));
    const count = Math.round((2 * Math.PI * (radius + BEAD.r)) / BEAD.gap), spacing = 360 / count;
    for (const [lo, hi] of stretches(units, memorized)) {
      for (let j = Math.ceil(lo / spacing); j * spacing <= hi; j++) {
        let angle = j * spacing;
        if (angle >= 180) angle -= 360; else if (angle < -180) angle += 360;
        const k = sectorOf(angle, RIM_SECTOR);
        beads.add(k, dot(frame(k), radius + BEAD.r, angle, BEAD.size));
      }
    }
    return [...frames.entries()].map(([k, f]) => ({ k, f, band: band.get(k), beads: beads.get(k) }));
  }, [units, selected, memorized, radius]);

  return <>
    <View style={[s.circle, { left: c - radius, top: c - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: withAlpha(p.card, 0.86), borderColor: p.border }]} />
    <View style={[s.circle, { left: c - inner, top: c - inner, width: inner * 2, height: inner * 2, borderRadius: inner, borderColor: withAlpha(p.ornament, 0.4) }]} />
    {fills.map(({ k, f, full, part }) => <Tile key={`f${k}`} cx={c} cy={c} {...f} fill={full} fillColor={withAlpha(p.primary, 0.2)} soft={part} softColor={withAlpha(p.primary, 0.08)} />)}
    <Dividers n={n} c={c} radius={radius} inner={inner} color={withAlpha(p.border, 0.9)} />
    {units.map((u, i) => {
      const a = unitAngle(i, n);
      return <Spoke key={u.start} label={u.label} number={kind === 'surah' ? u.number : 0} chosen={states[i] === 'full'} angle={a}
        left={c + mid * Math.cos(rad(a)) - length / 2} top={c + mid * Math.sin(rad(a)) - h / 2} length={length} height={h} fontSize={fontSize} palette={p} />;
    })}
    {rim.map(({ k, f, band, beads }) => <Tile key={`r${k}`} cx={c} cy={c} {...f} line={band} lineColor={p.primary} lineWidth={BAND.width} fill={beads} fillColor={withAlpha(p.ornament, 0.85)} />)}
    {juzMarks.map((m) => <View key={`t${m.juz}`} style={[s.tick, { left: c + (radius - 4) * Math.cos(rad(m.angle)) - 5, top: c + (radius - 4) * Math.sin(rad(m.angle)) - 0.75, backgroundColor: p.mutedForeground, transform: [{ rotate: `${m.angle - 180}deg` }] }]} />)}
    {juzMarks.filter((m) => m.shown).map((m) => {
      // The juz' number in a small round mark outside the beads.
      const r = radius + 27, d = 18;
      return <View key={m.juz} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={[s.juz, { left: c + r * Math.cos(rad(m.angle)) - d / 2, top: c + r * Math.sin(rad(m.angle)) - d / 2, width: d, height: d, borderRadius: d / 2, borderColor: withAlpha(p.mutedForeground, 0.6), transform: [{ rotate: `${m.angle - 180}deg` }] }]}>
        <Text style={{ color: p.mutedForeground, fontSize: 9, lineHeight: 12, textAlign: 'center' }}>{formatNumber(m.juz)}</Text>
      </View>;
    })}
  </>;
});

/**
 * A small drawing of part of the wheel (centred at `cx`, `cy`), turned into place: filled paths
 * (`fill`, and `soft` in a lighter colour) and a stroked one (`line`, with round ends).
 */
const Tile = memo(function Tile({ cx, cy, mid, r1, w, h, fill, fillColor, soft, softColor, line, lineColor, lineWidth }: Frame & {
  cx: number; cy: number; fill?: string; fillColor?: string; soft?: string; softColor?: string; line?: string; lineColor?: string; lineWidth?: number;
}) {
  const d = r1 - w / 2;
  return <Svg pointerEvents="none" width={w} height={h} style={{ position: 'absolute', left: cx + d * Math.cos(rad(mid)) - w / 2, top: cy + d * Math.sin(rad(mid)) - h / 2, transform: [{ rotate: `${mid - 180}deg` }] }}>
    {soft ? <Path d={soft} fill={softColor} /> : null}
    {fill ? <Path d={fill} fill={fillColor} /> : null}
    {line ? <Path d={line} stroke={lineColor} strokeWidth={lineWidth} strokeLinecap="round" fill="none" /> : null}
  </Svg>;
});

/** The lines between the units, along the wheel's radii. */
const Dividers = memo(function Dividers({ n, c, radius, inner, color }: { n: number; c: number; radius: number; inner: number; color: string }) {
  const length = radius - inner, r = (radius + inner) / 2, half = stepOf(n) / 2;
  return <>{Array.from({ length: n }, (_, i) => {
    const a = unitAngle(i, n) - half;
    return <View key={i} style={[s.divider, { left: c + r * Math.cos(rad(a)) - length / 2, top: c + r * Math.sin(rad(a)) - 0.5, width: length, backgroundColor: color, transform: [{ rotate: `${a - 180}deg` }] }]} />;
  })}</>;
});

/**
 * One unit, along its radius: its number by the inner edge, its name ending at the outer one;
 * chosen, the name in the primary colour.
 */
const Spoke = memo(function Spoke({ label, number, chosen, angle, left, top, length, height, fontSize, palette: p }: {
  label: string; number: number; chosen: boolean; angle: number; left: number; top: number; length: number; height: number; fontSize: number; palette: ReaderPalette;
}) {
  const lineHeight = Math.min(height, 28);
  return <View style={[s.spoke, { left, top, width: length, height, transform: [{ rotate: `${angle - 180}deg` }] }]}>
    {number > 0 && <Text style={{ color: p.mutedForeground, fontSize: 11, lineHeight }}>{formatNumber(number)}</Text>}
    <Text numberOfLines={1} style={{ flex: 1, color: chosen ? p.primary : p.foreground, fontSize, lineHeight, fontFamily: chosen ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold', textAlign: 'left' }}>{label}</Text>
  </View>;
});

const s = StyleSheet.create({
  circle: { position: 'absolute', borderWidth: 1 },
  // Physical order (the dial is laid out left to right): the number at the right, by the inner edge.
  spoke: { position: 'absolute', flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  divider: { position: 'absolute', height: 1 },
  tick: { position: 'absolute', width: 10, height: 1.5 },
  juz: { position: 'absolute', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
