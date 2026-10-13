import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { ArchTile, artColors, Emblem, khatam } from '@/components/craft/art';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-icon';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { formatNumber } from '@/i18n';
import { absent, entryOf, heard, type Halaqa, type HalaqaSession } from './model';

/**
 * The halaqa's own figure: those in it as seats round a circle, as a halaqa sits round its
 * supervisor, a star in the middle. Each seat says how its participant stands: heard (filled with
 * gold), here and waiting to be heard (a gold ring with a dot), not yet marked (an empty seat), or
 * away (a broken ring). On a member's phone their own seat is gold, haloed; a seat kept for whoever
 * joins next is open (drawn dashed, a cross in it).
 */
export type Seat = 'heard' | 'present' | 'waiting' | 'away' | 'me' | 'open';

/** The seats of a session (or of a day without one): each active participant's state. */
export function seatsOf(halaqa: Halaqa, session: HalaqaSession | undefined, students = halaqa.students.filter((s) => !s.leftOn)): Seat[] {
  return students.map((s) => {
    const entry = entryOf(session, s.id);
    return heard(entry) ? 'heard' : absent(entry) ? 'away' : entry ? 'present' : 'waiting';
  });
}

/** The ring's colours on the page, or on an arched tile (`tile`). */
function ringColors(p: ReaderPalette, tile: boolean) {
  if (!tile) return { gold: p.ornament, seat: p.card, line: withAlpha(p.ornament, 0.38), faint: withAlpha(p.ornament, 0.45), away: withAlpha(p.mutedForeground, 0.75), star: withAlpha(p.ornament, 0.1) };
  const c = artColors(p);
  return { gold: p.ornament, seat: c.surface, line: c.line, faint: withAlpha(c.ink, 0.4), away: withAlpha(c.ink, 0.55), star: withAlpha(p.ornament, 0.16) };
}

type RingColors = ReturnType<typeof ringColors>;

/** A seat at (x, y), of radius r. */
function seatShape(seat: Seat, x: number, y: number, r: number, colors: RingColors, key?: number) {
  if (seat === 'heard') return <Circle key={key} cx={x} cy={y} r={r} fill={colors.gold} stroke={colors.gold} strokeWidth={1.1} />;
  if (seat === 'me') return <G key={key}>
    <Circle cx={x} cy={y} r={r + 3} fill="none" stroke={colors.gold} strokeWidth={1} strokeOpacity={0.6} />
    <Circle cx={x} cy={y} r={r} fill={colors.gold} stroke={colors.gold} strokeWidth={1.1} />
  </G>;
  if (seat === 'away') return <Circle key={key} cx={x} cy={y} r={r - 0.5} fill="none" stroke={colors.away} strokeWidth={1.2} strokeDasharray="2 2" />;
  if (seat === 'open') {
    const k = r * 0.45;
    return <G key={key}>
      <Circle cx={x} cy={y} r={r + 0.5} fill={colors.seat} stroke={colors.gold} strokeWidth={1.2} strokeDasharray="2.2 2" />
      <Path d={`M ${x - k} ${y} H ${x + k} M ${x} ${y - k} V ${y + k}`} stroke={colors.gold} strokeWidth={1.2} strokeLinecap="round" />
    </G>;
  }
  return <G key={key}>
    <Circle cx={x} cy={y} r={r} fill={colors.seat} stroke={seat === 'present' ? colors.gold : colors.faint} strokeWidth={seat === 'present' ? 1.4 : 1.1} />
    {seat === 'present' && <Circle cx={x} cy={y} r={Math.max(1, r * 0.32)} fill={colors.gold} />}
  </G>;
}

/** One seat on its own, as a legend shows it beside its words. */
export function SeatGlyph({ seat, size = 12, palette: p, tile = false }: { seat: Seat; size?: number; palette: ReaderPalette; tile?: boolean }) {
  const box = size + 8;
  return <Svg width={box} height={box} aria-hidden>{seatShape(seat, box / 2, box / 2, size / 2, ringColors(p, tile))}</Svg>;
}

