import { Children, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { rtlTextAlignment } from '@/lib/ui-text-alignment';

// Geist has Latin digits only; Arabic-Indic digits and ٪ stay in Plex Sans Arabic.
const NUMERIC = /^[\s0-9.,:%+\-–/×]+$/;
/** Text made only of numbers (a stat, a date, a percentage) is set in Geist. */
function isNumeric(children: ReactNode) {
  const parts = Children.toArray(children);
  return parts.length > 0 && parts.every(part => (typeof part === 'string' || typeof part === 'number') && NUMERIC.test(String(part)) && /[0-9]/.test(String(part)));
}
const families = {
  sans: ['UiSans', 'UiSansMedium', 'UiSansSemiBold', 'UiSansBold'],
  numeric: ['UiNumeric', 'UiNumericMedium', 'UiNumericSemiBold', 'UiNumericBold'],
} as const;

/** Interface text in IBM Plex Sans Arabic (Universal UI); explicit Quran and surah fonts keep their own metrics. */
export function ArabicText({ style, ...props }: TextProps) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight === 'bold' ? 700 : Number(resolved?.fontWeight ?? 400) || 400;
  const step = weight >= 700 ? 3 : weight >= 600 ? 2 : weight >= 500 ? 1 : 0;
  const size = resolved?.fontSize ?? 14;
  const numeric = isNumeric(props.children);
  return <Text accessibilityLanguage="ar" {...props}
    style={[{ writingDirection: 'rtl', ...Platform.select({ native: { direction: 'rtl' as const } }) }, style,
      { textAlign: rtlTextAlignment(resolved?.textAlign ?? 'right', Platform.OS) },
      !resolved?.fontFamily && {
        fontFamily: families[numeric ? 'numeric' : 'sans'][step],
        fontWeight: 'normal',
        // Arabic needs room for its marks; numbers keep the tighter Latin rhythm.
        lineHeight: Math.max(resolved?.lineHeight ?? 0, Math.ceil(size * (numeric ? 1.3 : 1.6))),
        ...(numeric ? { fontVariant: ['tabular-nums' as const], letterSpacing: size >= 20 ? -0.025 * size : 0 } : {}),
      }]} />;
}
