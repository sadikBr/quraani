import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, Vibration, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useKeepAwakeWhileShown } from '@/hooks/use-keep-awake-while-shown';
import Svg, { Circle, ClipPath, Defs, G, Path } from 'react-native-svg';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { createPager, useRecentre } from '@/components/pager';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button } from '@/components/ui';
import { khatam, Pattern } from '@/components/craft/art';
import { Medallion } from '@/components/craft/marks';
import { ArchPanel } from '@/components/craft/panels';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useReaderContent } from '@/features/quran-reader/hooks/use-reader-content';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import type { Quran } from '@/lib/quranpedia/types';
import { formatList, formatNumber, t } from '@/i18n';
import { collectionIcons, collections, isCollectionId, type CollectionId, type Dhikr } from './content';
import { collectionProgress, countsOn, nextUnfinished, TEXT_SCALES } from './progress';
import { useAdhkar } from './provider';
import { dismissClipError, stopClip, toggleClip, useClip } from './audio';
import { AdhkarIndexSheet } from './adhkar-index-sheet';
import { CentredBeads, collectionMotifs } from './adhkar-screen';
import { DhikrText } from './dhikr-text';
import { QuranDhikr } from './dhikr-quran';
import { quranReadings, readingLength, resolveReading } from './quran';
import { beadLayout } from './thread';

/** The mushaf in the chosen riwayah, and its font, for the Quran adhkar. */
interface Mushaf { quran: Quran; fontFamily: string; display: (text: string) => string }

const nativeDriver = Platform.OS !== 'web';
/** A short tick for each count and a firmer one when a dhikr is done (Android; iOS ignores lengths). */
const buzz = (done: boolean) => { if (Platform.OS === 'android') Vibration.vibrate(done ? 40 : 12); };
/** How high the window's arch rises over its panel. */
const RISE = 52;
/** The ring around the bead of the dhikr shown, and the height of the string of beads. */
const HALO = 22, BEADS_HEIGHT = 32;

/** Says the adhkar of one collection, one dhikr per page, with a counter. */
export function AdhkarSessionScreen() {
  useKeepAwakeWhileShown('adhkar');
  const { id } = useLocalSearchParams<{ id?: string }>();
  if (!isCollectionId(id)) return <MissingCollection />;
  return <Session key={id} id={id} />;
}

function MissingCollection() {
  const { palette: p } = useReadingPreferences();
  useEffect(() => { router.replace('/adhkar'); }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }} />;
}

/**
 * A collection being said: its name and the string of its adhkar at the top (a bead each, filled
 * once said), each dhikr in an arched window with its number in a star at the arch's crown, and
 * under it the counter, a ring of beads round a large button that fill as it is pressed.
 */
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
      <View style={s.bar}>
        <Button variant="outline" icon="back" palette={p} label={t('adhkar.session.back')} onPress={() => router.canGoBack() ? router.back() : router.replace('/adhkar')} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ color: p.foreground, fontSize: 21, lineHeight: 34, fontFamily: 'ReaderNaskhBold' }}>{title}</Text>
          <Text numberOfLines={1} style={{ color: progress.complete ? p.ornament : p.mutedForeground, fontSize: 12, lineHeight: 18 }}>
            {progress.complete ? t('adhkar.completed') : t('adhkar.progress', { done: progress.done, total: progress.total })}
          </Text>
        </View>
        <TextSizeButton open={sizing} palette={p} onPress={() => setSizing((open) => !open)} />
        <Button variant="outline" icon="index" palette={p} label={t('adhkar.session.index')} onPress={() => setIndexOpen(true)} />
      </View>
      {sizing && <TextSizeBar step={state.textSize} palette={p} onChange={setTextSize} />}
      <Thread items={items} counts={counts} current={index} palette={p} onSelect={jump}
        onPrevious={index > 0 ? () => pager.go(index - 1) : undefined} onNext={index < last ? () => pager.go(index + 1) : undefined} />
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
              ? <DhikrPage dhikr={items[page]} position={page + 1} total={items.length} said={counts[items[page].key] ?? 0} palette={p} scale={scale} mushaf={mushaf} />
              : <ClosingPage id={id} title={title} left={items.length - progress.done} total={items.length} palette={p}
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

