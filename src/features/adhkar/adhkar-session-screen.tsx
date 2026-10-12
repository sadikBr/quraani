import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import Svg, { Circle } from 'react-native-svg';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { createPager, useRecentre } from '@/components/pager';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useReaderContent } from '@/features/quran-reader/hooks/use-reader-content';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import type { Quran } from '@/lib/quranpedia/types';
import { formatNumber, t } from '@/i18n';
import { collectionIcons, collections, isCollectionId, type CollectionId, type Dhikr } from './content';
import { collectionProgress, countsOn, nextUnfinished, TEXT_SCALES } from './progress';
import { useAdhkar } from './provider';
import { dismissClipError, stopClip, toggleClip, useClip } from './audio';
import { AdhkarIndexSheet } from './adhkar-index-sheet';
import { DhikrText } from './dhikr-text';
import { QuranDhikr } from './dhikr-quran';
import { quranReadings, readingLength, resolveReading } from './quran';

/** The mushaf in the chosen riwayah, and its font, for the Quran adhkar. */
interface Mushaf { quran: Quran; fontFamily: string; display: (text: string) => string }

const nativeDriver = Platform.OS !== 'web';
/** A short tick for each count and a firmer one when a dhikr is done (Android; iOS ignores lengths). */
const buzz = (done: boolean) => { if (Platform.OS === 'android') Vibration.vibrate(done ? 40 : 12); };

/** Says the adhkar of one collection, one dhikr per page, with a counter. */
export function AdhkarSessionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isCollectionId(id)) return <MissingCollection />;
  return <Session key={id} id={id} />;
}

function MissingCollection() {
  const { palette: p } = useReadingPreferences();
  useEffect(() => { router.replace('/adhkar'); }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }} />;
}

