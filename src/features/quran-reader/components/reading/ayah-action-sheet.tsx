import { editionForMushaf } from '../../riwayat';
import { readerElevation, readerShape, withAlpha } from '../../design';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { ArabicText as Text } from '@/components/arabic-text';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { Cartouche, Rule } from '@/components/craft/marks';
import { Row, RowGroup, SheetGrabber } from '@/components/craft/page';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';
import { quranpedia } from '../../services/reader-service';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { useQuranFont } from '../../hooks/use-quran-font';
import { ayahKey } from '../../utils/references';
import { ayahShareText, parallelAyahs } from '../../utils/ayah-actions';
import type { ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { ReaderIcon, type ReaderIconName, Segments } from '../ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { formatList, t } from '@/i18n';
import { useSurahFollows } from '@/features/recitation/use-listen';

/** The quoted ayah's size, and how many of its lines show before it fades. */
const QUOTE = 24, QUOTE_LINE = 48, QUOTE_LINES = 3;

/**
 * What can be done with an ayah, opened by a long press on it. At the head, the ayah itself as
 * the mushaf writes it: its surah's name in calligraphy in the title's frame, where it is, and its
 * text in the Quran's face with its number (a long ayah fades after a few lines). Then the three
 * things done at once (a bookmark, a copy, a share) side by side, and below them, as rows, listening
 * from it or repeating it, and its tafsir and translation, opened in place.
 */
export function AyahActionSheet({ ayah, quran, palette, onClose, onListen, wholeSurah = false, location }: {
  ayah: Ayah; quran: Quran; palette: ReaderPalette; onClose: () => void;
  /** Where the ayah is, when not by its page ("الآية 5 · الحزب 2 · الثمن 1"). */
  location?: string;
  /** Listen from this ayah onward, or repeat this ayah alone (`single`). */
  onListen?: (ayah: Ayah, single: boolean) => void;
  /** Listening onward plays the surah's whole recording (repeating the ayah stays ayah by ayah). */
  wholeSurah?: boolean;
}) {
  const close = useRef<View>(null);
  const { preferences: { repeat } } = useReadingPreferences();
  const font = useQuranFont();
  // Without the reciter's timings, a whole surah's recording can only start from its top.
  const follows = useSurahFollows(quran, wholeSurah && !!onListen);
  const fromTop = wholeSurah && follows === false;
  const { bookmarks, toggle, ready, error: bookmarkError } = useBookmarks();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'tafsir' | 'translation' | null>(null);
  const [long, setLong] = useState(false);
  const surahName = quran.surahs.find((s) => s.number === ayah.surahNumber)?.name ?? '';
  const bookmarked = bookmarks.includes(ayahKey(ayah));
  const copy = async () => {
    try {
      const text = ayahShareText(ayah, surahName);
      const ok = await Clipboard.setStringAsync(text); setMessage(ok ? t('reader.actions.copied') : t('reader.actions.copyFailed'));
    } catch { setMessage(t('reader.actions.copyFailed')); }
  };
  const share = () => {
    onClose();
    router.push({ pathname: '/share-ayah', params: { surah: ayah.surahNumber, ayah: ayah.ayahNumber } });
  };
  const swipe = useSwipeToClose(onClose);
  const p = palette;
  // Cover the system bars with the backdrop; SafeAreaView keeps controls inset.
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose} onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: p.overlay }]}>
      <View style={styles.body}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('reader.actions.close')} onPress={onClose} />
      <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} onLayout={swipe.onSheetLayout}
        style={[styles.sheet, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <SheetGrabber palette={p} />
        <View onLayout={swipe.onHeaderLayout} style={styles.heading}>
          <View style={styles.side} />
          <View style={styles.title}>
            <Cartouche width={212} height={54} palette={p} filled>
              {font.loaded ? <Text accessibilityRole="header" accessibilityLabel={t('reader.ayah.reference', { surah: surahName, ayah: ayah.ayahNumber })}
                style={[calligraphyStyle(34), { color: p.ornament, lineHeight: 46, textAlign: 'center' }]}>{surahNameGlyph(ayah.surahNumber)}</Text>
                : <Text accessibilityRole="header" accessibilityLabel={t('reader.ayah.reference', { surah: surahName, ayah: ayah.ayahNumber })}
                  numberOfLines={1} style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{surahName}</Text>}
            </Cartouche>
            <Text style={[styles.reference, { color: p.mutedForeground }]}>{location ?? t('reader.ayah.location', { ayah: ayah.ayahNumber, page: ayah.pageNumber })}</Text>
          </View>
          <View style={styles.side}>
            <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('reader.actions.close')} onPress={onClose} hitSlop={4}
              style={({ pressed }) => [styles.close, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background }]}>
              <ReaderIcon name="close" color={p.foreground} size={18} />
            </Pressable>
          </View>
        </View>
        <GestureDetector gesture={swipe.scrollGesture}><ScrollView {...swipe.scrollProps} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          {font.loaded && <View style={[styles.quote, long && { maxHeight: QUOTE_LINE * QUOTE_LINES }]}>
            <Text onLayout={(event) => setLong(event.nativeEvent.layout.height > QUOTE_LINE * QUOTE_LINES + 4)}
              style={{ fontFamily: font.fontFamily, fontSize: QUOTE, lineHeight: QUOTE_LINE, color: p.foreground, textAlign: 'center', writingDirection: 'rtl' }}>
              {font.display(ayah.text)}{'\u00A0'}<NativeText style={{ color: p.ornament }}>{ayah.marker}</NativeText>
            </Text>
            {long && <Fade color={p.background} />}
          </View>}
          <Rule palette={p} style={styles.rule} />
          <View style={[styles.quickActions, { backgroundColor: p.card, borderColor: p.border }]}>
            <QuickAction palette={p} icon={bookmarked ? 'check' : 'bookmark'} disabled={!ready} selected={bookmarked}
              label={bookmarked ? t('reader.actions.bookmarked') : t('reader.actions.bookmark')} accessibilityLabel={bookmarked ? t('reader.actions.removeBookmark') : t('reader.actions.bookmark')} onPress={() => toggle(ayahKey(ayah))} />
            <View style={[styles.separator, { backgroundColor: p.border }]} />
            <QuickAction palette={p} icon="copy" label={t('reader.actions.copy')} onPress={() => void copy()} />
            <View style={[styles.separator, { backgroundColor: p.border }]} />
            <QuickAction palette={p} icon="share" label={t('reader.actions.share')} onPress={share} />
          </View>
          {!!message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: p.primary }]}>{message}</Text>}
          {bookmarkError && <Text accessibilityRole="alert" style={[styles.feedback, { color: p.destructive }]}>{t('reader.actions.bookmarkStorageError')}</Text>}
          <RowGroup palette={p} style={styles.rows}>
            {onListen && <Row palette={p} icon="headphones" title={fromTop ? t('recitation.ayahSheet.wholeSurah') : t('recitation.ayahSheet.fromHere')}
              detail={!wholeSurah ? t('recitation.ayahSheet.fromHereDetail') : fromTop ? t('recitation.ayahSheet.wholeSurahDetail') : t('recitation.ayahSheet.fromHereSurahDetail')}
              label={fromTop ? t('recitation.ayahSheet.wholeSurah') : t('recitation.ayahSheet.fromHere')}
              hint={!wholeSurah ? t('recitation.ayahSheet.fromHereDetail') : fromTop ? t('recitation.ayahSheet.wholeSurahDetail') : t('recitation.ayahSheet.fromHereSurahDetail')}
              chevron={false} onPress={() => onListen(ayah, false)} />}
            {onListen && <Row palette={p} icon="loop" title={t('recitation.ayahSheet.repeatAyah')} label={t('recitation.ayahSheet.repeatAyah')}
              detail={repeat > 1 ? t('recitation.ayahSheet.repeatAyahDetail', { count: repeat }) : t('recitation.ayahSheet.repeatAyahEndless')}
              hint={repeat > 1 ? t('recitation.ayahSheet.repeatAyahDetail', { count: repeat }) : t('recitation.ayahSheet.repeatAyahEndless')}
              chevron={false} onPress={() => onListen(ayah, true)} />}
            <RelatedAction palette={p} icon="book" label={t('reader.actions.tafsir')} detail={t('reader.actions.tafsirDetail')} expanded={kind === 'tafsir'} onPress={() => setKind(kind === 'tafsir' ? null : 'tafsir')} />
            {kind === 'tafsir' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="tafsir" palette={p} /></View>}
            <RelatedAction palette={p} icon="translate" label={t('reader.actions.translation')} detail={t('reader.actions.translationDetail')} expanded={kind === 'translation'} onPress={() => setKind(kind === 'translation' ? null : 'translation')} />
            {kind === 'translation' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="translation" palette={p} /></View>}
          </RowGroup>
          <Text style={[styles.edition, { color: p.mutedForeground }]}>{t('common.riwayahOf', { riwayah: editionForMushaf(quran.id).label })}</Text>
        </ScrollView></GestureDetector>
      </AnimatedSafeAreaView></GestureDetector>
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

