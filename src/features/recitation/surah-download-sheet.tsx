import { useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import { Beads, Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { calligraphyStyle, surahNameGlyph } from '@/features/quran-reader/utils/reader-typography';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { formatNumber, t } from '@/i18n';

/**
 * Picks surahs to save for listening offline; surahs already saved are marked and cannot be picked
 * again. Each surah is a row on one card, its number on the star and its name in calligraphy, as
 * the index lists them; under the title, beads say how much of the recitation is already saved.
 */
export function SurahDownloadSheet({ quran, available, saved, palette: p, onDownload, onClose }: {
  quran: Quran; available: number[]; saved: number[]; palette: ReaderPalette;
  onDownload: (surahs: number[]) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<number[]>([]);
  const [query, setQuery] = useState('');
  const close = useRef<View>(null);
  const surahs = useMemo(() => quran.surahs.filter((s) => available.includes(s.number)), [quran, available]);
  const savedCount = available.filter((n) => saved.includes(n)).length;
  const { loaded: calligraphy } = useQuranFont();
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
          style={[styles.sheet, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <SheetGrabber palette={p} />
          <View onLayout={swipe.onHeaderLayout} style={styles.header}>
            <SheetTitle title={t('recitation.surahSheet.title')} subtitle={t('recitation.surahSheet.subtitle')} palette={p} onClose={onClose} closeLabel={t('recitation.surahSheet.close')} closeRef={close} />
            {savedCount > 0 && <View style={styles.progress}>
              <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{savedCount >= available.length ? t('recitation.settings.offline.complete') : t('recitation.settings.offline.saved', { count: savedCount })}</Text>
              <Beads count={available.length} done={savedCount} palette={p} size={7} />
            </View>}
            <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('recitation.surahSheet.searchLabel')} placeholder={t('recitation.surahSheet.searchPlaceholder')} />
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={(item) => String(item.number)} extraData={draft}
            keyboardShouldPersistTaps="handled" initialNumToRender={14} windowSize={7} contentContainerStyle={styles.list}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', padding: 20 }}>{t('recitation.surahSheet.empty')}</Text>}
            renderItem={({ item, index }) => {
              const onDevice = saved.includes(item.number);
              const checked = onDevice || draft.includes(item.number);
              const first = index === 0, last = index === filtered.length - 1;
              return <Pressable accessibilityRole="checkbox" accessibilityLabel={item.name} accessibilityHint={onDevice ? t('recitation.surahSheet.onDevice') : undefined}
                accessibilityState={{ checked, disabled: onDevice }} aria-checked={checked} disabled={onDevice}
                onPress={() => setDraft((items) => items.includes(item.number) ? items.filter((n) => n !== item.number) : [...items, item.number])}
                style={({ pressed }) => [styles.row, { borderColor: p.border, backgroundColor: pressed ? p.accent : checked && !onDevice ? withAlpha(p.primary, 0.06) : p.card }, first && styles.rowFirst, last && styles.rowLast]}>
                {!first && <View style={[styles.separator, { backgroundColor: p.border }]} />}
                <Medallion value={item.number} size={40} palette={p} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  {calligraphy
                    ? <Text accessibilityLabel={item.name} numberOfLines={1} style={[calligraphyStyle(27), { color: p.ornament, lineHeight: 36 }]}>{surahNameGlyph(item.number)}</Text>
                    : <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{item.name}</Text>}
                  {onDevice && <Text style={{ color: p.ornament, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t('recitation.surahSheet.onDevice')}</Text>}
                </View>
                {onDevice ? <ReaderIcon name="done" color={p.ornament} size={20} /> : <CheckMark checked={checked} palette={p} />}
              </Pressable>;
            }} /></GestureDetector>
          <View style={[styles.footer, { borderColor: p.border, backgroundColor: p.background }]}>
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
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12 },
  progress: { gap: 6 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 8, minHeight: 60,
    borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  separator: { position: 'absolute', top: 0, start: 66, end: 0, height: StyleSheet.hairlineWidth },
  rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
