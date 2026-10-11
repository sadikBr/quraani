import type { StyleProp, TextStyle } from 'react-native';
import { Text } from 'react-native';
import { ArabicText } from '@/components/arabic-text';
import { JustifiedText } from '@/components/justified-text';

// eslint-disable-next-line no-restricted-syntax -- the ayah separator in the adhkar data
const AYAH_SEPARATOR = '٭';

/**
 * A dhikr in the Naskh face. Quran quotes keep their ornate brackets and ayah separators, set in
 * the ornament colour; Noto Naskh draws ornate brackets as plain braces, so the interface face
 * (which has the classic ones) sets them. `justified` (on a background of `hiddenColor`): justified
 * with the last line centred, as in the reader.
 */
export function DhikrText({ text, size, color, ornament, numberOfLines, style, justified }: {
  text: string; size: number; color: string; ornament: string; numberOfLines?: number; style?: StyleProp<TextStyle>;
  justified?: { hiddenColor: string };
}) {
  const parts = text.split(/([﴾﴿٭])/);
  const base: TextStyle = { fontFamily: 'ReaderNaskh', color, fontSize: size, lineHeight: Math.round(size * 1.85) };
  const content = parts.map((part, i) => i % 2 ? <Text key={i} style={{ fontFamily: part === AYAH_SEPARATOR ? 'ReaderNaskh' : 'UiSans', color: ornament }}>{part}</Text> : part);
  if (justified) return <JustifiedText hiddenColor={justified.hiddenColor} style={[base, { writingDirection: 'rtl' }, style]}>{content}</JustifiedText>;
  return <ArabicText numberOfLines={numberOfLines} style={[base, style]}>{content}</ArabicText>;
}