/**
 * The collection as a string of beads, a bead a dhikr: said, partly said, still to say, and the
 * one shown, larger, in a ring of its own. The beads part to give it room, so the ring never
 * crowds its neighbours however long the string is. Tapping a bead opens its dhikr; the arrows
 * at either end turn to the previous and the next.
 *
 * The string is drawn whole, at the width it is given, with the beads where `beadLayout` puts
 * them; a tap finds its bead from where it fell.
 */
function Thread({ items, counts, current, palette: p, onSelect, onPrevious, onNext }: {
  items: Dhikr[]; counts: Record<string, number>; current: number; palette: ReaderPalette; onSelect: (index: number) => void; onPrevious?: () => void; onNext?: () => void;
}) {
  const [width, setWidth] = useState(0);
  const beads = beadLayout(items.length, current, width, HALO + 4);
  const select = (event: GestureResponderEvent) => {
    // Native touches give where they fell in the string; a click on the web, its offset.
    const native = event.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number };
    const x = Number.isFinite(native.locationX) ? native.locationX : native.offsetX;
    if (x !== undefined && Number.isFinite(x)) onSelect(beads.at(x));
  };
  const y = BEADS_HEIGHT / 2;
  return <View style={s.thread}>
    <PageArrow label={t('adhkar.session.previous')} reversed onPress={onPrevious} palette={p} />
    <Pressable onPress={select} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} hitSlop={{ top: 8, bottom: 8 }} focusable={false} style={s.beads}
      accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
      {width > 0 && <Svg width={width} height={BEADS_HEIGHT} pointerEvents="none" aria-hidden>
        <Path d={`M0 ${y}H${width}`} stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} />
        {items.map((d, i) => {
          const said = counts[d.key] ?? 0;
          const finished = said >= d.count;
          const fill = finished ? p.ornament : said ? withAlpha(p.ornament, 0.45) : p.background;
          const x = beads.x(i);
          return i === current
            ? <G key={d.key}>
              <Circle cx={x} cy={y} r={HALO / 2 - 0.5} fill={withAlpha(p.ornament, 0.1)} stroke={withAlpha(p.ornament, 0.45)} strokeWidth={0.8} />
              <Circle cx={x} cy={y} r={finished ? 6.5 : 5.75} fill={fill} stroke={p.ornament} strokeWidth={finished ? 0 : 1.5} />
            </G>
            : <Circle key={d.key} cx={x} cy={y} r={4} fill={fill} stroke={finished || said ? p.ornament : withAlpha(p.ornament, 0.6)} strokeWidth={1} />;
        })}
      </Svg>}
    </Pressable>
    <PageArrow label={t('adhkar.session.next')} onPress={onNext} palette={p} />
  </View>;
}

/** Short adhkar are set large; long Quran passages smaller, and they scroll. */
const fontSize = (text: string) => text.length < 40 ? 32 : text.length < 110 ? 27 : text.length < 260 ? 24 : text.length < 600 ? 22 : 20;
/** The same for Quran passages in the mushaf's font, which looks smaller at a given size. */
const quranFontSize = (length: number) => length < 110 ? 30 : length < 260 ? 27 : length < 600 ? 25 : 22;

/**
 * One dhikr in an arched window: its number in a star at the crown (filled once it is said), the
 * dhikr in Naskh (a Quran passage as in the mushaf), the surahs it asks to read, and the book's
 * note on it, quietly, at the foot.
 */
