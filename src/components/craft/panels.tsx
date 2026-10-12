import { useId, useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { mixColor, withAlpha } from '@/features/quran-reader/colors';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { archPath } from './art';

/**
 * A panel under a wide pointed arch, as a window of the Maghrib: the page's main figure sits in
 * it (the day's prayers seen as the sun's path, a dhikr being said). The outline is drawn to the
 * size the content takes; a line of gold runs just inside it, and the top of the arch is washed
 * with `sky` (the theme's primary by default) fading down.
 */
export function ArchPanel({ palette: p, rise = 44, sky, tone, style, contentStyle, children }: {
  palette: ReaderPalette; rise?: number; sky?: string | null; tone?: string; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const id = useId().replace(/[^\w-]/g, '');
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const wash = sky === undefined ? p.primary : sky;
  return <View style={style} onLayout={(event) => {
    const { width, height } = event.nativeEvent.layout;
    if (!size || Math.abs(size.width - width) > 0.5 || Math.abs(size.height - height) > 0.5) setSize({ width, height });
  }}>
    {size && <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} aria-hidden>
      <Defs>
        <LinearGradient id={`sky${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={wash ?? p.card} stopOpacity={wash ? 0.1 : 0} />
          <Stop offset="0.55" stopColor={wash ?? p.card} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {/* Drawn a line's width inside its box, so no part of the outline is cut off. */}
      <Path d={archPath(size.width - 2, size.height - 2, rise, 1, 1, 18)} fill={mixColor(p.card, p.ornament, 0.03)} stroke={tone ?? p.border} strokeWidth={tone ? 1.5 : 1} />
      {wash && <Path d={archPath(size.width - 2, size.height - 2, rise, 1, 1, 18)} fill={`url(#sky${id})`} />}
      <Path d={archPath(size.width - 14, size.height - 14, rise - 5, 7, 7, 12)} fill="none" stroke={withAlpha(p.ornament, 0.45)} strokeWidth={1} />
    </Svg>}
    <View style={[{ paddingTop: rise + 6, paddingHorizontal: 20, paddingBottom: 20 }, contentStyle]}>{children}</View>
  </View>;
}
