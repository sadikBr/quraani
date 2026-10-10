import { View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Polygon, Polyline, Rect } from 'react-native-svg';
import { iconNodes, type IconNode } from './icon-nodes';

export type ReaderIconName = keyof typeof iconNodes;
/** Lucide icons (2px stroke, round caps), drawn from the generated geometry so the bundle carries only the icons the app uses. */
export function ReaderIcon({ name, color, size = 20 }: { name: ReaderIconName; color: string; size?: number; strokeWidth?: number }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden><Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    {(iconNodes[name] as IconNode).map(([tag, attrs], i) => {
      const Shape = shapes[tag as keyof typeof shapes];
      return Shape ? <Shape key={i} {...(attrs as object)} /> : null;
    })}
  </Svg></View>;
}
const shapes = { path: Path, circle: Circle, rect: Rect, line: Line, polyline: Polyline, polygon: Polygon, ellipse: Ellipse };

