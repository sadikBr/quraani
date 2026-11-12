import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useKeepAwakeWhileShown } from '@/hooks/use-keep-awake-while-shown';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button } from '@/components/ui';
import { createPager, useRecentre } from '@/components/pager';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { mixColor, readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import type { PlanIndex } from '@/features/plans/engine';
import { dismissError, playFrom, stop, useRecitation } from '@/features/recitation/player';
import { resolveReciter } from '@/features/recitation/reciter-source';
import { formatList, formatNumber, t } from '@/i18n';
import type { AyahReference, Quran } from '@/lib/quranpedia/types';
import { calligraphyStyle, readerTextLineHeight, surahNameGlyph } from '@/features/quran-reader/utils/reader-typography';
import Svg, { Path } from 'react-native-svg';
import { examScore, GRADES, reshuffled, tally, wordCount, type Grade, type PracticePlace, type Reach } from './engine';
import { usePracticeContent } from './content';
import { PlaceText, type PlaceFont } from './place-text';
import { placeWords } from './place-view';
import { usePractice, type PracticeSession } from './provider';
import { cartouchePath, Lawh, lawhColors, Lozenge } from '@/components/craft/lawh';
import { ArchPanel } from '@/components/craft/panels';
import { khatam } from '@/components/craft/art';

/** Colour of each grade: in the progress marks, the grade buttons and the summary. */
export const gradeTone = (grade: Grade, p: ReaderPalette) => grade === 'good' ? p.success : grade === 'hesitant' ? p.warning : p.destructive;
const gradeIcon: Record<Grade, ReaderIconName> = { good: 'done', hesitant: 'alert', wrong: 'wrong' };

/** One place per page: the cue, revealed word by word or all at once, then graded. A summary closes the session. */
export function PracticeSessionScreen() {
  useKeepAwakeWhileShown('practice');
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
function taskLabel(index: PlanIndex, place: PracticePlace, reach: Reach, helper = false) {
  if (place.kind === 'surah') return t('practice.session.surahQuestion');
  // Listening to someone else: the task itself, not an order to the reciter.
  const k = helper ? 'practice.helper' : 'practice.session';
  if (place.kind === 'previous') {
    const from = place.from!;
    const pageStart = reach === 'page' && (from === 0 || index.ayahs[from - 1].pageNumber !== index.ayahs[from].pageNumber);
    return pageStart ? t(`${k}.beforePage`) : t(`${k}.before`, { count: place.ayah - from });
  }
  const whole = place.shown >= wordCount(index, place.ayah);
  const following = place.end - place.ayah - 1;
  const pageEnd = reach === 'page' && index.ayahs[place.end]?.pageNumber !== index.ayahs[place.end - 1].pageNumber;
  if (whole) return pageEnd ? t(`${k}.afterPage`) : t(`${k}.after`, { count: following });
  return pageEnd ? t(`${k}.completePage`) : following ? t(`${k}.completeMore`, { count: following }) : t(`${k}.completeAyah`);
}

/** A grade's name: what the reciter did («أتقنت»), or, listening to someone else, what it was («إتقان»). */
export const gradeName = (grade: Grade, helper = false) => helper ? t(`practice.helper.grades.${grade}`) : t(`practice.session.grades.${grade}`);

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
  const { palette: p, preferences, dark } = useReadingPreferences();
  const { grade, answer, begin, finishExam } = usePractice();
  const { index, quran, error, retry } = usePracticeContent(session.riwayah);
  // The session's riwayah, drawn as the reader draws it: in the letters, size and spacing chosen
  // for reading, and in the tajweed colours when they are shown.
  const { fontFamily, fontMushafId, display, loaded: fontsLoaded } = useQuranFont(session.riwayah);
  const { fontSize, spacious } = preferences;
  const font = useMemo<PlaceFont>(() => ({ fontFamily, fontMushafId, display, fontSize, lineHeight: readerTextLineHeight(fontSize, spacious) }),
    [fontFamily, fontMushafId, display, fontSize, spacious]);
  const tajweed = preferences.tajweed ? { quran, dark } : undefined;
  const { places, grades, answers, exam, helper } = session;
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
  // The incoming page is centred before it paints, and its buttons answer at once.
  useRecentre(translation, position);
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
  // Listening to someone else, the whole place is shown at once, to follow the recitation.
  const seen = (i: number) => helper ? words[i]?.total ?? 0 : revealed[i] ?? 0;
  const shown = seen(position);
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
  // Where to go once a question is answered: the next; in an exam, the next one still unanswered
  // (after or before it), and the result once none is left.
  const following = () => {
    if (!exam) return position + 1;
    const open = (i: number) => i !== position && grades[i] === null;
    for (let i = position + 1; i < last; i++) if (open(i)) return i;
    for (let i = 0; i < position; i++) if (open(i)) return i;
    return last;
  };
  const choose = (value: Grade) => {
    const first = grades[position] === null;
    if (exam && session.recorded) return;
    grade(position, value);
    clearTimeout(advance.current);
    if (first) { const next = following(); advance.current = setTimeout(() => pager.go(next), 450); }
  };
  // A surah question: the choice is shown right or wrong a moment before moving on.
  const pick = (surah: number) => {
    if (answers[position] !== null) return;
    answer(position, surah);
    clearTimeout(advance.current);
    const next = following();
    advance.current = setTimeout(() => pager.go(next), 1400);
  };
  const listen = () => {
    if (!index || !quran || !place) return;
    if (owns && listening!.position === position && recitation.status !== 'paused') { stop(); setListening(null); return; }
    // What was recited: the rest of the cue's ayah and on; in «ما قبلها», up to and through the cue; the ayah asked about.
    const [from, to] = place.kind === 'previous' ? [place.from!, place.ayah] : place.kind === 'surah' ? [place.ayah, place.ayah]
      : [place.shown >= words[position].ayahs[0].words.length ? place.ayah + 1 : place.ayah, place.end - 1];
    setListening({ position, to: index.ayahs[to] });
    void playFrom({ quran, reciter: () => resolveReciter(quran.riwayah.id, preferences.reciters[session.riwayah]), from: index.ayahs[from], to: index.ayahs[to], repeat: 1 });
  };
  // An exam's result is saved once every question is answered, wherever that happens.
  const finished = grades.every((g) => g !== null);
  useEffect(() => { if (exam && finished && !session.recorded) finishExam(); }, [exam, finished, session.recorded, finishExam]);
  const close = () => router.canGoBack() ? router.back() : router.replace('/practice');
  const pages = [position - 1, position, position + 1].filter((i) => i >= 0 && i <= last);
  return <GestureHandlerRootView style={{ flex: 1 }}><SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.header}>
      <View style={s.navigation}>
        <Button variant="outline" icon="close" label={exam ? t('practice.exam.close') : t('practice.session.close')} onPress={close} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <Text accessibilityRole="header" numberOfLines={1} style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold', flexShrink: 1 }}>{exam ? t('practice.exam.title') : t('practice.title')}</Text>
            {helper && <View style={[s.helperBadge, { backgroundColor: withAlpha(p.ornament, 0.14) }]}>
              <ReaderIcon name="headphones" color={p.ornament} size={12} />
              <Text style={{ color: p.ornament, fontSize: 12, fontWeight: '600' }}>{t('practice.helper.badge')}</Text>
            </View>}
          </View>
          <Text numberOfLines={1} style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.riwayah', { riwayah: RIWAYAT[session.riwayah].label })}</Text>
        </View>
      </View>
      {exam ? <Marks grades={grades} current={position} palette={p} onSelect={setPosition} /> : <Segments grades={grades} current={position} palette={p} onSelect={setPosition} />}
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
              ? <PlacePage index={index} place={places[page]} position={page} total={last} revealed={seen(page)} complete={seen(page) >= (words[page]?.total ?? 0)} helped={helped[page]}
                hinted={hinted[page]} grade={grades[page]} answered={answers[page] !== null} exam={exam} helper={helper} reach={exam ? 'ayah' : session.options.reach} riwayah={session.riwayah} font={font} tajweed={tajweed} palette={p}
                playing={owns && listening!.position === page && recitation.status !== 'paused'} canListen={!!quran}
                onHint={() => setHinted(hinted.map((x, i) => i === page ? true : x))} onListen={listen}
                onPrevious={page > 0 ? () => pager.go(page - 1) : undefined} onNext={() => pager.go(page + 1)} />
              : exam ? <ExamSummary index={index} session={session} active={position === last} reduceMotion={reduceMotion} palette={p} onPrevious={() => pager.go(last - 1)}
                onUnanswered={() => pager.go(grades.findIndex((g) => g === null))}
                onRetry={(again) => begin(session.riwayah, { ...session.options, reach: 'ayah' }, reshuffled(again), session.total, { counted: false, helper })} onClose={close} />
                : <Summary index={index} session={session} palette={p} onPrevious={() => pager.go(last - 1)}
                  onRetry={(again) => begin(session.riwayah, session.options, reshuffled(again), session.total, { counted: false, helper })} onClose={close} />}
          </Animated.View>;
        })}
      </View>
    </GestureDetector>}
    {index && place ? place.kind === 'surah'
      ? <SurahChoices index={index} place={place} chosen={answers[position]} calligraphy={fontsLoaded} helper={helper} palette={p} onChoose={pick} />
      : <Controls revealed={shown} total={total} grade={grades[position]} helped={helped[position]} exam={exam} helper={helper} locked={exam && session.recorded} palette={p} onReveal={reveal} onGrade={choose} position={position} />
      : <View style={s.controlsSpacer} />}
  </SafeAreaView></GestureHandlerRootView>;
}

