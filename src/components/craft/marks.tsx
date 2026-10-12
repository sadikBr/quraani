import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { mixColor, withAlpha } from '@/features/quran-reader/colors';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { formatNumber } from '@/i18n';
import { cartoucheFrame, khatam } from './art';

/**
 * A number held in an eight-pointed star, as the mushaf numbers its surahs and ayahs: a surah's
 * or a juz' number, a count. `current` fills the star (the one being read, the one chosen).
 */
export function Medallion({ value, size = 40, palette: p, current = false, tone, label }: {
  value: number | string; size?: number; palette: ReaderPalette; current?: boolean;
  /** The star's colour (the theme's gold by default). */
  tone?: string;
  /** Read out instead of the number. */
  label?: string;
}) {
  const color = tone ?? p.ornament;
  const c = size / 2, a = size * 0.3;
  const text = typeof value === 'number' ? formatNumber(value) : value;
  const digits = String(text).length;
  return <View accessible={!!label} accessibilityLabel={label} importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} accessibilityElementsHidden={!label}
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Path d={khatam(c, c, a)} fill={current ? color : withAlpha(color, 0.08)} stroke={color} strokeWidth={1.1} strokeLinejoin="round" />
      <Circle cx={c} cy={c} r={a * 0.92} fill="none" stroke={current ? withAlpha(p.card, 0.55) : withAlpha(color, 0.45)} strokeWidth={0.8} />
    </Svg>
    <Text style={{ color: current ? p.card : p.foreground, fontSize: Math.round(size * (digits > 2 ? 0.27 : 0.33)), lineHeight: Math.round(size * 0.5), fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{text}</Text>
  </View>;
}

/** A brushed stroke under a chosen word, as a teacher underlines on the lawh. */
export function BrushStroke({ on = true, width = 64, color }: { on?: boolean; width?: number; color: string }) {
  const k = width / 64;
  return <Svg width={width} height={8} aria-hidden>
    {on && <Path d={`M ${4 * k} 5 C ${18 * k} 2.5 ${40 * k} 2 ${60 * k} 4.2`} stroke={color} strokeWidth={3} strokeLinecap="round" fill="none" />}
  </Svg>;
}

/**
 * A rule between parts of a page, with a small star at its middle, as the mushaf divides its
 * margins. Used sparingly: where a page turns from one kind of thing to another.
 */
export function Rule({ palette: p, style }: { palette: ReaderPalette; style?: StyleProp<ViewStyle> }) {
  const line = withAlpha(p.ornament, 0.35);
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ flexDirection: 'row', alignItems: 'center', gap: 10 }, style]}>
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: line }} />
    <Svg width={14} height={14}><Path d={khatam(7, 7, 4)} fill={withAlpha(p.ornament, 0.15)} stroke={withAlpha(p.ornament, 0.75)} strokeWidth={1} /></Svg>
    <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: line }} />
  </View>;
}

/**
 * Beads on a thread, as on a misbaha: how far along something is, one bead a step (`count`
 * beads, `done` of them filled). Past `max` steps the beads stand for equal shares. Laid from
 * the reading start (right).
 */
export function Beads({ count, done, palette: p, size = 9, max = 24, tone, label }: {
  count: number; done: number; palette: ReaderPalette; size?: number; max?: number; tone?: string; label?: string;
}) {
  const [width, setWidth] = useState(0);
  const color = tone ?? p.ornament;
  const beads = Math.max(1, Math.min(count, max));
  const filled = count <= max ? Math.min(done, count) : Math.round((Math.min(done, count) / count) * beads);
  const gap = beads > 1 ? Math.max(2, Math.min(size, (width - beads * size) / (beads - 1))) : 0;
  const span = beads * size + (beads - 1) * gap;
  const r = size / 2;
  return <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: size + 2, alignSelf: 'stretch' }}
    accessible={!!label} accessibilityRole={label ? 'progressbar' : undefined} accessibilityLabel={label}
    accessibilityValue={label ? { min: 0, max: count, now: Math.min(done, count) } : undefined}
    importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} accessibilityElementsHidden={!label}>
    {width > 0 && <Svg width={width} height={size + 2} aria-hidden>
      <Path d={`M ${width - r} ${r + 1} H ${width - span + r}`} stroke={withAlpha(color, 0.35)} strokeWidth={1} />
      {Array.from({ length: beads }, (_, i) => {
        const cx = width - r - i * (size + gap), on = i < filled;
        return <Circle key={i} cx={cx} cy={r + 1} r={r - 0.6} fill={on ? color : p.card} stroke={on ? color : withAlpha(color, 0.55)} strokeWidth={1.1} />;
      })}
    </Svg>}
  </View>;
}

/**
 * The frame of a surah's title in the mushaf, a band with pointed ends, holding `children`
 * (a name in calligraphy, a short title).
 */
export function Cartouche({ width, height = 44, palette: p, filled = false, children, style }: {
  width: number; height?: number; palette: ReaderPalette; filled?: boolean; children: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ width, height, alignItems: 'center', justifyContent: 'center' }, style]}>
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} aria-hidden>
      <Path d={cartoucheFrame(width - 2, height - 2)} transform="translate(1 1)" fill={filled ? mixColor(p.card, p.ornament, 0.1) : 'none'} stroke={withAlpha(p.ornament, 0.7)} strokeWidth={1.1} />
      <Path d={cartoucheFrame(width - 10, height - 10)} transform="translate(5 5)" fill="none" stroke={withAlpha(p.ornament, 0.3)} strokeWidth={0.8} />
    </Svg>
    {children}
  </View>;
}
