import { IconTile } from '@/components/ui';
import { editionForMushaf } from '../../riwayat';
import { readerElevation, readerShape } from '../../design';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { ArabicText as Text } from '@/components/arabic-text';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { relatedPlainText, type RelatedText } from '@/lib/quranpedia/related-content';
import { quranpedia } from '../../services/reader-service';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { ayahKey } from '../../utils/references';
import { ayahShareText, parallelAyahs } from '../../utils/ayah-actions';
import type { ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { listeningSupported } from '@/features/recite-check/listener';
import { ReaderIcon, type ReaderIconName, Segments } from '../ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { formatList, t } from '@/i18n';
import { useSurahFollows } from '@/features/recitation/use-listen';

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
  // Without the reciter's timings, a whole surah's recording can only start from its top.
  const follows = useSurahFollows(quran, wholeSurah && !!onListen);
  const fromTop = wholeSurah && follows === false;
  const { bookmarks, toggle, ready, error: bookmarkError } = useBookmarks();
  const [message, setMessage] = useState('');
  const [kind, setKind] = useState<'tafsir' | 'translation' | null>(null);
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
  const reciteFromHere = () => {
    onClose();
    router.push({ pathname: '/recite-check', params: { surah: ayah.surahNumber, ayah: ayah.ayahNumber } });
  };
  const swipe = useSwipeToClose(onClose);
  // Cover the system bars with the backdrop; SafeAreaView keeps controls inset.
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={onClose} onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <View style={styles.body}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('reader.actions.close')} onPress={onClose} />
      <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={onClose} onLayout={swipe.onSheetLayout}
        style={[styles.sheet, { backgroundColor: palette.background, borderColor: palette.border }, readerElevation(4, palette), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <View style={[styles.grabber, { backgroundColor: palette.border }]} />
        <View onLayout={swipe.onHeaderLayout} style={styles.heading}>
          <View style={styles.title}>
            <Text accessibilityRole="header" accessibilityLabel={t('reader.ayah.reference', { surah: surahName, ayah: ayah.ayahNumber })}
              style={[styles.surah, { color: palette.ornament }]}>
              {surahNameGlyph(ayah.surahNumber)}
            </Text>
            <Text style={[styles.reference, { color: palette.mutedForeground }]}>{location ?? t('reader.ayah.location', { ayah: ayah.ayahNumber, page: ayah.pageNumber })}</Text>
          </View>
          <Pressable ref={close} accessibilityRole="button" accessibilityLabel={t('reader.actions.close')} onPress={onClose}
            hitSlop={4} style={({ pressed }) => [styles.close, { backgroundColor: pressed ? palette.accent : 'transparent' }]}>
            <ReaderIcon name="close" color={palette.mutedForeground} size={18} />
          </Pressable>
        </View>
        <GestureDetector gesture={swipe.scrollGesture}><ScrollView {...swipe.scrollProps} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={[styles.quickActions, { backgroundColor: palette.card, borderColor: palette.border }, readerElevation(2, palette)]}>
            <QuickAction palette={palette} icon={bookmarked ? 'check' : 'bookmark'} disabled={!ready} selected={bookmarked}
              label={bookmarked ? t('reader.actions.bookmarked') : t('reader.actions.bookmark')} accessibilityLabel={bookmarked ? t('reader.actions.removeBookmark') : t('reader.actions.bookmark')} onPress={() => toggle(ayahKey(ayah))} />
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <QuickAction palette={palette} icon="copy" label={t('reader.actions.copy')} onPress={() => void copy()} />
            <View style={[styles.separator, { backgroundColor: palette.border }]} />
            <QuickAction palette={palette} icon="share" label={t('reader.actions.share')} onPress={share} />
          </View>
          {!!message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: palette.primary }]}>{message}</Text>}
          {bookmarkError && <Text accessibilityRole="alert" style={[styles.feedback, { color: palette.destructive }]}>{t('reader.actions.bookmarkStorageError')}</Text>}
          <View style={styles.relatedActions}>
            {onListen && <>
              <ListenAction palette={palette} icon="headphones" label={fromTop ? t('recitation.ayahSheet.wholeSurah') : t('recitation.ayahSheet.fromHere')}
                detail={!wholeSurah ? t('recitation.ayahSheet.fromHereDetail') : fromTop ? t('recitation.ayahSheet.wholeSurahDetail') : t('recitation.ayahSheet.fromHereSurahDetail')}
                onPress={() => onListen(ayah, false)} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
              <ListenAction palette={palette} icon="loop" label={t('recitation.ayahSheet.repeatAyah')}
                detail={repeat > 1 ? t('recitation.ayahSheet.repeatAyahDetail', { count: repeat }) : t('recitation.ayahSheet.repeatAyahEndless')} onPress={() => onListen(ayah, true)} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
            </>}
            {listeningSupported && <>
              <ListenAction palette={palette} icon="mic" label={`${t('listening.action')} · ${t('listening.beta')}`} detail={t('listening.actionDetail')} onPress={reciteFromHere} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
            </>}
            <RelatedAction palette={palette} icon="book" label={t('reader.actions.tafsir')} detail={t('reader.actions.tafsirDetail')} expanded={kind === 'tafsir'} onPress={() => setKind(kind === 'tafsir' ? null : 'tafsir')} />
            {kind === 'tafsir' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="tafsir" palette={palette} /></View>}
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
            <RelatedAction palette={palette} icon="translate" label={t('reader.actions.translation')} detail={t('reader.actions.translationDetail')} expanded={kind === 'translation'} onPress={() => setKind(kind === 'translation' ? null : 'translation')} />
            {kind === 'translation' && <View style={styles.relatedContent}><RelatedContent ayah={ayah} kind="translation" palette={palette} /></View>}
          </View>
          <Text style={[styles.edition, { color: palette.mutedForeground }]}>{t('common.riwayahOf', { riwayah: editionForMushaf(quran.id).label })}</Text>
        </ScrollView></GestureDetector>
      </AnimatedSafeAreaView></GestureDetector>
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