/** What the seats say: each kind of seat there is, its words and how many sit so. */
export function SeatLegend({ items, palette: p }: { items: { seat: Seat; label: string; count: number }[]; palette: ReaderPalette }) {
  return <View style={{ gap: 2 }}>
    {items.map((item) => <View key={item.seat} style={s.legend}>
      <SeatGlyph seat={item.seat} palette={p} />
      <Text style={{ color: item.count ? p.foreground : p.mutedForeground, fontSize: 16, lineHeight: 24, fontFamily: 'ReaderNaskhBold', minWidth: 14, textAlign: 'center' }}>{formatNumber(item.count)}</Text>
      <Text numberOfLines={1} style={{ flexShrink: 1, color: item.count ? p.foreground : p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{item.label}</Text>
    </View>)}
  </View>;
}

export function HalaqaRing({ seats, size, palette: p, tile = false, children, label }: {
  seats: Seat[]; size: number; palette: ReaderPalette;
  /** Drawn on an arched tile (its colours), not on the page. */
  tile?: boolean;
  /** What the middle holds (a count). */
  children?: ReactNode;
  label?: string;
}) {
  const colors = ringColors(p, tile);
  // A small ring (in a row) is mostly its seats: a small star, no inner circle.
  const small = size < 72;
  const c = size / 2, orbit = size * (small ? 0.38 : 0.41), n = Math.max(1, seats.length);
  // As large as the circle allows, no larger than a bead of the app's.
  const r = Math.max(2.2, Math.min(size * (small ? 0.09 : 0.06), (Math.PI * orbit) / n * (small ? 0.42 : 0.34)));
  const a = size * (small ? 0.11 : 0.19);
  return <View accessible={!!label} accessibilityRole={label ? 'image' : undefined} accessibilityLabel={label}
    importantForAccessibility={label ? 'yes' : 'no-hide-descendants'} accessibilityElementsHidden={!label}
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Circle cx={c} cy={c} r={orbit} stroke={colors.line} strokeWidth={1} fill="none" />
      {!small && <Circle cx={c} cy={c} r={orbit * 0.74} stroke={colors.line} strokeWidth={0.8} strokeDasharray="1 4" strokeLinecap="round" fill="none" />}
      <Path d={khatam(c, c, a)} fill={colors.star} stroke={colors.gold} strokeWidth={1.1} strokeLinejoin="round" />
      {/* A clear disc in the star for what the middle holds. */}
      {!small && <Circle cx={c} cy={c} r={a * 0.92} fill={colors.seat} stroke={withAlpha(colors.gold, 0.45)} strokeWidth={0.8} />}
      {seats.map((seat, i) => {
        // From the top, round towards the reading start (right), as beads are laid.
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
        return seatShape(seat, c + orbit * Math.cos(angle), c + orbit * Math.sin(angle), r, colors, i);
      })}
    </Svg>
    {children}
  </View>;
}

/** A halaqa's mark in a list: a small arch drawn with circles of seats, and the halaqa's emblem in it. */
export function HalaqaMark({ palette: p, width = 46, muted = false }: { palette: ReaderPalette; width?: number; muted?: boolean }) {
  const height = Math.round(width * 1.22), rise = Math.round(width * 0.48);
  return <View style={{ width, height, opacity: muted ? 0.55 : 1 }} aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <ArchTile w={width} h={height} rise={rise} motif="circle" palette={p} faded={0.9} focus={Math.round(height * 0.58)} />
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', paddingTop: Math.round(width * 0.22) }]}>
      <Emblem name="circle" size={Math.round(width * 0.5)} color={artColors(p).ink} />
    </View>
  </View>;
}

/**
 * The way through a door: its words on a gold-edged pill, as the app's arched doors have it. With
 * `onPress` it is a button of its own (`filled`: the door's main one, in gold).
 */
export function DoorPill({ text, icon, palette: p, onPress, filled = false, disabled = false, label }: {
  text: string; icon?: ReaderIconName; palette: ReaderPalette; onPress?: () => void; filled?: boolean; disabled?: boolean; label?: string;
}) {
  const colors = artColors(p);
  const ink = filled ? colors.surface : colors.ink;
  const inner = <>
    {icon && <ReaderIcon name={icon} color={ink} size={14} />}
    <Text numberOfLines={1} style={{ color: ink, fontSize: 13, fontWeight: '600' }}>{text}</Text>
  </>;
  const style = [s.pill, { borderColor: filled ? p.ornament : colors.edge, backgroundColor: filled ? p.ornament : 'transparent' }];
  if (!onPress) return <View style={style}>{inner}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [...style, s.pressablePill, { opacity: disabled ? 0.5 : pressed ? 0.8 : 1 }]}>{inner}</Pressable>;
}

/**
 * A halaqa's door: a wide arch drawn with circles of seats, the halaqa's ring in it (its seats,
 * and what the middle holds), then a line above the title (`kicker`), the title in Naskh, a line
 * under it, and what follows (`children`: a pill, a code). The whole door opens `onPress`.
 */
export function HalaqaDoor({ seats, center, kicker, title, detail, children, onPress, label, palette: p, ringLabel }: {
  seats: Seat[]; center?: ReactNode; kicker?: string; title?: string; detail?: ReactNode; children?: ReactNode;
  onPress?: () => void; label?: string; palette: ReaderPalette; ringLabel?: string;
}) {
  const { width: screen } = useWindowDimensions();
  const colors = artColors(p);
  const width = Math.min(Math.min(screen, readerLayout.maxWidth) - 32, 520);
  const rise = Math.round(width * 0.27);
  const ring = Math.round(Math.min(176, Math.max(128, width * 0.44)));
  const focus = Math.round(rise * 0.5 + ring / 2);
  const top = focus + ring / 2 + 8;
  const [height, setHeight] = useState(top + 150);
  const body = <>
    <View style={StyleSheet.absoluteFill}><ArchTile w={width} h={height} rise={rise} motif="circle" palette={p} focus={focus} faded={0.55} /></View>
    <View style={[s.ring, { top: focus - ring / 2, height: ring }]}>
      <HalaqaRing seats={seats} size={ring} palette={p} tile label={ringLabel}>{center}</HalaqaRing>
    </View>
    <View style={[s.content, { paddingTop: top }]} onLayout={(e) => {
      const next = Math.ceil(e.nativeEvent.layout.height);
      if (Math.abs(next - height) > 1) setHeight(next);
    }}>
      {!!kicker && <Text numberOfLines={1} style={{ color: colors.soft, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{kicker}</Text>}
      {!!title && <Text accessibilityRole="header" numberOfLines={2} style={{ color: colors.ink, fontSize: 26, lineHeight: 42, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{title}</Text>}
      {typeof detail === 'string' ? <Text style={{ color: colors.soft, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{detail}</Text> : detail}
      {children && <View style={{ marginTop: 14, alignItems: 'center', alignSelf: 'stretch', gap: 10 }}>{children}</View>}
    </View>
  </>;
  return onPress
    ? <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [{ width, height, alignSelf: 'center', transform: [{ scale: pressed ? 0.985 : 1 }] }]}>{body}</Pressable>
    : <View style={{ width, height, alignSelf: 'center' }}>{body}</View>;
}

/** What a ring's middle holds: a number in Naskh, and a word under it. */
export function RingCount({ value, caption, palette: p, tile = false }: { value: string; caption?: string; palette: ReaderPalette; tile?: boolean }) {
  const ink = tile ? artColors(p).ink : p.foreground;
  return <View style={{ alignItems: 'center' }}>
    <Text style={{ color: ink, fontSize: 25, lineHeight: 31, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{value}</Text>
    {!!caption && <Text numberOfLines={1} style={{ color: tile ? artColors(p).soft : p.mutedForeground, fontSize: 9.5, lineHeight: 13, marginTop: -3, textAlign: 'center' }}>{caption}</Text>}
  </View>;
}

const s = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: readerShape.pill, paddingHorizontal: 14, paddingVertical: 6 },
  pressablePill: { minHeight: 40, paddingHorizontal: 16 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 28 },
  ring: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center', gap: 2 },
});
