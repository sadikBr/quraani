import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { formatNumber, t } from '@/i18n';

/** Picks surahs to save for listening offline; surahs already saved are marked and cannot be picked again. */
export function SurahDownloadSheet({ quran, available, saved, palette: p, onDownload, onClose }: {
  quran: Quran; available: number[]; saved: number[]; palette: ReaderPalette;
  onDownload: (surahs: number[]) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const surahs = useMemo(() => quran.surahs.filter((s) => available.includes(s.number)), [quran, available]);
  const filtered = useMemo(() => {
    const q = normalizeArabicSearch(query);
    if (!q) return surahs;
    return surahs.filter((s) => normalizeArabicSearch(s.name).includes(q) || String(s.number) === q || formatNumber(s.number) === query.trim());
  }, [surahs, query]);
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
                <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('recitation.surahSheet.title')}</Text>
                <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('recitation.surahSheet.subtitle')}</Text>
              </View>
              <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('recitation.surahSheet.close')} onPress={onClose} hitSlop={4}
                style={({ pressed }) => [styles.close, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
                <ReaderIcon name="close" color={p.mutedForeground} size={18} />
              </Pressable>
            </View>
            <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('recitation.surahSheet.searchLabel')} placeholder={t('recitation.surahSheet.searchPlaceholder')} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={(item) => String(item.number)} extraData={draft}
            keyboardShouldPersistTaps="handled" initialNumToRender={14} windowSize={7} contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('recitation.surahSheet.empty')}</Text>}
            renderItem={({ item, index }) => {
              const onDevice = saved.includes(item.number);
              const checked = onDevice || draft.includes(item.number);
              const first = index === 0, last = index === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityHint={onDevice ? t('recitation.surahSheet.onDevice') : undefined}
                accessibilityState={{ checked, disabled: onDevice }} aria-checked={checked} disabled={onDevice}
                onPress={() => setDraft((items) => items.includes(item.number) ? items.filter((n) => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => [styles.row, { borderColor: p.border, backgroundColor: (checked && !onDevice) || pressed ? p.accent : p.card, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && styles.rowFirst, last && styles.rowLast]}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 28 }}>{formatNumber(item.number)}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked && !onDevice ? '600' : '400' }}>{item.name}</Text>
                  {onDevice && <Text style={{ color: p.primary, fontSize: 12, fontWeight: '500' }}>{t('recitation.surahSheet.onDevice')}</Text>}
                </View>
                {onDevice ? <ReaderIcon name="done" color={p.primary} size={18} /> : <CheckMark checked={checked} palette={p} />}
              </Pressable>;
            }} /></GestureDetector>
          <View style={[styles.footer, { borderColor: p.border }]}>
            <ReaderButton palette={p} selected disabled={!draft.length} onPress={() => onDownload([...draft].sort((a, b) => a - b))}>{t('recitation.surahSheet.confirm', { count: draft.length })}</ReaderButton>
          </View>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { height: '92%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  header: { padding: 16, paddingTop: 8, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  rowFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
