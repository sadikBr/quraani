import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';

// Add future app destinations here without changing the reader toolbar.
const destinations = [
  { href: '/quran-index', icon: 'index', label: 'فهرس القرآن' },
  { href: '/search', icon: 'search', label: 'البحث في القرآن' },
  { href: '/bookmarks', icon: 'bookmark', label: 'العلامات المحفوظة' },
  { href: '/settings', icon: 'settings', label: 'الإعدادات' },
] as const satisfies readonly { href: string; icon: ReaderIconName; label: string }[];

export function ReaderMenu({ palette, onClose }: { palette: ReaderPalette; onClose: () => void }) {
  const close = useRef<View>(null);
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق قائمة التطبيق" onPress={onClose} />
      <SafeAreaView accessibilityViewIsModal onAccessibilityEscape={onClose} edges={['top', 'bottom', 'right']}
        style={[styles.panel, { backgroundColor: palette.paper, borderColor: palette.border }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <View style={[styles.heading, { borderColor: palette.border }]}>
          <QuranniLogo color={palette.ornament} size={38} />
          <Text accessibilityRole="header" style={[styles.brand, { color: palette.text }]}>قرآني</Text>
          <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق قائمة التطبيق" onPress={onClose}
            style={({ pressed }) => [styles.close, { backgroundColor: pressed ? palette.accentSoft : 'transparent' }]}>
            <ReaderIcon name="close" color={palette.muted} size={20} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable accessibilityRole="button" accessibilityLabel="متابعة القراءة" onPress={onClose}
            style={({ pressed }) => [styles.item, { backgroundColor: palette.accentSoft, opacity: pressed ? 0.65 : 1 }]}>
            <ReaderIcon name="book" color={palette.accent} size={22} />
            <Text style={[styles.label, { color: palette.text }]}>المصحف</Text>
            <Text style={{ fontSize: 11, color: palette.muted }}>تقرأ الآن</Text>
          </Pressable>
          {destinations.map(({ href, icon, label }) => <Link key={href} href={href} asChild onPress={onClose}>
            <Pressable accessibilityRole="link" accessibilityLabel={label}>
              {({ pressed }) => <View style={[styles.item, { backgroundColor: pressed ? palette.accentSoft : 'transparent' }]}>
                <ReaderIcon name={icon} color={palette.muted} size={22} />
                <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
                <ReaderIcon name="chevron" color={palette.muted} size={16} />
              </View>}
            </Pressable>
          </Link>)}
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(7, 20, 15, 0.48)' },
  panel: { position: 'absolute', top: 0, bottom: 0, start: 0, width: '86%', maxWidth: 360, borderEndWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { flex: 1, fontSize: 23, fontWeight: '600' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  content: { padding: 14, gap: 6 },
  item: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 14, paddingHorizontal: 14, paddingVertical: 10, borderRadius: readerShape.control },
  label: { flex: 1, fontSize: 16 },
});
