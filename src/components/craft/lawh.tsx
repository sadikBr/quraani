import { useState, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { mixColor, withAlpha } from '@/features/quran-reader/design';

/** Height of the lawh's head, the rounded handle above the board. */
const HEAD = 30;
const CORNER = 18;

/**
 * The outline of a lawh (اللوح), the wooden board the Quran is written on and memorized from in
 * the kuttab, and recited to the teacher: a board with rounded corners, and above it a rounded
 * handle, pierced to hang it, that rises from the board in soft shoulders.
 */
function lawhPath(width: number, height: number) {
  const r = CORNER, top = HEAD;
  const head = Math.min(116, width * 0.3), x0 = (width - head) / 2, x1 = x0 + head;
  // The shoulders where the handle leaves the board, so the outline reads as carved from one piece.
  const f = 10;
  return [
    `M ${r} ${top}`,
    `H ${x0 - f}`, `C ${x0 - 2} ${top} ${x0 + 2} ${top - 3} ${x0 + 3} ${top - 9}`,
    // The dome of the handle: nearly a half circle, flattened a little at the top.
    `C ${x0 + 5} ${top - 33} ${x1 - 5} ${top - 33} ${x1 - 3} ${top - 9}`,
    `C ${x1 - 2} ${top - 3} ${x1 + 2} ${top} ${x1 + f} ${top}`,
    `H ${width - r}`, `Q ${width} ${top} ${width} ${top + r}`,
    `V ${height - r}`, `Q ${width} ${height} ${width - r} ${height}`,
    `H ${r}`, `Q 0 ${height} 0 ${height - r}`,
    `V ${top + r}`, `Q 0 ${top} ${r} ${top}`, 'Z',
  ].join(' ');
}

/** The board's colours: the card warmed by the theme's gold, as clay-washed wood. */
export function lawhColors(p: ReaderPalette) {
  return { board: mixColor(p.card, p.ornament, 0.07), edge: withAlpha(p.ornament, 0.55), ink: p.foreground, rule: withAlpha(p.ornament, 0.45) };
}

/**
 * Content on a lawh. The outline is drawn to the size the content takes; the content sits below
 * the handle. `tone` colours the edge (a result).
 */
export function Lawh({ palette: p, tone, style, contentStyle, children }: {
  palette: ReaderPalette; tone?: string; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; children: ReactNode;
}) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const colors = lawhColors(p);
  const stroke = tone ? 2 : 1.5;
  return <View style={style} onLayout={(event) => {
    const { width, height } = event.nativeEvent.layout;
    if (!size || Math.abs(size.width - width) > 0.5 || Math.abs(size.height - height) > 0.5) setSize({ width, height });
  }}>
    {size && <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} aria-hidden>
      {/* Drawn a line's width inside its box: a line on the box's edge, or a fraction of a pixel
          past it once the box is rounded to the screen's pixels, is cut off. */}
      <Path d={lawhPath(size.width - stroke * 2, size.height - stroke * 2)} transform={`translate(${stroke} ${stroke})`}
        fill={colors.board} stroke={tone ?? colors.edge} strokeWidth={stroke} />
      <Circle cx={size.width / 2} cy={HEAD * 0.4 + stroke} r={4} fill={p.background} stroke={tone ?? colors.edge} strokeWidth={1} />
    </Svg>}
    <View style={[{ paddingTop: HEAD + 12, paddingHorizontal: 18, paddingBottom: 18 }, contentStyle]}>{children}</View>
  </View>;
}

/**
 * A row of dotted rules where hidden words go, as on a lawh wiped for the next lines: the answer
 * is said, not shown.
 */
export function GhostLines({ lines = 2, palette: p, width = '100%' }: { lines?: number; palette: ReaderPalette; width?: `${number}%` }) {
  const [measured, setMeasured] = useState(0);
  const colors = lawhColors(p);
  return <View style={{ width, alignSelf: 'center', gap: 22, paddingVertical: 10 }} onLayout={(e) => setMeasured(e.nativeEvent.layout.width)}
    accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
    {Array.from({ length: lines }, (_, i) => {
      // Lines get shorter, as the last line of a passage does; they keep to the reading start (right).
      const length = measured * (i === lines - 1 && lines > 1 ? 0.62 : 1);
      return <Svg key={i} width={measured} height={4}>
        {measured > 0 && <Path d={`M ${measured - 1} 2 H ${Math.max(1, measured - length)}`} stroke={colors.rule} strokeWidth={2} strokeLinecap="round" strokeDasharray="1 7" />}
      </Svg>;
    })}
  </View>;
}

/** The frame of a surah's name in the mushaf: a band with pointed ends. */
export function cartouchePath(width: number, height: number) {
  const tip = Math.min(16, height / 2);
  return `M ${tip} 0 H ${width - tip} L ${width} ${height / 2} L ${width - tip} ${height} H ${tip} L 0 ${height / 2} Z`;
}

/** A small lozenge: an exam's question, coloured by how it went. */
export function Lozenge({ size = 12, fill, stroke }: { size?: number; fill: string; stroke?: string }) {
  const h = size / 2;
  return <Svg width={size} height={size} aria-hidden>
    <Path d={`M ${h} 0.75 L ${size - 0.75} ${h} L ${h} ${size - 0.75} L 0.75 ${h} Z`} fill={fill} stroke={stroke ?? fill} strokeWidth={1.25} />
  </Svg>;
}
