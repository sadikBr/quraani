import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { t } from '@/i18n';

/** Asking before something that cannot be undone: what it is, what follows, and the way out first. */
export function ConfirmDialog({ title, body, confirm, onConfirm, onClose }: {
  title: string; body: string; confirm: string; onConfirm: () => void; onClose: () => void;
}) {
  const { palette: p } = useReadingPreferences();
  const cancel = useRef<View>(null);
  return <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') cancel.current?.focus(); else if (cancel.current) AccessibilityInfo.sendAccessibilityEvent(cancel.current, 'focus'); }}>
    <SafeAreaView style={[s.backdrop, { backgroundColor: p.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onClose} />
      <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={[s.dialog, { backgroundColor: p.background, borderColor: withAlpha(p.destructive, 0.35) }, readerElevation(4, p)]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 10 }}>
          <View style={[s.warn, { backgroundColor: withAlpha(p.destructive, 0.1) }]}><ReaderIcon name="trash" color={p.destructive} size={20} /></View>
          <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{body}</Text>
          <View style={{ gap: 8, marginTop: 12 }}>
            <Button variant="destructive" size="lg" icon="trash" palette={p} onPress={onConfirm} block>{confirm}</Button>
            <Button ref={cancel} variant="outline" size="lg" palette={p} onPress={onClose} block>{t('common.cancel')}</Button>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: Math.min(420, readerLayout.maxWidth), maxHeight: '90%', borderRadius: readerShape.sheet, borderWidth: 1, overflow: 'hidden' },
  warn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
