import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { CheckMark } from '@/components/ui';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import type { ListeningMode } from '@/features/quran-reader/state/reading-preferences';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { t } from '@/i18n';
import { useDownload } from './downloads';
import { playSample, sampleFiles, stopSample, useSample } from './sample';

/**
 * What sets an edition apart in the list: its style, its transmission path, how much of the Quran
 * it covers, and for whole surahs whether the page can follow the ayahs.
 */
export function reciterDetail(reciter: Reciter, listening: ListeningMode = 'ayah') {
  return [
    t(`recitation.styles.${reciter.style}`),
    reciter.path,
    reciter.surahs.length < 114 ? t('recitation.partial', { count: reciter.surahs.length }) : null,
    listening === 'surah' && reciter.timingUrl ? t('recitation.follows') : null,
  ].filter(Boolean).join(' · ');
}

/**
 * Choosing a reciter: each one can be heard first (a short sample from the opening of Al-Fatiha),
 * then chosen. A sample stops when another plays, when one is chosen, or when the sheet closes.
 */
export function ReciterSheet({ reciters, selected, subtitle, quran, listening = 'ayah', palette: p, onSelect, onClose: dismiss }: {
  reciters: Reciter[]; selected: number | undefined; subtitle: string; quran: Quran; listening?: ListeningMode; palette: ReaderPalette;
  onSelect: (reciter: Reciter) => void; onClose: () => void;
}) {
  const onClose = () => { stopSample(); dismiss(); };
  useEffect(() => () => stopSample(), []);
  const sample = useSample();
  const ayahCount = (surah: number) => quran.surahs.find((x) => x.number === surah)?.ayahs.length ?? 0;
  const listen = (reciter: Reciter) => {
    if (sample.reciter === reciter.id) stopSample();
    else void playSample(reciter, sampleFiles(reciter, ayahCount));
  };
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
                <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{subtitle}</Text>
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
            renderItem={({ item, index }) => <ReciterRow reciter={item} listening={listening} checked={item.id === selected} first={index === 0} last={index === filtered.length - 1} palette={p}
              sample={sample.reciter === item.id ? (sample.loading ? 'loading' : 'playing') : sample.failed === item.id ? 'failed' : null}
              onListen={() => listen(item)} onPress={() => { stopSample(); onSelect(item); }} />} /></GestureDetector>
        </AnimatedSafeAreaView></GestureDetector>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

/** A reciter to choose (the row) and to hear first (the listen button beside it). */
function ReciterRow({ reciter, listening, checked, first, last, sample, palette: p, onPress, onListen }: {
  reciter: Reciter; listening: ListeningMode; checked: boolean; first: boolean; last: boolean;
  sample: 'loading' | 'playing' | 'failed' | null; palette: ReaderPalette; onPress: () => void; onListen: () => void;
}) {
  const saved = useDownload(reciter.id).surahs.length > 0;
  const heard = sample === 'loading' || sample === 'playing';
  return <View style={[styles.row, { borderColor: p.border, backgroundColor: checked ? p.accent : p.card, borderBottomWidth: last ? StyleSheet.hairlineWidth : 0 }, first && styles.rowFirst, last && styles.rowLast]}>
    <Pressable accessibilityRole="radio" accessibilityLabel={reciter.name} accessibilityHint={reciterDetail(reciter, listening)} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
      style={({ pressed }) => [styles.choose, { opacity: pressed ? 0.7 : 1 }]}>
      <CheckMark checked={checked} palette={p} radio />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: checked ? '600' : '500' }}>{reciter.name}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{reciterDetail(reciter, listening)}</Text>
        {saved && <View style={styles.saved}>
          <ReaderIcon name="download" color={p.primary} size={12} />
          <Text style={{ color: p.primary, fontSize: 12, fontWeight: '500' }}>{t('recitation.reciterSheet.onDevice')}</Text>
        </View>}
        {sample === 'failed' && <Text accessibilityLiveRegion="polite" style={{ color: p.destructive, fontSize: 12 }}>{t('recitation.reciterSheet.sampleFailed')}</Text>}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t(heard ? 'recitation.reciterSheet.sampleStop' : 'recitation.reciterSheet.sample', { name: reciter.name })}
      accessibilityState={{ busy: sample === 'loading' }} onPress={onListen} hitSlop={4}
      style={({ pressed }) => [styles.listen, { borderColor: heard ? p.primary : p.input, backgroundColor: pressed ? p.accent : heard ? p.secondary : p.background }]}>
      {sample === 'loading' ? <ActivityIndicator size="small" color={p.primary} /> : <ReaderIcon name={heard ? 'stop' : 'play'} color={p.primary} size={18} />}
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { height: '88%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  header: { padding: 16, paddingTop: 8, gap: 12 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingStart: 16, paddingEnd: 12, minHeight: 64,
    borderTopWidth: StyleSheet.hairlineWidth, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  choose: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  listen: { width: 40, height: 40, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowFirst: { borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
});