function DhikrPage({ dhikr, position, total, said, palette: p, scale, mushaf }: {
  dhikr: Dhikr; position: number; total: number; said: number; palette: ReaderPalette;
  /** The chosen text size, as a share of the usual one. */
  scale: number;
  mushaf: Mushaf | null;
}) {
  const done = said >= dhikr.count;
  const size = Math.round(fontSize(dhikr.text) * scale);
  const reading = quranReadings[dhikr.key];
  const passages = useMemo(() => reading && mushaf ? resolveReading(mushaf.quran, reading) : null, [reading, mushaf]);
  const where = t('adhkar.session.position', { position, total });
  return <View style={s.page}>
    <ArchPanel palette={p} rise={RISE} tone={done ? withAlpha(p.ornament, 0.85) : undefined} style={{ flex: 1 }} contentStyle={s.panel}>
      <View style={s.crown}>
        <Medallion value={position} size={46} palette={p} current={done} label={done ? formatList([where, t('adhkar.session.done')]) : where} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={s.textArea} showsVerticalScrollIndicator={false}>
        {reading && passages && mushaf
          ? <QuranDhikr reading={reading} passages={passages} quran={mushaf.quran} fontFamily={mushaf.fontFamily} display={mushaf.display} size={Math.round(quranFontSize(readingLength(passages)) * scale)} palette={p} />
          : <DhikrText text={dhikr.text} size={size} color={p.foreground} ornament={p.ornament} justified={{ hiddenColor: p.card }} />}
        {!!dhikr.surahs?.length && <View style={s.surahs}>{dhikr.surahs.map((surah) => <SurahButton key={surah} surah={surah} palette={p} />)}</View>}
        {!!dhikr.note && <View style={s.note}>
          <Svg width={12} height={12} aria-hidden><Path d={khatam(6, 6, 3.4)} fill={withAlpha(p.ornament, 0.15)} stroke={withAlpha(p.ornament, 0.8)} strokeWidth={1} /></Svg>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{dhikr.note}</Text>
        </View>}
      </ScrollView>
    </ArchPanel>
  </View>;
}

/**
 * The letter ʿayn of the Naskh font (Noto Naskh Arabic Bold), in font units with y downwards and
 * the baseline at 0: from x 83 to 613, and from y -475 (its head) to 301 (its tail).
 */
const AYN = 'M367 301Q289 301 232 273Q175 245 144 193Q113 141 113 71Q113 -37 188 -118Q156 -133 132 -158Q107 -182 95 -209Q83 -236 83 -261Q83 -291 94 -326Q106 -360 126 -392Q147 -423 172 -444Q209 -475 250 -475Q285 -475 323 -452Q361 -429 402 -382L381 -342Q351 -354 325 -360Q299 -365 276 -365Q241 -365 214 -358Q186 -350 154 -333Q157 -279 190 -243Q224 -207 281 -193Q325 -219 373 -240Q421 -262 475 -280Q486 -264 486 -229Q486 -208 478 -192Q469 -175 450 -162Q442 -156 424 -148Q406 -139 379 -128Q292 -94 249 -66Q206 -38 185 -5Q175 11 170 29Q164 47 164 65Q164 122 216 154Q269 186 369 186Q389 186 410 184Q431 183 453 180Q474 177 511 170Q548 162 600 150L613 192Q527 245 462 273Q398 301 367 301Z';
/** The two letters' scales (font units to points), and the space between them. */
const AYN_LARGE = 0.0205, AYN_SMALL = 0.0135, AYN_GAP = 2.5;
const AYN_ICON = { width: 530 * (AYN_LARGE + AYN_SMALL) + AYN_GAP, height: 776 * AYN_LARGE, baseline: 475 * AYN_LARGE };

/**
 * Opens the text size bar: a small and a large letter on one baseline. They are drawn, not set as
 * text, so they sit in the middle of the button on every platform: each font and each platform
 * puts a line's text at its own height in the line.
 */
function TextSizeButton({ open, palette: p, onPress }: { open: boolean; palette: ReaderPalette; onPress: () => void }) {
  const { width, height, baseline } = AYN_ICON;
  return <Pressable accessibilityRole="button" accessibilityLabel={t('adhkar.session.textSize')} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={onPress} hitSlop={4}
    style={({ pressed }) => [s.sizeButton, { borderColor: open ? p.ornament : p.input, backgroundColor: pressed ? p.accent : open ? withAlpha(p.ornament, 0.12) : p.background }, readerElevation(1, p)]}>
    {/* Read from the right: the small letter, then the large. */}
    <Svg width={width} height={height} aria-hidden>
      <Path d={AYN} fill={p.foreground} transform={`translate(${width - 613 * AYN_SMALL} ${baseline}) scale(${AYN_SMALL})`} />
      <Path d={AYN} fill={p.foreground} transform={`translate(${-83 * AYN_LARGE} ${baseline}) scale(${AYN_LARGE})`} />
    </Svg>
  </Pressable>;
}

