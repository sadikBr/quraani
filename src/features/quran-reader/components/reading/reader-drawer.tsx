import { useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent } from '../../types/reader';
import type { AyahReference } from '@/lib/quranpedia/types';
import { ReaderJump } from './reader-jump';
import { ReaderIcon } from '../ui/reader-chrome';

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
  const [translation] = useState(() => new Animated.Value(500));
  const show = () => {
    translation.setValue(500);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      Animated.timing(translation, { toValue: 0, duration: reduceMotion ? 0 : 240, useNativeDriver: Platform.OS !== 'web' }).start();
    });
    if (Platform.OS === 'web') close.current?.focus();
    else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus');
  };
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onShow={show} onRequestClose={onClose}>
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق الانتقال السريع" onPress={onClose} />
        <Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.drawer, { backgroundColor: palette.paper, borderColor: palette.border, transform: [{ translateY: translation }] }]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetContent}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <View style={styles.heading}>
              <View style={[styles.headingIcon, { backgroundColor: palette.accentSoft }]}><ReaderIcon name="jump" color={palette.accent} size={24} /></View>
              <View style={styles.title}>
                <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 23, fontWeight: '700' }}>{limited ? 'انتقال داخل الورد' : 'انتقال سريع'}</Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>{content?.quran.riwayah.name} · موضعك الحالي: صفحة {currentPage}</Text>
              </View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق الانتقال السريع" onPress={onClose}
                style={({ pressed }) => [styles.close, { borderColor: palette.border, backgroundColor: pressed ? palette.accentSoft : palette.paper }]}><ReaderIcon name="close" color={palette.muted} size={20} /></Pressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formContent}>
              {content && <ReaderJump key={currentPage} content={content} currentPage={currentPage} palette={palette} onJump={onJump} limited={limited} />}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(7, 20, 15, 0.48)' },
  body: { flex: 1, justifyContent: 'flex-end', ...Platform.select({ native: { direction: 'rtl' as const } }) },
  drawer: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '90%', borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet,
    elevation: 4, boxShadow: '0 -2px 16px rgba(0, 0, 0, 0.10)' },
  sheetContent: { flexShrink: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  heading: { padding: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: { width: 42, height: 48, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0 },
  close: { width: 44, height: 44, borderWidth: 1, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 4 },
});
