import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button } from '@/components/ui';
import { createPager } from '@/components/pager';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import type { PlanIndex } from '@/features/plans/engine';
import { dismissError, playFrom, stop, useRecitation } from '@/features/recitation/player';
import { resolveReciter } from '@/features/recitation/reciter-source';
import { formatList, formatNumber, t } from '@/i18n';
import type { AyahReference } from '@/lib/quranpedia/types';
import { GRADES, tally, wordCount, type Grade, type PracticePlace, type Reach } from './engine';
import { usePracticeContent } from './content';
import { passageSize, placeWords, PlaceText } from './place-text';
import { usePractice, type PracticeSession } from './provider';

/** Colour of each grade: in the progress marks, the grade buttons and the summary. */
export const gradeTone = (grade: Grade, p: ReaderPalette) => grade === 'good' ? p.success : grade === 'hesitant' ? p.warning : p.destructive;
const gradeIcon: Record<Grade, ReaderIconName> = { good: 'done', hesitant: 'alert', wrong: 'wrong' };

/** One place per page: the cue, revealed word by word or all at once, then graded. A summary closes the session. */
export function PracticeSessionScreen() {
  const { session } = usePractice();
  if (!session) return <NoSession />;
  return <Session key={session.id} session={session} />;
}

/** Opened without a session (the app was restarted, or a link): back to choosing one. */
function NoSession() {
  const { palette: p } = useReadingPreferences();
  useEffect(() => { router.replace('/practice'); }, []);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }} />;
}

/**
 * What to recite at a place, from the place itself: a short ayah may be shown whole, and a place
 * extends past the chosen reach when too few words would be left.
 */
function taskLabel(index: PlanIndex, place: PracticePlace, reach: Reach) {
  const whole = place.shown >= wordCount(index, place.ayah);
  const following = place.end - place.ayah - 1;
  const pageEnd = reach === 'page' && index.ayahs[place.end]?.pageNumber !== index.ayahs[place.end - 1].pageNumber;
  if (whole) return pageEnd ? t('practice.session.afterPage') : t('practice.session.after', { count: following });
  return pageEnd ? t('practice.session.completePage') : following ? t('practice.session.completeMore', { count: following }) : t('practice.session.completeAyah');
}

/** The place's reference: «سورة البقرة · الآية ٢٥٥». */
export const placeLabel = (index: PlanIndex, ayah: number) => t('practice.review.place', { surah: index.surahNames[index.ayahs[ayah].surahNumber], ayah: index.ayahs[ayah].ayahNumber });
/** Opens a place in the mushaf, in the riwayah it was practised in (the same numbers point elsewhere in another). */
export function useOpenInMushaf(riwayah: Riwayah) {
  const { update } = useReadingPreferences();
  return (index: PlanIndex, ayah: number) => {
    update({ riwayah });
    router.push({ pathname: '/', params: { surah: String(index.ayahs[ayah].surahNumber), ayah: String(index.ayahs[ayah].ayahNumber) } });
  };
}

function Session({ session }: { session: PracticeSession }) {
  const { index: loaded } = usePracticeContent(session.riwayah);
  // The edition changed since the places were chosen: they no longer point where they did.
  if (loaded && loaded.ayahs.length !== session.total) return <NoSession />;
  return <SessionPages session={session} />;
}

