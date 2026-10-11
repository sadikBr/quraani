import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

export interface JustifiedTextProps extends Omit<TextProps, 'style' | 'children'> {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  /** Unused on the web, where the browser centres the last line itself. */
  hiddenColor: string;
}

/** Justified text whose last line is centred, as in a mushaf (`text-align-last` on the web). */
export function JustifiedText({ children, style, containerStyle, hiddenColor: _hiddenColor, ...props }: JustifiedTextProps) {
  return <View style={containerStyle}>
    <Text {...props} style={[style, styles.justify]}>{children}</Text>
  </View>;
}

const styles = StyleSheet.create({
  justify: { textAlign: 'justify', textAlignLast: 'center' } as TextStyle,
});