/** Smaller and larger, with the steps between them as beads that grow; the window behind changes at once. */
function TextSizeBar({ step, palette: p, onChange }: { step: number; palette: ReaderPalette; onChange: (step: number) => void }) {
  const last = TEXT_SCALES.length - 1;
  return <View style={[s.sizeBar, { backgroundColor: withAlpha(p.ornament, 0.07), borderColor: withAlpha(p.ornament, 0.3) }]}>
    <Button size="sm" variant="outline" palette={p} icon="minus" label={t('adhkar.session.smaller')} disabled={step <= 0} onPress={() => onChange(step - 1)} />
    <View accessible accessibilityLabel={t('adhkar.session.textSizeValue', { step: step + 1, total: last + 1 })} style={s.sizeMiddle}>
      <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('adhkar.session.textSize')}</Text>
      <View style={s.sizeSteps}>
        <View style={[s.sizeString, { backgroundColor: withAlpha(p.ornament, 0.4) }]} />
        {TEXT_SCALES.map((_, i) => {
          const size = 6 + i * 2;
          return <View key={i} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: p.ornament, backgroundColor: i <= step ? p.ornament : p.background }} />;
        })}
      </View>
    </View>
    <Button size="sm" variant="outline" palette={p} icon="plus" label={t('adhkar.session.larger')} disabled={step >= last} onPress={() => onChange(step + 1)} />
  </View>;
}

function PageArrow({ label, onPress, reversed = false, palette: p }: { label: string; onPress?: () => void; reversed?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !onPress }} disabled={!onPress} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [s.arrow, { opacity: onPress ? 1 : 0.25, backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <View style={reversed ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron" color={p.mutedForeground} size={18} /></View>
  </Pressable>;
}

/**
 * The collection's pattern in a roundel, round a medallion holding a check once all is said (or
 * the collection's mark), for the closing page.
 */
function ClosingFigure({ id, complete, palette: p }: { id: CollectionId; complete: boolean; palette: ReaderPalette }) {
  const size = 156, c = size / 2;
  const clip = `roundel${useId().replace(/[^\w-]/g, '')}`;
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} aria-hidden>
      <Defs><ClipPath id={clip}><Circle cx={c} cy={c} r={c - 2} /></ClipPath></Defs>
      <G clipPath={`url(#${clip})`}>
        <Pattern motif={collectionMotifs[id]} w={size} h={size} rise={c} focus={c} color={withAlpha(p.ornament, 0.4)} />
      </G>
      <Circle cx={c} cy={c} r={c - 2} fill="none" stroke={withAlpha(p.ornament, 0.55)} strokeWidth={1} />
      <Circle cx={c} cy={c} r={34} fill={complete ? p.ornament : p.card} stroke={p.ornament} strokeWidth={1.25} />
      <Circle cx={c} cy={c} r={29} fill="none" stroke={complete ? withAlpha(p.card, 0.6) : withAlpha(p.ornament, 0.5)} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />
    </Svg>
    <ReaderIcon name={complete ? 'check' : collectionIcons[id]} color={complete ? p.card : p.ornament} size={28} />
  </View>;
}

function ClosingPage({ id, title, left, total, palette: p, onRemaining, onPrevious }: {
  id: CollectionId; title: string; left: number; total: number; palette: ReaderPalette; onRemaining: () => void; onPrevious: () => void;
}) {
  const complete = left === 0;
  return <View style={s.page}>
    <ArchPanel palette={p} rise={RISE} tone={complete ? withAlpha(p.ornament, 0.85) : undefined} style={{ flex: 1 }} contentStyle={[s.panel, s.closing]}>
      <ClosingFigure id={id} complete={complete} palette={p} />
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, lineHeight: 40, fontFamily: 'ReaderNaskhBold', textAlign: 'center', marginTop: 6 }}>
        {complete ? t('adhkar.session.finishedTitle') : t('adhkar.session.left', { count: left })}
      </Text>
      <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{complete ? t('adhkar.session.finishedDetail', { title }) : t('adhkar.session.leftDetail')}</Text>
      <View style={{ alignSelf: 'stretch', marginVertical: 8 }}><CentredBeads count={total} done={total - left} size={8} max={240} palette={p} /></View>
      <View style={{ alignSelf: 'stretch', gap: 8, maxWidth: 360, width: '100%' }}>
        {complete ? <Button palette={p} block onPress={() => router.canGoBack() ? router.back() : router.replace('/adhkar')}>{t('adhkar.session.back')}</Button>
          : <Button palette={p} block onPress={onRemaining}>{t('adhkar.session.goToRemaining')}</Button>}
        <Button variant="ghost" palette={p} block onPress={onPrevious}>{t('adhkar.session.previous')}</Button>
      </View>
    </ArchPanel>
  </View>;
}

