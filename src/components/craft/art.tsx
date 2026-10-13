import { useId, type ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { isDarkColor, mixColor, withAlpha } from '@/features/quran-reader/colors';
import type { ReaderPalette } from '@/features/quran-reader/theme';

/**
 * The app's craft: the forms of the Maghrib's mosques and manuscripts that its screens are drawn
 * with. Arches (doors into a feature, niches holding a choice), the patterns of zellige and
 * mashrabiya inside them, the eight-pointed star (khatam) that holds a number, the frame of a
 * surah's title, and a few marks. Each one stands for something on the screen it is on.
 */

/** The patterns an arch can be drawn with (see `Pattern`). */
export type Motif = 'ripple' | 'khatam' | 'rosette' | 'lattice' | 'crescent' | 'arches' | 'circle';
/** The marks a saved selection or a collection can be drawn with (see `Emblem`). */
export type EmblemName = 'star' | 'crescent' | 'arch' | 'lantern' | 'drop' | 'leaf' | 'sun' | 'knot' | 'circle';

/**
 * The colours of the arched cards: on a light page, a deep tile (the theme's primary darkened
 * with its ink) written in the page's paper; on a dark page, the card warmed by the gold. The
 * patterns are drawn in the gold.
 */
export function artColors(p: ReaderPalette) {
  const dark = isDarkColor(p.background);
  const surface = dark ? mixColor(p.card, p.ornament, 0.1) : mixColor(p.primary, p.foreground, 0.42);
  const ink = dark ? p.foreground : p.card;
  return {
    surface, ink, soft: withAlpha(ink, 0.74),
    line: withAlpha(mixColor(p.ornament, ink, dark ? 0.15 : 0.35), dark ? 0.42 : 0.5),
    edge: withAlpha(p.ornament, dark ? 0.6 : 0.7),
  };
}

/**
 * A pointed arch over a panel, as the doors and niches of the Maghrib: straight sides rising to
 * `rise`, two curves meeting at a point at the top, and rounded corners at the foot.
 */
export function archPath(w: number, h: number, rise: number, x = 0, y = 0, corner = 16) {
  const r = Math.min(corner, w / 4, (h - rise) / 2);
  return [
    `M ${x} ${y + h - r}`, `V ${y + rise}`,
    `C ${x} ${y + rise * 0.45} ${x + w * 0.26} ${y + rise * 0.07} ${x + w / 2} ${y}`,
    `C ${x + w * 0.74} ${y + rise * 0.07} ${x + w} ${y + rise * 0.45} ${x + w} ${y + rise}`,
    `V ${y + h - r}`, `Q ${x + w} ${y + h} ${x + w - r} ${y + h}`, `H ${x + r}`, `Q ${x} ${y + h} ${x} ${y + h - r}`, 'Z',
  ].join(' ');
}

/** An eight-pointed star (the khatam): a square and the same square turned by an eighth. */
export function khatam(cx: number, cy: number, a: number) {
  const d = a * Math.SQRT2;
  return `M ${cx - a} ${cy - a} H ${cx + a} V ${cy + a} H ${cx - a} Z M ${cx} ${cy - d} L ${cx + d} ${cy} L ${cx} ${cy + d} L ${cx - d} ${cy} Z`;
}
/** A star of `n` points between two radii. */
export function star(cx: number, cy: number, n: number, outer: number, inner: number, turn = 0) {
  const points = Array.from({ length: n * 2 }, (_, i) => {
    const r = i % 2 ? inner : outer, a = turn + (Math.PI * i) / n - Math.PI / 2;
    return `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
  });
  return `M ${points.join(' L ')} Z`;
}
/**
 * A pattern for an arched card, drawn in `color` over `w`×`h` (the arch's top at `rise`): tiles of
 * eight-pointed stars, a rosette, a lattice as of a mashrabiya, a crescent among stars, ripples,
 * arches nested in one another, or circles of seats (a halaqa).
 */
export function Pattern({ motif, w, h, rise, color, focus = rise * 0.95 }: { motif: Motif; w: number; h: number; rise: number; color: string; focus?: number }) {
  const lines = { stroke: color, strokeWidth: 1, fill: 'none' } as const;
  if (motif === 'khatam') {
    const s = 30, paths: string[] = [];
    for (let y = -s / 2; y < h; y += s) for (let x = (y / s) % 2 ? 0 : s / 2; x < w + s; x += s) paths.push(khatam(x, y, s * 0.3));
    return <Path d={paths.join(' ')} {...lines} />;
  }
  if (motif === 'rosette') {
    const cx = w / 2, cy = focus, r = w * 0.34;
    return <G>
      <Path d={star(cx, cy, 16, r, r * 0.8)} {...lines} />
      <Path d={star(cx, cy, 8, r * 0.52, r * 0.36, Math.PI / 8)} {...lines} />
      <Circle cx={cx} cy={cy} r={r * 1.22} {...lines} />
      <Circle cx={cx} cy={cy} r={r * 1.48} {...lines} strokeDasharray="2 5" />
      <Circle cx={cx} cy={cy} r={r * 0.16} {...lines} />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (Math.PI * i) / 8;
        return <Path key={i} d={`M ${cx + r * 0.52 * Math.cos(a)} ${cy + r * 0.52 * Math.sin(a)} L ${cx + r * 0.8 * Math.cos(a)} ${cy + r * 0.8 * Math.sin(a)}`} {...lines} />;
      })}
    </G>;
  }
  if (motif === 'lattice') {
    const s = 18, r = 2.2, paths: string[] = [], dots: string[] = [];
    for (let i = -h; i < w + h; i += s) paths.push(`M ${i} 0 L ${i + h} ${h}`, `M ${i} 0 L ${i - h} ${h}`);
    // The dots where the lines cross, as one path (one drawing, not hundreds).
    for (let y = 0; y < h; y += s / 2) for (let x = ((y / (s / 2)) % 2) * (s / 2); x < w; x += s) dots.push(`M ${x - r} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`);
    return <G>
      <Path d={paths.join(' ')} {...lines} />
      <Path d={dots.join(' ')} fill={color} />
    </G>;
  }
  if (motif === 'crescent') {
    // A crescent high in the arch, stars about it, and a dotted orbit round the centre.
    const r = w * 0.085, mx = w * 0.3, my = rise * 0.42, d = r * 0.6, hh = Math.sqrt(r * r - (d / 2) ** 2);
    const stars = [[0.72, 0.3, 4.5], [0.84, 0.58, 3], [0.18, 0.78, 3], [0.62, 0.14, 2.5], [0.88, 0.95, 3.5], [0.12, 1.1, 2.5]] as const;
    return <G>
      <Path d={`M ${mx + d / 2} ${my - hh} A ${r} ${r} 0 1 0 ${mx + d / 2} ${my + hh} A ${r} ${r} 0 0 1 ${mx + d / 2} ${my - hh} Z`} fill={color} />
      {stars.map(([x, y, size], i) => <Path key={i} d={star(w * x, rise * y + 8, 4, size, size * 0.35)} fill={color} />)}
      <Circle cx={w / 2} cy={focus} r={w * 0.36} {...lines} strokeDasharray="1 6" strokeLinecap="round" />
    </G>;
  }
  if (motif === 'circle') {
    // Rows of people seated in circles round the one in the middle, as a halaqa in a mosque: rings
    // of dots about the centre, each row a little further out, every other one turned half a seat.
    const cx = w / 2, cy = focus, d = 1.6, dots: string[] = [];
    for (let k = 1; k <= 10; k++) {
      const r = 16 + k * 15, n = Math.max(8, Math.round((2 * Math.PI * r) / 14));
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * (i + (k % 2 ? 0.5 : 0))) / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a);
        if (x > -4 && x < w + 4 && y > -4 && y < h + 4) dots.push(`M ${x - d} ${y} a ${d} ${d} 0 1 0 ${d * 2} 0 a ${d} ${d} 0 1 0 ${-d * 2} 0`);
      }
    }
    return <G>
      {[1, 4, 7, 10].map((k) => <Circle key={k} cx={cx} cy={cy} r={16 + k * 15} {...lines} strokeDasharray="1 5" strokeLinecap="round" />)}
      <Path d={dots.join(' ')} fill={color} />
    </G>;
  }
  if (motif === 'ripple') {
    const cx = w / 2, cy = focus;
    return <G>{Array.from({ length: 9 }, (_, i) => <Circle key={i} cx={cx} cy={cy} r={10 + i * 13} {...lines} strokeDasharray={i % 2 ? '3 5' : undefined} />)}</G>;
  }
  // Arches nested in one another, as a doorway seen through doorways.
  return <G>{Array.from({ length: 6 }, (_, i) => {
    const inset = 10 + i * 13;
    return <Path key={i} d={archPath(w - inset * 2, h, Math.max(8, rise - inset * 0.6), inset, inset, 0)} {...lines} />;
  })}</G>;
}

/**
 * An arched tile: the arch filled with `surface`, its pattern fading out towards the foot, and a
 * line of gold just inside its edge. `children` are laid over it by the caller.
 */
export function ArchTile({ w, h, rise, motif, palette: p, faded = 0.62, focus, medallion, cartouche }: {
  w: number; h: number; rise: number; motif: Motif; palette: ReaderPalette; faded?: number;
  /** Where the arch's figure is centred, for the patterns drawn round it. */
  focus?: number;
  /** A round medallion at `focus` for a figure (a number), of this radius. */
  medallion?: number;
  /** A surah title's frame at `focus`, of this size. */
  cartouche?: { width: number; height: number };
}) {
  const id = useId().replace(/[^\w-]/g, '');
  const colors = artColors(p);
  return <Svg width={w} height={h} aria-hidden>
    <Defs>
      <ClipPath id={`clip${id}`}><Path d={archPath(w, h, rise)} /></ClipPath>
      <LinearGradient id={`fade${id}`} x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={colors.surface} stopOpacity={0} />
        <Stop offset={String(faded * 0.62)} stopColor={colors.surface} stopOpacity={0} />
        <Stop offset={String(faded)} stopColor={colors.surface} stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <Path d={archPath(w, h, rise)} fill={colors.surface} />
    <G clipPath={`url(#clip${id})`}>
      <Pattern motif={motif} w={w} h={h} rise={rise} color={colors.line} focus={focus} />
      <Rect x={0} y={0} width={w} height={h} fill={`url(#fade${id})`} />
    </G>
    {medallion && focus !== undefined && <G>
      <Circle cx={w / 2} cy={focus} r={medallion} fill={colors.surface} stroke={colors.edge} strokeWidth={1.25} />
      <Circle cx={w / 2} cy={focus} r={medallion - 5} fill="none" stroke={colors.line} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />
    </G>}
    {cartouche && focus !== undefined && <Path d={cartoucheFrame(cartouche.width, cartouche.height)} transform={`translate(${(w - cartouche.width) / 2} ${focus - cartouche.height / 2})`}
      fill={colors.surface} stroke={colors.edge} strokeWidth={1.25} />}
    {/* Drawn inside the tile, so no part of it falls outside the drawing. */}
    <Path d={archPath(w - 12, h - 12, rise - 5, 6, 6, 11)} stroke={colors.edge} strokeWidth={1} fill="none" />
  </Svg>;
}

/** The frame of a surah's title in the mushaf: a band with pointed ends. */
export const cartoucheFrame = (w: number, h: number) => { const tip = Math.min(16, h / 2); return `M ${tip} 0 H ${w - tip} L ${w} ${h / 2} L ${w - tip} ${h} H ${tip} L 0 ${h / 2} Z`; };

/** The marks a saved selection is drawn with, in a 24-unit square. */
const emblems: Record<EmblemName, string> = {
  star: khatam(12, 12, 6),
  crescent: 'M 15 3.5 A 9 9 0 1 0 15 20.5 A 7 7 0 1 1 15 3.5 Z',
  arch: `${archPath(14, 18, 9, 5, 3, 2)} M 9 21 V 13.5 C 9 11 10.5 10 12 9.5 C 13.5 10 15 11 15 13.5 V 21`,
  lantern: 'M 12 2 V 4.5 M 9 4.5 H 15 L 17 8 H 7 Z M 7 8 L 6 15 L 9 19.5 H 15 L 18 15 L 17 8 M 12 8 V 19.5 M 10 21.5 H 14',
  drop: 'M 12 3 C 9 8 6 11 6 15 A 6 6 0 0 0 18 15 C 18 11 15 8 12 3 Z M 9.5 15.5 A 2.5 2.5 0 0 0 12 18',
  leaf: 'M 5 19 C 5 10 10 5 19 5 C 19 14 14 19 5 19 Z M 5 19 L 14 10',
  sun: `${star(12, 12, 8, 9.5, 6.5)} M 15 12 A 3 3 0 1 1 9 12 A 3 3 0 1 1 15 12 Z`,
  // A halaqa: eight seats round a star.
  circle: `${khatam(12, 12, 3)} ${Array.from({ length: 8 }, (_, i) => {
    const a = (Math.PI * i) / 4 - Math.PI / 2, x = 12 + 8.6 * Math.cos(a), y = 12 + 8.6 * Math.sin(a);
    return `M ${(x - 1.7).toFixed(2)} ${y.toFixed(2)} a 1.7 1.7 0 1 0 3.4 0 a 1.7 1.7 0 1 0 -3.4 0`;
  }).join(' ')}`,
  knot: 'M 12 3.5 C 15 3.5 15.5 8.5 12 8.5 C 8.5 8.5 9 3.5 12 3.5 Z M 12 15.5 C 15 15.5 15.5 20.5 12 20.5 C 8.5 20.5 9 15.5 12 15.5 Z M 3.5 12 C 3.5 9 8.5 8.5 8.5 12 C 8.5 15.5 3.5 15 3.5 12 Z M 20.5 12 C 20.5 9 15.5 8.5 15.5 12 C 15.5 15.5 20.5 15 20.5 12 Z M 9.5 9.5 H 14.5 V 14.5 H 9.5 Z',
};

/** A saved selection's mark. */
export function Emblem({ name, size = 24, color }: { name: EmblemName; size?: number; color: string }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
    <Path d={emblems[name]} stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" fill="none" />
  </Svg>;
}

/**
 * A niche: an arch drawn in gold line on the page, its pattern showing faintly at the top. A
 * light counterpart to `ArchTile`, for what waits to be filled (an empty list) or a quiet figure.
 * `children` (an icon) sit in its middle.
 */
export function Niche({ w = 64, h = 78, motif = 'khatam', palette: p, children }: { w?: number; h?: number; motif?: Motif; palette: ReaderPalette; children?: ReactNode }) {
  const id = useId().replace(/[^\w-]/g, '');
  const rise = Math.round(w * 0.5);
  return <View style={{ width: w, height: h, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={w} height={h} style={{ position: 'absolute', left: 0, top: 0 }} aria-hidden>
      <Defs>
        <ClipPath id={`niche${id}`}><Path d={archPath(w - 2, h - 2, rise, 1, 1, 10)} /></ClipPath>
        <LinearGradient id={`nfade${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={p.background} stopOpacity={0} />
          <Stop offset="0.75" stopColor={p.background} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Path d={archPath(w - 2, h - 2, rise, 1, 1, 10)} fill={withAlpha(p.ornament, 0.07)} />
      <G clipPath={`url(#niche${id})`}>
        <Pattern motif={motif} w={w} h={h} rise={rise} color={withAlpha(p.ornament, 0.3)} />
        <Rect x={0} y={0} width={w} height={h} fill={`url(#nfade${id})`} />
      </G>
      <Path d={archPath(w - 2, h - 2, rise, 1, 1, 10)} stroke={withAlpha(p.ornament, 0.75)} strokeWidth={1.2} fill="none" />
      <Path d={archPath(w - 12, h - 12, rise - 5, 6, 6, 6)} stroke={withAlpha(p.ornament, 0.35)} strokeWidth={0.8} fill="none" />
    </Svg>
    <View style={{ paddingTop: rise * 0.35 }}>{children}</View>
  </View>;
}
