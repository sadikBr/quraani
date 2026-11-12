import { editionForMushaf } from '../../riwayat';
import { readerElevation, readerShape, withAlpha } from '../../design';
import { useCallback, useEffect, useRef, useState, type Ref } from 'react';
import { AccessibilityInfo, Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import { ArabicText as Text } from '@/components/arabic-text';
import { AnimatedSafeAreaView, GestureDetector, GestureHandlerRootView, useSwipeToClose } from '@/components/swipe-to-close';
import { Cartouche, Rule } from '@/components/craft/marks';
import { SheetGrabber } from '@/components/craft/page';
import type { Ayah, Quran } from '@/lib/quranpedia/types';
import { quranpedia } from '../../services/reader-service';
import { useBookmarks } from '../../state/bookmarks-provider';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { useQuranFont } from '../../hooks/use-quran-font';
import { ayahKey } from '../../utils/references';
import { ayahShareText } from '../../utils/ayah-actions';
import { SAJDA_SIGN, splitSajda } from '../../utils/sajda';
import type { ReaderPalette } from '../../theme';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { formatList, t } from '@/i18n';
import { useSurahFollows } from '@/features/recitation/use-listen';
import { Arcade } from './ayah/arcade';
import { ScienceView } from './ayah/science-view';
import { availableSciences, hafsNumbers, PROBED, SCIENCE_GROUPS, type Science } from './ayah/sciences';
import { InnerBack, Star, useRequest } from './ayah/shared';

/** The quoted ayah's size, and how many of its lines show before it fades. */
const QUOTE = 24, QUOTE_LINE = 48, QUOTE_LINES = 3;
const nativeDriver = Platform.OS !== 'web';

/**
 * What can be done with an ayah, opened by a long press on it. At the head, the ayah itself as
 * the mushaf writes it: its surah's name in calligraphy in the title's frame, where it is, and its
 * text in the Quran's face with its number (a long ayah fades after a few lines); under an ayah of
 * prostration, what is said in it. Then what is
 * done at once (listening, repeating, a bookmark, a copy, a share) side by side, and the ayah's
 * sciences as an arcade of three arches: each name a door that opens, in the sheet, what
 * Quranpedia holds of it (its tafsir, i'rab, qira'at, the ayahs like it, fatwas…), with the way
 * back to the arcade at its head.
 */
export function AyahActionSheet({ ayah, quran, palette, onClose, onListen, wholeSurah = false, location, onOpenAyah }: {
  ayah: Ayah; quran: Quran; palette: ReaderPalette; onClose: () => void;
  /** Where the ayah is, when not by its page ("الآية 5 · الحزب 2 · الثمن 1"). */
  location?: string;
  /** Listen from this ayah onward, or repeat this ayah alone (`single`). */
  onListen?: (ayah: Ayah, single: boolean) => void;
  /** Listening onward plays the surah's whole recording (repeating the ayah stays ayah by ayah). */
  wholeSurah?: boolean;
  /** Opens another ayah in the mushaf (an ayah like this one, an ayah of its topic). */
  onOpenAyah?: (ayah: Ayah) => void;
}) {
  const close = useRef<View>(null);
  const backButton = useRef<View>(null);
  const [science, setScience] = useState<Science | null>(null);
  // Whether the ayah is too long to quote whole; kept while a science is open, so the quote does
  // not unfold and fold again on the way back.
  const [long, setLong] = useState(false);
  const [shown] = useState(() => new Animated.Value(1));
  // A view's own step back (its list of books) answers before the sheet's.
  const innerBack = useRef<(() => void) | null>(null);
  const setInnerBack = useCallback((back: (() => void) | null) => { innerBack.current = back; }, []);
  const p = palette;
  const surahName = quran.surahs.find((s) => s.number === ayah.surahNumber)?.name ?? '';
  // Nasikh and mutashabih books are rare and not listed with the ayah: asked for once it opens.
  const probe = useRequest(`probe:${ayahKey(ayah)}`, async () => {
    const found = await Promise.all(PROBED.map(async (service) => {
      const answers = await Promise.allSettled(hafsNumbers(ayah).map((hafs) => quranpedia.getAyahBooks(ayah.surahNumber, hafs, service)));
      return answers.some((answer) => answer.status === 'fulfilled' && answer.value.data.length) ? [service] : [];
    }));
    return { data: found.flat() as Science[], stale: false };
  });
  const available = availableSciences(ayah, probe.data ?? []);
  const groups = SCIENCE_GROUPS.map((group) => ({ group, sciences: group.sciences.filter((entry) => available.has(entry)) }));

  const open = (next: Science | null) => { innerBack.current = null; setScience(next); };
  // The page that opens rises into place (not the first, which comes up with the sheet).
  const opened = useRef(false);
  const scroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (!opened.current) { opened.current = true; return; }
    // From its top (which also tells the swipe it may close the sheet from the content).
    scroll.current?.scrollTo({ y: 0, animated: false });
    shown.setValue(0);
    Animated.timing(shown, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }).start();
  }, [science, shown]);
  const back = () => { if (innerBack.current) innerBack.current(); else if (science) open(null); else onClose(); };
  // The focus follows the sheet's page: to the way back in a science, to the close button out of it.
  useEffect(() => {
    const target = science ? backButton.current : close.current;
    if (!target) return;
    if (Platform.OS === 'web') (target as unknown as { focus?: () => void }).focus?.();
    else AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
  }, [science]);
  const swipe = useSwipeToClose(onClose);
  const reference = t('reader.ayah.reference', { surah: surahName, ayah: ayah.ayahNumber });
  // Cover the system bars with the backdrop; SafeAreaView keeps controls inset.
  return <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="slide" onRequestClose={back} onShow={() => { if (Platform.OS === 'web') close.current?.focus(); else if (close.current) AccessibilityInfo.sendAccessibilityEvent(close.current, 'focus'); }}>
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.root, { backgroundColor: p.overlay }]}>
      <View style={styles.body}>
      <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel={t('reader.actions.close')} onPress={onClose} />
      <GestureDetector gesture={swipe.gesture}><AnimatedSafeAreaView edges={['bottom']} accessibilityViewIsModal onAccessibilityEscape={back} onLayout={swipe.onSheetLayout}
        style={[styles.sheet, science && styles.tall, { backgroundColor: p.background, borderColor: p.border }, readerElevation(4, p), swipe.sheetStyle]} {...(Platform.OS === 'web' ? { dir: 'rtl' } : {})}>
        <SheetGrabber palette={p} />
        {science
          ? <View onLayout={swipe.onHeaderLayout} style={styles.scienceHead}>
            <RoundButton ref={backButton} icon="back" label={t('reader.sciences.back')} palette={p} onPress={back} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text accessibilityRole="header" numberOfLines={1} style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold' }}>{t(`reader.sciences.names.${science}`)}</Text>
              <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{reference}</Text>
            </View>
            <RoundButton ref={close} icon="close" label={t('reader.actions.close')} palette={p} onPress={onClose} />
          </View>
          : <View onLayout={swipe.onHeaderLayout} style={styles.heading}>
            <View style={styles.side} />
            <View style={styles.title}>
              <Cartouche width={212} height={54} palette={p} filled>
                <SurahTitle surah={ayah.surahNumber} name={surahName} reference={reference} palette={p} />
              </Cartouche>
              <Text style={[styles.reference, { color: p.mutedForeground }]}>{location ?? t('reader.ayah.location', { ayah: ayah.ayahNumber, page: ayah.pageNumber })}</Text>
            </View>
            <View style={styles.side}>
              <RoundButton ref={close} icon="close" label={t('reader.actions.close')} palette={p} onPress={onClose} />
            </View>
          </View>}
        <GestureDetector gesture={swipe.scrollGesture}><ScrollView ref={scroll} {...swipe.scrollProps} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Animated.View style={{ opacity: shown, transform: [{ translateY: shown.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <InnerBack.Provider value={setInnerBack}>
              {science
                ? <View style={{ paddingTop: 8 }}>
                  <ScienceView science={science} ayah={ayah} quran={quran} palette={p} onOpenAyah={onOpenAyah} />
                  <Text style={[styles.edition, { color: p.mutedForeground, marginTop: 28 }]}>{t('reader.related.sources', { references: formatList(hafsNumbers(ayah).map((hafs) => `${ayah.surahNumber}:${hafs}`)) })}</Text>
                </View>
                : <Hub ayah={ayah} quran={quran} surahName={surahName} palette={p} onListen={onListen} wholeSurah={wholeSurah} groups={groups} onOpen={open} long={long} onLong={() => setLong(true)}
                  onShare={() => { onClose(); router.push({ pathname: '/share-ayah', params: { surah: ayah.surahNumber, ayah: ayah.ayahNumber } }); }} />}
            </InnerBack.Provider>
          </Animated.View>
        </ScrollView></GestureDetector>
      </AnimatedSafeAreaView></GestureDetector>
      </View>
    </SafeAreaView>
    </GestureHandlerRootView>
  </Modal>;
}

/** The surah's name in calligraphy in the title's frame (in Naskh until the font is there). */
function SurahTitle({ surah, name, reference, palette: p }: { surah: number; name: string; reference: string; palette: ReaderPalette }) {
  const font = useQuranFont();
  return font.loaded
    ? <Text accessibilityRole="header" accessibilityLabel={reference} style={[calligraphyStyle(34), { color: p.ornament, lineHeight: 46, textAlign: 'center' }]}>{surahNameGlyph(surah)}</Text>
    : <Text accessibilityRole="header" accessibilityLabel={reference} numberOfLines={1} style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{name}</Text>;
}

/** The sheet's first page: the ayah, what is done with it at once, and the arcade of its sciences. */
function Hub({ ayah, quran, surahName, palette: p, onListen, wholeSurah, groups, onOpen, onShare, long, onLong }: {
  ayah: Ayah; quran: Quran; surahName: string; palette: ReaderPalette; onListen?: (ayah: Ayah, single: boolean) => void; wholeSurah: boolean;
  groups: Parameters<typeof Arcade>[0]['groups']; onOpen: (science: Science) => void; onShare: () => void;
  /** The ayah is cut to its first lines; `onLong` once its whole text is found too tall. */
  long: boolean; onLong: () => void;
}) {
  const { preferences: { repeat } } = useReadingPreferences();
  const font = useQuranFont();
  // Without the reciter's timings, a whole surah's recording can only start from its top.
  const follows = useSurahFollows(quran, wholeSurah && !!onListen);
  const fromTop = wholeSurah && follows === false;
  const { bookmarks, toggle, ready, error: bookmarkError } = useBookmarks();
  const [message, setMessage] = useState('');
  const bookmarked = bookmarks.includes(ayahKey(ayah));
  const copy = async () => {
    try {
      const ok = await Clipboard.setStringAsync(ayahShareText(ayah, surahName)); setMessage(ok ? t('reader.actions.copied') : t('reader.actions.copyFailed'));
    } catch { setMessage(t('reader.actions.copyFailed')); }
  };
  const listenTitle = fromTop ? t('recitation.ayahSheet.wholeSurah') : t('recitation.ayahSheet.fromHere');
  const listenDetail = !wholeSurah ? t('recitation.ayahSheet.fromHereDetail') : fromTop ? t('recitation.ayahSheet.wholeSurahDetail') : t('recitation.ayahSheet.fromHereSurahDetail');
  const repeatDetail = repeat > 1 ? t('recitation.ayahSheet.repeatAyahDetail', { count: repeat }) : t('recitation.ayahSheet.repeatAyahEndless');
  const separator = <View style={[styles.separator, { backgroundColor: p.border }]} />;
  const sajda = splitSajda(ayah.text);
  return <View>
    {font.loaded && <View style={[styles.quote, long && { maxHeight: QUOTE_LINE * QUOTE_LINES }]}>
      {/* Measured whole only until it is cut: once its box is capped, Android measures the text to
          the cap, and deciding again from that would undo the cut, in a loop. */}
      <Text onLayout={(event) => { if (!long && event.nativeEvent.layout.height > QUOTE_LINE * QUOTE_LINES + 4) onLong(); }}
        style={{ fontFamily: font.fontFamily, fontSize: QUOTE, lineHeight: QUOTE_LINE, color: p.foreground, textAlign: 'center', writingDirection: 'rtl' }}>
        {font.display(sajda.text)}{!!sajda.sign && <NativeText style={{ color: p.ornament }}>{sajda.sign}</NativeText>}{' '}<NativeText style={{ color: p.ornament }}>{ayah.marker}</NativeText>
      </Text>
      {long && <Fade color={p.background} />}
    </View>}
    {!!sajda.sign && <View style={[styles.sajda, { backgroundColor: withAlpha(p.ornament, 0.08), borderColor: withAlpha(p.ornament, 0.4) }]}>
      <View style={styles.sajdaHead}>
        {font.loaded && <NativeText aria-hidden style={{ fontFamily: font.fontFamily, fontSize: 22, lineHeight: 34, color: p.ornament }}>{SAJDA_SIGN}</NativeText>}
        <Text accessibilityRole="header" style={{ flex: 1, color: p.foreground, fontSize: 17, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{t('reader.sajda.title')}</Text>
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('reader.sajda.lead')}</Text>
      <Text selectable style={{ color: p.foreground, fontSize: 18, lineHeight: 34, fontFamily: 'ReaderNaskh', textAlign: 'center' }}>{t('reader.sajda.dua')}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>{t('reader.sajda.source')}</Text>
    </View>}
    <Rule palette={p} style={styles.rule} />
    <View style={[styles.quickActions, { backgroundColor: p.card, borderColor: p.border }]}>
      {onListen && <><QuickAction palette={p} icon="headphones" label={t('reader.actions.listen')} accessibilityLabel={listenTitle} hint={listenDetail} onPress={() => onListen(ayah, false)} />{separator}</>}
      {onListen && <><QuickAction palette={p} icon="loop" label={t('reader.actions.repeat')} accessibilityLabel={t('recitation.ayahSheet.repeatAyah')} hint={repeatDetail} onPress={() => onListen(ayah, true)} />{separator}</>}
      <QuickAction palette={p} icon={bookmarked ? 'check' : 'bookmark'} disabled={!ready} selected={bookmarked}
        label={bookmarked ? t('reader.actions.bookmarked') : t('reader.actions.bookmark')} accessibilityLabel={bookmarked ? t('reader.actions.removeBookmark') : t('reader.actions.bookmark')} onPress={() => toggle(ayahKey(ayah))} />
      {separator}
      <QuickAction palette={p} icon="copy" label={t('reader.actions.copy')} onPress={() => void copy()} />
      {separator}
      <QuickAction palette={p} icon="share" label={t('reader.actions.share')} onPress={onShare} />
    </View>
    {!!message && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: p.primary }]}>{message}</Text>}
    {bookmarkError && <Text accessibilityRole="alert" style={[styles.feedback, { color: p.destructive }]}>{t('reader.actions.bookmarkStorageError')}</Text>}
    <View style={styles.arcadeHead}>
      <View style={[styles.line, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />
      <Star size={10} palette={p} />
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 17, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{t('reader.sciences.title')}</Text>
      <Star size={10} palette={p} />
      <View style={[styles.line, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />
    </View>
    <Arcade groups={groups} palette={p} onOpen={onOpen} />
    <Text style={[styles.edition, { color: p.mutedForeground }]}>{t('common.riwayahOf', { riwayah: editionForMushaf(quran.id).label })}</Text>
  </View>;
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

/** A square button of the sheet's head: the way back, or closing. */
function RoundButton({ ref, icon, label, palette: p, onPress }: { ref?: Ref<View>; icon: ReaderIconName; label: string; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [styles.close, { borderColor: p.border, backgroundColor: pressed ? p.accent : p.background }]}>
    <ReaderIcon name={icon} color={p.foreground} size={18} />
  </Pressable>;
}

/** One of the things done at once: its icon on a gold tile (filled when it is on), its name under it. */
function QuickAction({ palette: p, icon, label, accessibilityLabel, hint, onPress, selected = false, disabled = false }: {
  palette: ReaderPalette; icon: ReaderIconName; label: string; accessibilityLabel?: string; hint?: string;
  onPress: () => void; selected?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityHint={hint}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.quickAction, { backgroundColor: pressed ? p.accent : 'transparent', opacity: disabled ? 0.4 : 1 }]}>
    <View style={[styles.quickIcon, { backgroundColor: selected ? p.primary : withAlpha(p.ornament, 0.12) }]}>
      <ReaderIcon name={icon} color={selected ? p.primaryForeground : p.ornament} size={20} />
    </View>
    <Text numberOfLines={1} style={[styles.actionLabel, { color: selected ? p.primary : p.foreground, fontWeight: selected ? '600' : '500' }]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', maxHeight: '88%', borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0,
    borderTopLeftRadius: readerShape.sheet, borderTopRightRadius: readerShape.sheet,
    ...Platform.select({ native: { direction: 'rtl' as const } }) },
  tall: { height: '88%' },
  heading: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  scienceHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  side: { width: 40 },
  title: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4 },
  reference: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  close: { width: 40, height: 40, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  quote: { overflow: 'hidden', paddingHorizontal: 4 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: Math.round(QUOTE_LINE * 0.8) },
  sajda: { marginTop: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingHorizontal: 14, paddingVertical: 12, gap: 6 },
  sajdaHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rule: { marginVertical: 14, marginHorizontal: 24 },
  quickActions: { flexDirection: 'row', alignItems: 'center', borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  quickAction: { flex: 1, minHeight: 84, paddingHorizontal: 2, paddingVertical: 12, gap: 8, alignItems: 'center', justifyContent: 'center' },
  quickIcon: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, textAlign: 'center' },
  separator: { width: StyleSheet.hairlineWidth, height: 40 },
  feedback: { fontSize: 12, lineHeight: 18, marginTop: 10, textAlign: 'center' },
  arcadeHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 24, marginBottom: 14 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  edition: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 16 },
});
