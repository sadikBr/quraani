import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerShape, withAlpha } from '../quran-reader/design';

/** Shared frame keeps every goal type aligned with the existing goals overview.
 * One status line closes the card; the chevron is the only affordance. */
export function GoalCardFrame({ id, name, status, due, accessibilityDetail = '', children }: PropsWithChildren<{
  id: string; name: string; status: string; due: boolean; accessibilityDetail?: string;
}>) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={`فتح هدف ${name}، ${status}${accessibilityDetail}`}
    onPress={() => router.push({ pathname: '/plans/[id]', params: { id } })}
    style={({ pressed }) => [g.card, { backgroundColor: pressed ? p.accentSoft : p.paper, borderColor: pressed ? withAlpha(p.accent, 0.5) : p.border }]}>
    {children}
    <View style={g.row}>
      <View style={[g.dot, { backgroundColor: due ? p.accent : withAlpha(p.text, 0.25) }]} />
      <Text style={{ color: due ? p.accent : p.muted, fontSize: 13, fontWeight: due ? '600' : '400', flex: 1, minWidth: 0 }}>{status}</Text>
      <ReaderIcon name="chevron" color={due ? p.accent : p.muted} size={17} />
    </View>
  </Pressable>;
}

export function GoalCardHeading({ name, description, icon, trailing }: { name: string; description: string; icon: ReaderIconName; trailing?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[g.row, { gap: 12, alignItems: 'flex-start' }]}>
    <View style={[g.icon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={20} /></View>
    <View style={g.grow}><Text style={{ color: p.text, fontSize: 19, fontWeight: '600', lineHeight: 28 }}>{name}</Text><Text style={{ color: p.muted, fontSize: 13, lineHeight: 20 }}>{description}</Text></View>
    {trailing}
  </View>;
}

/** Gold is reserved for progress: the one accent of delight on a goal card. */
export function GoalProgress({ value, label, trailing }: { value: number; label: string; trailing?: string }) {
  const { palette: p } = useReadingPreferences();
  const width = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return <View style={{ gap: 8 }}>
    <View style={[g.track, { backgroundColor: withAlpha(p.text, 0.08) }]}><View style={{ height: '100%', width, backgroundColor: p.ornament }} /></View>
    <View style={[g.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: p.muted, fontSize: 12, flexShrink: 1 }}>{label}</Text>
      {!!trailing && <Text style={{ color: p.muted, fontSize: 12 }}>{trailing}</Text>}
    </View>
  </View>;
}

const g = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: readerShape.card, padding: 18, gap: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  icon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: readerShape.detail },
  track: { height: 6, borderRadius: readerShape.detail, overflow: 'hidden' },
});
