import { IconTile } from '@/components/ui';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { readerElevation, readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent } from '../../types/reader';
import type { AyahReference } from '@/lib/quranpedia/types';
import { ReaderJump } from './reader-jump';
import { thumunName } from '../../utils/thumun-pages';
import { ReaderIcon } from '../ui/reader-chrome';
import { t } from '@/i18n';

interface Props {
  onClose: () => void;
  palette: ReaderPalette;
  content?: ReaderContent;
  currentPage: number;
  limited?: boolean;
  onJump: (page: number, ayah?: AyahReference) => void;
}

export function ReaderDrawer({ onClose, palette, content, currentPage, onJump, limited }: Props) {
  const close = useRef<View>(null);
  // The list of surahs replaces the form; back (or Escape) returns to the form before closing.
  const [picking, setPicking] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const viewport = useRef(0);
  const pick = (value: boolean) => { scroll.current?.scrollTo({ y: 0, animated: false }); setPicking(value); };
  const back = () => picking ? pick(false) : onClose();
  const [translation] = useState(() => new Animated.Value(500));
  const swipe = useSwipeToClose(onClose);
  const [position] = useState(() => Animated.add(translation, swipe.offset));
  const show = () => {
    translation.setValue(500);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      Animated.timing(translation, { toValue: 0, duration: reduceMotion ? 0 : 240, useNativeDriver: Platform.OS !== 'web' }).start();
    });
    if (Platform.OS === 'web') close.current?.focus();
    else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  };
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onShow={show} onRequestClose={back}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: palette.overlay }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('reader.drawer.close')} onPress={onClose} />
        <GestureDetector gesture={swipe.gesture}><Animated.View accessibilityViewIsModal onAccessibilityEscape={back} onLayout={swipe.onSheetLayout} style={[styles.drawer, picking && styles.tall, readerElevation(4, palette), { backgroundColor: palette.background, borderColor: palette.border, transform: [{ translateY: position }] }]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetContent}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <View onLayout={swipe.onHeaderLayout} style={styles.heading}>
              <IconTile name="jump" palette={palette} />
              <View style={styles.title}>
                <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 18, fontWeight: '600' }}>{limited ? t('reader.drawer.titleSession') : t('reader.drawer.title')}</Text>
                <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{content?.paging === 'thumun' ? t('reader.thumun.currentPosition', { riwayah: content.quran.riwayah.name, position: thumunName(currentPage) })
                  : t('reader.drawer.currentPosition', { riwayah: content?.quran.riwayah.name ?? '', page: currentPage })}</Text>
              </View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('reader.drawer.close')} onPress={onClose}
                hitSlop={4} style={({ pressed }) => [styles.close, { backgroundColor: pressed ? palette.accent : 'transparent' }]}><ReaderIcon name="close" color={palette.mutedForeground} size={18} /></Pressable>
            </View>
            <GestureDetector gesture={swipe.scrollGesture}><ScrollView ref={scroll} {...swipe.scrollProps} onLayout={(event) => { viewport.current = event.nativeEvent.layout.height; }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              {content && <ReaderJump key={currentPage} content={content} currentPage={currentPage} palette={palette} onJump={onJump} limited={limited}
                picking={picking} onPickingChange={pick} onReveal={(y) => {
                  // Only when the chosen surah is out of view; then it sits a third of the way down.
                  const top = styles.formContent.paddingTop + y;
                  requestAnimationFrame(() => { if (top + 60 > viewport.current) scroll.current?.scrollTo({ y: top - viewport.current / 3, animated: false }); });
                }} />}
            </ScrollView></GestureDetector>
          </SafeAreaView>
        </Animated.View></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'flex-end', ...Platform.select({ native: { direction: 'rtl' as const } }) },
  drawer: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '90%', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet },
  // While searching the surahs, the sheet keeps its height instead of shrinking with the results.
  tall: { height: '90%' },
  sheetContent: { flexShrink: 1 },
  handle: { width: 40, height: 4, borderRadius: readerShape.pill, alignSelf: 'center', marginTop: 10 },
  heading: { padding: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
});
