import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Image } from 'expo-image';
import { ArabicText as Text } from '@/components/arabic-text';
import { khatam } from '@/components/craft/art';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { withAlpha } from '@/features/quran-reader/design';

/**
 * The account's portrait: the photo in a circle set in an eight-pointed star of gold, as the app
 * numbers a surah or a participant — or, without a photo, the name's first letter in its place.
 * `busy` veils it while a new photo goes up.
 */
export function Avatar({ size, photo, cacheKey, initial, palette: p, busy = false, label }: {
  size: number; photo?: string; cacheKey?: string; initial: string; palette: ReaderPalette; busy?: boolean; label?: string;
}) {
  // A link that no longer loads (offline, expired) shows the letter instead.
  const [failed, setFailed] = useState<string | undefined>(undefined);
  const c = size / 2;
  // The star's squares reach `a` from the centre on their sides and `a·√2` at their points: the
  // photo covers the octagon where they cross, so only the eight points show around it.
  const a = size / (2 * Math.SQRT2) - 1;
  const d = Math.round(a * 2.2);
  const shown = photo && failed !== photo ? photo : undefined;
  return <View accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}
    importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Path d={khatam(c, c, a)} fill={withAlpha(p.ornament, 0.1)} stroke={p.ornament} strokeWidth={1.4} strokeLinejoin="round" />
      <Circle cx={c} cy={c} r={d / 2 + 3} fill={p.card} stroke={withAlpha(p.ornament, 0.55)} strokeWidth={1} />
    </Svg>
    <View style={{ width: d, height: d, borderRadius: d / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(p.ornament, 0.14) }}>
      {shown ? <Image source={{ uri: shown, cacheKey }} style={{ width: d, height: d }} contentFit="cover" transition={160} onError={() => setFailed(shown)} accessible={false} />
        : <Text style={{ color: p.ornament, fontSize: Math.round(d * 0.46), lineHeight: Math.round(d * 0.7), fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{initial}</Text>}
      {busy && <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: withAlpha(p.background, 0.55) }]}>
        <ActivityIndicator color={p.foreground} />
      </View>}
    </View>
  </View>;
}