function SessionPages({ session }: { session: PracticeSession }) {
  const { palette: p, preferences } = useReadingPreferences();
  const { grade, begin } = usePractice();
  const { index, quran, error, retry } = usePracticeContent(session.riwayah);
  useQuranFont();
  const fontFamily = RIWAYAT[session.riwayah].fontFamily;
  const { places, grades } = session;
  const last = places.length;
  const [position, setPosition] = useState(0);
  const [revealed, setRevealed] = useState<number[]>(() => places.map(() => 0));
  const [hinted, setHinted] = useState<boolean[]>(() => places.map(() => false));
  const [helped, setHelped] = useState<boolean[]>(() => places.map(() => false));
  // The stretch this session asked the player for; the player is shared with the reader.
  const [listening, setListening] = useState<{ position: number; to: Pick<AyahReference, 'surahNumber' | 'ayahNumber'> } | null>(null);
  const recitation = useRecitation();
  const [translation] = useState(() => new Animated.Value(0));
  const [pager] = useState(() => createPager(translation));
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  Object.assign(pager.state, { index: position, last, width: width || 360, reduceMotion, onChange: setPosition });
  const words = useMemo(() => index ? places.map((place) => placeWords(index, place)) : [], [index, places]);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  useLayoutEffect(() => { translation.setValue(0); }, [position, translation]);
  // A pending move after grading belongs to the place it was given on.
  useEffect(() => () => { clearTimeout(advance.current); }, [position]);
  // Listening belongs to one place: moving on, or leaving the session, stops it.
  // Ours while the player still recites that stretch: a recitation started in the reader meanwhile is left alone.
  const owns = !!listening && !!quran && recitation.status !== 'idle' && recitation.mushafId === quran.id
    && recitation.end?.surahNumber === listening.to.surahNumber && recitation.end.ayahNumber === listening.to.ayahNumber;
  const owned = useRef(false);
  useEffect(() => { owned.current = owns; });
  useEffect(() => { if (owns && listening!.position !== position) stop(); }, [owns, listening, position]);
  useEffect(() => () => { if (owned.current) stop(); }, []);

  const place = places[position];
  const total = words[position]?.total ?? 0;
  const shown = revealed[position] ?? 0;
  const update = <T,>(list: T[], value: T) => list.map((x, i) => i === position ? value : x);
  const reveal = (unit: 'word' | 'ayah' | 'all') => {
    if (!place || !words[position]) return;
    let next = total;
    if (unit === 'word') next = shown + 1;
    else if (unit === 'ayah') {
      let n = 0;
      for (const a of words[position].ayahs) { n += a.words.length - a.cue; if (n > shown) { next = n; break; } }
    }
    setRevealed(update(revealed, Math.min(total, next)));
    if (unit !== 'all') setHelped(update(helped, true));
  };
  const choose = (value: Grade) => {
    const first = grades[position] === null;
    grade(position, value);
    clearTimeout(advance.current);
    if (first) advance.current = setTimeout(() => pager.go(position + 1), 450);
  };
  const listen = () => {
    if (!index || !quran || !place) return;
    if (owns && listening!.position === position && recitation.status !== 'paused') { stop(); setListening(null); return; }
    const from = place.shown >= words[position].ayahs[0].words.length ? place.ayah + 1 : place.ayah;
    setListening({ position, to: index.ayahs[place.end - 1] });
    void playFrom({ quran, reciter: () => resolveReciter(quran.riwayah.id, preferences.reciters[session.riwayah]), from: index.ayahs[from], to: index.ayahs[place.end - 1], repeat: 1 });
  };
  const close = () => router.canGoBack() ? router.back() : router.replace('/practice');
  const pages = [position - 1, position, position + 1].filter((i) => i >= 0 && i <= last);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <View style={s.navigation}>
        <Button variant="outline" icon="close" label={t('practice.session.close')} onPress={close} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ color: p.foreground, fontSize: 19, fontWeight: '600' }}>{t('practice.title')}</Text>
          <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.riwayah', { riwayah: RIWAYAT[session.riwayah].label })}</Text>
        </View>
      </View>
      <Segments grades={grades} current={position} palette={p} onSelect={setPosition} />
    </View>
    {error && <View style={s.notice}><Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert></View>}
    {!!listening && recitation.error && <View style={s.notice}><Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} onPress={dismissError}>{t('common.close')}</Button>}>{recitation.error}</Alert></View>}
    {!index ? <View style={s.loading}>{!error && <ActivityIndicator color={p.mutedForeground} />}</View> : <GestureDetector gesture={pager.pan}>
      <View style={s.pager} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {pages.map((page) => {
          const offset = page - position;
          return <Animated.View key={page} pointerEvents={offset ? 'none' : 'auto'} accessibilityElementsHidden={!!offset} importantForAccessibility={offset ? 'no-hide-descendants' : 'auto'}
            {...(Platform.OS === 'web' && offset ? { 'aria-hidden': true, inert: true } : {})}
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: Animated.add(translation, -offset * (width || 360)) }] }]}>
            {page < last
              ? <PlacePage index={index} place={places[page]} position={page} total={last} revealed={revealed[page]} complete={revealed[page] >= (words[page]?.total ?? 0)} helped={helped[page]}
                hinted={hinted[page]} grade={grades[page]} reach={session.options.reach} riwayah={session.riwayah} fontFamily={fontFamily} palette={p}
                playing={owns && listening!.position === page && recitation.status !== 'paused'} canListen={!!quran}
                onHint={() => setHinted(hinted.map((x, i) => i === page ? true : x))} onListen={listen}
                onPrevious={page > 0 ? () => pager.go(page - 1) : undefined} onNext={() => pager.go(page + 1)} />
              : <Summary index={index} session={session} palette={p} onPrevious={() => pager.go(last - 1)}
                onRetry={(again) => begin(session.riwayah, session.options, again, session.total, false)} onClose={close} />}
          </Animated.View>;
        })}
      </View>
    </GestureDetector>}
    {index && place ? <Controls revealed={shown} total={total} grade={grades[position]} helped={helped[position]} palette={p} onReveal={reveal} onGrade={choose} position={position} />
      : <View style={s.controlsSpacer} />}
  </SafeAreaView></GestureHandlerRootView>;
}