/** The foot of a long ayah, fading into the sheet: the rest is on the page behind. */
function Fade({ color }: { color: string }) {
  return <View aria-hidden pointerEvents="none" style={styles.fade}>
    <Svg width="100%" height="100%">
      <Defs>
        <LinearGradient id="ayahFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="1" stopColor={color} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#ayahFade)" />
    </Svg>
  </View>;
}

/** One of the three things done at once: its icon on a gold tile (filled when it is on), its name under it. */
function QuickAction({ palette: p, icon, label, accessibilityLabel, onPress, selected = false, disabled = false }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; accessibilityLabel?: string;
  onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.quickAction, { backgroundColor: pressed ? p.accent : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
    <View style={[styles.quickIcon, { backgroundColor: selected ? p.primary : withAlpha(p.ornament, 0.12) }]}>
      <ReaderIcon name={icon} color={selected ? p.primaryForeground : p.ornament} size={20} />
    </View>
    <Text numberOfLines={1} style={[styles.actionLabel, { color: selected ? p.primary : p.foreground, fontWeight: selected ? '600' : '500' }]}>{label}</Text>
  </Pressable>;
}

/** A row that opens its content in place (the tafsir, the translation), drawn as the kit's rows; its chevron turns down when open. */
function RelatedAction({ palette: p, icon, label, detail, expanded, onPress }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; detail: string; expanded: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ expanded }} onPress={onPress}
    style={({ pressed }) => [styles.relatedAction, { backgroundColor: pressed ? p.accent : expanded ? withAlpha(p.ornament, 0.06) : 'transparent' }]}>
    <View style={[styles.relatedIcon, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name={icon} color={p.ornament} size={19} /></View>
    <View style={styles.relatedCopy}>
      <Text style={[styles.relatedLabel, { color: p.foreground }]}>{label}</Text>
      <Text style={[styles.relatedDetail, { color: p.mutedForeground }]}>{detail}</Text>
    </View>
    <View style={expanded ? { transform: [{ rotate: '-90deg' }] } : undefined}><ReaderIcon name="chevron" color={p.mutedForeground} size={16} /></View>
  </Pressable>;
}
function RelatedContent({ ayah, kind, palette }: { ayah: Ayah; kind: 'tafsir' | 'translation'; palette: ReaderPalette }) {
  const [language, setLanguage] = useState<'en' | 'fr'>('fr');
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ items: { number: number; content: RelatedText; stale: boolean }[]; error: boolean; loading: boolean }>({ items: [], error: false, loading: true });
  // Each request lifetime belongs to this panel. Closing/changing it prevents late results from reaching another ayah.
  useEffect(() => {
    let active = true;
    const numbers = parallelAyahs(ayah);
    void Promise.all(numbers.map(async (number) => {
      if (kind === 'tafsir') { const response = await quranpedia.getBookContent(ayah.surahNumber, number, 2012); return [{ number, content: response.data, stale: response.stale }]; }
      const response = await quranpedia.getTranslations(ayah.surahNumber, number, language);
      return response.data.map((content) => ({ number, content, stale: response.stale }));
    })).then((rows) => { if (active) setResult({ items: rows.flat(), error: false, loading: false }); }).catch(() => { if (active) setResult({ items: [], error: true, loading: false }); });
    return () => { active = false; };
  }, [ayah, kind, language, revision]);
  return <View style={{ gap: 12 }}>
    {kind === 'translation' && <Segments palette={palette} options={[{ value: 'fr', label: t('common.languages.french') }, { value: 'en', label: t('common.languages.english') }]} value={language} onChange={(v) => { setResult({ items: [], error: false, loading: true }); setLanguage(v); }} />}
    <Text style={{ color: palette.mutedForeground, fontSize: 12, lineHeight: 22 }}>{t('reader.related.sources', { references: formatList(parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`)) })}</Text>
    {result.loading ? <ActivityIndicator accessibilityLabel={t('reader.related.loading')} color={palette.primary} /> : result.error ? <View style={{ gap: 12 }}><Text accessibilityRole="alert" style={{ color: palette.destructive }}>{t('reader.related.loadError')}</Text><ReaderButton palette={palette} onPress={() => { setResult({ items: [], error: false, loading: true }); setRevision((v) => v + 1); }}>{t('common.retry')}</ReaderButton></View> : !result.items.length ? <Text style={{ color: palette.mutedForeground }}>{t('reader.related.empty')}</Text> : result.items.map((item, i) => <View key={`${item.number}:${item.content.book.id}:${i}`} style={[styles.range, { backgroundColor: palette.background }]}>
      <Text accessibilityRole="header" style={{ color: palette.primary, fontWeight: '600' }}>{item.content.book.name}</Text>
      {!!item.content.book.author && <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{item.content.book.author}</Text>}
      <Text style={{ color: palette.mutedForeground, fontSize: 11 }}>{t('reader.related.parallelReference', { surah: ayah.surahNumber, ayah: item.number })}{item.stale ? ` · ${t('reader.related.stale')}` : ''}</Text>
      {item.content.texts.filter(Boolean).map((text, index) => <NativeText key={index} selectable style={{ color: palette.foreground, fontSize: 17, lineHeight: 30, writingDirection: item.content.direction, textAlign: item.content.direction === 'ltr' ? 'left' : 'auto', fontFamily: item.content.direction === 'rtl' ? 'ReaderNaskh' : undefined }}>{relatedPlainText(text)}</NativeText>)}
      <ReaderButton palette={palette} onPress={() => void Linking.openURL(`https://quranpedia.net/surah/1/${ayah.surahNumber}`).catch(() => {})}>{t('reader.related.openSource')}</ReaderButton>
    </View>)}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '85%', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet,
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  side: { width: 40 },
  title: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  reference: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  close: { width: 40, height: 40, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 20 },
  quote: { overflow: 'hidden', paddingHorizontal: 4 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(QUOTE_LINE * 0.8) },
  rule: { marginVertical: 14, marginHorizontal: 24 },
  quickActions: { flexDirection: 'row', alignItems: 'center', borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  quickAction: { flex: 1, minHeight: 88, paddingHorizontal: 4, paddingVertical: 12, gap: 8, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, textAlign: 'center' },
  separator: { width: StyleSheet.hairlineWidth, height: 40 },
  feedback: { fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  rows: { marginTop: 12 },
  relatedAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 14 },
  relatedIcon: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  relatedCopy: { flex: 1, minWidth: 0, gap: 2 },
  relatedLabel: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  relatedDetail: { fontSize: 13, lineHeight: 20 },
  relatedContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 16 },
  edition: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 14 },
  range: { padding: 16, borderRadius: readerShape.card, gap: 12 },
});
