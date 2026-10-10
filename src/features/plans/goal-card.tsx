import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, type ReaderIconName } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerShape } from '../quran-reader/design';
import { Badge, IconTile, Progress } from '@/components/ui';
import { t } from '@/i18n';

/** Shared frame keeps every goal type aligned with the existing goals overview.
 * One status line closes the card; the chevron is the only affordance. */
export function GoalCardFrame({ id, name, status, due, accessibilityDetail = '', children }: PropsWithChildren<{
  id: string; name: string; status: string; due: boolean; accessibilityDetail?: string;
}>) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={t('plans.card.openLabel', { name, status, detail: accessibilityDetail })}
    onPress={() => router.push({ pathname: '/plans/[id]', params: { id } })}
    style={({ pressed }) => [g.card, { backgroundColor: pressed ? p.accent : p.card, borderColor: p.border }, readerElevation(2, p)]}>
    {children}
    <View style={[g.row, g.footer, { borderColor: p.border }]}>
      {due ? <Badge variant="default">{status}</Badge> : <Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{status}</Text>}
      <View style={{ flex: 1 }} />
      <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
    </View>
  </Pressable>;
}

export function GoalCardHeading({ name, description, icon, trailing }: { name: string; description: string; icon: ReaderIconName; trailing?: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <View style={[g.row, { gap: 12, alignItems: 'flex-start' }]}>
    <IconTile name={icon} />
    <View style={g.grow}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600', lineHeight: 26 }}>{name}</Text><Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{description}</Text></View>
    {trailing}
  </View>;
}

export function GoalProgress({ value, label, trailing }: { value: number; label: string; trailing?: string }) {
  const { palette: p } = useReadingPreferences();
  return <View style={{ gap: 8 }}>
    <Progress value={value} />
    <View style={[g.row, { justifyContent: 'space-between' }]}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, flexShrink: 1 }}>{label}</Text>
      {!!trailing && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{trailing}</Text>}
    </View>
  </View>;
}

const g = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 16, gap: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  grow: { flex: 1, minWidth: 0 },
  icon: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: readerShape.detail },
  track: { height: 6, borderRadius: readerShape.detail, overflow: 'hidden' },
});
