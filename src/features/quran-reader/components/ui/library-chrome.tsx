import { useState, type PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { readerLayout, readerShape, withAlpha } from '../../design';
import { ReaderIcon, type ReaderIconName } from './reader-chrome';

export function LibraryHeader({ title, subtitle, icon, palette: p, onBack }: { title: string; subtitle: string; icon: ReaderIconName; palette: ReaderPalette; onBack: () => void }) {
  return <View style={[l.header, { borderColor: p.border }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى القراءة" onPress={onBack} style={({ pressed }) => [l.back, { backgroundColor: pressed ? p.accentSoft : p.paper, borderColor: p.border }]}><ReaderIcon name="back" color={p.text} size={21} /></Pressable>
    <View style={l.grow}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: '700' }}>{title}</Text><Text style={{ color: p.muted, fontSize: 13 }}>{subtitle}</Text></View>
    <View style={[l.headerIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={24} /></View>
  </View>;
}

export function LibrarySearch({ value, onChange, label, placeholder, palette: p }: { value: string; onChange: (query: string) => void; label: string; placeholder: string; palette: ReaderPalette }) {
  const [focused, setFocused] = useState(false);
  return <View style={[l.search, { backgroundColor: p.paper, borderColor: focused ? p.accent : p.border }]}>
    <ReaderIcon name="search" color={focused ? p.accent : p.muted} size={21} />
    <TextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor={p.muted} value={value} onChangeText={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCorrect={false} returnKeyType="search" selectionColor={p.accent} style={[l.input, { color: p.text }]} />
    {!!value && <Pressable accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => onChange('')} style={l.clear}><ReaderIcon name="close" color={p.muted} size={18} /></Pressable>}
  </View>;
}

export function LibraryTabs<T extends string>({ options, value, onChange, label, palette: p }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; palette: ReaderPalette;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={[l.tabs, { backgroundColor: withAlpha(p.text, 0.06) }]}>{options.map(option => {
    const selected = option.value === value;
    return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected }} aria-selected={selected} onPress={() => onChange(option.value)}
      style={({ pressed }) => [l.tab, { backgroundColor: selected ? p.paper : 'transparent', borderColor: selected ? p.border : 'transparent', opacity: pressed ? 0.6 : 1 }]}>
      <Text numberOfLines={1} style={{ color: selected ? p.accent : p.muted, fontSize: 14, fontWeight: selected ? '600' : '400', textAlign: 'center' }}>{option.label}</Text>
    </Pressable>;
  })}</View>;
}

export function LibraryEmpty({ title, description, icon, palette: p, children }: PropsWithChildren<{ title: string; description: string; icon: ReaderIconName; palette: ReaderPalette }>) {
  return <View style={l.empty}>
    <View style={[l.emptyIcon, { backgroundColor: p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={30} /></View>
    <Text accessibilityRole="header" style={{ color: p.text, fontSize: 19, fontWeight: '600', textAlign: 'center' }}>{title}</Text>
    <Text style={{ color: p.muted, fontSize: 15, lineHeight: 24, textAlign: 'center', maxWidth: 330 }}>{description}</Text>
    {children}
  </View>;
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
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  grow: { flex: 1, minWidth: 0 }, back: { width: 44, height: 44, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth * 2, alignItems: 'center', justifyContent: 'center' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control },
  input: { flex: 1, minWidth: 0, minHeight: 52, paddingVertical: 8, fontFamily: 'ReaderNaskh', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const }, web: { outlineStyle: 'solid', outlineWidth: 0 } }) },
  clear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  // Outer `control` minus the 4px inset leaves `detail` for the selected tab, so the corners stay concentric.
  tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: readerShape.control },
  tab: { flex: 1, minHeight: 44, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: readerShape.detail, borderWidth: StyleSheet.hairlineWidth },
  empty: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
