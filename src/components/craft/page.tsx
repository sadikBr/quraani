import { Children, Fragment, isValidElement, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-icon';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { formatList } from '@/i18n';

/**
 * The parts every page is built from, so that all of them read as one book: a bar with the way
 * back and the page's actions, the page's title set in Naskh, sections titled the same way, and
 * rows grouped on one card.
 */

/** The way back: to the mushaf (with its name, `text`), or to the page before (an arrow alone). */
export interface Back { label: string; text?: string; onPress: () => void }

/** The bar at the top of a page: the way back at the start, the page's actions at the end. */
export function PageBar({ back, actions, palette: p, style }: { back?: Back; actions?: ReactNode; palette: ReaderPalette; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.bar, style]}>
    {back && <Button variant="outline" icon="back" label={back.label} palette={p} onPress={back.onPress}>{back.text}</Button>}
    <View style={{ flex: 1 }} />
    {actions}
  </View>;
}

/** A page's title, in Naskh, and a line under it. */
export function PageTitle({ title, subtitle, palette: p, children }: { title: string; subtitle?: string; palette: ReaderPalette; children?: ReactNode }) {
  return <View style={{ gap: 2 }}>
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 28, lineHeight: 46, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
    {!!subtitle && <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{subtitle}</Text>}
    {children}
  </View>;
}

/** The bar and the title together, for a page whose title stays in place above a list. */
export function PageHeader({ back, actions, title, subtitle, palette: p, children }: {
  back?: Back; actions?: ReactNode; title: string; subtitle?: string; palette: ReaderPalette; children?: ReactNode;
}) {
  return <View style={s.header}>
    <PageBar back={back} actions={actions} palette={p} style={{ paddingHorizontal: 0 }} />
    <PageTitle title={title} subtitle={subtitle} palette={p}>{children}</PageTitle>
  </View>;
}

/** A part of a page: its title in Naskh, a short note beside it, and what it holds. */
export function Section({ title, detail, action, palette: p, children, style }: {
  title: string; detail?: string; action?: ReactNode; palette: ReaderPalette; children: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ gap: 12 }, style]}>
    <View style={s.sectionHead}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontFamily: 'ReaderNaskhBold', lineHeight: 30 }}>{title}</Text>
      {detail ? <Text numberOfLines={1} style={{ flex: 1, color: p.mutedForeground, fontSize: 12 }}>{detail}</Text> : <View style={{ flex: 1 }} />}
      {action}
    </View>
    {children}
  </View>;
}

/** Rows on one card, a hairline between them. */
export function RowGroup({ palette: p, children, style }: { palette: ReaderPalette; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(isValidElement);
  return <View style={[s.group, { backgroundColor: p.card, borderColor: p.border }, style]}>
    {rows.map((row, i) => <Fragment key={row.key ?? i}>
      {i > 0 && <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginStart: 16 }} />}
      {row}
    </Fragment>)}
  </View>;
}

/**
 * A row: what it is at the start (an icon on a gold tile, or `leading`), its title and a line,
 * and at the end a value, a control, or the way in (a chevron, when it opens something).
 */
export function Row({ title, detail, icon, leading, trailing, onPress, label, hint, role = 'button', selected, disabled, palette: p, tone, chevron }: {
  title: string; detail?: string; icon?: ReaderIconName; leading?: ReactNode; trailing?: ReactNode; onPress?: () => void;
  label?: string; hint?: string; role?: 'button' | 'link' | 'switch' | 'radio' | 'checkbox'; selected?: boolean; disabled?: boolean; palette: ReaderPalette;
  /** The title's colour, for a row that carries meaning (destructive). */
  tone?: string;
  /** Show the chevron of a row that opens something (on by default for a row with `onPress` and no `trailing`). */
  chevron?: boolean;
}) {
  const body = <>
    {leading ?? (icon && <View style={[s.icon, { backgroundColor: withAlpha(tone ?? p.ornament, 0.12) }]}><ReaderIcon name={icon} color={tone ?? p.ornament} size={19} /></View>)}
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text numberOfLines={2} style={{ color: tone ?? p.foreground, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{title}</Text>
      {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}
    </View>
    {trailing}
    {(chevron ?? (!!onPress && !trailing)) && <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />}
  </>;
  if (!onPress) return <View style={s.row}>{body}</View>;
  const state = role === 'switch' || role === 'checkbox' || role === 'radio' ? { checked: !!selected, disabled } : { selected, disabled };
  return <Pressable accessibilityRole={role} accessibilityLabel={label ?? (detail ? formatList([title, detail]) : title)} accessibilityHint={hint} accessibilityState={state}
    aria-checked={role === 'switch' || role === 'checkbox' || role === 'radio' ? !!selected : undefined} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? p.accent : 'transparent', opacity: disabled ? 0.55 : 1 }]}>
    {body}
  </Pressable>;
}

/** Something new to make: a dashed outline in gold, waiting to be filled. */
export function AddRow({ title, detail, onPress, disabled, palette: p, icon = 'plus' }: {
  title: string; detail?: string; onPress: () => void; disabled?: boolean; palette: ReaderPalette; icon?: ReaderIconName;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityHint={detail} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.add, { borderColor: withAlpha(p.ornament, 0.7), backgroundColor: pressed ? withAlpha(p.ornament, 0.08) : 'transparent', opacity: disabled ? 0.6 : 1 }]}>
    <View style={[s.plus, { backgroundColor: withAlpha(p.ornament, 0.16) }]}><ReaderIcon name={icon} color={p.ornament} size={20} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{detail}</Text>}
    </View>
  </Pressable>;
}

/** The grabber at the top of a bottom sheet, which says it can be dragged down. */
export function SheetGrabber({ palette: p }: { palette: ReaderPalette }) {
  return <View aria-hidden style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10, backgroundColor: p.border }} />;
}

/**
 * A sheet's or a dialog's title, in Naskh like a page's, a line under it, and the close button at
 * the end (`closeRef` to move the focus to it when the sheet opens).
 */
export function SheetTitle({ title, subtitle, palette: p, onClose, closeLabel, closeRef, actions }: {
  title: string; subtitle?: string; palette: ReaderPalette; onClose?: () => void; closeLabel?: string; closeRef?: Ref<View>; actions?: ReactNode;
}) {
  return <View style={s.sheetTitle}>
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
      {!!subtitle && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{subtitle}</Text>}
    </View>
    {actions}
    {onClose && <Pressable ref={closeRef} accessibilityRole="button" accessibilityLabel={closeLabel} onPress={onClose} hitSlop={4}
      style={({ pressed }) => [s.close, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background }]}>
      <ReaderIcon name="close" color={p.foreground} size={18} />
    </Pressable>}
  </View>;
}

/** The common measure of a page's content: centred, the app's width at most, its gutter. */
export const page = StyleSheet.create({
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 26 },
});

const s = StyleSheet.create({
  bar: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 8 },
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  group: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: readerShape.card, paddingVertical: 14, paddingHorizontal: 14 },
  plus: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  sheetTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
