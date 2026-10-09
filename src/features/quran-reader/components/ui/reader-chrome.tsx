import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerShape } from '../../design';
import { QuranniLogo } from './quranni-logo';

export type ReaderIconName = 'back' | 'search' | 'book' | 'settings' | 'menu' | 'index' | 'jump' | 'close' | 'sun' | 'moon' | 'system' | 'lines' | 'check' | 'chevron' | 'bookmark' | 'eye' | 'eye-off' | 'word' | 'copy' | 'share' | 'translate';
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
    {name === 'search' && <><Circle cx="10.5" cy="10.5" r="6.5" /><Path d="m16 16 5 5" /></>}
    {name === 'book' && <Path d="M12 5v15M3 4c3-1 6 0 9 2 3-2 6-3 9-2v15c-3-1-6 0-9 2-3-2-6-3-9-2V4Z" />}
    {name === 'lines' && <Path d="M4 5h16M4 10h16M4 15h16M10 20h10" />}
    {name === 'word' && <Path d="M4 8h16M12 13h8M16 18h4m-11-4-4 4 4 4" />}
    {name === 'eye' && <><Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><Circle cx="12" cy="12" r="3" /></>}
    {name === 'eye-off' && <><Path d="m3 3 18 18M10 5.2c.7-.1 1.3-.2 2-.2 6.5 0 10 7 10 7a20 20 0 0 1-3.2 4.2M6.2 6.2A23 23 0 0 0 2 12s3.5 7 10 7c1.9 0 3.6-.6 5.1-1.4M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>}
    {name === 'settings' && <><Path d="m9.5 3-.6 2.2-1.5.9-2.2-.6-2.5 4.3 1.6 1.6v1.8l-1.6 1.6 2.5 4.3 2.2-.6 1.5.9.6 2.2h5l.6-2.2 1.5-.9 2.2.6 2.5-4.3-1.6-1.6v-1.8l1.6-1.6-2.5-4.3-2.2.6-1.5-.9-.6-2.2h-5Z" /><Circle cx="12" cy="12" r="3" /></>}
    {name === 'menu' && <Path d="M4 6h16M4 12h16M4 18h16" />}
    {name === 'index' && <><Path d="M4 6h10M4 12h10M4 18h10" /><Circle cx="19" cy="6" r="1" /><Circle cx="19" cy="12" r="1" /><Circle cx="19" cy="18" r="1" /></>}
    {name === 'jump' && <Path d="M5 5h14v14H5zM8 12h8m-3-3 3 3-3 3" />}
    {name === 'sun' && <><Circle cx="12" cy="12" r="4" /><Path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>}
    {name === 'moon' && <Path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10Z" />}
    {name === 'system' && <><Rect x="3" y="4" width="18" height="13" rx="3" /><Path d="M8 21h8m-4-4v4" /></>}
  </Svg></View>;
}

export function IconButton({ name, label, onPress, palette }: { name: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? palette.accentSoft : palette.paper, borderColor: palette.border }]}>
    <ReaderIcon name={name} color={palette.text} size={20} />
  </Pressable>;
}

export function ScreenHeading({ title, subtitle, palette, onBack }: { title: string; subtitle: string; palette: ReaderPalette; onBack: () => void }) {
  return <View style={styles.heading}>
    <View style={[styles.bar, { borderColor: palette.border }]}>
      <View style={styles.brand}><QuranniLogo color={palette.ornament} size={30} /><Text style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>قرآني</Text></View>
      <IconButton name="back" label="العودة إلى القراءة" onPress={onBack} palette={palette} />
    </View>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 28, fontWeight: '700', lineHeight: 44 }}>{title}</Text>
    <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 24 }}>{subtitle}</Text>
  </View>;
}

export function SectionHeading({ title, description, icon, palette }: { title: string; description?: string; icon: ReaderIconName; palette: ReaderPalette }) {
  return <View style={{ gap: 4 }}>
    <View style={styles.sectionTitle}>
      <ReaderIcon name={icon} color={palette.accent} size={19} />
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 19, fontWeight: '600' }}>{title}</Text>
    </View>
    {!!description && <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 24 }}>{description}</Text>}
  </View>;
}

export function Segments<T extends string>({ options, value, onChange, palette }: { options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; palette: ReaderPalette }) {
  return <View style={[styles.segments, { backgroundColor: palette.paper, borderColor: palette.border }]}>
    {options.map((option) => <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: value === option.value }} onPress={() => onChange(option.value)}
      aria-pressed={value === option.value}
      style={({ pressed }) => [styles.segment, { backgroundColor: value === option.value ? palette.accent : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
      <Text style={{ fontSize: 14, fontWeight: '600', textAlign: 'center', color: value === option.value ? palette.paper : palette.muted }}>{option.label}</Text>
    </Pressable>)}
  </View>;
}

const styles = StyleSheet.create({
  heading: { gap: 2 }, bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 16, borderBottomWidth: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 44, height: 44, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  segments: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: readerShape.card, gap: 3 },
  segment: { flex: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'center', borderRadius: readerShape.control },
});