/** Beads round the counter: one a time the dhikr is said, past this many they stand for equal shares. */
const RING_BEADS = 33;
const RING = 140;

/**
 * The counter's ring: a thread with a bead for each time the dhikr is said, filled as it is
 * counted (from the crown, leftwards, as the reading goes), round a face like a medallion, filled
 * in gold with a check once the dhikr is said, as its star is.
 */
function CounterRing({ count, said, done, pressed, palette: p }: { count: number; said: number; done: boolean; pressed: boolean; palette: ReaderPalette }) {
  const c = RING / 2, thread = c - 9, face = thread - 14;
  const beads = Math.min(count, RING_BEADS);
  const filled = count <= RING_BEADS ? Math.min(said, count) : Math.round((Math.min(said, count) / count) * beads);
  const spacing = (2 * Math.PI * thread) / beads;
  const r = Math.min(6.5, spacing * 0.36);
  return <Svg width={RING} height={RING} style={StyleSheet.absoluteFill} aria-hidden>
    <Circle cx={c} cy={c} r={thread} fill="none" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} />
    <Circle cx={c} cy={c} r={face} fill={done ? p.ornament : pressed ? p.accent : p.card} stroke={done ? p.ornament : withAlpha(p.ornament, 0.7)} strokeWidth={1.25} />
    {!done && <Circle cx={c} cy={c} r={face - 5} fill="none" stroke={withAlpha(p.ornament, 0.4)} strokeWidth={1} strokeDasharray="1 4" strokeLinecap="round" />}
    {Array.from({ length: beads }, (_, i) => {
      // From the crown, anticlockwise: leftwards across the top, as the reading goes.
      const a = -Math.PI / 2 - (i / beads) * 2 * Math.PI;
      const on = i < filled;
      return <Circle key={i} cx={c + thread * Math.cos(a)} cy={c + thread * Math.sin(a)} r={r}
        fill={on ? p.ornament : p.background} stroke={on ? p.ornament : withAlpha(p.ornament, 0.6)} strokeWidth={1.1} />;
    })}
  </Svg>;
}

