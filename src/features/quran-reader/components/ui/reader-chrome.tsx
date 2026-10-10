import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerShape, withAlpha } from '../../design';

export type ReaderIconName = 'back' | 'search' | 'book' | 'settings' | 'menu' | 'index' | 'calendar' | 'jump' | 'close' | 'sun' | 'moon' | 'system' | 'lines' | 'check' | 'chevron' | 'bookmark' | 'eye' | 'eye-off' | 'word' | 'copy' | 'share' | 'translate' | 'trash' | 'restore' | 'archive' | 'clock' | 'plus' | 'sparkle' | 'flame' | 'loop';
export function ReaderIcon({ name, color, size = 22, strokeWidth = 1.65 }: { name: ReaderIconName; color: string; size?: number; strokeWidth?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden><Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {name === 'back' && <Path d="m9 5 7 7-7 7M16 12H4" />}
    {name === 'chevron' && <Path d="m14 6-6 6 6 6" />}
    {name === 'check' && <Path d="m5 12 4 4L19 6" />}
    {name === 'bookmark' && <Path d="M6 4h12v17l-6-4-6 4V4Z" />}
    {name === 'copy' && <><Rect x="8" y="8" width="12" height="13" rx="2" /><Path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /></>}
    {name === 'share' && <Path d="M12 16V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />}
    {name === 'translate' && <Path d="M3 5h12M9 3v2m4 0c-1 5-5 8-9 10m2-8c1 3 4 6 7 7m1 6 4-10 4 10m-7-3h6" />}
    {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
    {name === 'trash' && <Path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7" />}
    {name === 'restore' && <Path d="M4 4v6h6M4.5 10a8 8 0 1 1-.1 5" />}
    {name === 'archive' && <><Rect x="3" y="3" width="18" height="5" rx="1" /><Path d="M5 8v13h14V8M9 12h6" /></>}
    {name === 'search' && <><Circle cx="10.5" cy="10.5" r="6.5" /><Path d="m16 16 5 5" /></>}
    {name === 'book' && <Path d="M12 5v15M3 4c3-1 6 0 9 2 3-2 6-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2V4Z" />}
    {name === 'lines' && <Path d="M4 5h16M4 10h16M4 15h16M10 20h10" />}
    {name === 'word' && <Path d="M4 8h16M12 13h8M16 18h4m-11-4-4 4 4 4" />}
    {name === 'eye' && <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><Circle cx="12" cy="12" r="3" /></>}
    {name === 'eye-off' && <><Path d="m3 3 18 18M10 5.2c.7-.1 1.3-.2 2-.2 6.5 0 10 7 10 7a20 20 0 0 1-3.2 4.2M6.2 6.2A23 23 0 0 0 2 12s3.5 7 10 7c1.9 0 3.6-.6 5.1-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
    {name === 'settings' && <><Path d="m9.5 3-.6 2.2-1.5.9-2.2-.6-2.5 4.3 1.6 1.6v1.8l-1.6 1.6 2.5 4.3 2.2-.6 1.5.9.6 2.2h5l.6-2.2 1.5-.9 2.2.6 2.5-4.3-1.6-1.6v-1.8l1.6-1.6-2.5-4.3-2.2.6-1.5-.9-.6-2.2h-5Z" /><Circle cx="12" cy="12" r="3" /></>}
    {name === 'menu' && <Path d="M4 6h16M4 12h16M4 18h16" />}
    {name === 'calendar' && <><Rect x="3" y="5" width="18" height="16" rx="2" /><Path d="M7 3v4m10-4v4M3 11h18m-13 5 2 2 5-4" /></>}
    {name === 'index' && <><Path d="M4 6h10M4 12h10M4 18h10" /><Circle cx="19" cy="6" r="1" /><Circle cx="19" cy="12" r="1" /><Circle cx="19" cy="18" r="1" /></>}
    {name === 'jump' && <Path d="M5 5h14v14H5zM8 12h8m-3-3 3 3-3 3" />}
    {name === 'sun' && <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'moon' && <Path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />}
    {name === 'clock' && <><Circle cx="12" cy="12" r="9" /><Path d="M12 7v5l3 2" /></>}
    {name === 'plus' && <Path d="M12 5v14M5 12h14" />}
    {name === 'sparkle' && <Path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />}
    {name === 'flame' && <Path d="M12 21c-3.9 0-7-2.9-7-6.6 0-3.2 2.3-5.6 4-7.4.2 2.1 1.2 3.4 2.6 4 0-3 1.5-5.6 3.9-8 .6 3.1 3.5 5.5 3.5 10.1 0 4.4-3.1 7.9-7 7.9Z" />}
    {name === 'loop' && <Path d="M17 3l3 3-3 3M4 12v-1a5 5 0 0 1 5-5h11M7 21l-3-3 3-3M20 12v1a5 5 0 0 1-5 5H4" />}
    {name === 'system' && <><Rect x="3" y="4" width="18" height="13" rx="3" /><Path d="M8 21h8m-4-4v4" /></>}
  </Svg></View>;
}

export function IconButton({ name, label, onPress, palette }: { name: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? palette.accentSoft : palette.paper, borderColor: palette.border }]} hitSlop={4}>
    <ReaderIcon name={name} color={palette.text} size={20} />
  </Pressable>;
}

export function Segments<T extends string>({ options, value, onChange, palette }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; palette: ReaderPalette }) {
  return <View style={[styles.segments, { backgroundColor: withAlpha(palette.text, 0.06) }]}>
    {options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)}
      aria-pressed={value === option.value}
      style={({ pressed }) => [styles.segment, { backgroundColor: value === option.value ? palette.paper : 'transparent', borderColor: value === option.value ? palette.border : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
      <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center', color: value === option.value ? palette.accent : palette.muted }}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: 'center', justifyContent: 'center' },
  // Outer `control` minus the 4px inset leaves `detail` for the selected segment, so the corners stay concentric.
  segments: { flexDirection: 'row', padding: 4, borderRadius: readerShape.control, gap: 4 },
  segment: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 6, justifyContent: 'center', borderRadius: readerShape.detail, borderWidth: StyleSheet.hairlineWidth },
});
