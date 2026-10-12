import { useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { Button } from '@/components/ui';
import { Beads, Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { formatList, t } from '@/i18n';
import type { Dhikr } from './content';
import { DhikrText } from './dhikr-text';

/** The opening words of a dhikr, for the index. */
const excerpt = (text: string) => text.split('\n')[0];

/**
 * Every dhikr of a collection, each numbered in a star (filled for the one shown), its opening
 * words, and how far it is said; choosing one jumps to it.
 */
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
          <SheetGrabber palette={p} />
          <View onLayout={swipe.onHeaderLayout} style={s.header}>
            <SheetTitle title={t('adhkar.session.indexTitle', { title })} subtitle={done === items.length ? t('adhkar.completed') : t('adhkar.progress', { done, total: items.length })}
              palette={p} onClose={onClose} closeLabel={t('adhkar.session.closeIndex')} closeRef={close} />
            <Beads count={items.length} done={done} size={7} max={items.length} palette={p} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={items} keyExtractor={(d) => d.key}
            initialScrollIndex={Math.max(0, Math.min(current, items.length - 1) - 2)} getItemLayout={(_, i) => ({ length: ROW, offset: ROW * i, index: i })}
            contentContainerStyle={s.list} initialNumToRender={14} windowSize={7}
            renderItem={({ item, index }) => <IndexRow item={item} index={index} total={items.length} said={counts[item.key] ?? 0} selected={index === current} palette={p} onSelect={onSelect} />} /></GestureDetector>
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

/** A dhikr in the index: its number in a star, its opening words, and a check once said (or how far). */
function IndexRow({ item, index, total, said: count, selected, palette: p, onSelect }: {
  item: Dhikr; index: number; total: number; said: number; selected: boolean; palette: ReaderPalette; onSelect: (index: number) => void;
}) {
  const said = Math.min(count, item.count);
  const finished = said >= item.count;
  const state = finished ? t('adhkar.session.done') : said ? t('adhkar.session.partial', { said, count: item.count }) : t('adhkar.times', { count: item.count });
  return <Pressable accessibilityRole="button" accessibilityLabel={formatList([t('adhkar.session.position', { position: index + 1, total }), state])}
    accessibilityHint={excerpt(item.text)} accessibilityState={{ selected }} onPress={() => onSelect(index)}
    style={({ pressed }) => [s.row, { backgroundColor: selected ? withAlpha(p.ornament, 0.1) : pressed ? p.accent : 'transparent', borderColor: selected ? withAlpha(p.ornament, 0.55) : 'transparent' }]}>
    <Medallion value={index + 1} size={38} palette={p} current={selected} />
    <View style={s.excerpt}><DhikrText text={excerpt(item.text)} size={16} numberOfLines={2} color={finished ? p.mutedForeground : p.foreground} ornament={finished ? p.mutedForeground : p.ornament} /></View>
    {finished ? <View style={s.state}>
      <ReaderIcon name="done" color={p.ornament} size={18} />
      <Text style={{ color: p.ornament, fontSize: 11, lineHeight: 16 }}>{state}</Text>
    </View> : <Text style={{ color: said ? p.foreground : p.mutedForeground, fontSize: 12, fontWeight: said ? '600' : '400', minWidth: 44, textAlign: 'left' }}>{state}</Text>}
  </Pressable>;
}

const ROW = 68;
const s = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { maxHeight: '86%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 10 },
  list: { paddingHorizontal: 10, paddingBottom: 12 },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, borderRadius: readerShape.lg, borderWidth: 1 },
  excerpt: { flex: 1, minWidth: 0 },
  state: { alignItems: 'center', minWidth: 44 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 10 },
  actions: { flexDirection: 'row', gap: 8 },
});
