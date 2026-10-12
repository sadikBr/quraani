import { useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import { readerElevation, readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent } from '../../types/reader';
import type { AyahReference } from '@/lib/quranpedia/types';
import { ReaderJump } from './reader-jump';
import { thumunName } from '../../utils/thumun-pages';
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
            <SheetGrabber palette={palette} />
            <View onLayout={swipe.onHeaderLayout} style={styles.heading}>
              <SheetTitle palette={palette} title={limited ? t('reader.drawer.titleSession') : t('reader.drawer.title')}
                subtitle={content?.paging === 'thumun' ? t('reader.thumun.currentPosition', { riwayah: content.quran.riwayah.name, position: thumunName(currentPage) })
                  : t('reader.drawer.currentPosition', { riwayah: content?.quran.riwayah.name ?? '', page: currentPage })}
                onClose={onClose} closeLabel={t('reader.drawer.close')} closeRef={close} />
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
  heading: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  formContent: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 4 },
});
