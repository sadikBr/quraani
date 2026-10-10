import { IconTile } from '@/components/ui';
import { useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent } from '../../types/reader';
import type { AyahReference } from '@/lib/quranpedia/types';
import { ReaderJump } from './reader-jump';
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
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: palette.overlay }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('reader.drawer.close')} onPress={onClose} />
        <Animated.View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[styles.drawer, readerElevation(4, palette), { backgroundColor: palette.background, borderColor: palette.border, transform: [{ translateY: translation }] }]}>
          <SafeAreaView edges={['bottom']} style={styles.sheetContent}>
            <View style={[styles.handle, { backgroundColor: palette.border }]} />
            <View style={styles.heading}>
              <IconTile name="jump" palette={palette} />
              <View style={styles.title}>
                <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 18, fontWeight: '600' }}>{limited ? t('reader.drawer.titleSession') : t('reader.drawer.title')}</Text>
                <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('reader.drawer.currentPosition', { riwayah: content?.quran.riwayah.name ?? '', page: currentPage })}</Text>
              </View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('reader.drawer.close')} onPress={onClose}
                hitSlop={4} style={({ pressed }) => [styles.close, { backgroundColor: pressed ? palette.accent : 'transparent' }]}><ReaderIcon name="close" color={palette.mutedForeground} size={18} /></Pressable>
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
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'flex-end', ...Platform.select({ native: { direction: 'rtl' as const } }) },
  drawer: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '90%', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet },
  sheetContent: { flexShrink: 1 },
  handle: { width: 40, height: 4, borderRadius: readerShape.pill, alignSelf: 'center', marginTop: 10 },
  heading: { padding: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headingIcon: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, minWidth: 0 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  formContent: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4 },
});
