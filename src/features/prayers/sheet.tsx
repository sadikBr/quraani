import { useRef, type ReactNode } from 'react';
import { AccessibilityInfo, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import { readerElevation, readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { t } from '@/i18n';

type Swipe = ReturnType<typeof useSwipeToClose>;

/**
 * A bottom sheet of the prayer settings: a title, an optional `header` under it (a search field),
 * then `body` (given the drag bindings for its list), or `children` in a scroll view.
 * Dragged down or tapped outside, it closes.
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
            <View style={[s.grabber, { backgroundColor: p.border }]} />
            <View onLayout={swipe.onHeaderLayout} style={[s.header, { borderColor: p.border }]}>
              <View style={s.headingRow}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{title}</Text>
                  {!!subtitle && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{subtitle}</Text>}
                </View>
                <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={4}
                  style={({ pressed }) => [s.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
                  <ReaderIcon name="close" color={p.mutedForeground} size={18} />
                </Pressable>
              </View>
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

/** A choice in a sheet: a radio row with a title and a line of detail. */
export function SheetOption({ title, detail, checked, onPress, first, last, trailing }: {
  title: string; detail?: string; checked: boolean; onPress: () => void; first: boolean; last: boolean; trailing?: ReactNode;
}) {
  const { palette: p } = useReadingPreferences();
  return <View style={[s.option, { borderColor: p.border, backgroundColor: checked ? p.accent : p.card, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && s.optionFirst, last && s.optionLast]}>
    <Pressable accessibilityRole="radio" accessibilityLabel={title} accessibilityHint={detail} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
      style={({ pressed }) => [s.optionPress, { opacity: pressed ? 0.7 : 1 }]}>
      <CheckMark checked={checked} palette={p} radio />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '600' : '500' }}>{title}</Text>
        {!!detail && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>}
      </View>
    </Pressable>
    {trailing}
  </View>;
}

export const sheetStyles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 16 },
});

const s = StyleSheet.create({
  frame: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '90%', borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, overflow: 'hidden' },
  tall: { height: '88%' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 16, gap: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingEnd: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  optionPress: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingStart: 16, paddingVertical: 12, minHeight: 60 },
  optionFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  optionLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
});
