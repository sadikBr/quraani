import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { withAlpha } from '@/features/quran-reader/design';
import type { CueMode } from './engine';
import { cartouchePath } from '@/components/craft/lawh';

/**
 * What each kind of question shows and hides, drawn as two lines of a page: a solid line is
 * shown, a dotted one is recited from memory. «في أي سورة؟» shows the ayah over an empty surah
 * frame. Lines start at the reading start (right).
 */
export function ModeDiagram({ mode, palette: p, active, width = 104 }: { mode: CueMode; palette: ReaderPalette; active: boolean; width?: number }) {
  const height = Math.round(width * 0.42);
  const ink = active ? p.foreground : withAlpha(p.foreground, 0.55);
  const hidden = active ? p.ornament : withAlpha(p.mutedForeground, 0.75);
  const w = width, y1 = height * 0.3, y2 = height * 0.72;
  // A line from the right edge, of a share of the width: solid or dotted. Its round ends stay
  // inside the drawing, which would cut them off.
  const pad = 3, x = (share: number) => w - pad - share * (w - pad * 2);
  const line = (y: number, from: number, to: number, solid: boolean, key: string) => <Path key={key}
    d={`M ${x(from)} ${y} H ${x(to)}`} stroke={solid ? ink : hidden} strokeWidth={solid ? 4 : 3} strokeLinecap="round"
    strokeDasharray={solid ? undefined : '0.5 6'} />;
  let lines: ReactNode[];
  if (mode === 'complete') lines = [line(y1, 0.02, 0.4, true, 'a'), line(y1, 0.5, 0.98, false, 'b'), line(y2, 0.02, 0.7, false, 'c')];
  else if (mode === 'next') lines = [line(y1, 0.02, 0.98, true, 'a'), line(y2, 0.02, 0.76, false, 'b')];
  else if (mode === 'previous') lines = [line(y1, 0.02, 0.98, false, 'a'), line(y2, 0.02, 0.76, true, 'b')];
  else {
    const fw = w * 0.42, fh = height * 0.34, fx = (w - fw) / 2, fy = height * 0.56;
    lines = [line(height * 0.22, 0.02, 0.98, true, 'a'),
      <Path key="frame" d={cartouchePath(fw, fh)} transform={`translate(${fx} ${fy})`} fill="none" stroke={hidden} strokeWidth={1.5} />,
      <Rect key="mark" x={w / 2 - 1.5} y={fy + fh / 2 - 1.5} width={3} height={3} fill={hidden} transform={`rotate(45 ${w / 2} ${fy + fh / 2})`} />];
  }
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
    <Svg width={w} height={height}>{lines}</Svg>
  </View>;
}
