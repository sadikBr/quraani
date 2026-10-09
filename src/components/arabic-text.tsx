import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { rtlTextAlignment } from '@/lib/ui-text-alignment';

/** Bundled Naskh UI faces; explicit Quran and surah fonts keep their own metrics. */
export function ArabicText({ style, ...props }: TextProps) {
  const resolved = StyleSheet.flatten(style);
  const weight = resolved?.fontWeight;
  const bold = weight === 'bold' || Number(weight) >= 700;
  const strong = Number(weight) >= 500;
  // Naskh has a smaller apparent size than the previous sans face. Give small
  // UI copy a little more size and leave room for Arabic vowel marks.
  const size = resolved?.fontSize ?? 14;
  const uiSize = size < 16 ? size + 2 : size;
  return <Text accessibilityLanguage="ar" {...props}
    style={[{ writingDirection: 'rtl', ...Platform.select({ native: { direction: 'rtl' as const } }) }, style,
      { textAlign: rtlTextAlignment(resolved?.textAlign ?? 'right', Platform.OS) },
      !resolved?.fontFamily && {
        fontFamily: bold ? 'ReaderNaskhBold' : strong ? 'ReaderNaskhSemibold' : 'ReaderNaskh',
        fontWeight: 'normal', fontSize: uiSize,
        lineHeight: Math.max(resolved?.lineHeight ?? 0, Math.ceil(uiSize * 1.75)),
      }]} />;
}
