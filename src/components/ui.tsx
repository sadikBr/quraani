/**
 * Universal UI (shadcn/ui) primitives for React Native. Colours come from the
 * active reader theme's roles, so every component works in every theme; sizes,
 * radii, type and depth come from the design tokens. Touch targets reach 48dp
 * with hit slop even when a control draws smaller.
 */
import type { PropsWithChildren, ReactNode, Ref } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { readerElevation, readerShape, withAlpha } from '@/features/quran-reader/design';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-icon';

/** Components inside the reader receive the palette explicitly; elsewhere it comes from the provider. */
export function usePalette(palette?: ReaderPalette) {
  const context = useReadingPreferences();
  return palette ?? context.palette;
}

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
export type ButtonSize = 'sm' | 'default' | 'lg';
const heights: Record<ButtonSize, number> = { sm: 32, default: 40, lg: 48 };

export function buttonColors(p: ReaderPalette, variant: ButtonVariant, pressed: boolean) {
  switch (variant) {
    case 'default': return { background: p.primary, border: p.primary, text: p.primaryForeground };
    case 'secondary': return { background: pressed ? withAlpha(p.secondary, 0.8) : p.secondary, border: p.secondary, text: p.secondaryForeground };
    case 'outline': return { background: pressed ? p.accent : p.background, border: p.input, text: p.foreground };
    case 'ghost': return { background: pressed ? p.accent : 'transparent', border: 'transparent', text: p.foreground };
    case 'destructive': return { background: p.destructive, border: p.destructive, text: p.destructiveForeground };
    case 'link': return { background: 'transparent', border: 'transparent', text: p.primary };
  }
}

export function Button({ children, onPress, variant = 'default', size = 'default', icon, iconEnd, disabled = false, label, palette, block = false, tone, style, ref, selected }: {
  children?: string; onPress: () => void; variant?: ButtonVariant; size?: ButtonSize; icon?: ReaderIconName; iconEnd?: ReaderIconName;
  disabled?: boolean; label?: string; palette?: ReaderPalette; block?: boolean;
  /** Text colour for ghost/link buttons that carry meaning (e.g. destructive). */
  tone?: string; style?: StyleProp<ViewStyle>; ref?: Ref<View>;
  /** Mirrors the toggle state of buttons that used to announce it. */
  selected?: boolean;
}) {
  const p = usePalette(palette);
  const height = heights[size];
  const iconOnly = !children;
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label ?? children} accessibilityState={selected === undefined ? { disabled } : { disabled, selected }} disabled={disabled} onPress={onPress}
    hitSlop={height < 48 ? Math.ceil((48 - height) / 2) : undefined}
    style={({ pressed }) => {
      const c = buttonColors(p, variant, pressed);
      return [ui.button, { minHeight: height, minWidth: iconOnly ? height : undefined, paddingHorizontal: iconOnly ? 0 : size === 'sm' ? 12 : 16,
        backgroundColor: c.background, borderColor: c.border, opacity: disabled ? 0.5 : pressed && (variant === 'default' || variant === 'destructive') ? 0.9 : 1 },
        block && { alignSelf: 'stretch' }, variant === 'outline' && !disabled && readerElevation(1, p), style];
    }}>
    {({ pressed }) => {
      const c = buttonColors(p, variant, pressed);
      const color = tone ?? c.text;
      return <>
        {icon && <ReaderIcon name={icon} color={color} size={size === 'sm' ? 16 : 18} />}
        {!!children && <Text style={{ color, fontSize: 14, fontWeight: '500', textAlign: 'center', flexShrink: 1, textDecorationLine: variant === 'link' && pressed ? 'underline' : 'none' }}>{children}</Text>}
        {iconEnd && <ReaderIcon name={iconEnd} color={color} size={16} />}
      </>;
    }}
  </Pressable>;
}

/** `radius-xl`, hairline border, shadow-sm, space-6 padding. */
export function Card({ children, palette, style, padded = true }: PropsWithChildren<{ palette?: ReaderPalette; style?: StyleProp<ViewStyle>; padded?: boolean }>) {
  const p = usePalette(palette);
  return <View style={[ui.card, padded && ui.cardPadding, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p), style]}>{children}</View>;
}
export function CardHeader({ title, description, icon, action, palette }: { title: string; description?: string; icon?: ReaderIconName; action?: ReactNode; palette?: ReaderPalette }) {
  const p = usePalette(palette);
  return <View style={ui.cardHeader}>
    {icon && <IconTile name={icon} palette={p} />}
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      {!!description && <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{description}</Text>}
    </View>
    {action}
  </View>;
}

