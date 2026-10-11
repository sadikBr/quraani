import { useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { formatList, formatNumber, t } from '@/i18n';
import type { Dhikr } from './content';
import { DhikrText } from './dhikr-text';

/** The opening words of a dhikr, for the index. */
const excerpt = (text: string) => text.split('\n')[0];

/** Every dhikr of a collection with its state; choosing one jumps to it. */
export function AdhkarIndexSheet({ title, items, counts, current, palette: p, onSelect, onRestart, onClose }: {
  title: string; items: Dhikr[]; counts: Record<string, number>; current: number; palette: ReaderPalette;
  onSelect: (index: number) => void; onRestart: () => void; onClose: () => void;
}) {
  const close = useRef<View>(null);
  const [confirming, setConfirming] = useState(false);
  const swipe = useSwipeToClose(onClose);
  const done = items.filter((d) => (counts[d.key] ?? 0) >= d.count).length;
  const started = Object.keys(counts).length > 0;
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('adhkar.session.closeIndex')} onPress={onClose} />
      <View style={s.frame} pointerEvents="box-none">
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={onClose}
          style={[s.sheet, { backgroundColor: p.background, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[s.grabber, { backgroundColor: p.border }]} />
          <View onLayout={swipe.onHeaderLayout} style={s.header}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('adhkar.session.indexTitle', { title })}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{done === items.length ? t('adhkar.completed') : t('adhkar.progress', { done, total: items.length })}</Text>
            </View>
            <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('adhkar.session.closeIndex')} onPress={onClose} hitSlop={4}
              style={({ pressed }) => [s.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
              <ReaderIcon name="close" color={p.mutedForeground} size={18} />
            </Pressable>
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={items} keyExtractor={(d) => d.key}
            initialScrollIndex={Math.max(0, Math.min(current, items.length - 1) - 2)} getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
            contentContainerStyle={s.list} initialNumToRender={14} windowSize={7}
            renderItem={({ item, index }) => {
              const said = Math.min(counts[item.key] ?? 0, item.count);
              const finished = said >= item.count;
              const selected = index === current;
              const state = finished ? t('adhkar.session.done') : said ? t('adhkar.session.partial', { said, count: item.count }) : t('adhkar.times', { count: item.count });
              return <Pressable accessibilityRole="button" accessibilityLabel={formatList([t('adhkar.session.position', { position: index + 1, total: items.length }), state])}
                accessibilityHint={excerpt(item.text)} accessibilityState={{ selected }} onPress={() => onSelect(index)}
                style={({ pressed }) => [s.row, { backgroundColor: selected ? withAlpha(p.primary, 0.08) : pressed ? p.accent : 'transparent', borderColor: selected ? p.primary : 'transparent' }]}>
                <View style={[s.badge, finished ? { backgroundColor: p.primary, borderColor: p.primary } : { borderColor: said ? p.primary : p.input }]}>
                  {finished ? <ReaderIcon name="check" color={p.primaryForeground} size={14} />
                    : <Text style={{ color: said ? p.primary : p.mutedForeground, fontSize: 12, fontWeight: '600' }}>{formatNumber(index + 1)}</Text>}
                </View>
                <View style={s.excerpt}><DhikrText text={excerpt(item.text)} size={16} numberOfLines={2} color={finished ? p.mutedForeground : p.foreground} ornament={finished ? p.mutedForeground : p.ornament} /></View>
                <Text style={{ color: finished ? p.primary : p.mutedForeground, fontSize: 12, minWidth: 44, textAlign: 'left' }}>{state}</Text>
              </Pressable>;
            }} /></GestureDetector>
          {started && <View style={[s.footer, { borderColor: p.border }]}>
            {confirming ? <View style={{ gap: 10 }}>
              <Text style={{ color: p.foreground, fontSize: 14 }}>{t('adhkar.session.restartConfirm', { title })}</Text>
              <View style={s.actions}>
                <Button variant="destructive" size="sm" palette={p} onPress={() => { setConfirming(false); onRestart(); }}>{t('adhkar.session.restartAction')}</Button>
                <Button variant="ghost" size="sm" palette={p} onPress={() => setConfirming(false)}>{t('adhkar.session.keep')}</Button>
              </View>
            </View> : <Button variant="ghost" palette={p} icon="restore" onPress={() => setConfirming(true)}>{t('adhkar.session.restart')}</Button>}
          </View>}
        </AnimatedSafeAreaView></GestureDetector>
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

const ROW = 68;
const s = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, paddingTop: 8 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 12, paddingBottom: 12 },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, borderRadius: readerShape.lg, borderWidth: 1 },
  badge: { width: 30, height: 30, borderRadius: readerShape.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  excerpt: { flex: 1, minWidth: 0 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 8 },
});