function Session({ id }: { id: CollectionId }) {
  const { palette: p } = useReadingPreferences();
  const { state, today, step, reset, setTextSize } = useAdhkar();
  const clip = useClip();
  // The Quran adhkar are read from the mushaf once it and its font are loaded; until then, as in the book.
  const { content } = useReaderContent();
  const font = useQuranFont();
  const quran = content?.data.quran;
  const mushaf = useMemo(() => quran && font.loaded ? { quran, fontFamily: font.fontFamily, display: font.display } : null, [quran, font.loaded, font.fontFamily, font.display]);
  const scale = TEXT_SCALES[state.textSize] ?? 1;
  const [sizing, setSizing] = useState(false);
  const items = collections[id];
  const counts = countsOn(state, id, today);
  const progress = collectionProgress(state, id, today);
  const title = t(`adhkar.collections.${id}.title`);
  // The pages are the adhkar, then a closing page.
  const last = items.length;
  const [index, setIndex] = useState(() => { const first = nextUnfinished(id, counts); return first < 0 ? last : first; });
  const [indexOpen, setIndexOpen] = useState(false);
  const [translation] = useState(() => new Animated.Value(0));
  const [pager] = useState(() => createPager(translation));
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  Object.assign(pager.state, { index, last, width: width || 360, reduceMotion, onChange: setIndex });
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  // The incoming page is centred before it paints; a recording of another dhikr stops.
  useRecentre(translation, index);
  useEffect(() => { clearTimeout(advance.current); stopClip(); }, [index]);
  useEffect(() => () => { clearTimeout(advance.current); stopClip(); }, []);

  const jump = (target: number) => { clearTimeout(advance.current); setIndex(target); };
  const count = () => {
    const dhikr = items[index];
    if (!dhikr) return;
    const said = (counts[dhikr.key] ?? 0) + 1;
    if (said > dhikr.count) return;
    step(id, dhikr.key, 1);
    const done = said === dhikr.count;
    buzz(done);
    if (!done) return;
    // Move on to the next dhikr still to say, or to the closing page.
    const after = items.findIndex((d, i) => i > index && (counts[d.key] ?? 0) < d.count);
    clearTimeout(advance.current);
    advance.current = setTimeout(() => pager.go(after < 0 ? last : after), 650);
  };
  const undo = () => {
    const dhikr = items[index];
    clearTimeout(advance.current);
    if (dhikr && (counts[dhikr.key] ?? 0) > 0) { step(id, dhikr.key, -1); buzz(false); }
  };
  const dhikr = items[index];
  const pages = [index - 1, index, index + 1].filter((i) => i >= 0 && i <= last);
  // The pager's gesture needs a gesture root; the app's stack screens have none of their own.
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <View style={s.navigation}>
        <Button variant="outline" icon="back" label={t('adhkar.session.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/adhkar')} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ color: p.foreground, fontSize: 19, fontWeight: '600' }}>{title}</Text>
          <Text style={{ color: progress.complete ? p.primary : p.mutedForeground, fontSize: 13 }}>
            {progress.complete ? t('adhkar.completed') : t('adhkar.progress', { done: progress.done, total: progress.total })}
          </Text>
        </View>
        <TextSizeButton open={sizing} palette={p} onPress={() => setSizing((open) => !open)} />
        <Button variant="outline" icon="index" label={t('adhkar.session.index')} onPress={() => setIndexOpen(true)} />
      </View>
      {sizing && <TextSizeBar step={state.textSize} palette={p} onChange={setTextSize} />}
      <Segments items={items} counts={counts} current={index} palette={p} onSelect={jump} />
    </View>
    {clip.error && <View style={s.notice}><Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} onPress={dismissClipError}>{t('common.close')}</Button>}>{t('adhkar.audio.error')}</Alert></View>}
    <GestureDetector gesture={pager.pan}>
      <View style={s.pager} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {pages.map((page) => {
          const offset = page - index;
          return <Animated.View key={page} pointerEvents={offset ? 'none' : 'auto'} accessibilityElementsHidden={!!offset} importantForAccessibility={offset ? 'no-hide-descendants' : 'auto'}
            {...(Platform.OS === 'web' && offset ? { 'aria-hidden': true, inert: true } : {})}
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: Animated.add(translation, -offset * (width || 360)) }] }]}>
            {page < last
              ? <DhikrPage dhikr={items[page]} position={page + 1} total={items.length} said={counts[items[page].key] ?? 0} palette={p} scale={scale} mushaf={mushaf}
                onPrevious={page > 0 ? () => pager.go(page - 1) : undefined} onNext={() => pager.go(page + 1)} />
              : <ClosingPage id={id} title={title} left={items.length - progress.done} palette={p}
                onRemaining={() => { const first = nextUnfinished(id, counts); if (first >= 0) jump(first); }} onPrevious={() => pager.go(last - 1)} />}
          </Animated.View>;
        })}
      </View>
    </GestureDetector>
    {dhikr ? <Controls dhikr={dhikr} said={counts[dhikr.key] ?? 0} palette={p} hint={!progress.started}
      playing={clip.id !== null && clip.id === dhikr.audio} loading={clip.loading && clip.id === dhikr.audio}
      onCount={count} onUndo={undo} /> : <View style={s.controlsSpacer} />}
    {indexOpen && <AdhkarIndexSheet title={title} items={items} counts={counts} current={index} palette={p} onClose={() => setIndexOpen(false)}
      onSelect={(target) => { setIndexOpen(false); jump(target); }}
      onRestart={() => { reset(id); setIndexOpen(false); jump(0); }} />}
  </SafeAreaView></GestureHandlerRootView>;
}

