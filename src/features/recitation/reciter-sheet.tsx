import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { SheetGrabber, SheetTitle } from '@/components/craft/page';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import type { ListeningMode } from '@/features/quran-reader/state/reading-preferences';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
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
 * The first letter of a reciter's name, which stands for him on his star («عمر القزابري» → «ع»;
 * the article is passed over: «العيون الكوشي» → «ع»). An alef alone is a bare stroke that reads
 * as a mark rather than a letter, so a name that starts with one keeps its second letter too
 * («إبراهيم» → «إب»).
 */
export function reciterInitial(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? '';
  // eslint-disable-next-line no-restricted-syntax -- matching the article of a name, not interface text
  const word = first.length > 3 && first.startsWith('ال') ? first.slice(2) : first;
  // eslint-disable-next-line no-restricted-syntax -- the forms of the letter alef, not interface text
  return 'اأإآ'.includes(word.charAt(0)) ? word.slice(0, 2) : word.charAt(0);
}

/**
 * A reciter's star: his initial on the eight-pointed star, filled when he is the one chosen. The
 * letter is drawn larger than a number would be, so that a hamza or a dot reads at a glance.
 */
export function ReciterStar({ name, size = 44, current = false, palette: p }: { name: string; size?: number; current?: boolean; palette: ReaderPalette }) {
  const initial = reciterInitial(name);
  return <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: size, height: size }}>
    <Medallion value="" size={size} palette={p} current={current} />
    <View style={[StyleSheet.absoluteFill, styles.initial]}>
      <Text style={{ color: current ? p.card : p.foreground, fontSize: Math.round(size * (initial.length > 1 ? 0.32 : 0.4)), lineHeight: Math.round(size * 0.66), fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{initial}</Text>
    </View>
  </View>;
}

/**
 * Choosing a reciter: each one can be heard first (a short sample from the opening of Al-Fatiha),
 * then chosen. A sample stops when another plays, when one is chosen, or when the sheet closes.
 * Each reciter is a row on one card, his initial on the eight-pointed star; the chosen one's star
 * is filled.
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
          style={[styles.sheet, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
          <SheetGrabber palette={p} />
          <View onLayout={swipe.onHeaderLayout} style={styles.header}>
            <SheetTitle title={t('recitation.reciterSheet.title')} subtitle={subtitle} palette={p} onClose={onClose} closeLabel={t('recitation.reciterSheet.close')} closeRef={close} />
            {reciters.length > 6 && <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('recitation.reciterSheet.searchLabel')} placeholder={t('recitation.reciterSheet.searchPlaceholder')} />}
          </View>
          <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={filtered} keyExtractor={(item) => String(item.id)} extraData={selected}
            keyboardShouldPersistTaps="handled" initialNumToRender={14} windowSize={7} contentContainerStyle={styles.list}
            accessibilityRole="radiogroup" accessibilityLabel={t('recitation.reciterSheet.title')}
            ListEmptyComponent={<Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', padding: 20 }}>{t('recitation.reciterSheet.empty')}</Text>}
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
  return <View style={[styles.row, { borderColor: p.border, backgroundColor: checked ? withAlpha(p.ornament, 0.08) : p.card }, first && styles.rowFirst, last && styles.rowLast]}>
    {!first && <View style={[styles.separator, { backgroundColor: p.border }]} />}
    <Pressable accessibilityRole="radio" accessibilityLabel={reciter.name} accessibilityHint={reciterDetail(reciter, listening)} accessibilityState={{ checked }} aria-checked={checked} onPress={onPress}
      style={({ pressed }) => [styles.choose, { opacity: pressed ? 0.7 : 1 }]}>
      <ReciterStar name={reciter.name} size={44} palette={p} current={checked} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 24, fontWeight: checked ? '700' : '600' }}>{reciter.name}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{reciterDetail(reciter, listening)}</Text>
        {saved && <View style={styles.saved}>
          <ReaderIcon name="download" color={p.ornament} size={12} />
          <Text style={{ color: p.ornament, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t('recitation.reciterSheet.onDevice')}</Text>
        </View>}
        {sample === 'failed' && <Text accessibilityLiveRegion="polite" style={{ color: p.destructive, fontSize: 12, lineHeight: 18 }}>{t('recitation.reciterSheet.sampleFailed')}</Text>}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t(heard ? 'recitation.reciterSheet.sampleStop' : 'recitation.reciterSheet.sample', { name: reciter.name })}
      accessibilityState={{ busy: sample === 'loading' }} onPress={onListen} hitSlop={4}
      style={({ pressed }) => [styles.listen, { borderColor: heard ? p.primary : withAlpha(p.ornament, 0.55), backgroundColor: heard ? p.primary : pressed ? p.accent : p.background }]}>
      {sample === 'loading' ? <ActivityIndicator size="small" color={p.primaryForeground} /> : <ReaderIcon name={heard ? 'stop' : 'play'} color={heard ? p.primaryForeground : p.foreground} size={17} />}
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  frame: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { height: '88%', width: '100%', maxWidth: readerLayout.maxWidth, borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0 },
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingStart: 14, paddingEnd: 12, minHeight: 72, borderStartWidth: StyleSheet.hairlineWidth, borderEndWidth: StyleSheet.hairlineWidth },
  separator: { position: 'absolute', top: 0, start: 70, end: 0, height: StyleSheet.hairlineWidth },
  choose: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  listen: { width: 40, height: 40, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rowFirst: { borderTopWidth: StyleSheet.hairlineWidth, borderTopStartRadius: readerShape.card, borderTopEndRadius: readerShape.card },
  rowLast: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomStartRadius: readerShape.card, borderBottomEndRadius: readerShape.card },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  initial: { alignItems: 'center', justifyContent: 'center' },
});
