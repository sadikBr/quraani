import { useRef, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import { CheckMark } from '@/components/ui';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import type { DayTimes, PrayerId } from './times';

type Swipe = ReturnType<typeof useSwipeToClose>;

/**
 * A bottom sheet of the prayer screens: the grabber, a title in Naskh with the close button, an
 * optional `header` under it (a search field), then `body` (given the drag bindings for its list),
 * or `children` in a scroll view. Dragged down or tapped outside, it closes.
 */
export function PrayerSheet({ title, subtitle, onClose, header, body, children, tall = false }: {
  title: string; subtitle?: string; onClose: () => void; header?: ReactNode;
  body?: (swipe: Swipe) => ReactNode; children?: ReactNode; tall?: boolean;
}) {
  const { palette: p } = useReadingPreferences();
  const close = useRef<View>(null);
  const swipe = useSwipeToClose(onClose);
  return <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.frame}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} />
          <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} onLayout={swipe.onSheetLayout}
            style={[s.sheet, tall && s.tall, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
            <SheetGrabber palette={p} />
            <View onLayout={swipe.onHeaderLayout} style={s.header}>
              <SheetTitle title={title} subtitle={subtitle} palette={p} onClose={onClose} closeLabel={t('common.close')} closeRef={close} />
              {header}
            </View>
            {body ? body(swipe) : <GestureDetector gesture={swipe.scrollGesture}>
              <ScrollView {...swipe.scrollProps} keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>{children}</ScrollView>
            </GestureDetector>}
          </AnimatedSafeAreaView></GestureDetector>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

/**
 * A choice in a sheet: a radio mark, a title and a line of detail, on one card with the choices
 * around it. Each option draws its own part of the card (its sides, the top of the first, the foot
 * of the last, a hairline above the others), so a virtualised list still reads as one card.
 */
export function SheetOption({ title, detail, checked, onPress, first, last, trailing }: {
  title: string; detail?: string; checked: boolean; onPress: () => void; first: boolean; last: boolean; trailing?: ReactNode;
}) {
  const { palette: p } = useReadingPreferences();
  return <View style={[s.option, { borderColor: p.border, backgroundColor: checked ? withAlpha(p.primary, 0.06) : p.card }, first && s.optionFirst, last && s.optionLast]}>
    {!first && <View style={[s.separator, { backgroundColor: p.border }]} />}
    <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityHint={detail} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
      style={({ pressed }) => [s.optionPress, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
      <CheckMark checked={checked} palette={p} radio />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 24, fontWeight: checked ? '600' : '500' }}>{title}</Text>
        {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}
      </View>
    </Pressable>
    {trailing}
  </View>;
}

/** A heading between the groups of a sheet's list («المغرب», «مدن أخرى»), in Naskh. */
export function SheetListHeading({ title }: { title: string }) {
  const { palette: p } = useReadingPreferences();
  return <Text accessibilityRole="header" style={[s.listHeading, { color: p.foreground }]}>{title}</Text>;
}

export const sheetStyles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24 },
});

const MINUTE = 60_000;
/** How far below the horizon the path dips at night, as a share of its height by day. */
const DIP = 0.45;

/**
 * The day as the sun's path, the way the home card draws it: a curve from before Fajr to after
 * Isha, `arc` high at noon (its top at `top`) and under the horizon at night, each time at its
 * place in the day, right to left like the times. Null when the sun does not rise and set.
 */
export function sunPath(times: DayTimes, { width, top, arc, side }: { width: number; top: number; arc: number; side: number }) {
  const at = (prayer: PrayerId) => times[prayer].getTime();
  const sunrise = at('sunrise'), sunset = at('maghrib');
  if (!width || !Number.isFinite(sunrise) || !Number.isFinite(sunset) || sunset <= sunrise) return null;
  const first = Number.isFinite(at('fajr')) ? at('fajr') : sunrise - 90 * MINUTE;
  const last = Number.isFinite(at('isha')) ? at('isha') : sunset + 90 * MINUTE;
  const start = first - 40 * MINUTE, end = last + 40 * MINUTE;
  const horizon = top + arc;
  const x = (time: number) => width - side - ((time - start) / (end - start)) * (width - 2 * side);
  const y = (time: number) => {
    const sine = Math.sin(Math.PI * (time - sunrise) / (sunset - sunrise));
    return horizon - (sine >= 0 ? sine * arc : sine * arc * DIP);
  };
  /** The path from one moment to another, in `detail` steps for the whole day. */
  const line = (from: number, to: number, detail = 48) => {
    const steps = Math.max(2, Math.round(detail * (to - from) / (end - start)));
    return Array.from({ length: steps + 1 }, (_, i) => {
      const time = from + (to - from) * i / steps;
      return `${i ? 'L' : 'M'}${x(time).toFixed(1)} ${y(time).toFixed(1)}`;
    }).join(' ');
  };
  return { at, start, end, sunrise, sunset, horizon, x, y, line };
}

const MARK_WIDTH = 38;
const MARK_HEIGHT = 24;

/**
 * Where the sun stands at a prayer: the day's path in small, as the large one on the prayer
 * times page, drawn in `tone` as far as the prayer's moment, and the sun there (a ring under the
 * horizon at Fajr and Isha).
 */
export function SunMark({ times, prayer, palette: p, tone }: { times: DayTimes; prayer: PrayerId; palette: ReaderPalette; tone?: string }) {
  const sun = sunPath(times, { width: MARK_WIDTH, top: 4, arc: 12, side: 4 });
  const time = sun?.at(prayer);
  if (!sun || time === undefined || !Number.isFinite(time)) return <View style={{ width: MARK_WIDTH, height: MARK_HEIGHT }} />;
  const color = tone ?? p.foreground;
  const night = time < sun.sunrise - MINUTE || time > sun.sunset + MINUTE;
  const cx = sun.x(time), cy = sun.y(time);
  return <Svg width={MARK_WIDTH} height={MARK_HEIGHT} aria-hidden>
    <Line x1={2} y1={sun.horizon} x2={MARK_WIDTH - 2} y2={sun.horizon} stroke={withAlpha(p.mutedForeground, 0.3)} strokeWidth={1} />
    <Path d={sun.line(time, sun.end, 20)} stroke={withAlpha(p.mutedForeground, 0.45)} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    <Path d={sun.line(sun.start, time, 20)} stroke={withAlpha(p.ornament, 0.85)} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    <Circle cx={cx} cy={cy} r={night ? 2.7 : 3.5} fill={night ? p.card : color} stroke={color} strokeWidth={night ? 1.4 : 0} />
  </Svg>;
}

const s = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '90%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  tall: { height: '88%' },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 14 },
  content: { paddingHorizontal: 16, paddingBottom: 24, gap: 16 },
  option: { flexDirection: 'row', alignItems: 'center', paddingEnd: 8, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  optionFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  optionLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  separator: { position: 'absolute', top: 0, start: 50, end: 0, height: StyleSheet.hairlineWidth },
  optionPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingStart: 16, paddingEnd: 8, paddingVertical: 10, minHeight: 54 },
  listHeading: { fontSize: 16, lineHeight: 28, fontFamily: 'ReaderNaskhBold', paddingTop: 14, paddingBottom: 8 },
});
