import { useState, type PropsWithChildren, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import { fieldElevation, readerLayout, readerShape, withAlpha } from '../../design';
import { Empty, Tabs } from '@/components/ui';
import { PageHeader } from '@/components/craft/page';
import { BrushStroke } from '@/components/craft/marks';
import type { Motif } from '@/components/craft/art';
import { ReaderIcon, type ReaderIconName } from './reader-chrome';
import { t } from '@/i18n';
import { useBack } from '@/components/back';

/** A library page's header: the way back to the mushaf, then the page's title in Naskh. */
export function LibraryHeader({ title, subtitle, palette: p, actions }: { title: string; subtitle: string; icon?: ReaderIconName; palette: ReaderPalette; actions?: ReactNode }) {
  // To the mushaf when opened from it; otherwise to the page it was opened from.
  const back = useBack();
  return <PageHeader back={back} actions={actions} title={title} subtitle={subtitle} palette={p} />;
}

/** Input with a leading search icon: `input` border, `radius-md`, shadow-xs; focus turns the border `ring`. */
export function LibrarySearch({ value, onChange, label, placeholder, palette: p }: { value: string; onChange: (query: string) => void; label: string; placeholder: string; palette: ReaderPalette }) {
  const [focused, setFocused] = useState(false);
  // Its own native view whatever the style, so focusing never moves the input to another parent.
  return <View collapsable={false} style={[l.search, { backgroundColor: p.background, borderColor: focused ? p.ring : p.input }, fieldElevation(focused, p)]}>
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

/**
 * Tabs written as words in Naskh, the chosen one underlined with the brushed gold stroke, as the
 * home screen's sections and the lawh's two kinds of session.
 */
export function WordTabs<T extends string>({ options, value, onChange, label, palette: p }: {
  options: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void; label: string; palette: ReaderPalette;
}) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={l.words}>
    {options.map((option) => {
      const on = option.value === value;
      return <Pressable key={option.value} accessibilityRole="tab" accessibilityLabel={option.label} accessibilityState={{ selected: on }} aria-selected={on}
        onPress={() => onChange(option.value)} hitSlop={{ top: 4, bottom: 4, left: 10, right: 10 }} style={({ pressed }) => [l.word, { opacity: pressed && !on ? 0.6 : 1 }]}>
        <Text numberOfLines={1} style={{ color: on ? p.foreground : p.mutedForeground, fontSize: 18, lineHeight: 31, fontFamily: on ? 'ReaderNaskhBold' : 'ReaderNaskhSemibold' }}>{option.label}</Text>
        <BrushStroke on={on} width={44} color={p.ornament} />
      </Pressable>;
    })}
  </View>;
}

export function LibraryEmpty({ title, description, icon, motif, palette: p, children }: PropsWithChildren<{ title: string; description: string; icon: ReaderIconName; motif?: Motif; palette: ReaderPalette }>) {
  return <Empty icon={icon} title={title} description={description} motif={motif} palette={p}>{children}</Empty>;
}

/**
 * The dotted line that leads the eye from a name to its page, as in the index at the end of a
 * printed mushaf. It takes the room left between them.
 */
export function Leader({ palette: p }: { palette: ReaderPalette }) {
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={l.leader}>
    <Svg width="100%" height={4}>
      <Line x1="2" y1="2" x2="100%" y2="2" stroke={withAlpha(p.ornament, 0.55)} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" />
    </Svg>
  </View>;
}

export const libraryStyles = StyleSheet.create({
  root: { flex: 1 },
  filters: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: readerLayout.gutter, paddingTop: 6, gap: 12 },
  list: { flex: 1, width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  content: { padding: readerLayout.gutter, paddingTop: 14, paddingBottom: 40 },
  results: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  status: { alignItems: 'center', gap: 14, paddingVertical: 32 },
});
const l = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderWidth: 1, borderRadius: readerShape.control },
  input: { flex: 1, minWidth: 0, minHeight: 44, paddingVertical: 8, fontFamily: 'UiSans', fontSize: 16, writingDirection: 'rtl', textAlign: Platform.OS === 'android' ? 'left' : 'right', ...Platform.select({ native: { direction: 'rtl' as const }, web: { outlineStyle: 'solid', outlineWidth: 0 } }) },
  clear: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  words: { flexDirection: 'row', alignItems: 'flex-end', gap: 28 },
  word: { alignItems: 'center', minHeight: 44, justifyContent: 'flex-end' },
  leader: { flex: 1, minWidth: 16, height: 4, marginHorizontal: 6 },
});