/**
 * The places as beads on a thread, as on a misbaha: each filled with its grade once given, the
 * current one larger and ringed in gold; tapping one opens it.
 */
function Segments({ grades, current, palette: p, onSelect }: { grades: (Grade | null)[]; current: number; palette: ReaderPalette; onSelect: (index: number) => void }) {
  return <View style={s.segments} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
    <View style={[s.thread, { backgroundColor: withAlpha(p.ornament, 0.35) }]} />
    {grades.map((g, i) => {
      const on = i === current, size = on ? 14 : 10;
      return <Pressable key={i} onPress={() => onSelect(i)} hitSlop={{ top: 10, bottom: 10 }} style={s.segmentHit}>
        <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: on ? 2 : 1.25,
          backgroundColor: g ? gradeTone(g, p) : on ? withAlpha(p.ornament, 0.25) : p.background,
          borderColor: on ? p.ornament : g ? gradeTone(g, p) : withAlpha(p.ornament, 0.55) }} />
      </Pressable>;
    })}
  </View>;
}

/** An exam's questions as lozenges, filled by how each went; the current one outlined in gold. */
function Marks({ grades, current, palette: p, onSelect }: { grades: (Grade | null)[]; current: number; palette: ReaderPalette; onSelect: (index: number) => void }) {
  return <View style={s.marks} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
    {grades.map((g, i) => <Pressable key={i} onPress={() => onSelect(i)} hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }} style={s.markHit}>
      <Lozenge size={i === current ? 14 : 11} fill={g ? gradeTone(g, p) : i === current ? withAlpha(p.ornament, 0.25) : p.muted} stroke={i === current ? p.ornament : g ? gradeTone(g, p) : p.input} />
    </Pressable>)}
  </View>;
}

