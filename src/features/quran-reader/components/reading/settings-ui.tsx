import type { PropsWithChildren } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerShape } from '../../design';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';

export function SettingsCard({ palette, children }: PropsWithChildren<{ palette: ReaderPalette }>) {
  return <View style={[settingsStyles.card, { backgroundColor: palette.paper, borderColor: palette.border }]}>{children}</View>;
}

export function SettingsCardHeading({ title, detail, icon, palette }: { title: string; detail?: string; icon: ReaderIconName; palette: ReaderPalette }) {
  return <View style={settingsStyles.heading}>
    <View style={[settingsStyles.icon, { backgroundColor: palette.accentSoft }]}><ReaderIcon name={icon} color={palette.accent} size={20} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
      <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 18, fontWeight: '600' }}>{title}</Text>
      {!!detail && <Text style={{ color: palette.muted, fontSize: 13 }}>{detail}</Text>}
    </View>
  </View>;
}

export function SettingsSelection({ selected, palette }: { selected: boolean; palette: ReaderPalette }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={[settingsStyles.selection, { backgroundColor: selected ? palette.accent : 'transparent', borderColor: selected ? palette.accent : palette.border }]}>
    {selected && <ReaderIcon name="check" size={14} strokeWidth={2.4} color={palette.paper} />}
  </View>;
}

/** Explicit geometry keeps the switch consistent in both native RTL and web. */
export function SettingsToggle({ checked, palette }: { checked: boolean; palette: ReaderPalette }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}
    style={[settingsStyles.toggle, { backgroundColor: checked ? palette.accent : palette.border }]}>
    <View style={[settingsStyles.thumb, { backgroundColor: palette.paper, alignSelf: checked ? 'flex-end' : 'flex-start' }]} />
  </View>;
}

/** Lightweight diagrams distinguish layouts without loading another Quran page. */
export function ReadingLayoutPreview({ kind, palette, selected }: { kind: 'page' | 'ayah' | 'flowing'; palette: ReaderPalette; selected: boolean }) {
  const ink = selected ? palette.accent : palette.muted;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[settingsStyles.layoutPreview, { backgroundColor: palette.background }]}>
    {kind === 'page' && <View style={[settingsStyles.layoutFrame, { borderColor: palette.border }]} />}
    <View style={{ width: kind === 'page' ? '36%' : '25%', height: 4, borderRadius: 2, backgroundColor: palette.ornament, marginBottom: 5, alignSelf: 'center' }} />
    {(kind === 'ayah' ? [88, 65, 78] : kind === 'flowing' ? [100, 100, 66] : [100, 100, 100, 100]).map((width, i) => <View key={i}
      style={{ width: `${width}%`, height: 3, borderRadius: 2, backgroundColor: ink, opacity: 0.38, marginBottom: kind === 'ayah' ? 7 : 4 }} />)}
  </View>;
}

export const settingsStyles = StyleSheet.create({
  card: { padding: 18, borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, gap: 18 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  icon: { width: 36, height: 36, borderRadius: readerShape.control, justifyContent: 'center', alignItems: 'center' },
  selection: { width: 20, height: 20, borderRadius: readerShape.detail, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // A switch is one of the few genuine pills: the thumb travels inside a rounded track.
  toggle: { width: 48, height: 28, borderRadius: readerShape.pill, padding: 3.5, ...Platform.select({ native: { direction: 'ltr' as const } }) },
  thumb: { width: 21, height: 21, borderRadius: readerShape.pill },
  layoutPreview: { height: 82, borderRadius: readerShape.control, padding: 14, alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden' },
  layoutFrame: { position: 'absolute', top: 6, bottom: 6, left: 7, right: 7, borderWidth: 1, borderRadius: 2 },
});
