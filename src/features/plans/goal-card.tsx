import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerShape, withAlpha } from '../quran-reader/design';

/** Shared frame keeps every goal type aligned with the existing goals overview. */
export function GoalCardFrame({ id, name, status, due, accessibilityDetail = '', children }: PropsWithChildren<{
  id: string; name: string; status: string; due: boolean; accessibilityDetail?: string;
}>) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={`فتح هدف ${name}، ${status}${accessibilityDetail}`}
    onPress={() => router.push({ pathname: '/plans/[id]', params: { id } })}
    style={({ pressed }) => [g.card, { backgroundColor: p.paper, borderColor: pressed ? p.accent : withAlpha(p.border, 0.7), transform: [{ scale: pressed ? 0.99 : 1 }] }, readerElevation(1, p)]}>
    <View style={g.content}>{children}</View>
    <View style={[g.footer, { backgroundColor: due ? p.accentSoft : 'transparent', borderColor: p.border }]}>
      <View style={[g.row, g.grow]}>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: due ? p.accent : p.muted }} />
        <Text style={{ color: due ? p.accent : p.muted, fontSize: 12, flexShrink: 1 }}>{status}</Text>
      </View>
      <View style={g.row}><Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>{due ? 'متابعة' : 'التفاصيل'}</Text><ReaderIcon name="chevron" color={p.accent} size={17} /></View>
    </View>
  </Pressable>;
}

export function GoalCardHeading({ name, description, icon, trailing }: { name: string; description: string; icon: ReaderIconName; trailing?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[g.row, { gap: 12 }]}>
    <View style={[g.icon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={24} /></View>
    <View style={g.grow}><Text style={{ color: p.text, fontSize: 22, fontWeight: '600' }}>{name}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{description}</Text></View>
    {trailing}
  </View>;
}

const g = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.card },
  content: { padding: 18, gap: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  icon: { width: 46, height: 46, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: 18, paddingVertical: 10, minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomLeftRadius: readerShape.card, borderBottomRightRadius: readerShape.card },
});
