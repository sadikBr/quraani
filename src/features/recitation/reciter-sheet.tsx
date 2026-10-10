import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { t } from '@/i18n';
import { useDownload } from './downloads';

/** What sets an edition apart in the list: its style, its transmission path, and how much of the Quran it covers. */
export function reciterDetail(reciter: Reciter) {
  return [
    t(`recitation.styles.${reciter.style}`),
    reciter.path,
    reciter.surahs.length < 114 ? t('recitation.partial', { count: reciter.surahs.length }) : null,
  ].filter(Boolean).join(' · ');
}

export function ReciterSheet({ reciters, selected, riwayah, palette: p, onSelect, onClose }: {
  reciters: Reciter[]; selected: number | undefined; riwayah: string; palette: ReaderPalette;
  onSelect: (reciter: Reciter) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const filtered = useMemo(() => {
    const q = normalizeArabicSearch(query);
    return q ? reciters.filter((r) => normalizeArabicSearch(`${r.name} ${r.path ?? ''}`).includes(q)) : reciters;
  }, [reciters, query]);
  const swipe = useSwipeToClose(onClose);
  return <Modal transparent visible animationType="slide" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}
    onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: p.overlay }}>
      <KeyboardAvoidingView style={styles.frame} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onLayout={swipe.onSheetLayout} onAccessibilityEscape={onClose}
          style={[styles.sheet, { backgroundColor: p.background, borderColor: p.border }, swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <View style={[styles.grabber, { backgroundColor: p.border }]} />
          <View onLayout={swipe.onHeaderLayout} style={styles.header}>
            <View style={styles.headingRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('recitation.reciterSheet.title')}</Text>
                <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('recitation.reciterSheet.subtitle', { riwayah })}</Text>
              </View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('recitation.reciterSheet.close')} onPress={onClose} hitSlop={4}
                style={({ pressed }) => [styles.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
                <ReaderIcon name="close" color={p.mutedForeground} size={18} />
              </Pressable>
            </View>
            {reciters.length > 6 && <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('recitation.reciterSheet.searchLabel')} placeholder={t('recitation.reciterSheet.searchPlaceholder')} />}
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={(item) => String(item.id)} extraData={selected}
            keyboardShouldPersistTaps="handled" initialNumToRender={14} windowSize={7} contentContainerStyle={styles.list}
            accessibilityRole="radiogroup" accessibilityLabel={t('recitation.reciterSheet.title')}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('recitation.reciterSheet.empty')}</Text>}
            renderItem={({ item, index }) => <ReciterRow reciter={item} checked={item.id === selected} first={index === 0} last={index === filtered.length - 1} palette={p} onPress={() => onSelect(item)} />} /></GestureDetector>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

function ReciterRow({ reciter, checked, first, last, palette: p, onPress }: { reciter: Reciter; checked: boolean; first: boolean; last: boolean; palette: ReaderPalette; onPress: () => void }) {
  const saved = useDownload(reciter.id).surahs.length > 0;
  return <Pressable accessibilityRole="radio" accessibilityLabel={reciter.name} accessibilityHint={reciterDetail(reciter)} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
    style={({ pressed }) => [styles.row, { borderColor: p.border, backgroundColor: checked || pressed ? p.accent : p.card, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && styles.rowFirst, last && styles.rowLast]}>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '600' : '500' }}>{reciter.name}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{reciterDetail(reciter)}</Text>
      {saved && <View style={styles.saved}>
        <ReaderIcon name="download" color={p.primary} size={12} />
        <Text style={{ color: p.primary, fontSize: 12, fontWeight: '500' }}>{t('recitation.reciterSheet.onDevice')}</Text>
      </View>}
    </View>
    <CheckMark checked={checked} palette={p} radio />
  </Pressable>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { height: '88%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  header: { padding: 16, paddingTop: 8, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  rowFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
