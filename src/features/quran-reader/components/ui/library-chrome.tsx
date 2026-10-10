import { useState, type PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '../../design';
import { Button, Empty, IconTile, Tabs } from '@/components/ui';
import { ReaderIcon, type ReaderIconName } from './reader-chrome';
import { t } from '@/i18n';

export function LibraryHeader({ title, subtitle, icon, palette: p, onBack }: { title: string; subtitle: string; icon: ReaderIconName; palette: ReaderPalette; onBack: () => void }) {
  return <View style={[l.header, { borderColor: p.border }]}>
    <Button icon="back" label={t('common.backToReading')} onPress={onBack} palette={p} variant="outline" />
    <View style={l.grow}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{title}</Text><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{subtitle}</Text></View>
    <IconTile name={icon} palette={p} />
  </View>;
}

/** Input with a leading search icon: `input` border, `radius-md`, shadow-xs; focus turns the border `ring`. */
export function LibrarySearch({ value, onChange, label, placeholder, palette: p }: { value: string; onChange: (query: string) => void; label: string; placeholder: string; palette: ReaderPalette }) {
  const [focused, setFocused] = useState(false);
  return <View style={[l.search, { backgroundColor: p.background, borderColor: focused ? p.ring : p.input }, focused ? { boxShadow: `0 0 0 3px ${withAlpha(p.ring, 0.5)}` } as ViewStyle : readerElevation(1, p)]}>
    <ReaderIcon name="search" color={p.mutedForeground} size={18} />
    <TextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={p.mutedForeground} value={value} onChangeText={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCorrect={false} returnKeyType="search" selectionColor={p.primary} style={[l.input, { color: p.foreground }]} />
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel={t('common.clearSearch')} onPress={() => onChange('')} style={l.clear}><ReaderIcon name="close" color={p.mutedForeground} size={16} /></Pressable>}
  </View>;
}

export function LibraryTabs<T extends string>({ options, value, onChange, label, palette: p }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; palette: ReaderPalette;
}) {
  return <Tabs options={options} value={value} onChange={onChange} label={label} palette={p} />;
}

export function LibraryEmpty({ title, description, icon, palette: p, children }: PropsWithChildren<{ title: string; description: string; icon: ReaderIconName; palette: ReaderPalette }>) {
  return <Empty icon={icon} title={title} description={description} palette={p}>{children}</Empty>;
}

/** Rows of a list share one bordered container: every row draws its sides and
 * bottom hairline (the separator), the first adds the top edge, and the ends
 * carry the container's corners. Works inside a virtualised list. */
export function listRowFrame(index: number, count: number): ViewStyle {
  const first = index === 0, last = index === count - 1, r = readerShape.card;
  return {
    borderWidth: StyleSheet.hairlineWidth, borderTopWidth: first ? StyleSheet.hairlineWidth : 0, overflow: 'hidden',
    borderTopLeftRadius: first ? r : 0, borderTopRightRadius: first ? r : 0, borderBottomLeftRadius: last ? r : 0, borderBottomRightRadius: last ? r : 0,
  };
}

export const libraryStyles = StyleSheet.create({
  root: { flex: 1 },
  filters: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: readerLayout.gutter, paddingTop: 16, gap: 10 },
  list: { flex: 1, width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  content: { padding: readerLayout.gutter, paddingTop: 14, paddingBottom: 32 },
  results: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  status: { alignItems: 'center', gap: 14, paddingVertical: 32 },
});
const l = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1, minWidth: 0 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: readerShape.control },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 8, fontFamily: 'UiSans', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const }, web: { outlineStyle: 'solid', outlineWidth: 0 } }) },
  clear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