/** One mark per dhikr: said, partly said, still to say, and the one shown. Tapping one opens it. */
function Segments({ items, counts, current, palette: p, onSelect }: { items: Dhikr[]; counts: Record<string, number>; current: number; palette: ReaderPalette; onSelect: (index: number) => void }) {
  return <View style={s.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
    {items.map((d, i) => {
      const said = counts[d.key] ?? 0;
      const finished = said >= d.count;
      return <Pressable key={d.key} onPress={() => onSelect(i)} hitSlop={{ top: 10, bottom: 10 }} style={s.segmentHit}>
        <View style={[s.segment, { backgroundColor: finished ? p.primary : said ? withAlpha(p.primary, 0.45) : p.muted },
          i === current && { height: 6, backgroundColor: finished ? p.primary : p.ornament }]} />
      </Pressable>;
    })}
  </View>;
}

/** Short adhkar are set large; long Quran passages smaller, and they scroll. */
const fontSize = (text: string) => text.length < 40 ? 32 : text.length < 110 ? 27 : text.length < 260 ? 24 : text.length < 600 ? 22 : 20;
/** The same for Quran passages in the mushaf's font, which looks smaller at a given size. */
const quranFontSize = (length: number) => length < 110 ? 30 : length < 260 ? 27 : length < 600 ? 25 : 22;

function DhikrPage({ dhikr, position, total, said, palette: p, scale, mushaf, onPrevious, onNext }: {
  dhikr: Dhikr; position: number; total: number; said: number; palette: ReaderPalette;
  /** The chosen text size, as a share of the usual one. */
  scale: number;
  mushaf: Mushaf | null;
  onPrevious?: () => void; onNext: () => void;
}) {
  const done = said >= dhikr.count;
  const size = Math.round(fontSize(dhikr.text) * scale);
  const reading = quranReadings[dhikr.key];
  const passages = useMemo(() => reading && mushaf ? resolveReading(mushaf.quran, reading) : null, [reading, mushaf]);
  return <View style={s.page}>
    <View style={[s.card, { backgroundColor: p.card, borderColor: done ? withAlpha(p.primary, 0.35) : p.border }, readerElevation(2, p)]}>
      <View style={s.cardHead}>
        <PageArrow label={t('adhkar.session.previous')} reversed onPress={onPrevious} palette={p} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('adhkar.session.position', { position, total })}</Text>
          {done && <View style={s.doneTag}><ReaderIcon name="done" color={p.primary} size={13} /><Text style={{ color: p.primary, fontSize: 12, fontWeight: '600' }}>{t('adhkar.session.done')}</Text></View>}
        </View>
        <PageArrow label={t('adhkar.session.next')} onPress={onNext} palette={p} />
      </View>
      {!!dhikr.note && <View style={[s.note, { backgroundColor: p.muted }]}>
        <ReaderIcon name="info" color={p.mutedForeground} size={14} />
        <Text style={{ flex: 1, color: p.mutedForeground, fontSize: 13 }}>{dhikr.note}</Text>
      </View>}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.textArea} showsVerticalScrollIndicator={false}>
        {reading && passages && mushaf
          ? <QuranDhikr reading={reading} passages={passages} quran={mushaf.quran} fontFamily={mushaf.fontFamily} display={mushaf.display} size={Math.round(quranFontSize(readingLength(passages)) * scale)} palette={p} />
          : <DhikrText text={dhikr.text} size={size} color={p.foreground} ornament={p.ornament} justified={{ hiddenColor: p.card }} />}
        {!!dhikr.surahs?.length && <View style={s.surahs}>{dhikr.surahs.map((surah) => <SurahButton key={surah} surah={surah} palette={p} />)}</View>}
      </ScrollView>
    </View>
  </View>;
}

/** Opens the text size bar: a small and a large letter. */
function TextSizeButton({ open, palette: p, onPress }: { open: boolean; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.session.textSize')} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.sizeButton, { borderColor: open ? p.primary : p.input, backgroundColor: pressed ? p.accent : open ? p.secondary : p.background }, readerElevation(1, p)]}>
    <Text style={{ color: p.foreground, fontSize: 13, lineHeight: 20 }}>{t('adhkar.session.textSizeGlyph')}</Text>
    <Text style={{ color: p.foreground, fontSize: 19, lineHeight: 26, fontWeight: '600' }}>{t('adhkar.session.textSizeGlyph')}</Text>
  </Pressable>;
}

/** Smaller and larger, with the steps between them; the card behind changes at once. */
function TextSizeBar({ step, palette: p, onChange }: { step: number; palette: ReaderPalette; onChange: (step: number) => void }) {
  const last = TEXT_SCALES.length - 1;
  return <View style={[s.sizeBar, { backgroundColor: p.muted }]}>
    <Button size="sm" variant="outline" palette={p} icon="minus" label={t('adhkar.session.smaller')} disabled={step <= 0} onPress={() => onChange(step - 1)} />
    <View accessible accessibilityLabel={t('adhkar.session.textSizeValue', { step: step + 1, total: last + 1 })} style={s.sizeMiddle}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('adhkar.session.textSize')}</Text>
      <View style={s.sizeSteps}>
        {TEXT_SCALES.map((_, i) => <View key={i} style={[s.sizeStep, { height: 6 + i * 2, backgroundColor: i <= step ? p.primary : p.border }]} />)}
      </View>
    </View>
    <Button size="sm" variant="outline" palette={p} icon="plus" label={t('adhkar.session.larger')} disabled={step >= last} onPress={() => onChange(step + 1)} />
  </View>;
}

