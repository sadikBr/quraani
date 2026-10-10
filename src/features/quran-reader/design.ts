import { Platform, type ViewStyle } from 'react-native';

/** Shared geometry keeps controls, cards, and sheets consistent across themes.
 * `detail` is for small marks (checkboxes, badges), `control` for buttons and
 * fields, `card` for surfaces, `sheet` for modal sheets, `pill` for chips. */
export const readerShape = { detail: 4, control: 8, card: 12, sheet: 18, hero: 14, pill: 999 } as const;
export const readerLayout = { maxWidth: 740, gutter: 20, sectionGap: 28 } as const;

/** Soft, theme-aware depth. Shadows are tinted with the theme's text colour so
 * they read as depth on light themes and stay invisible on dark ones. */
export function readerElevation(level: 1 | 2 | 3, palette?: { background: string; text: string }): ViewStyle {
  if (palette && isDarkColor(palette.background)) return {};
  const tint = palette?.text ?? '#0B2A23';
  const radius = [0, 8, 14, 22][level], opacity = [0, 0.05, 0.08, 0.12][level], y = [0, 1, 4, 8][level];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: tint, shadowOpacity: opacity, shadowRadius: radius, shadowOffset: { width: 0, height: y } },
    android: { elevation: [0, 1, 3, 6][level], shadowColor: tint },
    default: { boxShadow: `0 ${y}px ${radius}px ${tint}${Math.round(opacity * 255).toString(16).padStart(2, '0')}` } as ViewStyle,
  })!;
}

/** Colour with alpha, from a #RRGGBB palette value. */
export function withAlpha(color: string, alpha: number) {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${Math.round(Math.max(0, Math.min(1, alpha)) * 255).toString(16).padStart(2, '0')}` : color;
}

export function isDarkColor(color: string) {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color);
  if (!m) return false;
  const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.45;
}