/** The counter between listening and undoing: a large button in a ring of beads that fill as the dhikr is said. */
function Controls({ dhikr, said, palette: p, hint, playing, loading, onCount, onUndo }: {
  dhikr: Dhikr; said: number; palette: ReaderPalette; hint: boolean; playing: boolean; loading: boolean; onCount: () => void; onUndo: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(1));
  const done = said >= dhikr.count;
  const remaining = dhikr.count - said;
  const press = () => {
    if (done) return;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.94, duration: 60, useNativeDriver: nativeDriver }),
      Animated.spring(scale, { toValue: 1, speed: 30, bounciness: 8, useNativeDriver: nativeDriver }),
    ]).start();
    onCount();
  };
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
        onPress={press} onLongPress={onUndo} delayLongPress={500} style={s.counter}>
        {({ pressed }) => <Animated.View style={[s.ring, { transform: [{ scale }] }]}>
          <CounterRing count={dhikr.count} said={said} done={done} pressed={pressed} palette={p} />
          {done ? <ReaderIcon name="check" color={p.card} size={38} /> : <>
            <Text style={{ color: p.foreground, fontSize: remaining >= 100 ? 30 : 38, lineHeight: remaining >= 100 ? 46 : 56, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{formatNumber(remaining)}</Text>
            {dhikr.count > 1 && <Text style={{ color: p.mutedForeground, fontSize: 11, lineHeight: 14, marginTop: -6 }}>{t('adhkar.session.of', { count: dhikr.count })}</Text>}
          </>}
        </Animated.View>}
      </Pressable>
      <RoundButton icon="minus" label={t('adhkar.session.undo')} disabled={said === 0} onPress={onUndo} palette={p} />
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, textAlign: 'center', minHeight: 18 }}>{hint ? t('adhkar.session.hint') : t('adhkar.times', { count: dhikr.count })}</Text>
  </View>;
}

function RoundButton({ icon, label, onPress, palette: p, disabled = false, selected = false, loading = false }: {
  icon: ReaderIconName; label: string; onPress: () => void; palette: ReaderPalette; disabled?: boolean; selected?: boolean; loading?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected }} disabled={disabled} onPress={onPress} hitSlop={8}
    style={({ pressed }) => [s.round, { opacity: disabled ? 0.35 : 1, borderColor: selected ? p.ornament : p.input, backgroundColor: pressed ? p.accent : selected ? withAlpha(p.ornament, 0.12) : p.background }, !disabled && readerElevation(1, p)]}>
    {loading ? <ActivityIndicator size="small" color={p.ornament} /> : <ReaderIcon name={icon} color={selected ? p.ornament : p.foreground} size={20} />}
  </Pressable>;
}

function SurahButton({ surah, palette: p }: { surah: number; palette: ReaderPalette }) {
  const { content } = useReaderContent();
  const name = content?.data.quran.surahs.find((x) => x.number === surah)?.name;
  if (!name) return null;
  return <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.session.readSurah', { surah: name })} hitSlop={6}
    onPress={() => router.push({ pathname: '/', params: { surah: String(surah) } })}
    style={({ pressed }) => [s.surah, { backgroundColor: pressed ? withAlpha(p.ornament, 0.1) : 'transparent', borderColor: withAlpha(p.ornament, 0.6) }]}>
    <ReaderIcon name="book" color={p.ornament} size={14} />
    <Text style={{ color: p.foreground, fontSize: 13, fontWeight: '500' }}>{name}</Text>
  </Pressable>;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 6 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  sizeButton: { height: 40, minWidth: 40, paddingHorizontal: 6, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sizeBar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: readerShape.lg, borderWidth: StyleSheet.hairlineWidth },
  sizeMiddle: { flex: 1, alignItems: 'center', gap: 4 },
  sizeSteps: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 20 },
  sizeString: { position: 'absolute', left: 4, right: 4, top: 10, height: 1 },
  thread: { flexDirection: 'row', alignItems: 'center', gap: 2, marginHorizontal: -8 },
  beads: { flex: 1, height: BEADS_HEIGHT },
  notice: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10 },
  pager: { flex: 1, overflow: 'hidden', width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4 },
  panel: { flex: 1, paddingTop: 12, paddingHorizontal: 18, paddingBottom: 10, gap: 4 },
  crown: { alignItems: 'center' },
  arrow: { width: 40, height: 40, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  textArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: 10, gap: 16 },
  surahs: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  surah: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: readerShape.pill, borderWidth: 1 },
  note: { alignItems: 'center', gap: 6, paddingHorizontal: 8, marginTop: 4 },
  closing: { alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 24, paddingBottom: 24 },
  controls: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 4 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  controlsSpacer: { height: 170 },
  counter: { width: RING, height: RING },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  round: { width: 52, height: 52, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundSpacer: { width: 52, height: 52 },
});
