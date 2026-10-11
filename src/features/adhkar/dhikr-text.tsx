import type { StyleProp, TextStyle } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';

// eslint-disable-next-line no-restricted-syntax -- the ayah separator in the adhkar data
const AYAH_SEPARATOR = '\u066D';

/**
 * A dhikr in the Naskh face. Quran quotes keep their ornate brackets and ayah separators, set in
 * the ornament colour; Noto Naskh draws ornate brackets as plain braces, so the interface face
 * (which has the classic ones) sets them.
 */
export function DhikrText({ text, size, color, ornament, numberOfLines, style }: {
  text: string; size: number; color: string; ornament: string; numberOfLines?: number; style?: StyleProp<TextStyle>;
}) {
  const parts = text.split(/([\uFD3E\uFD3F\u066D])/);
  return <Text numberOfLines={numberOfLines} style={[{ fontFamily: 'ReaderNaskh', color, fontSize: size, lineHeight: Math.round(size * 1.85) }, style]}>
    {parts.map((part, i) => i % 2 ? <Text key={i} style={{ fontFamily: part === AYAH_SEPARATOR ? 'ReaderNaskh' : 'UiSans', color: ornament }}>{part}</Text> : part)}
  </Text>;
}
