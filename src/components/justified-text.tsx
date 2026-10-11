import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type NativeSyntheticEvent, type StyleProp, type TextLayoutEventData, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { splitLastLine, textOf } from './last-line';

export interface JustifiedTextProps extends Omit<TextProps, 'style' | 'children'> {
  children: ReactNode;
  /** The text's style; no padding (put it on `containerStyle`), so its lines can be placed. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** The background behind the text, given to the hidden copy of the last line. */
  hiddenColor: string;
}

/**
 * Justified text whose last line is centred, as in a mushaf: what is left over after the last full
 * line sits in the middle. Text views can only justify with the last line at the start, so the
 * text is laid out once, justified; its last line is then drawn again, centred, over a hidden copy
 * of itself, which keeps the layout (and the line's touches and highlights, which the centred copy
 * carries). If the reported lines do not match the text, it stays justified as it is.
 */
export function JustifiedText({ children, style, containerStyle, hiddenColor, onTextLayout, ...props }: JustifiedTextProps) {
  const flat = textOf(children);
  const [last, setLast] = useState<{ flat: string; at: number; y: number; height: number } | null>(null);
  const line = last?.flat === flat ? last : null;
  const hidden: TextStyle = { color: hiddenColor, opacity: 0, backgroundColor: 'transparent' };
  const parts = line ? splitLastLine(children, line.at, hidden, Text) : null;
  const layout = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    onTextLayout?.(event);
    const lines = event.nativeEvent.lines;
    const final = lines[lines.length - 1];
    if (!final?.text || !flat.endsWith(final.text)) { if (last) setLast(null); return; }
    const next = { flat, at: flat.length - final.text.length, y: final.y, height: final.height };
    if (!last || last.flat !== next.flat || last.at !== next.at || Math.abs(last.y - next.y) > 0.5 || Math.abs(last.height - next.height) > 0.5) setLast(next);
  };
  // The centred line is placed in a box without padding, where the reported line positions start.
  return <View style={containerStyle}>
    <View>
      <Text {...props} style={[style, styles.justify]} onTextLayout={layout}>{parts ? parts.main : children}</Text>
      {line && parts && <Text style={[style, styles.centre, { top: line.y, minHeight: line.height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {parts.line}
      </Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  justify: { textAlign: 'justify' },
  centre: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
});
