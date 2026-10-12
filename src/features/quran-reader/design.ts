import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import { isDarkColor, withAlpha } from './colors';

/**
 * Universal UI (shadcn/ui) tokens. Radii derive from `radius` 10: `detail` 4
 * (checkbox), `sm` 6, `control` 8 (radius-md: buttons, inputs, menus), `lg` 10
 * (alerts, dialogs, tab tracks), `card` 14 (radius-xl: cards, bottom sheets).
 */
export const readerShape = { detail: 4, sm: 6, control: 8, lg: 10, card: 14, sheet: 14, hero: 14, pill: 999 } as const;
export const space = { 0.5: 2, 1: 4, 1.5: 6, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;
export const controlSize = { xs: 24, sm: 32, md: 36, lg: 40, touch: 48, icon: 16, iconSm: 12 } as const;
/** Type scale (px / line height / weight). Arabic UI text needs the taller lines. */
export const typeScale = {
  h1: { fontSize: 32, lineHeight: 48, fontWeight: '700' }, h2: { fontSize: 28, lineHeight: 42, fontWeight: '600' },
  h3: { fontSize: 24, lineHeight: 36, fontWeight: '600' }, h4: { fontSize: 20, lineHeight: 32, fontWeight: '600' },
  large: { fontSize: 18, lineHeight: 28, fontWeight: '600' }, body: { fontSize: 16, lineHeight: 26, fontWeight: '400' },
  bodySm: { fontSize: 14, lineHeight: 22, fontWeight: '400' }, small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
} as const;
export const readerLayout = { maxWidth: 740, gutter: 16, sectionGap: 24 } as const;

/** Quiet depth from the design system: 1 = shadow-xs (controls), 2 = shadow-sm
 * (cards), 3 = shadow-md (menus), 4 = shadow-lg (dialogs, sheets). Dark themes
 * separate surfaces with the border alone. */
export function readerElevation(level: 1 | 2 | 3 | 4, palette?: { background: string }): ViewStyle {
  if (palette && isDarkColor(palette.background)) return {};
  const web = ['', '0 1px 2px 0 #0000000d', '0 1px 3px 0 #0000001a, 0 1px 2px -1px #0000001a', '0 4px 6px -1px #0000001a, 0 2px 4px -2px #0000001a', '0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a'][level];
  const radius = [0, 2, 3, 6, 15][level], opacity = [0, 0.05, 0.1, 0.1, 0.1][level], y = [0, 1, 1, 4, 10][level];
  return Platform.select<ViewStyle>({
    ios: { shadowColor: '#000000', shadowOpacity: opacity, shadowRadius: radius / 2, shadowOffset: { width: 0, height: y } },
    android: { elevation: [0, 1, 1, 3, 8][level], shadowColor: '#000000' },
    default: { boxShadow: web } as ViewStyle,
  })!;
}

/**
 * A text field's depth, with a focus ring while focused. The shadow stays on in both states: a
 * shadow gives the field its own native layer, so dropping it on focus moved the text input
 * under another native parent, which blurred it and closed the keyboard as soon as it opened.
 */
export function fieldElevation(focused: boolean, palette: { background: string; ring: string }) {
  // Also used directly on a TextInput, hence a style both views and text accept.
  return { ...readerElevation(1, palette), ...(focused ? { boxShadow: `0 0 0 3px ${withAlpha(palette.ring, 0.5)}` } : {}) } as ViewStyle & TextStyle;
}

export { contrastRatio, isDarkColor, mixColor, withAlpha } from './colors';
