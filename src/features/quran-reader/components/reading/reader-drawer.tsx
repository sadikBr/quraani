import { useState } from 'react';
import { AccessibilityInfo, Animated, Modal, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent } from '../../types/reader';
import type { AyahReference } from '@/lib/quranpedia/types';
import { ReaderJump } from './reader-jump';
import { ReaderIcon } from '../ui/reader-chrome';
import { ReaderButton } from './reader-button';

export type ReaderDrawerSection = 'practice' | 'jump';

interface Props {
  section: ReaderDrawerSection;
  onClose: () => void;
  palette: ReaderPalette;
  content?: ReaderContent;
  currentPage: number;
  onJump: (page: number, ayah?: AyahReference) => void;
  hiddenCount: number;
  practiceCount: number;
  onRevealAll: () => void;
  onResetHidden: () => void;
  onClearHidden: () => void;
}

export function ReaderDrawer({ section, onClose, palette, content, currentPage, onJump, hiddenCount, practiceCount, onRevealAll, onResetHidden, onClearHidden }: Props) {
  const jumpOpen = section === 'jump';
  const [translation] = useState(() => new Animated.Value(500));
  const show = () => {
    translation.setValue(500);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      Animated.timing(translation, { toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: Platform.OS !== 'web' }).start();
    });
  };
  return <Modal visible transparent animationType="none" onShow={show} onRequestClose={onClose}>
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.body} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق القائمة" onPress={onClose} />
        <Animated.View style={[styles.drawer, { backgroundColor: palette.paper, borderColor: palette.border, transform: [{ translateY: translation }] }]}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.drawerContent}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
          <View style={styles.heading}>
            <View style={styles.title}>
              <View style={{ gap: 4 }}>
                <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 23, fontWeight: '700' }}>{jumpOpen ? 'انتقال سريع' : 'مراجعة المقطع'}</Text>
                <Text style={{ color: palette.muted, fontSize: 12 }}>ورش عن نافع · صفحة {currentPage}</Text>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="إغلاق القائمة" onPress={onClose} style={[styles.close, { backgroundColor: palette.background }]}><ReaderIcon name="close" color={palette.muted} /></Pressable>
          </View>
          {content && jumpOpen && <View style={[styles.jump, { backgroundColor: palette.background }]}><ReaderJump key={currentPage} content={content} currentPage={currentPage} palette={palette} onJump={onJump} /></View>}
          {!jumpOpen && practiceCount > 0 && <View style={[styles.jump, { backgroundColor: palette.background, gap: 12 }]}>
            <Text style={{ color: palette.text }}>{hiddenCount} آية مخفية</Text>
            <Text style={{ color: palette.muted, fontSize: 12 }}>الإخفاء مؤقت ولا يغيّر تقدم الحفظ.</Text>
            <ReaderButton palette={palette} onPress={onRevealAll}>إظهار الكل</ReaderButton>
            <ReaderButton palette={palette} onPress={onResetHidden}>إعادة إخفاء المقطع</ReaderButton>
            <ReaderButton palette={palette} onPress={onClearHidden}>إنهاء الإخفاء ومسح المقطع</ReaderButton>
          </View>}
          <ReaderButton palette={palette} onPress={onClose}>متابعة القراءة</ReaderButton>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(7, 20, 15, 0.48)' },
  body: { flex: 1, justifyContent: 'flex-end', ...Platform.select({ native: { direction: 'rtl' as const } }) },
  drawer: { width: '100%', maxWidth: 700, alignSelf: 'center', maxHeight: '85%',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    elevation: 8, boxShadow: '0 -4px 30px rgba(0, 0, 0, 0.12)' },
  drawerContent: { padding: 22, paddingTop: 12, gap: 22 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center' }, jump: { padding: 16, borderRadius: 20 },
});
