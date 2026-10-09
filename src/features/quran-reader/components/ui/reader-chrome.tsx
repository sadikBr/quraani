import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';

export type ReaderIconName = 'back' | 'search' | 'book' | 'settings' | 'jump' | 'close' | 'sun' | 'moon' | 'system' | 'lines' | 'check' | 'chevron' | 'bookmark';
export function ReaderIcon({ name, color, size = 22 }: { name: ReaderIconName; color: string; size?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden><Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.65} strokeLinecap="round" strokeLinejoin="round">
    {name === 'back' && <Path d="m9 5 7 7-7 7M16 12H4" />}
    {name === 'chevron' && <Path d="m14 6-6 6 6 6" />}
    {name === 'check' && <Path d="m5 12 4 4L19 6" />}
    {name === 'bookmark' && <Path d="M6 4h12v17l-6-4-6 4V4Z" />}
    {name === 'close' && <Path d="m6 6 12 12M6 18 18 6" />}
    {name === 'search' && <><Circle cx="10.5" cy="10.5" r="6.5" /><Path d="m16 16 5 5" /></>}
    {name === 'book' && <Path d="M12 5v15M3 4c3-1 6 0 9 2 3-2 6-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2V4Z" />}
    {name === 'lines' && <Path d="M4 5h16M4 10h16M4 15h16M10 20h10" />}
    {name === 'settings' && <><Path d="M4 6h16M4 12h16M4 18h16" /><Circle cx="8" cy="6" r="2" /><Circle cx="16" cy="12" r="2" /><Circle cx="9" cy="18" r="2" /></>}
    {name === 'jump' && <Path d="M5 5h14v14H5zM8 12h8m-3-3 3 3-3 3" />}
    {name === 'sun' && <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'moon' && <Path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />}
    {name === 'system' && <><Rect x="3" y="4" width="18" height="13" rx="3" /><Path d="M8 21h8m-4-4v4" /></>}
  </Svg></View>;
}

/** A small geometric seal, shared by the index and reading chrome. */
export function QuranSeal({ color, size = 44 }: { color: string; size?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none" stroke={color} strokeWidth={1.2}>
      <Path d="m40 3 11 11h15v15l11 11-11 11v15H51L40 77 29 66H14V51L3 40l11-11V14h15Z" />
      <Path d="m40 13 8 9h10v10l9 8-9 8v10H48l-8 9-8-9H22V48l-9-8 9-8V22h10Z" />
      <Path d="M40 29v25M26 28c5-1 10 1 14 4 4-3 9-5 14-4v23c-5-1-10 1-14 4-4-3-9-5-14-4Z" strokeWidth={1.7} />
    </Svg>
  </View>;
}

export function IconButton({ name, label, onPress, palette }: { name: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? palette.accentSoft : palette.paper, borderColor: palette.border }]}>
    <ReaderIcon name={name} color={palette.text} size={20} />
  </Pressable>;
}

export function ScreenHeading({ title, subtitle, palette, onBack }: { title: string; subtitle: string; palette: ReaderPalette; onBack: () => void }) {
  return <View style={styles.heading}>
    <View style={styles.bar}>
      <View style={styles.brand}><QuranSeal color={palette.ornament} size={30} /><Text style={{ color: palette.text, fontSize: 14, fontWeight: '600' }}>قراني</Text></View>
      <IconButton name="back" label="العودة إلى القراءة" onPress={onBack} palette={palette} />
    </View>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 30, fontWeight: '700', lineHeight: 46 }}>{title}</Text>
    <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 24 }}>{subtitle}</Text>
  </View>;
}

export function Segments<T extends string>({ options, value, onChange, palette }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; palette: ReaderPalette }) {
  return <View style={[styles.segments, { backgroundColor: palette.accentSoft }]}>
    {options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)}
      style={({ pressed }) => [styles.segment, { backgroundColor: value === option.value ? palette.paper : 'transparent', opacity: pressed ? 0.7 : 1 }, value === option.value && styles.segmentSelected]}>
      <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center', color: value === option.value ? palette.accent : palette.muted }}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  heading: { gap: 2 }, bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', padding: 4, borderRadius: 15, gap: 4 },
  segment: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 9, justifyContent: 'center', borderRadius: 11 },
  segmentSelected: { boxShadow: '0 2px 5px rgba(20, 53, 43, 0.06)' },
});