function PageArrow({ label, onPress, reversed = false, palette: p }: { label: string; onPress?: () => void; reversed?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!onPress} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [s.arrow, { opacity: onPress ? 1 : 0.25, backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <View style={reversed ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron" color={p.mutedForeground} size={18} /></View>
  </Pressable>;
}

function ClosingPage({ id, title, left, palette: p, onRemaining, onPrevious }: {
  id: CollectionId; title: string; left: number; palette: ReaderPalette; onRemaining: () => void; onPrevious: () => void;
}) {
  const complete = left === 0;
  return <View style={s.page}>
    <View style={[s.card, s.closing, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
      <View style={[s.closingIcon, { backgroundColor: complete ? p.primary : p.secondary }]}>
        <ReaderIcon name={complete ? 'check' : collectionIcons[id]} color={complete ? p.primaryForeground : p.primary} size={30} />
      </View>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>
        {complete ? t('adhkar.session.finishedTitle') : t('adhkar.session.left', { count: left })}
      </Text>
      <Text style={{ color: p.mutedForeground, fontSize: 15, textAlign: 'center' }}>{complete ? t('adhkar.session.finishedDetail', { title }) : t('adhkar.session.leftDetail')}</Text>
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 8 }}>
        {complete ? <Button palette={p} block onPress={() => router.canGoBack() ? router.back() : router.replace('/adhkar')}>{t('adhkar.session.back')}</Button>
          : <Button palette={p} block onPress={onRemaining}>{t('adhkar.session.goToRemaining')}</Button>}
        <Button variant="ghost" palette={p} block onPress={onPrevious}>{t('adhkar.session.previous')}</Button>
      </View>
    </View>
  </View>;
}

/** The counter ring between undo and listen: the ring fills as the dhikr is said. */
function Controls({ dhikr, said, palette: p, hint, playing, loading, onCount, onUndo }: {
  dhikr: Dhikr; said: number; palette: ReaderPalette; hint: boolean; playing: boolean; loading: boolean; onCount: () => void; onUndo: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const done = said >= dhikr.count;
  const remaining = dhikr.count - said;
  const press = () => {
    if (done) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.92, duration: 60, useNativeDriver: nativeDriver }),
      Animated.spring(scale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: nativeDriver }),
    ]).start();
    onCount();
  };
  const size = 112, stroke = 6, radius = (size - stroke) / 2, circumference = 2 * Math.PI * radius;
  const state = done ? t('adhkar.session.done') : t('adhkar.session.remaining', { remaining, count: dhikr.count });
  return <View style={s.controls}>
    <View style={s.controlRow}>
      {dhikr.audio !== undefined
        ? <RoundButton icon={playing ? 'pause' : 'headphones'} loading={loading} selected={playing} label={playing ? t('adhkar.audio.stop') : t('adhkar.audio.listen')}
          onPress={() => toggleClip(dhikr.audio!)} palette={p} />
        : <View style={s.roundSpacer} />}
      <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.session.countLabel', { state })} accessibilityHint={done ? undefined : t('adhkar.session.countHint')}
        accessibilityState={{ disabled: done }} accessibilityActions={[{ name: 'decrement', label: t('adhkar.session.undo') }]}
        onAccessibilityAction={(e) => { if (e.nativeEvent.actionName === 'decrement') onUndo(); }}
        onPress={press} onLongPress={onUndo} delayLongPress={500}>
        {({ pressed }) => <Animated.View style={[s.ring, { width: size, height: size, transform: [{ scale }] }]}>
          <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
            <Circle cx={size / 2} cy={size / 2} r={radius} stroke={withAlpha(p.primary, 0.14)} strokeWidth={stroke} fill={done ? p.primary : pressed ? p.accent : p.card} />
            {!done && said > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} stroke={p.primary} strokeWidth={stroke} fill="none" strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - said / dhikr.count)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />}
          </Svg>
          {done ? <ReaderIcon name="check" color={p.primaryForeground} size={40} /> : <>
            <Text style={{ color: p.foreground, fontSize: remaining >= 100 ? 30 : 36, fontWeight: '600', lineHeight: 44 }}>{formatNumber(remaining)}</Text>
            {dhikr.count > 1 && <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 16 }}>{t('adhkar.session.of', { count: dhikr.count })}</Text>}
          </>}
        </Animated.View>}
      </Pressable>
      <RoundButton icon="minus" label={t('adhkar.session.undo')} disabled={said === 0} onPress={onUndo} palette={p} />
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center', minHeight: 20 }}>{hint ? t('adhkar.session.hint') : t('adhkar.times', { count: dhikr.count })}</Text>
  </View>;
}

