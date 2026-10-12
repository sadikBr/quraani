import { memo, useId } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import { archPath, khatam } from '@/components/craft/art';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { readerThemeOptions, readerThemes, type ReaderAppearance, type ReaderPalette, type ReaderThemeId } from '../../theme';
import { readerLayout, withAlpha } from '../../design';
import { t } from '@/i18n';
import { tRich } from '@/i18n/rich';

interface Props {
  appearance: ReaderAppearance;
  onChange: (appearance: ReaderAppearance) => void;
  palette: ReaderPalette;
}

const GAP = 10;

/**
 * The themes, as a gallery of arches: each one painted in its own theme (its page, a card in a
 * niche lined with its gold, a few lines of its ink, its button), so a theme is seen before it is
 * chosen. The light ones, then the dark; above them, following the device.
 */
export function ReaderThemePicker({ appearance, onChange, palette: p }: Props) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, readerLayout.maxWidth) - 32;
  const columns = inner >= 600 ? 6 : inner >= 440 ? 4 : 3;
  const tile = Math.floor((inner - GAP * (columns - 1)) / columns);
  const selectedLabel = readerThemeOptions.find(option => option.id === appearance)?.label;
  const system = appearance === 'system';
  return <View accessibilityRole="radiogroup" accessibilityLabel={t('settings.appearance.label')} style={{ gap: 26 }}>
    <View style={{ gap: 12 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{tRich('settings.appearance.current', { theme: <Text style={{ color: p.foreground, fontWeight: '600' }}>{selectedLabel}</Text> })}</Text>
      <RowGroup palette={p}>
        <Row title={t('themes.system')} detail={t('settings.appearance.systemDetail')} label={t('themes.system')} role="radio" selected={system} onPress={() => onChange('system')}
          leading={<DeviceArch palette={p} />} trailing={<CheckMark checked={system} palette={p} radio />} palette={p} />
      </RowGroup>
    </View>
    {[false, true].map(dark => <Section key={String(dark)} title={dark ? t('settings.appearance.darkShades') : t('settings.appearance.lightShades')} palette={p}>
      <View style={[styles.grid, { gap: GAP }]}>
        {readerThemeOptions.map(option => option.id === 'system' || option.dark !== dark ? null
          : <ThemeArch key={option.id} id={option.id} label={option.label} width={tile} selected={appearance === option.id} ring={p.primary} ink={p.foreground} muted={p.mutedForeground}
            onChange={onChange} />)}
      </View>
    </Section>)}
  </View>;
}

/** A theme as a small arch painted in its colours, its name under it; the chosen one ringed and named in bold. */
const ThemeArch = memo(function ThemeArch({ id, label, width: w, selected, ring, ink, muted, onChange }: {
  id: ReaderThemeId; label: string; width: number; selected: boolean; ring: string; ink: string; muted: string; onChange: (appearance: ReaderAppearance) => void;
}) {
  const h = Math.round(w * 1.22);
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityHint={t('settings.appearance.themeHint')}
    accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => onChange(id)}
    style={({ pressed }) => [styles.theme, { width: w, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
    <ThemeSwatch theme={readerThemes[id]} w={w} h={h} ring={selected ? ring : null} />
    <Text numberOfLines={2} style={{ color: selected ? ink : muted, fontSize: 13, lineHeight: 19, fontWeight: selected ? '700' : '500', textAlign: 'center' }}>{label}</Text>
  </Pressable>;
});

/**
 * The drawing of a theme: an arch of its page colour edged with its border, and within it a niche
 * of its card lined with its gold, a star of its gold in the niche's head, lines of its ink and a
 * button of its primary. Drawn with room for the ring of the chosen one around it.
 */
function ThemeSwatch({ theme: c, w, h, ring }: { theme: ReaderPalette; w: number; h: number; ring: string | null }) {
  const m = 4, aw = w - m * 2, ah = h - m * 2, rise = Math.round(aw * 0.5);
  const cx = w / 2, star = m + Math.round(rise * 0.62) + 4;
  const line = withAlpha(c.foreground, 0.5);
  const top = m + rise + 6;
  return <Svg width={w} height={h} aria-hidden>
    {ring && <Path d={archPath(w - 2, h - 2, rise + 3, 1, 1, 15)} fill="none" stroke={ring} strokeWidth={2} />}
    <Path d={archPath(aw, ah, rise, m, m, 12)} fill={c.background} stroke={c.border} strokeWidth={1} />
    <Path d={archPath(aw - 14, ah - 14, rise - 6, m + 7, m + 7, 7)} fill={c.card} stroke={c.ornament} strokeWidth={1} />
    {/* The chosen theme's star is filled, as the kit's medallion fills the one chosen. */}
    <Path d={khatam(cx, star, aw * 0.075)} fill={ring ? c.ornament : withAlpha(c.ornament, 0.2)} stroke={c.ornament} strokeWidth={1} strokeLinejoin="round" />
    {[0.5, 0.36, 0.5, 0.28].map((share, i) => <Path key={i} d={`M ${cx + (aw * share) / 2} ${top + i * 7} H ${cx - (aw * share) / 2}`} stroke={line} strokeWidth={1.8} strokeLinecap="round" />)}
    <Rect x={cx - aw * 0.18} y={h - m - 7 - 16} width={aw * 0.36} height={9} rx={4.5} fill={c.primary} />
  </Svg>;
}

/** Following the device: an arch half in the light theme, half in the dark, one gold line round it. */
function DeviceArch({ palette: p }: { palette: ReaderPalette }) {
  const id = useId().replace(/[^\w-]/g, '');
  const light = readerThemes.light, dark = readerThemes.dark;
  const w = 38, h = 46, rise = 19;
  const outline = archPath(w - 2, h - 2, rise, 1, 1, 8);
  return <View aria-hidden style={{ width: 40, height: 48, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={w} height={h}>
      <Defs><ClipPath id={`night${id}`}><Rect x={0} y={0} width={w / 2} height={h} /></ClipPath></Defs>
      <Path d={outline} fill={light.background} stroke={withAlpha(p.ornament, 0.8)} strokeWidth={1} />
      <G clipPath={`url(#night${id})`}><Path d={outline} fill={dark.card} /></G>
      <Path d={archPath(w - 10, h - 10, rise - 4, 5, 5, 5)} fill="none" stroke={withAlpha(p.ornament, 0.7)} strokeWidth={0.8} />
      <Path d={khatam(w / 2, 17, 3.2)} fill={p.ornament} />
    </Svg>
  </View>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  theme: { alignItems: 'center', gap: 6 },
});
