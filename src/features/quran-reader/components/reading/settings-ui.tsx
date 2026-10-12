import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, CheckMark, IconTile, SwitchMark } from '@/components/ui';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerShape } from '../../design';
import type { ReaderIconName } from '../ui/reader-chrome';

export function SettingsCard({ palette, children }: PropsWithChildren<{ palette: ReaderPalette }>) {
  return <Card palette={palette} style={settingsStyles.card}>{children}</Card>;
}

export function SettingsCardHeading({ title, detail, icon, palette }: { title: string; detail?: string; icon: ReaderIconName; palette: ReaderPalette }) {
  return <View style={settingsStyles.heading}>
    <IconTile name={icon} palette={palette} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      {!!detail && <Text style={{ color: palette.mutedForeground, fontSize: 14 }}>{detail}</Text>}
    </View>
  </View>;
}

/** The heading of a group of cards within a tab, with what the group is about. */
export function SettingsGroupHeading({ title, detail, palette }: { title: string; detail?: string; palette: ReaderPalette }) {
  return <View style={settingsStyles.group}>
    <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 19, fontWeight: '700' }}>{title}</Text>
    {!!detail && <Text style={{ color: palette.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}
  </View>;
}

/** Single-choice mark (RadioGroup item). */
export function SettingsSelection({ selected, palette }: { selected: boolean; palette: ReaderPalette }) {
  return <CheckMark checked={selected} palette={palette} radio />;
}

/** Explicit geometry keeps the switch consistent in both native RTL and web. */
export function SettingsToggle({ checked, palette }: { checked: boolean; palette: ReaderPalette }) {
  return <SwitchMark checked={checked} palette={palette} />;
}

/** Lightweight diagrams distinguish layouts without loading another Quran page. */
export function ReadingLayoutPreview({ kind, palette, selected }: { kind: 'page' | 'ayah' | 'flowing'; palette: ReaderPalette; selected: boolean }) {
  const ink = selected ? palette.primary : palette.mutedForeground;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={[settingsStyles.layoutPreview, { backgroundColor: palette.background }]}>
    {kind === 'page' && <View style={[settingsStyles.layoutFrame, { borderColor: palette.border }]} />}
    <View style={{ width: kind === 'page' ? '36%' : '25%', height: 4, borderRadius: 2, backgroundColor: palette.ornament, marginBottom: 5, alignSelf: 'center' }} />
    {(kind === 'ayah' ? [88, 65, 78] : kind === 'flowing' ? [100, 100, 66] : [100, 100, 100, 100]).map((width, i) => <View key={i}
      style={{ width: `${width}%`, height: 3, borderRadius: 2, backgroundColor: ink, opacity: 0.38, marginBottom: kind === 'ayah' ? 7 : 4 }} />)}
  </View>;
}

export const settingsStyles = StyleSheet.create({
  card: { padding: 20, gap: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  group: { paddingHorizontal: 4, paddingTop: 6, gap: 2 },
  layoutPreview: { height: 82, borderRadius: readerShape.control, padding: 14, alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden' },
  layoutFrame: { position: 'absolute', top: 6, bottom: 6, left: 7, right: 7, borderWidth: 1, borderRadius: 2 },
});