/** One mark per place, coloured by its grade; tapping one opens it. */
function Segments({ grades, current, palette: p, onSelect }: { grades: (Grade | null)[]; current: number; palette: ReaderPalette; onSelect: (index: number) => void }) {
  return <View style={s.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
    {grades.map((g, i) => <Pressable key={i} onPress={() => onSelect(i)} hitSlop={{ top: 10, bottom: 10 }} style={s.segmentHit}>
      <View style={[s.segment, { backgroundColor: g ? gradeTone(g, p) : p.muted }, i === current && { height: 6, backgroundColor: g ? gradeTone(g, p) : p.ornament }]} />
    </Pressable>)}
  </View>;
}

function PlacePage({ index, place, position, total, revealed, complete, helped, hinted, grade, reach, riwayah, fontFamily, palette: p, playing, canListen, onHint, onListen, onPrevious, onNext }: {
  index: PlanIndex; place: PracticePlace; position: number; total: number; revealed: number; complete: boolean; helped: boolean; hinted: boolean; grade: Grade | null;
  reach: Reach; riwayah: Riwayah; fontFamily: string; palette: ReaderPalette;
  playing: boolean; canListen: boolean; onHint: () => void; onListen: () => void; onPrevious?: () => void; onNext: () => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const showHint = hinted || place.surah || complete;
  const size = useMemo(() => passageSize(index, place), [index, place]);
  const label = placeLabel(index, place.ayah);
  const open = useOpenInMushaf(riwayah);
  return <View style={s.page}>
    <View style={[s.card, { backgroundColor: p.card, borderColor: grade ? withAlpha(gradeTone(grade, p), 0.45) : p.border }, readerElevation(2, p)]}>
      <View style={s.cardHead}>
        <PageArrow label={t('practice.session.previous')} reversed onPress={onPrevious} palette={p} />
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.session.position', { position: position + 1, total })}</Text>
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{taskLabel(index, place, reach)}</Text>
          {grade && <View style={s.gradeTag}><ReaderIcon name={gradeIcon[grade]} color={gradeTone(grade, p)} size={13} /><Text style={{ color: gradeTone(grade, p), fontSize: 12, fontWeight: '600' }}>{t(`practice.session.grades.${grade}`)}</Text></View>}
        </View>
        <PageArrow label={t('practice.session.next')} onPress={onNext} palette={p} />
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.textArea} showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Word by word, follow the reading; everything at once, go back to its start to check it.
          if (!revealed) return;
          if (complete && !helped) scroll.current?.scrollTo({ y: 0, animated: true }); else scroll.current?.scrollToEnd({ animated: true });
        }}>
        <PlaceText source={index} place={place} revealed={revealed} markers={showHint || revealed > 0} fontFamily={fontFamily} size={size} palette={p} />
      </ScrollView>
      <View style={s.cardFoot}>
        {showHint ? <View style={{ alignItems: 'center', gap: 2 }}>
          <View style={[s.reference, { backgroundColor: p.muted }]}><ReaderIcon name="book" color={p.mutedForeground} size={14} /><Text style={{ color: p.foreground, fontSize: 13, fontWeight: '500' }}>{label}</Text></View>
          {place.surah && !complete && <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('practice.session.named')}</Text>}
        </View> : <Button variant="ghost" size="sm" palette={p} icon="hint" label={t('practice.session.hintLabel')} onPress={onHint}>{t('practice.session.hint')}</Button>}
        {complete && <View style={s.footActions}>
          <Button variant="ghost" size="sm" palette={p} icon={playing ? 'pause' : 'headphones'} disabled={!canListen} label={playing ? t('practice.session.stopListening') : t('practice.session.listenLabel')} onPress={onListen}>{t('practice.session.listen')}</Button>
          <Button variant="ghost" size="sm" palette={p} icon="book" label={t('practice.session.openLabel', { place: label })} onPress={() => open(index, place.ayah)}>{t('practice.session.open')}</Button>
        </View>}
      </View>
    </View>
  </View>;
}