/** The 40px muted icon tile used by Empty, list rows and card headers. */
export function IconTile({ name, palette, size = 40, tone }: { name: ReaderIconName; palette?: ReaderPalette; size?: number; tone?: string }) {
  const p = usePalette(palette);
  return <View style={[ui.tile, { width: size, height: size, backgroundColor: p.muted }]}><ReaderIcon name={name} color={tone ?? p.foreground} size={size >= 40 ? 20 : 16} /></View>;
}

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive' | 'success';
export function Badge({ children, variant = 'secondary', palette, icon }: { children: string; variant?: BadgeVariant; palette?: ReaderPalette; icon?: ReaderIconName }) {
  const p = usePalette(palette);
  const c = { default: [p.primary, p.primaryForeground, p.primary], secondary: [p.secondary, p.secondaryForeground, p.secondary], outline: ['transparent', p.foreground, p.border],
    destructive: [withAlpha(p.destructive, 0.12), p.destructive, 'transparent'], success: [withAlpha(p.success, 0.12), p.success, 'transparent'] }[variant];
  return <View style={[ui.badge, { backgroundColor: c[0], borderColor: c[2] }]}>
    {icon && <ReaderIcon name={icon} color={c[1]} size={12} />}
    <Text numberOfLines={1} style={{ color: c[1], fontSize: 12, fontWeight: '500', lineHeight: 18 }}>{children}</Text>
  </View>;
}

/** Visual switch: checked track `primary`, unchecked `input`; the thumb sits at the reading start when off. */
export function SwitchMark({ checked, palette }: { checked: boolean; palette?: ReaderPalette }) {
  const p = usePalette(palette);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}
    style={[ui.track, { backgroundColor: checked ? p.primary : p.input }]}>
    <View style={[ui.thumb, { backgroundColor: checked ? p.primaryForeground : p.background, alignSelf: checked ? 'flex-start' : 'flex-end' }, readerElevation(1, p)]} />
  </View>;
}

/** Checkbox (multi-choice) or radio (single-choice) mark. */
export function CheckMark({ checked, palette, radio = false, size = 20 }: { checked: boolean; palette?: ReaderPalette; radio?: boolean; size?: number }) {
  const p = usePalette(palette);
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden
    style={{ width: size, height: size, borderRadius: radio ? size / 2 : readerShape.detail, borderWidth: 1, alignItems: 'center', justifyContent: 'center',
      borderColor: checked ? p.primary : p.input, backgroundColor: checked && !radio ? p.primary : radio ? 'transparent' : p.background }}>
    {checked && (radio ? <View style={{ width: size / 2, height: size / 2, borderRadius: size / 4, backgroundColor: p.primary }} /> : <ReaderIcon name="check" color={p.primaryForeground} size={size - 6} />)}
  </View>;
}

/** 8px track of `primary` at 20%, `primary` indicator. */
/** Without a `label` the bar is decorative (inside a button whose label already says it). */
export function Progress({ value, palette, label, height = 8 }: { value: number; palette?: ReaderPalette; label?: string; height?: number }) {
  const p = usePalette(palette);
  const v = Math.max(0, Math.min(1, value));
  const a11y = label ? { accessibilityRole: 'progressbar' as const, accessibilityLabel: label, accessibilityValue: { min: 0, max: 100, now: Math.round(v * 100) } }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const };
  return <View {...a11y}
    style={{ height, borderRadius: readerShape.pill, backgroundColor: withAlpha(p.primary, 0.2), overflow: 'hidden' }}>
    <View style={{ width: `${v * 100}%`, height: '100%', borderRadius: readerShape.pill, backgroundColor: p.primary }} />
  </View>;
}

export function Separator({ palette, vertical = false, style }: { palette?: ReaderPalette; vertical?: boolean; style?: StyleProp<ViewStyle> }) {
  const p = usePalette(palette);
  return <View style={[vertical ? { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' } : { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' }, { backgroundColor: p.border }, style]} />;
}

/** Inline message: card fill, border, `radius-lg`; destructive puts title and icon in `destructive`. */
export function Alert({ title, children, variant = 'default', icon, palette, action }: PropsWithChildren<{ title?: string; variant?: 'default' | 'destructive'; icon?: ReaderIconName; palette?: ReaderPalette; action?: ReactNode }>) {
  const p = usePalette(palette);
  const tone = variant === 'destructive' ? p.destructive : p.foreground;
  return <View accessibilityLiveRegion="polite" style={[ui.alert, { backgroundColor: p.card, borderColor: variant === 'destructive' ? withAlpha(p.destructive, 0.4) : p.border }]}>
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <View style={{ paddingTop: 3 }}><ReaderIcon name={icon ?? (variant === 'destructive' ? 'alert' : 'info')} color={tone} size={16} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {!!title && <Text style={{ color: tone, fontSize: 14, fontWeight: '500' }}>{title}</Text>}
        {typeof children === 'string' ? <Text accessibilityRole={variant === 'destructive' ? 'alert' : undefined} style={{ color: variant === 'destructive' ? withAlpha(p.destructive, 0.9) : p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{children}</Text> : children}
      </View>
    </View>
    {action}
  </View>;
}

/** Placeholder for an empty list: dashed border, 40px muted icon tile, one action. */
export function Empty({ icon, title, description, children, palette }: PropsWithChildren<{ icon: ReaderIconName; title: string; description: string; palette?: ReaderPalette }>) {
  const p = usePalette(palette);
  return <View style={[ui.empty, { borderColor: p.border }]}>
    <IconTile name={icon} palette={p} />
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 4 }}>{title}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>{description}</Text>
    {children && <View style={{ alignSelf: 'stretch', marginTop: 8, gap: 8 }}>{children}</View>}
  </View>;
}