function QuickAction({ palette, icon, label, accessibilityLabel, onPress, selected = false, disabled = false }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; accessibilityLabel?: string;
  onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.quickAction, { backgroundColor: selected || pressed ? palette.accent : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
    <ReaderIcon name={icon} color={palette.foreground} size={20} />
    <Text style={[styles.actionLabel, { color: palette.foreground }]}>{label}</Text>
  </Pressable>;
}

function ListenAction({ palette, icon, label, detail, onPress }: { palette: ReaderPalette; icon: ReaderIconName; label: string; detail: string; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} onPress={onPress}
    style={({ pressed }) => [styles.relatedAction, { backgroundColor: pressed ? palette.accent : 'transparent' }]}>
    <IconTile name={icon} palette={palette} />
    <View style={styles.relatedCopy}>
      <Text style={[styles.relatedLabel, { color: palette.foreground }]}>{label}</Text>
      <Text style={[styles.relatedDetail, { color: palette.mutedForeground }]}>{detail}</Text>
    </View>
  </Pressable>;
}

function RelatedAction({ palette, icon, label, detail, expanded, onPress }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; detail: string; expanded: boolean; onPress: () => void;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded }} onPress={onPress}
    style={({ pressed }) => [styles.relatedAction, { backgroundColor: pressed || expanded ? palette.accent : 'transparent' }]}>
    <IconTile name={icon} palette={palette} />
    <View style={styles.relatedCopy}>
      <Text style={[styles.relatedLabel, { color: palette.foreground }]}>{label}</Text>
      <Text style={[styles.relatedDetail, { color: palette.mutedForeground }]}>{detail}</Text>
    </View>
    <View style={expanded ? { transform: [{ rotate: '-90deg' }] } : undefined}><ReaderIcon name="chevron" color={palette.mutedForeground} size={16} /></View>
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
  root: { flex: 1, backgroundColor: '#00000080' },
  body: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '85%', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet,
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: readerShape.pill, marginTop: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  title: { flex: 1, minWidth: 0, gap: 2 },
  surah: calligraphyStyle(38),
  reference: { fontSize: 13 },
  close: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 16 },
  quickActions: { flexDirection: 'row', alignItems: 'center', borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  quickAction: { flex: 1, minHeight: 82, paddingHorizontal: 4, paddingVertical: 12, gap: 7, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  separator: { width: StyleSheet.hairlineWidth, height: 32 },
  feedback: { fontSize: 12, marginTop: 10, textAlign: 'center' },
  relatedActions: { marginTop: 16 },
  relatedAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, paddingVertical: 10, paddingHorizontal: 8, borderRadius: readerShape.control },
  relatedIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  relatedCopy: { flex: 1, minWidth: 0 },
  relatedLabel: { fontSize: 15, fontWeight: '600' },
  relatedDetail: { fontSize: 13 },
  relatedContent: { paddingTop: 8, paddingBottom: 18 },
  edition: { fontSize: 12, textAlign: 'center', marginTop: 12 },
  range: { padding: 16, borderRadius: readerShape.card, gap: 12 },
});
