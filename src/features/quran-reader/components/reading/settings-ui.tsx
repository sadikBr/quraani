import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { cartoucheFrame, khatam } from '@/components/craft/art';
import type { ReaderPalette } from '../../theme';
import { readerShape, withAlpha } from '../../design';

/** The settings' own parts, beside the kit's rows and sections: a setting whose control needs the row's width, and the reading modes drawn. */

/**
 * A setting in a `RowGroup` whose control needs the row's width (a segmented choice, a slider):
 * its name (and current value) above the control, and what the choice means below it.
 */
export function SettingBlock({ title, value, detail, palette: p, children }: {
  title: string; value?: string; detail?: string; palette: ReaderPalette; children: ReactNode;
}) {
  return <View style={settingsStyles.block}>
    <View style={settingsStyles.blockHead}>
      <Text style={{ flexShrink: 1, color: p.foreground, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{title}</Text>
      {!!value && <Text accessibilityLiveRegion="polite" style={[settingsStyles.value, { color: p.foreground, backgroundColor: withAlpha(p.ornament, 0.14) }]}>{value}</Text>}
    </View>
    {children}
    {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}
  </View>;
}

/**
 * The two ways of reading, drawn: a printed page in its double frame, its surah's band at the
 * head and the lines justified to the frame; or the text alone, larger, each ayah on its own lines
 * (`ayah`) or running on (`flowing`), with its marker. Lines are set from the right, as read.
 */
export function ModeDrawing({ kind, palette: p, active }: { kind: 'page' | 'ayah' | 'flowing'; palette: ReaderPalette; active: boolean }) {
  const ink = withAlpha(p.foreground, active ? 0.5 : 0.3);
  const gold = withAlpha(p.ornament, active ? 0.95 : 0.6);
  const faint = withAlpha(p.ornament, active ? 0.4 : 0.25);
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 76 }}>
    <Svg width="100%" height={76} viewBox="0 0 132 76">
      {kind === 'page' ? <>
        <Rect x={38} y={1.5} width={56} height={73} rx={2.5} fill={p.background} stroke={withAlpha(p.foreground, 0.14)} strokeWidth={0.8} />
        <Rect x={41.5} y={5} width={49} height={66} fill="none" stroke={gold} strokeWidth={1} />
        <Rect x={43.5} y={7} width={45} height={62} fill="none" stroke={faint} strokeWidth={0.6} />
        <Path d={cartoucheFrame(28, 7)} transform="translate(52 11)" fill={withAlpha(p.ornament, 0.14)} stroke={gold} strokeWidth={0.8} />
        {[23, 29, 35, 41, 47, 53, 59, 65].map((y, i) => <Path key={y} d={`M 85 ${y} H ${i === 7 ? 64 : 47}`} stroke={ink} strokeWidth={1.6} strokeLinecap="round" />)}
        {[[60, 35], [72, 53]].map(([x, y]) => <Circle key={x} cx={x} cy={y} r={2.1} fill={p.background} stroke={gold} strokeWidth={0.8} />)}
      </> : <>
        {(kind === 'ayah'
          ? [[16, 124, 8], [30, 124, 64], [46, 124, 8], [60, 124, 40]]
          // Running on: the first ayah ends inside the second line, and the next begins after its marker.
          : [[14, 124, 8], [28, 124, 76], [28, 64, 8], [42, 124, 8], [56, 124, 52]]).map(([y, from, to]) => <Path key={`${y}-${from}`} d={`M ${from} ${y} H ${to}`} stroke={ink} strokeWidth={3} strokeLinecap="round" />)}
        {(kind === 'ayah' ? [[56, 30], [32, 60]] : [[70, 28], [44, 56]]).map(([x, y]) => <Path key={x} d={khatam(x, y, 3.9)} fill={withAlpha(p.ornament, 0.16)} stroke={gold} strokeWidth={0.9} strokeLinejoin="round" />)}
        {kind === 'ayah' && <Path d="M 8 38 H 124" stroke={faint} strokeWidth={0.6} strokeDasharray="1 3" />}
      </>}
    </Svg>
  </View>;
}

export const settingsStyles = StyleSheet.create({
  block: { paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  blockHead: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  value: { fontSize: 12, lineHeight: 20, fontWeight: '600', paddingHorizontal: 10, paddingVertical: 1, borderRadius: readerShape.pill, overflow: 'hidden', textAlign: 'center' },
});
