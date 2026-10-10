import { Platform, Text, type StyleProp, type TextStyle } from 'react-native';
import { rtlTextAlignment } from '@/lib/ui-text-alignment';
import { ArabicText } from '@/components/arabic-text';
import { useQuranFont } from '../../hooks/use-quran-font';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';

/**
 * A surah name set in the mushaf's calligraphic face, with the plain name as
 * the accessibility label and as the fallback until the font has loaded.
 */
export function SurahName({ number, name, size = 28, color, align = 'right', style }: {
  number: number; name: string; size?: number; color: string; align?: 'right' | 'center' | 'left'; style?: StyleProp<TextStyle>;
}) {
  const font = useQuranFont();
  if (!font.loaded) return <ArabicText style={[{ color, fontSize: Math.round(size * 0.6), fontWeight: '600', textAlign: align }, style]}>{name}</ArabicText>;
  return <Text accessibilityLabel={name} accessibilityLanguage="ar" numberOfLines={1}
    style={[calligraphyStyle(size), { color, lineHeight: Math.round(size * 1.35), textAlign: rtlTextAlignment(align, Platform.OS), writingDirection: 'rtl' }, style]}>{surahNameGlyph(number)}</Text>;
}