function PageArrow({ label, onPress, reversed = false, palette: p }: { label: string; onPress?: () => void; reversed?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!onPress} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [s.arrow, { opacity: onPress ? 1 : 0.25, backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <View style={reversed ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron" color={p.mutedForeground} size={18} /></View>
  </Pressable>;
}

/** Below the card: reveal while reciting, then grade once everything is shown. */
function Controls({ revealed, total, grade, helped, position, palette: p, onReveal, onGrade }: {
  revealed: number; total: number; grade: Grade | null; helped: boolean; position: number; palette: ReaderPalette;
  onReveal: (unit: 'word' | 'ayah' | 'all') => void; onGrade: (grade: Grade) => void;
}) {
  if (revealed < total) return <View style={s.controls}>
    <View style={s.controlRow}>
      <Button variant="outline" size="lg" palette={p} icon="word" label={t('practice.session.wordLabel')} onPress={() => onReveal('word')}>{t('practice.session.word')}</Button>
      <Button variant="outline" size="lg" palette={p} icon="lines" label={t('practice.session.ayahLabel')} onPress={() => onReveal('ayah')}>{t('practice.session.ayah')}</Button>
      <View style={{ flex: 1 }}><Button size="lg" palette={p} icon="eye" block label={t('practice.session.allLabel')} onPress={() => onReveal('all')}>{t('practice.session.all')}</Button></View>
    </View>
  </View>;
  return <View style={s.controls}>
    <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{t('practice.session.question')}</Text>
    <View style={s.controlRow} accessibilityRole="radiogroup" accessibilityLabel={t('practice.session.question')}>
      {GRADES.map((g) => {
        const selected = grade === g, tone = gradeTone(g, p);
        return <Pressable key={g} accessibilityRole="radio" accessibilityState={{ checked: selected }} aria-checked={selected}
          accessibilityLabel={t('practice.session.gradeLabel', { grade: t(`practice.session.grades.${g}`), position: position + 1 })} onPress={() => onGrade(g)}
          style={({ pressed }) => [s.grade, { borderColor: selected ? tone : p.input, backgroundColor: selected ? withAlpha(tone, 0.16) : pressed ? p.accent : p.background }, !selected && readerElevation(1, p)]}>
          <ReaderIcon name={gradeIcon[g]} color={tone} size={20} />
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: selected ? '600' : '500' }}>{t(`practice.session.grades.${g}`)}</Text>
        </Pressable>;
      })}
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center', minHeight: 18 }}>{helped && !grade ? t('practice.session.usedHints') : ''}</Text>
  </View>;
}

function Summary({ index, session, palette: p, onPrevious, onRetry, onClose }: {
  index: PlanIndex; session: PracticeSession; palette: ReaderPalette; onPrevious: () => void; onRetry: (places: PracticePlace[]) => void; onClose: () => void;
}) {
  const counts = tally(session.grades);
  const total = session.places.length;
  const missed = session.places.filter((_, i) => session.grades[i] === 'wrong' || session.grades[i] === 'hesitant');
  const ungraded = total - counts.graded;
  const open = useOpenInMushaf(session.riwayah);
  return <View style={s.page}>
    <ScrollView style={[s.card, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]} contentContainerStyle={s.summary} showsVerticalScrollIndicator={false}>
      <View style={[s.summaryIcon, { backgroundColor: counts.good === total ? p.primary : p.secondary }]}>
        <ReaderIcon name={counts.good === total ? 'check' : 'practice'} color={counts.good === total ? p.primaryForeground : p.primary} size={30} />
      </View>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 22, fontWeight: '600', textAlign: 'center' }}>{counts.good === total ? t('practice.summary.perfect') : t('practice.summary.done')}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 15, textAlign: 'center' }}>{t('practice.summary.score', { good: counts.good, total })}</Text>
      <View style={s.stats}>
        {GRADES.map((g) => <View key={g} style={[s.stat, { borderColor: p.border }]}>
          <Text style={{ color: gradeTone(g, p), fontSize: 24, fontWeight: '600' }}>{formatNumber(counts[g])}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`practice.session.grades.${g}`)}</Text>
        </View>)}
      </View>
      {!!ungraded && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('practice.summary.ungraded', { count: ungraded })}</Text>}
      {!!missed.length && <View style={{ alignSelf: 'stretch', gap: 8 }}>
        <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('practice.summary.review')}</Text>
        <View style={[s.list, { borderColor: p.border }]}>
          {missed.map((place, i) => {
            const g = session.grades[session.places.indexOf(place)]!;
            return <Pressable key={place.key} accessibilityRole="link" accessibilityLabel={formatList([placeLabel(index, place.ayah), t(`practice.session.grades.${g}`)])} accessibilityHint={t('practice.session.open')} onPress={() => open(index, place.ayah)}
              style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
              <ReaderIcon name={gradeIcon[g]} color={gradeTone(g, p)} size={18} />
              <Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{placeLabel(index, place.ayah)}</Text>
              <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
            </Pressable>;
          })}
        </View>
      </View>}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 4 }}>
        {!!missed.length && <Button palette={p} block icon="restore" onPress={() => onRetry(missed)}>{t('practice.summary.retry')}</Button>}
        <Button variant={missed.length ? 'outline' : 'default'} palette={p} block onPress={onClose}>{t('practice.summary.finish')}</Button>
        <Button variant="ghost" palette={p} block onPress={onPrevious}>{t('practice.session.previous')}</Button>
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  segments: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 10 },
  segmentHit: { flex: 1, height: 10, justifyContent: 'center' },
  segment: { height: 4, borderRadius: readerShape.pill },
  notice: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1, overflow: 'hidden', width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  card: { flex: 1, borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 10, gap: 8 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  cardFoot: { alignItems: 'center', gap: 6 },
  gradeTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footActions: { flexDirection: 'row', gap: 4, justifyContent: 'center' },
  reference: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: readerShape.pill },
  arrow: { width: 40, height: 40, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  textArea: { flexGrow: 1, justifyContent: 'center', paddingVertical: 12 },
  controls: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 8 },
  controlRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  controlsSpacer: { height: 120 },
  grade: { flex: 1, minHeight: 64, borderWidth: 1, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  summary: { alignItems: 'center', gap: 10, paddingVertical: 24, paddingHorizontal: 6 },
  summaryIcon: { width: 64, height: 64, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginVertical: 6 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8 },
});
