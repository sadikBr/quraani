import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { Rule } from '@/components/craft/marks';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { t } from '@/i18n';

/**
 * A du'a to say on finishing the Quran, shown when a khatma is completed and from its page
 * afterwards. No one du'a is prescribed for it: the words say so, and offer one that is often said.
 */
export function KhatmDuaDialog({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const close = useRef<View>(null);
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView style={[s.backdrop, { backgroundColor: p.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.dialog, { backgroundColor: p.background, borderColor: withAlpha(p.ornament, 0.4) }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 10 }}>
          <View style={[s.mark, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name="hand-heart" color={p.ornament} size={20} /></View>
          <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{t('khatma.dua.title')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{t('khatma.dua.lead')}</Text>
          <Rule palette={p} style={{ marginVertical: 6, marginHorizontal: 24 }} />
          <Text selectable style={{ color: p.foreground, fontSize: 19, lineHeight: 38, fontFamily: 'ReaderNaskh', textAlign: 'center' }}>{t('khatma.dua.text')}</Text>
          <View style={{ marginTop: 12 }}>
            <Button ref={close} size="lg" palette={p} onPress={onClose} block>{t('khatma.dua.close')}</Button>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: Math.min(420, readerLayout.maxWidth), maxHeight: '90%', borderRadius: readerShape.sheet, borderWidth: 1, overflow: 'hidden' },
  mark: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