function RoundButton({ icon, label, onPress, palette: p, disabled = false, selected = false, loading = false }: {
  icon: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette; disabled?: boolean; selected?: boolean; loading?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} hitSlop={8}
    style={({ pressed }) => [s.round, { opacity: disabled ? 0.35 : 1, borderColor: selected ? p.primary : p.input, backgroundColor: pressed ? p.accent : selected ? p.secondary : p.background }, !disabled && readerElevation(1, p)]}>
    {loading ? <ActivityIndicator size="small" color={p.primary} /> : <ReaderIcon name={icon} color={selected ? p.primary : p.foreground} size={20} />}
  </Pressable>;
}

function SurahButton({ surah, palette: p }: { surah: number; palette: ReaderPalette }) {
  const { content } = useReaderContent();
  const name = content?.data.quran.surahs.find((x) => x.number === surah)?.name;
  if (!name) return null;
  return <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.session.readSurah', { surah: name })} hitSlop={6}
    onPress={() => router.push({ pathname: '/', params: { surah: String(surah) } })}
    style={({ pressed }) => [s.surah, { backgroundColor: pressed ? p.accent : 'transparent', borderColor: p.input }]}>
    <ReaderIcon name="book" color={p.foreground} size={14} />
    <Text style={{ color: p.foreground, fontSize: 13, fontWeight: '500' }}>{name}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sizeButton: { height: 40, minWidth: 40, paddingHorizontal: 6, borderRadius: readerShape.control, borderWidth: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 1 },
  sizeBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: readerShape.lg },
  sizeMiddle: { flex: 1, alignItems: 'center', gap: 4 },
  sizeSteps: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 18 },
  sizeStep: { width: 6, borderRadius: 3 },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 10 },
  segmentHit: { flex: 1, height: 10, justifyContent: 'center' },
  segment: { height: 4, borderRadius: readerShape.pill },
  notice: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10 },
  pager: { flex: 1, overflow: 'hidden', width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  card: { flex: 1, borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  arrow: { width: 40, height: 40, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  doneTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: readerShape.control },
  textArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: 10, gap: 16 },
  surahs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  surah: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: readerShape.pill, borderWidth: 1 },
  closing: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24 },
  closingIcon: { width: 64, height: 64, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  controls: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10, gap: 6 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  controlsSpacer: { height: 150 },
  ring: { alignItems: 'center', justifyContent: 'center' },
  round: { width: 52, height: 52, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundSpacer: { width: 52, height: 52 },
});
