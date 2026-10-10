import { Pressable, StyleSheet } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';

interface Props {
  children: string;
  label?: string;
  onPress: () => void;
  palette: ReaderPalette;
  /** The primary (filled) style. */
  selected?: boolean;
  disabled?: boolean;
}

export function ReaderButton({ children, label, onPress, palette: p, selected, disabled }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label ?? children}
    accessibilityState={{ selected: !!selected, disabled: !!disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, selected
      ? { backgroundColor: p.accent, borderColor: p.accent }
      : { backgroundColor: pressed ? p.accentSoft : p.paper, borderColor: p.border },
    { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }]}>
    <Text style={[styles.text, { color: selected ? p.paper : p.text }]}>{children}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 48, minWidth: 44, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.control, paddingHorizontal: 18, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
