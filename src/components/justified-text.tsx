import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type NativeSyntheticEvent, type StyleProp, type TextLayoutEventData, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { layoutKey, splitLastLine, textOf } from './last-line';

export interface JustifiedTextProps extends Omit<TextProps, 'style' | 'children'> {
  children: ReactNode;
  /** The text's style; no padding (put it on `containerStyle`), so its lines can be placed. */
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** The background behind the text, given to the hidden copy of the last line. */
  hiddenColor: string;
  /** Shown only once its lines are known, so it never appears with the last line at the start. */
  hideUntilLaidOut?: boolean;
}

interface Line { at: number; y: number; height: number }
/**
 * Text as laid out: what it was (by `layoutKey`), how it was written, and where its last line
 * starts. `provisional`: shown without its lines, which had not been reported in time; the copy
 * stays to report them.
 */
interface Laid { key: string; children: ReactNode; style: StyleProp<TextStyle>; line: Line | null; provisional?: boolean }

/** If no layout is reported (it always should be), the text is shown as it is after this long. */
const LAYOUT_TIMEOUT_MS = 400;

/**
 * Justified text whose last line is centred, as in a mushaf: what is left over after the last full
 * line sits in the middle. Text views can only justify with the last line at the start, so the
 * text is laid out once, justified; its last line is then drawn again, centred, over a hidden copy
 * of itself, which keeps the layout (and the line's touches and highlights, which the centred copy
 * carries). If the reported lines do not match the text, it stays justified as it is.
 *
 * When the text or its type changes (another size, spacing or font), its new lines are measured
 * in an invisible copy while the previous layout stays on screen, which then changes once, to the
 * new layout with its last line already centred, rather than showing the line breaks of one with
 * the centring of the other.
 */
export function JustifiedText({ children, style, containerStyle, hiddenColor, hideUntilLaidOut, onTextLayout, ...props }: JustifiedTextProps) {
  // What else decides the line breaks, given to the copy being measured too.
  const { numberOfLines, allowFontScaling, maxFontSizeMultiplier, textBreakStrategy, android_hyphenationFrequency, lineBreakStrategyIOS, adjustsFontSizeToFit, minimumFontScale } = props;
  const breaks = { numberOfLines, allowFontScaling, maxFontSizeMultiplier, textBreakStrategy, android_hyphenationFrequency, lineBreakStrategyIOS, adjustsFontSizeToFit, minimumFontScale };
  const flat = textOf(children);
  const key = layoutKey(flat, StyleSheet.flatten(style));
  const [laid, setLaid] = useState<Laid | null>(null);
  // `steady`: the layout known is this text's. Otherwise a layout is pending: the first one, or a
  // new one after a change (`laid` then holds the previous text, shown meanwhile).
  const steady = laid?.key === key;
  const measured = (event: NativeSyntheticEvent<TextLayoutEventData>) => {
    onTextLayout?.(event);
    const lines = event.nativeEvent.lines;
    const final = lines[lines.length - 1];
    const line = final?.text && flat.endsWith(final.text) ? { at: flat.length - final.text.length, y: final.y, height: final.height } : null;
    if (steady && !laid.provisional && sameLine(laid.line, line)) return;
    setLaid({ key, children, style, line });
  };
  useEffect(() => {
    if (steady) return;
    const timer = setTimeout(() => setLaid({ key, children, style, line: null, provisional: true }), LAYOUT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [steady, key, children, style]);
  const shown: Laid = steady ? { ...laid, children, style } : laid ?? { key, children, style, line: null };
  const hidden: TextStyle = { color: hiddenColor, opacity: 0, backgroundColor: 'transparent' };
  const parts = shown.line ? splitLastLine(shown.children, shown.line.at, hidden, Text) : null;
  // The centred line is placed in a box without padding, where the reported line positions start.
  return <View style={containerStyle}>
    <View>
      <Text {...props} style={[shown.style, styles.justify, !laid && hideUntilLaidOut && styles.invisible]} onTextLayout={steady || !laid ? measured : undefined}>
        {parts ? parts.main : shown.children}
      </Text>
      {shown.line && parts && <Text style={[shown.style, styles.centre, { top: shown.line.y, minHeight: shown.line.height }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {parts.line}
      </Text>}
      {laid && (!steady || laid.provisional) && <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.measure}>
        <Text key={key} {...breaks} style={[style, styles.justify]} onTextLayout={measured}>{children}</Text>
      </View>}
    </View>
  </View>;
}

const sameLine = (a: Line | null, b: Line | null) =>
  a === b || (!!a && !!b && a.at === b.at && Math.abs(a.y - b.y) <= 0.5 && Math.abs(a.height - b.height) <= 0.5);

const styles = StyleSheet.create({
  justify: { textAlign: 'justify' },
  centre: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  invisible: { opacity: 0 },
  // The copy being measured: the same width, out of the way and unseen.
  measure: { position: 'absolute', top: 0, left: 0, right: 0, opacity: 0 },
});