function PlacePage({ index, place, position, total, revealed, complete, helped, hinted, grade, answered, exam, helper, reach, riwayah, font, tajweed, palette: p, playing, canListen, onHint, onListen, onPrevious, onNext }: {
  index: PlanIndex; place: PracticePlace; position: number; total: number; revealed: number; complete: boolean; helped: boolean; hinted: boolean; grade: Grade | null;
  answered: boolean; exam: boolean; helper: boolean; reach: Reach; riwayah: Riwayah; font: PlaceFont; tajweed?: { quran: Quran | undefined; dark: boolean }; palette: ReaderPalette;
  playing: boolean; canListen: boolean; onHint: () => void; onListen: () => void; onPrevious?: () => void; onNext: () => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const viewHeight = useRef(0);
  const asked = place.kind === 'surah';
  const previous = place.kind === 'previous';
  // The answer is checked: everything revealed, or the surah chosen.
  const checked = asked ? answered : complete;
  // The reference gives the surah away, and an exam gives no hints: it shows once checked (or when the cue needs it).
  const showHint = checked || (!asked && (place.surah || (!exam && hinted)));
  const label = placeLabel(index, place.ayah);
  const open = useOpenInMushaf(riwayah);
  const head = <View style={s.cardHead}>
    <PageArrow label={t('practice.session.previous')} reversed onPress={onPrevious} palette={p} />
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{exam ? t('practice.exam.position', { position: position + 1, total }) : t('practice.session.position', { position: position + 1, total })}</Text>
      <Text style={exam ? { color: p.foreground, fontSize: 19, fontFamily: 'ReaderNaskhSemibold', lineHeight: 34, textAlign: 'center' }
        : { color: p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{taskLabel(index, place, reach, helper)}</Text>
      {grade && !asked && <View style={s.gradeTag}><ReaderIcon name={gradeIcon[grade]} color={gradeTone(grade, p)} size={13} /><Text style={{ color: gradeTone(grade, p), fontSize: 12, fontWeight: '600' }}>{gradeName(grade, helper)}</Text></View>}
    </View>
    <PageArrow label={t('practice.session.next')} onPress={onNext} palette={p} />
  </View>;
  const body = <>
    {/* Not scrolled to the text when a tap gives its web view (tajweed) focus, on Android. */}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={s.textArea} showsVerticalScrollIndicator={false} scrollsChildToFocus={false}
      onLayout={(e) => { viewHeight.current = e.nativeEvent.layout.height; }}
      onContentSizeChange={() => {
        // Word by word, follow the reading; everything at once, go back to its start to check it.
        // In «ما قبلها» the reading grows above the cue: it is followed as it is laid out.
        if (!revealed) return;
        if (complete && !helped) scroll.current?.scrollTo({ y: 0, animated: true }); else if (!previous) scroll.current?.scrollToEnd({ animated: true });
      }}>
      <PlaceText source={index} place={place} revealed={revealed} markers={showHint || revealed > 0} font={font} tajweed={tajweed} palette={p} background={exam ? lawhColors(p).board : mixColor(p.card, p.ornament, 0.03)} ghost={exam} marked={helper}
        onRecited={previous ? (bottom) => {
          if (revealed && !(complete && !helped)) scroll.current?.scrollTo({ y: Math.max(0, bottom - viewHeight.current + 24), animated: true });
        } : undefined} />
    </ScrollView>
    <View style={s.cardFoot}>
      {showHint ? <View style={{ alignItems: 'center', gap: 2 }}>
        <View style={[s.reference, { backgroundColor: p.muted }]}><ReaderIcon name="book" color={p.mutedForeground} size={14} /><Text style={{ color: p.foreground, fontSize: 13, fontWeight: '500' }}>{label}</Text></View>
        {place.surah && !checked && <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('practice.session.named')}</Text>}
      </View> : !exam && !asked ? <Button variant="ghost" size="sm" palette={p} icon="hint" label={t('practice.session.hintLabel')} onPress={onHint}>{t('practice.session.hint')}</Button> : null}
      {checked && <View style={s.footActions}>
        <Button variant="ghost" size="sm" palette={p} icon={playing ? 'pause' : 'headphones'} disabled={!canListen} label={playing ? t('practice.session.stopListening') : t('practice.session.listenLabel')} onPress={onListen}>{t('practice.session.listen')}</Button>
        <Button variant="ghost" size="sm" palette={p} icon="book" label={t('practice.session.openLabel', { place: label })} onPress={() => open(index, place.ayah)}>{t('practice.session.open')}</Button>
      </View>}
    </View>
  </>;
  if (exam) return <View style={s.page}>
    <Lawh palette={p} tone={grade ? gradeTone(grade, p) : undefined} style={{ flex: 1 }} contentStyle={{ flex: 1, paddingHorizontal: 12, paddingBottom: 10, gap: 4 }}>
      {head}{body}
    </Lawh>
  </View>;
  return <View style={s.page}>
    <ArchPanel palette={p} sky={null} rise={40} tone={grade ? gradeTone(grade, p) : undefined} style={{ flex: 1 }} contentStyle={{ flex: 1, paddingHorizontal: 12, paddingBottom: 10, paddingTop: 34, gap: 4 }}>
      {head}{body}
    </ArchPanel>
  </View>;
}

/**
 * The surah question's choices, below the ayah: each surah's name in the mushaf's calligraphy, in
 * the frame of a surah title. Once one is chosen, the right one is marked, and a wrong choice too.
 */
function SurahChoices({ index, place, chosen, calligraphy, helper, palette: p, onChoose }: {
  index: PlanIndex; place: PracticePlace; chosen: number | null; calligraphy: boolean; helper: boolean; palette: ReaderPalette; onChoose: (surah: number) => void;
}) {
  const own = index.ayahs[place.ayah].surahNumber;
  const choices = place.choices ?? [own];
  const answered = chosen !== null;
  return <View style={s.controls}>
    <View style={s.choices} accessibilityRole="radiogroup" accessibilityLabel={t('practice.session.surahQuestion')}>
      {choices.map((surah, i) => {
        const right = answered && surah === own, wrong = answered && surah === chosen && surah !== own;
        return <Cartouche key={surah} surah={surah} name={index.surahNames[surah]} calligraphy={calligraphy} palette={p}
          state={right ? 'right' : wrong ? 'wrong' : answered ? 'idle' : 'open'} label={t('practice.session.choiceLabel', { surah: index.surahNames[surah], position: i + 1, total: choices.length })}
          onPress={() => onChoose(surah)} />;
      })}
    </View>
    <Text accessibilityLiveRegion="polite" style={{ color: answered ? (chosen === own ? p.success : p.destructive) : p.mutedForeground, fontSize: 14, fontWeight: '600', textAlign: 'center', minHeight: 22 }}>
      {answered ? chosen === own ? helper ? t('practice.helper.right') : t('practice.session.right') : t('practice.session.wrongAnswer', { surah: index.surahNames[own] }) : ''}
    </Text>
  </View>;
}

function Cartouche({ surah, name, calligraphy, state, label, palette: p, onPress }: {
  surah: number; name: string; calligraphy: boolean; state: 'open' | 'right' | 'wrong' | 'idle'; label: string; palette: ReaderPalette; onPress: () => void;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const tone = state === 'right' ? p.success : state === 'wrong' ? p.destructive : null;
  const colors = lawhColors(p);
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: state === 'right' || state === 'wrong', disabled: state !== 'open' }} aria-checked={state === 'right' || state === 'wrong'}
    accessibilityLabel={label} disabled={state !== 'open'} onPress={onPress} onLayout={(e) => setSize(e.nativeEvent.layout)}
    style={({ pressed }) => [s.cartouche, { opacity: state === 'idle' ? 0.45 : pressed ? 0.75 : 1 }]}>
    {size.width > 0 && <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} aria-hidden>
      <Path d={cartouchePath(size.width - 2, size.height - 2)} transform="translate(1 1)" fill={tone ? withAlpha(tone, 0.14) : colors.board} stroke={tone ?? colors.edge} strokeWidth={tone ? 2 : 1.25} />
    </Svg>}
    {calligraphy ? <Text style={[calligraphyStyle(30), { color: tone ?? p.foreground, textAlign: 'center' }]}>{surahNameGlyph(surah)}</Text>
      : <Text style={{ color: tone ?? p.foreground, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{name}</Text>}
    {tone && <View style={[s.verdict, { backgroundColor: tone }]}><ReaderIcon name={state === 'right' ? 'check' : 'close'} color={p.card} size={12} /></View>}
  </Pressable>;
}

function PageArrow({ label, onPress, reversed = false, palette: p }: { label: string; onPress?: () => void; reversed?: boolean; palette: ReaderPalette }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={!onPress} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [s.arrow, { opacity: onPress ? 1 : 0.25, backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <View style={reversed ? { transform: [{ rotate: '180deg' }] } : undefined}><ReaderIcon name="chevron" color={p.mutedForeground} size={18} /></View>
  </Pressable>;
}

/** Below the card: reveal while reciting, then grade once everything is shown. */
function Controls({ revealed, total, grade, helped, exam, helper, locked, position, palette: p, onReveal, onGrade }: {
  revealed: number; total: number; grade: Grade | null; helped: boolean; exam: boolean; helper: boolean; locked: boolean; position: number; palette: ReaderPalette;
  onReveal: (unit: 'word' | 'ayah' | 'all') => void; onGrade: (grade: Grade) => void;
}) {
  // An exam gives no word-by-word help: recite, then see the answer whole.
  if (revealed < total && exam) return <View style={s.controls}>
    <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('practice.exam.instruction')}</Text>
    <Button size="lg" palette={p} icon="eye" block onPress={() => onReveal('all')}>{t('practice.exam.show')}</Button>
  </View>;
  if (revealed < total) return <View style={s.controls}>
    <View style={s.controlRow}>
      <Button variant="outline" size="lg" palette={p} icon="word" label={t('practice.session.wordLabel')} onPress={() => onReveal('word')}>{t('practice.session.word')}</Button>
      <Button variant="outline" size="lg" palette={p} icon="lines" label={t('practice.session.ayahLabel')} onPress={() => onReveal('ayah')}>{t('practice.session.ayah')}</Button>
      <View style={{ flex: 1 }}><Button size="lg" palette={p} icon="eye" block label={t('practice.session.allLabel')} onPress={() => onReveal('all')}>{t('practice.session.all')}</Button></View>
    </View>
  </View>;
  return <View style={s.controls}>
    <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{helper ? t('practice.helper.question') : t('practice.session.question')}</Text>
    <View style={s.controlRow} accessibilityRole="radiogroup" accessibilityLabel={helper ? t('practice.helper.question') : t('practice.session.question')}>
      {GRADES.map((g) => {
        const selected = grade === g, tone = gradeTone(g, p);
        return <Pressable key={g} accessibilityRole="radio" accessibilityState={{ checked: selected, disabled: locked }} aria-checked={selected} disabled={locked}
          accessibilityLabel={t('practice.session.gradeLabel', { grade: gradeName(g, helper), position: position + 1 })} onPress={() => onGrade(g)}
          style={({ pressed }) => [s.grade, { borderColor: selected ? tone : p.input, backgroundColor: selected ? withAlpha(tone, 0.16) : pressed ? p.accent : p.background,
            opacity: locked && !selected ? 0.45 : 1 }, !selected && !locked && readerElevation(1, p)]}>
          <ReaderIcon name={gradeIcon[g]} color={tone} size={20} />
          <Text style={{ color: p.foreground, fontSize: 14, fontWeight: selected ? '600' : '500' }}>{gradeName(g, helper)}</Text>
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
  const helper = session.helper;
  const perfect = counts.good === total;
  return <View style={s.page}>
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
    <ArchPanel palette={p} contentStyle={s.summary}>
      <View style={s.summaryIcon}>
        <Svg width={72} height={72} style={StyleSheet.absoluteFill} aria-hidden>
          <Path d={khatam(36, 36, 22)} fill={perfect ? p.ornament : withAlpha(p.ornament, 0.12)} stroke={p.ornament} strokeWidth={1.25} strokeLinejoin="round" />
        </Svg>
        <ReaderIcon name={perfect ? 'check' : 'practice'} color={perfect ? p.card : p.ornament} size={28} />
      </View>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, lineHeight: 40, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>
        {counts.good === total ? helper ? t('practice.helper.perfect') : t('practice.summary.perfect') : helper ? t('practice.helper.done') : t('practice.summary.done')}
      </Text>
      <Text style={{ color: p.mutedForeground, fontSize: 15, textAlign: 'center' }}>
        {t(session.places.every((place) => place.kind === 'surah') ? helper ? 'practice.helper.rightScore' : 'practice.summary.rightScore'
          : helper ? 'practice.helper.score' : 'practice.summary.score', { good: counts.good, total })}
      </Text>
      <View style={s.stats}>
        {GRADES.map((g) => <View key={g} style={[s.stat, { borderColor: p.border }]}>
          <Text style={{ color: gradeTone(g, p), fontSize: 26, lineHeight: 42, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(counts[g])}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{gradeName(g, helper)}</Text>
        </View>)}
      </View>
      {!!ungraded && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('practice.summary.ungraded', { count: ungraded })}</Text>}
    </ArchPanel>
    {/* The places to revise and the buttons below the window, so that its drawing stays the size of its head. */}
    <View style={{ gap: 16, paddingTop: 16 }}>
      {!!missed.length && <View style={{ alignSelf: 'stretch', gap: 8 }}>
        <Text style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{helper ? t('practice.helper.review') : t('practice.summary.review')}</Text>
        {helper && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.helper.notRecorded')}</Text>}
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }]}>
          {missed.map((place, i) => {
            const g = session.grades[session.places.indexOf(place)]!;
            return <Pressable key={place.key} accessibilityRole="link" accessibilityLabel={formatList([placeLabel(index, place.ayah), gradeName(g, helper)])} accessibilityHint={t('practice.session.open')} onPress={() => open(index, place.ayah)}
              style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
              <ReaderIcon name={gradeIcon[g]} color={gradeTone(g, p)} size={18} />
              <Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{placeLabel(index, place.ayah)}</Text>
              <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
            </Pressable>;
          })}
        </View>
      </View>}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 4 }}>
        {!!missed.length && <Button palette={p} block icon="restore" onPress={() => onRetry(missed)}>{helper ? t('practice.helper.retry') : t('practice.summary.retry')}</Button>}
        <Button variant={missed.length ? 'outline' : 'default'} palette={p} block onPress={onClose}>{t('practice.summary.finish')}</Button>
        <Button variant="ghost" palette={p} block onPress={onPrevious}>{t('practice.session.previous')}</Button>
      </View>
    </View>
    </ScrollView>
  </View>;
}

/**
 * The end of an exam: the score written on the lawh, as a teacher marks a recitation, with the
 * grade it earns and a lozenge per question; then the places to revise. Questions left
 * unanswered come first.
 */
function ExamSummary({ index, session, active, reduceMotion, palette: p, onPrevious, onUnanswered, onRetry, onClose }: {
  index: PlanIndex; session: PracticeSession; active: boolean; reduceMotion: boolean; palette: ReaderPalette;
  onPrevious: () => void; onUnanswered: () => void; onRetry: (places: PracticePlace[]) => void; onClose: () => void;
}) {
  const counts = tally(session.grades);
  const total = session.places.length;
  const unanswered = total - counts.graded;
  const { points, grade } = examScore(counts, total);
  const missed = session.places.filter((_, i) => session.grades[i] === 'wrong' || session.grades[i] === 'hesitant');
  const open = useOpenInMushaf(session.riwayah);
  const helper = session.helper;
  const tone = grade === 'review' ? p.destructive : p.ornament;
  // The one moment of the exam: the score is written on the board when its page is reached.
  const [written] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!active || unanswered) return;
    Animated.timing(written, { toValue: 1, duration: reduceMotion ? 0 : 650, delay: reduceMotion ? 0 : 150, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [active, unanswered, reduceMotion, written]);
  const gradeWord = t(`practice.exam.grades.${grade}`);
  return <View style={s.page}>
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
      <Lawh palette={p} contentStyle={{ alignItems: 'center', gap: 4, paddingBottom: 24 }}>
        {unanswered ? <View style={{ alignItems: 'center', gap: 12, paddingVertical: 24 }}>
          <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{t('practice.exam.unanswered', { count: unanswered })}</Text>
          <Button palette={p} icon="chevron" onPress={onUnanswered}>{t('practice.exam.toUnanswered')}</Button>
        </View> : <>
          <Text style={{ color: p.mutedForeground, fontSize: 18, fontFamily: 'ReaderNaskhSemibold', lineHeight: 32 }}>{helper ? t('practice.helper.result') : t('practice.exam.result')}</Text>
          <Animated.View accessible accessibilityRole="header" accessibilityLabel={t('practice.exam.scoreLabel', { points, total, grade: gradeWord })}
            style={{ alignItems: 'center', opacity: written, transform: [{ translateY: written.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
            <Text style={{ color: p.foreground, fontSize: 72, fontFamily: 'ReaderNaskhBold', lineHeight: 110 }}>{formatNumber(points)}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{t('practice.exam.outOf', { total })}</Text>
            <View style={s.gradeLine}>
              <Lozenge size={9} fill={tone} />
              <Text style={{ color: tone, fontSize: 30, fontFamily: 'ReaderNaskhBold', lineHeight: 56 }}>{gradeWord}</Text>
              <Lozenge size={9} fill={tone} />
            </View>
          </Animated.View>
          <View style={s.resultMarks} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" {...(Platform.OS === 'web' ? { 'aria-hidden': true } : {})}>
            {session.grades.map((g, i) => <Lozenge key={i} size={12} fill={g ? gradeTone(g, p) : p.muted} />)}
          </View>
          <View style={s.stats}>
            {GRADES.map((g) => <View key={g} style={s.examStat}>
              <Text style={{ color: gradeTone(g, p), fontSize: 20, fontWeight: '600' }}>{formatNumber(counts[g])}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{gradeName(g, helper)}</Text>
            </View>)}
          </View>
        </>}
      </Lawh>
      {!!missed.length && <View style={{ gap: 8 }}>
        <View style={{ gap: 2 }}>
          <Text style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{helper ? t('practice.helper.review') : t('practice.summary.review')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{helper ? t('practice.helper.notRecorded') : t('practice.exam.reviewNote')}</Text>
        </View>
        <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }]}>
          {missed.map((place, i) => {
            const g = session.grades[session.places.indexOf(place)]!;
            return <Pressable key={place.key} accessibilityRole="link" accessibilityLabel={formatList([placeLabel(index, place.ayah), gradeName(g, helper)])} accessibilityHint={t('practice.session.open')} onPress={() => open(index, place.ayah)}
              style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
              <ReaderIcon name={gradeIcon[g]} color={gradeTone(g, p)} size={18} />
              <Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{placeLabel(index, place.ayah)}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t(`practice.cue.${place.kind}`)}</Text>
              <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
            </Pressable>;
          })}
        </View>
      </View>}
      <View style={{ gap: 8 }}>
        {!!missed.length && !unanswered && <Button palette={p} block icon="restore" onPress={() => onRetry(missed)}>{helper ? t('practice.helper.retry') : t('practice.summary.retry')}</Button>}
        <Button variant={missed.length && !unanswered ? 'outline' : 'default'} palette={p} block onPress={onClose}>{t('practice.summary.finish')}</Button>
        <Button variant="ghost" palette={p} block onPress={onPrevious}>{t('practice.session.previous')}</Button>
      </View>
    </ScrollView>
  </View>;
}

const s = StyleSheet.create({
  header: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  segments: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 18 },
  segmentHit: { height: 18, minWidth: 14, alignItems: 'center', justifyContent: 'center' },
  thread: { position: 'absolute', start: 6, end: 6, height: 1, top: 8.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  helperBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: readerShape.pill },
  marks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', minHeight: 16 },
  markHit: { width: 18, height: 16, alignItems: 'center', justifyContent: 'center' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  cartouche: { width: '47%', minHeight: 60, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 8 },
  verdict: { position: 'absolute', top: -6, left: 10, width: 20, height: 20, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center' },
  gradeLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultMarks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 6, maxWidth: 260 },
  examStat: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  notice: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pager: { flex: 1, overflow: 'hidden', width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center' },
  page: { flex: 1, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
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
  summary: { alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 22 },
  summaryIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch', marginVertical: 6 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8 },
});