/** Segmented tabs: `muted` track, the active trigger on `background` with shadow-sm. */
export function Tabs<T extends string>({ options, value, onChange, palette, label, role = 'tab' }: {
  options: readonly { value: T; label: string; badge?: ReactNode; icon?: ReaderIconName; hint?: string }[]; value: T; onChange: (value: T) => void; palette?: ReaderPalette; label?: string; role?: 'tab' | 'button' | 'radio';
}) {
  const p = usePalette(palette);
  return <View accessibilityRole={role === 'tab' ? 'tablist' : role === 'radio' ? 'radiogroup' : undefined} accessibilityLabel={label} style={[ui.tabs, { backgroundColor: p.muted }]}>
    {options.map(option => {
      const selected = option.value === value;
      return <Pressable key={option.value} accessibilityRole={role} accessibilityLabel={option.label} accessibilityHint={option.hint} accessibilityState={role === 'radio' ? { checked: selected } : { selected }}
        aria-selected={role === 'tab' ? selected : undefined} aria-pressed={role === 'button' ? selected : undefined} aria-checked={role === 'radio' ? selected : undefined}
        onPress={() => onChange(option.value)} hitSlop={{ top: 5, bottom: 5 }}
        style={({ pressed }) => [ui.trigger, { backgroundColor: selected ? p.background : 'transparent', borderColor: selected ? p.border : 'transparent', opacity: pressed && !selected ? 0.7 : 1 }, selected && readerElevation(2, p)]}>
        {option.icon && <ReaderIcon name={option.icon} color={selected ? p.foreground : p.mutedForeground} size={16} />}
        <Text numberOfLines={role === 'tab' ? 1 : undefined} style={{ color: selected ? p.foreground : p.mutedForeground, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{option.label}</Text>
        {option.badge}
      </Pressable>;
    })}
  </View>;
}

/** A pressable chip in a set. `solid` (single choice): selected = `primary`. `soft` (several
 * at once): selected = `secondary` fill with a `primary` outline, so a full week stays light. */
export function Chip({ label, selected, onPress, palette, accessibilityRole = 'button', flex = false, soft = false }: { label: string; selected: boolean; onPress: () => void; palette?: ReaderPalette; accessibilityRole?: 'button' | 'checkbox' | 'radio'; flex?: boolean; soft?: boolean }) {
  const p = usePalette(palette);
  if (soft) return <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={label} accessibilityState={accessibilityRole === 'button' ? { selected } : { checked: selected }}
    aria-pressed={accessibilityRole === 'button' ? selected : undefined} aria-checked={accessibilityRole !== 'button' ? selected : undefined} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [ui.chip, flex && { flex: 1, minWidth: 0 }, { backgroundColor: selected ? p.secondary : pressed ? p.accent : p.background, borderColor: selected ? p.primary : p.input }, !selected && readerElevation(1, p)]}>
    <Text numberOfLines={1} style={{ color: selected ? p.secondaryForeground : p.mutedForeground, fontSize: 14, fontWeight: selected ? '600' : '500', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
  return <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={label} accessibilityState={accessibilityRole === 'button' ? { selected } : { checked: selected }}
    aria-pressed={accessibilityRole === 'button' ? selected : undefined} aria-checked={accessibilityRole !== 'button' ? selected : undefined} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [ui.chip, flex && { flex: 1, minWidth: 0 }, { backgroundColor: selected ? p.primary : pressed ? p.accent : p.background, borderColor: selected ? p.primary : p.input }, !selected && readerElevation(1, p)]}>
    <Text numberOfLines={1} style={{ color: selected ? p.primaryForeground : p.foreground, fontSize: 14, fontWeight: '500', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
}

export const ui = StyleSheet.create({
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: readerShape.control },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, gap: 24 },
  cardPadding: { padding: 24 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: readerShape.pill, borderWidth: 1 },
  track: { width: 44, height: 24, borderRadius: readerShape.pill, padding: 2, justifyContent: 'center', ...Platform.select({ native: { direction: 'ltr' as const } }) },
  thumb: { width: 20, height: 20, borderRadius: readerShape.pill },
  alert: { borderWidth: 1, borderRadius: readerShape.lg, paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  empty: { alignItems: 'center', gap: 8, padding: 24, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg },
  tabs: { flexDirection: 'row', padding: 3, gap: 3, borderRadius: readerShape.lg },
  trigger: { flex: 1, minWidth: 0, minHeight: 38, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, borderRadius: readerShape.control, borderWidth: StyleSheet.hairlineWidth },
  chip: { minHeight: 40, paddingHorizontal: 14, justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1 },
});
