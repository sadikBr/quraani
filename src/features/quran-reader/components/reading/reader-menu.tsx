import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerLayout, readerShape } from '../../design';
import type { ReaderPalette } from '../../theme';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { QuranniLogo } from '../ui/quranni-logo';

// Only app destinations belong here; reading tools live in the reader toolbars.
// Future features can add a tile without changing the navigation pattern.
const destinations = [
  { href: '/plans', icon: 'calendar', label: 'الأهداف', detail: 'وردك وختمتك وحفظك', action: 'عرض أهدافك' },
  { href: '/quran-index', icon: 'index', label: 'الفهرس', detail: 'السور والأجزاء والأحزاب', action: 'تصفّح المصحف' },
  { href: '/bookmarks', icon: 'bookmark', label: 'العلامات', detail: 'آيات حفظتها للرجوع إليها', action: 'عرض العلامات' },
  { href: '/search', icon: 'search', label: 'البحث', detail: 'ابحث بكلمة أو موضع آية', action: 'ابدأ البحث' },
  { href: '/settings', icon: 'settings', label: 'الإعدادات', detail: 'الرواية والمظهر والخط', action: 'تخصيص القراءة' },
] as const satisfies readonly { href: string; icon: ReaderIconName; label: string; detail: string; action: string }[];

export function ReaderMenu({ palette: p, onClose }: { palette: ReaderPalette; onClose: () => void }) {
  const close = useRef<View>(null);
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={s.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="إغلاق التنقل" onPress={onClose} />
      <SafeAreaView accessibilityViewIsModal onAccessibilityEscape={onClose} edges={['bottom']}
        style={[s.panel, { backgroundColor: p.paper, borderColor: p.border }]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <View style={[s.grabber, { backgroundColor: `${p.text}2E` }]} />
        <View style={s.heading}>
          <QuranniLogo color={p.ornament} size={42} />
          <View style={{ flex: 1 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 25, fontWeight: '600' }}>قرآني</Text>
            <Text style={{ color: p.muted, fontSize: 12 }}>مساحتك مع القرآن</Text></View>
          <Pressable ref={close} accessibilityRole="button" accessibilityLabel="إغلاق قائمة التطبيق" onPress={onClose}
            style={({ pressed }) => [s.close, { backgroundColor: pressed ? p.accentSoft : p.background }]}>
            <ReaderIcon name="close" color={p.muted} size={21} />
          </Pressable>
        </View>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
          <View style={s.grid}>
            <Pressable accessibilityRole="button" accessibilityLabel="متابعة القراءة" onPress={onClose}
              style={({ pressed }) => [s.tileSlot, s.tile, { backgroundColor: p.background, borderColor: p.border, opacity: pressed ? 0.65 : 1 }]}>
              <View style={s.tileTop}><View style={[s.tileIcon, { backgroundColor: p.goldSoft }]}><ReaderIcon name="book" color={p.ornament} size={22} strokeWidth={1.7} /></View>
                <View style={[s.dot, { backgroundColor: p.accent }]} /></View>
              <Text style={{ color: p.text, fontSize: 20, fontWeight: '600' }}>المصحف</Text>
              <Text style={{ color: p.muted, fontSize: 12 }}>تابع من حيث توقفت</Text>
              <Text style={{ color: p.accent, fontSize: 11, marginTop: 8 }}>تقرأ الآن</Text>
            </Pressable>
            {destinations.map(({ href, icon, label, detail, action }) => <Link key={href} href={href} asChild onPress={onClose} style={s.tileSlot}>
              <Pressable accessibilityRole="link" accessibilityLabel={label}>
                {({ pressed }) => <View style={[s.tile, { backgroundColor: href === '/plans' ? p.accentSoft : p.background, borderColor: href === '/plans' ? 'transparent' : p.border, opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
                <View style={s.tileTop}><View style={[s.tileIcon, { backgroundColor: href === '/plans' ? p.paper : p.accentSoft }]}><ReaderIcon name={icon} color={p.accent} size={22} strokeWidth={1.7} /></View><ReaderIcon name="chevron" color={p.accent} size={18} /></View>
                <Text style={{ color: p.text, fontSize: 20, fontWeight: '600' }}>{label}</Text>
                <Text style={{ color: p.muted, fontSize: 12 }}>{detail}</Text>
                <Text style={{ color: p.accent, fontSize: 11, marginTop: 6 }}>{action}</Text>
                </View>}
              </Pressable>
            </Link>)}
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaView>
  </Modal>;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(7, 20, 15, 0.52)' },
  panel: { width: '100%', maxWidth: readerLayout.maxWidth, maxHeight: '88%', borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, overflow: 'hidden',
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 20, paddingBottom: 16 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.pill },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, marginTop: 10 },
  tileIcon: { width: 42, height: 42, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileSlot: { flexGrow: 1, flexBasis: '44%', minWidth: 120 },
  tile: { flex: 1, minHeight: 150, padding: 16, borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: readerShape.card },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
