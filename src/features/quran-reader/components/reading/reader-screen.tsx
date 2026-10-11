import { loadTajweedFont } from '../../services/tajweed-service';
import { TajweedQuranPage } from './tajweed-quran-page';
import { ArabicText as Text } from '@/components/arabic-text';
import { recentre } from '@/components/pager';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, PanResponder, Platform, ScrollView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useReadingPosition } from '../../hooks/use-reading-position';
import { deferPrintedPagePreparation, getCachedPrintedPage, preloadPrintedPages, setPrintedPageInteraction, waitForPagePreparation } from '../../services/printed-page-service';
import { preloadPrintedImage } from '../../services/printed-page-render';
import { preloadPageNumbers, swipePageDelta } from '../../utils/navigation';
import { AyahActionSheet } from './ayah-action-sheet';
import { ayahKey } from '../../utils/references';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import { QuranPage } from './quran-page';
import { PrintedQuranPage } from './printed-quran-page';
import { ReaderButton } from './reader-button';
import { ReaderDrawer } from './reader-drawer';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { Stack, router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { indexRouteDestination } from '../../utils/reader-index';
import { ReaderControls } from './reader-controls';
import { createPagePractice, practiceVisibility, revealNext } from '../../utils/page-practice';
import { reserveReadingInsets } from '../../utils/reading-insets';
import { PlanReadingControls, PlanReadingEnd, PlanReadingOpening, usePlanReadingActions } from '@/features/plans/plan-reading-controls';
import { usePlans } from '@/features/plans/provider';
import { createReadingSession } from '@/features/plans/reading-session';
import { RecitationBar } from '@/features/recitation/recitation-bar';
import { stop as stopRecitation, useRecitation } from '@/features/recitation/player';
import { useListen, useWholeSurahs } from '@/features/recitation/use-listen';
import { t } from '@/i18n';

export function ReaderScreen() {
  const { preferences: { riwayah } } = useReadingPreferences();
  const { plan, planCycle, planSlot } = useLocalSearchParams<{ plan?: string; planCycle?: string; planSlot?: string }>();
  return <RiwayahReaderScreen key={`${riwayah}:${plan ?? ''}:${planCycle ?? ''}:${planSlot ?? ''}`} />;
}

function RiwayahReaderScreen() {
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  // Initial metrics can precede Android's camera-cutout measurement. Accept later
  // increases, but never shrink the reserved area when system bars disappear.
  const [readingInsets, setReadingInsets] = useState(() => ({
    top: Math.max(insets.top, initialWindowMetrics?.insets.top ?? 0, Platform.OS === 'android' ? NativeStatusBar.currentHeight ?? 0 : 0),
    bottom: Math.max(insets.bottom, initialWindowMetrics?.insets.bottom ?? 0),
  }));
  const reservedInsets = reserveReadingInsets(readingInsets, insets);
  if (Platform.OS !== 'web' && reservedInsets !== readingInsets) setReadingInsets(reservedInsets);
  const topInset = Platform.OS === 'web' ? insets.top : reservedInsets.top;
  const bottomInset = Platform.OS === 'web' ? insets.bottom : reservedInsets.bottom;
  const { surah: targetSurah, ayah: targetAyah, plan: planId, planCycle, planSlot } = useLocalSearchParams<{ surah?: string; ayah?: string; plan?: string; planCycle?: string; planSlot?: string }>();
  const { content, error, refresh } = useReaderContent();
  const { plans, ready: plansReady, today, error: plansError, retry: retryPlans } = usePlans();
  const plan = plans.find(p => p.id === planId);
  const reading = useMemo(() => {
    if (!planId || !plansReady || !content) return {};
    if (!plan) return { error: t('goals.unavailable') };
    try { return { session: createReadingSession(plan, content.data, planCycle, planSlot, today) }; }
    catch (e) { return { error: e instanceof Error ? e.message : t('reader.screen.sessionError') }; }
  }, [planId, plansReady, content, plan, planCycle, planSlot, today]);
  const session = reading.session;
  const planActions = usePlanReadingActions(session);
  const readerPages = session?.pages ?? content?.data.pages;
  const firstPage = session?.firstPage ?? 1;
  const lastPageNumber = session?.lastPage ?? content?.data.pages.at(-1)?.number ?? 604;
  const font = useQuranFont();
  const { preferences: { mode, textLayout, fontSize, spacious, tajweed, riwayah, repeat }, palette, dark } = useReadingPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [controlsProgress] = useState(() => new Animated.Value(0));
  const [actionAyah, setActionAyah] = useState<Ayah | null>(null);
  const [practice, setPractice] = useState<{ pageNumber: number; revealed: number } | null>(null);
  const practiceScrollY = useRef(0);
  const readingScrollY = useRef(0);
  const practiceOffsets = useRef(new Map<string, number>());
  const { position, ready: positionReady, move, selectAyah, setScroll, recordScroll } = useReadingPosition(planId ? session?.content : content?.data);
  // Callbacks handed to the memoized pages read the latest position here, so a
  // debounced scroll commit does not give them new identities and re-render
  // every mounted page.
  const latestPosition = useRef(position);
  useLayoutEffect(() => { latestPosition.current = position; }, [position]);
  const ready = positionReady && (!planId || !!session);
  const pageNumber = Math.max(firstPage, Math.min(lastPageNumber, position.pageNumber));
  const [jumpRevision, setJumpRevision] = useState(0);
  const jumpPending = useRef(false);
  const [pageTranslation] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const swipeWidth = useRef(390);
  const gestureActive = useRef(false);
  const swipeOrigin = useRef(pageNumber);
  const swipeDestination = useRef<number | null>(null);
  const readingDirection = useRef(1);
  const lastPage = useRef(pageNumber);
  const [pageWidth, setPageWidth] = useState(390);
  const [toolbarHeight, setToolbarHeight] = useState(53);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    const animation = Animated.timing(controlsProgress, {
      toValue: actionsVisible ? 1 : 0, duration: reduceMotion ? 0 : 320,
      easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [actionsVisible, controlsProgress, reduceMotion]);
  // Recenter the already mounted neighboring page before the next frame paints.
  useLayoutEffect(() => {
    // Also brings React Native's record of the pages in line, so the toolbar of a page that was
    // swiped in answers taps at once (it used to need the tools hidden and shown again).
    recentre(pageTranslation);
    swipeOrigin.current = pageNumber;
    swipeDestination.current = null;
    if (!gestureActive.current) setPrintedPageInteraction(false);
    if (pageNumber !== lastPage.current) readingDirection.current = Math.sign(pageNumber - lastPage.current);
    lastPage.current = pageNumber;
  }, [pageNumber, pageTranslation]);
  useEffect(() => () => setPrintedPageInteraction(false), []);
  const suppressClick = useRef(0);
  const scroll = useRef<ScrollView>(null);
  // Content can change height asynchronously (tajweed measurement, printed
  // artwork, error banners). Keep restoring the intended offset only until the
  // reader scrolls this page; null means the saved position (pinned once ready).
  const restore = useRef<{ armed: boolean; y: number | null }>({ armed: true, y: null });
  const restoreY = () => restore.current.y ?? latestPosition.current.scrollY;
  const openingHeight = useRef(0);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const page = ready ? (session?.content.pages ?? readerPages)?.find((value) => value.number === pageNumber) : undefined;
  const practiceActive = practice?.pageNumber === pageNumber;
  const practicePlan = useMemo(() => page ? createPagePractice(page,
    mode === 'page' && practiceActive && !session ? getCachedPrintedPage(page)?.regions : undefined) : null, [page, mode, practiceActive, session]);
  const visibleWords = useMemo(() => practiceActive && practicePlan && practice
    ? practiceVisibility(practicePlan, practice.revealed) : undefined, [practiceActive, practicePlan, practice]);
  const practiceTarget = practiceActive && practice && practice.revealed > 0
    ? practicePlan?.ayahs.find((entry) => entry.end >= practice.revealed)?.ayah : undefined;
  const practiceTargetKey = practiceTarget ? ayahKey(practiceTarget) : null;
  const recordPracticeOffset = useCallback((ayah: Ayah, y: number) => { practiceOffsets.current.set(ayahKey(ayah), y); }, []);
  useEffect(() => {
    const y = practiceTargetKey ? practiceOffsets.current.get(practiceTargetKey) : undefined;
    if (y === undefined) return;
    const contentTop = mode === 'page' ? 64 : 8;
    const openingOffset = session && pageNumber === firstPage ? openingHeight.current : 0;
    practiceScrollY.current = Math.max(0, y + contentTop + openingOffset - toolbarHeight - 12);
    scroll.current?.scrollTo({ y: practiceScrollY.current, animated: !reduceMotion });
  }, [practiceTargetKey, reduceMotion, mode, toolbarHeight, session, pageNumber, firstPage]);
  const totalPages = content?.data.pages.length ?? 604;
  const overlayOpen = drawerOpen || !!actionAyah;
  const immersive = ready && !actionsVisible && !overlayOpen;
  const recitation = useRecitation();
  const listen = useListen(content?.data.quran);
  const quranId = content?.data.quran.id;
  const listening = recitation.status !== 'idle' && recitation.mushafId === quranId;
  // A recitation of another riwayah (changed in settings while listening) no longer matches the page.
  const otherRecitation = recitation.status !== 'idle' && quranId !== undefined && recitation.mushafId !== null && recitation.mushafId !== quranId;
  useEffect(() => { if (otherRecitation) stopRecitation(); }, [otherRecitation]);
  // A goal's reading stops at the end of its portion.
  const sessionEnd = session ? session.index.ayahs[session.portion.end - 1] : null;
  // Listening onward plays whole surahs when chosen, except over a goal's portion.
  const wholeSurahs = useWholeSurahs(!!sessionEnd);

  const navigate = useCallback((number: number, ayah?: AyahReference) => {
    if (!ready || !readerPages?.some((value) => value.number === number) || (ayah && session && !session.contains(ayah))) return;
    setDrawerOpen(false);
    setActionAyah(null);
    setPractice(null);
    jumpPending.current = !!ayah;
    if (ayah) {
      setJumpRevision((value) => value + 1);
    }
    move({ mushafId: content!.data.quran.id, pageNumber: number, ayah: ayah ? { mushafId: content!.data.quran.id, surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber } : null, scrollY: 0 });
    restore.current = { armed: true, y: 0 };
    // This still targets the outgoing (or same) page, so a later visit starts at
    // the top. The incoming page is reset by the layout effect below.
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [ready, content, readerPages, session, move]);
  // Runs after the scroll ref points to the incoming page, whose already mounted
  // ScrollView may keep an offset from an earlier visit.
  useLayoutEffect(() => {
    if (!ready) return;
    // Pin the saved offset now: our own restore scrolls (clamped while content
    // is still short) are recorded and would otherwise replace it.
    restore.current.y ??= latestPosition.current.scrollY;
    scroll.current?.scrollTo({ y: jumpPending.current ? 0 : restore.current.y, animated: false });
  }, [pageNumber, ready]);
  useEffect(() => {
    if (!ready || !content || (!targetSurah && !targetAyah)) return;
    const target = indexRouteDestination(session?.content ?? content.data, targetSurah, targetAyah);
    // Apply an external Router command once the saved reader position is ready.
    if (target) {
      const pageStart = content.data.pages.find(p => p.number === target.pageNumber)?.ayahs[0];
      const beginsPage = session && pageStart && ayahKey(pageStart) === ayahKey(target);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      navigate(target.pageNumber, beginsPage ? undefined : target);
    }
    // Consume the jump so subsequent reloads restore the latest reading position.
    router.setParams({ surah: undefined, ayah: undefined });
  }, [ready, content, session, targetSurah, targetAyah, navigate]);
  // The page follows the recitation: the ayah being recited is selected, on its own page.
  // An open sheet or index is left alone; the page catches up once it closes.
  const recitedSurah = listening ? recitation.current?.surahNumber : undefined;
  const recitedAyah = listening ? recitation.current?.ayahNumber : undefined;
  const recitedPage = listening ? recitation.current?.pageNumber : undefined;
  useEffect(() => {
    if (!ready || overlayOpen || quranId === undefined || recitedSurah === undefined || recitedAyah === undefined || recitedPage === undefined) return;
    const ayah = { mushafId: quranId, surahNumber: recitedSurah, ayahNumber: recitedAyah };
    if (session && !session.contains(ayah)) return;
    const current = latestPosition.current;
    if (recitedPage !== current.pageNumber) navigate(recitedPage, ayah);
    else if (!current.ayah || ayahKey(current.ayah) !== ayahKey(ayah)) selectAyah(ayah);
  }, [ready, overlayOpen, quranId, recitedSurah, recitedAyah, recitedPage, session, navigate, selectAyah]);
  const toggleListening = () => {
    if (listening) { stopRecitation(); return; }
    if (!page?.ayahs.length) return;
    // From the selected ayah when it is on this page, otherwise from the top of the page.
    const selected = position.ayah;
    const from = selected && page.ayahs.find((a) => a.surahNumber === selected.surahNumber && a.ayahNumber === selected.ayahNumber) || page.ayahs[0];
    void listen(from, { to: sessionEnd });
  };
  const listenFrom = (ayah: Ayah, single: boolean) => {
    setActionAyah(null);
    setActionsVisible(true);
    // Repeating one ayah uses the chosen count, or goes on until stopped when no repetition is set.
    void listen(ayah, single ? { to: ayah, repeat: repeat > 1 ? repeat : 0 } : { to: sessionEnd });
  };
  const toggleActions = useCallback(() => {
    if (Date.now() < suppressClick.current) return;
    // A native text press and its enclosing touch-end can describe the same tap.
    suppressClick.current = Date.now() + 100;
    setActionsVisible((visible) => !visible);
  }, []);
  const tapAyah = toggleActions;
  const select = useCallback((ayah: Ayah) => {
    if (session && !session.contains(ayah)) return;
    suppressClick.current = Date.now() + 500;
    setDrawerOpen(false);
    setActionsVisible(false);
    selectAyah({ mushafId: ayah.mushafId, surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber });
    setActionAyah(ayah);
  }, [selectAyah, session]);
  const togglePractice = () => {
    if (!page) return;
    setActionAyah(null);
    setActionsVisible(true);
    if (practiceActive) {
      // Text practice shares the reading surface, so keep the current place.
      if (mode === 'text') {
        readingScrollY.current = practiceScrollY.current;
        setScroll(practiceScrollY.current);
      }
      restore.current = { armed: true, y: mode === 'text' ? practiceScrollY.current : position.scrollY };
      setPractice(null);
      if (mode === 'page') scroll.current?.scrollTo({ y: position.scrollY, animated: false });
    } else {
      practiceScrollY.current = mode === 'text' ? readingScrollY.current : 0;
      if (mode === 'page') practiceOffsets.current.clear();
      setPractice({ pageNumber, revealed: 0 });
      if (mode === 'page') scroll.current?.scrollTo({ y: 0, animated: false });
    }
  };
  const reveal = (unit: 'word' | 'ayah') => {
    if (!practicePlan) return;
    setPractice((current) => current?.pageNumber === pageNumber
      ? { ...current, revealed: revealNext(practicePlan, current.revealed, unit) } : current);
  };
  const targetOffset = useCallback((y: number) => {
    if (!jumpPending.current) return;
    jumpPending.current = false;
    const offset = y + (session && pageNumber === firstPage ? openingHeight.current : 0);
    scroll.current?.scrollTo({ y: Math.max(0, offset - 12), animated: false });
    restore.current = { armed: true, y: Math.max(0, offset - 12) };
    recordScroll(Math.max(0, offset - 12));
  }, [recordScroll, session, pageNumber, firstPage]);
  const settleSwipe = useCallback(() => {
    gestureActive.current = false;
    swipeDestination.current = null;
    Animated.spring(pageTranslation, { toValue: 0, speed: 24, bounciness: 0, useNativeDriver: Platform.OS !== 'web' }).start(() => { setPrintedPageInteraction(false); });
  }, [pageTranslation]);
  const swipeGrant = useCallback(() => {
    tapStart.current = null;
    suppressClick.current = Date.now() + 1000;
    // A second gesture completes the prior committed turn instead of being discarded
    // during its settling animation. The destination is already mounted beside us.
    const destination = swipeDestination.current;
    pageTranslation.stopAnimation();
    if (destination !== null) {
      swipeOrigin.current = destination;
      swipeDestination.current = null;
      pageTranslation.setValue(0);
      navigate(destination);
    }
    gestureActive.current = true;
    setPrintedPageInteraction(true);
  }, [pageTranslation, navigate]);
  const swipeMove = useCallback((_: unknown, gesture: { dx: number }) => {
    if (reduceMotion) return;
    const blocked = gesture.dx > 0 ? swipeOrigin.current >= lastPageNumber : swipeOrigin.current <= firstPage;
    const offset = gesture.dx * (blocked ? 0.18 : 1);
    pageTranslation.setValue(Math.max(-swipeWidth.current, Math.min(swipeWidth.current, offset)));
  }, [firstPage, lastPageNumber, pageTranslation, reduceMotion]);
  const swipeRelease = useCallback((_: unknown, gesture: { dx: number; dy: number; vx: number }) => {
    gestureActive.current = false;
    suppressClick.current = Date.now() + 120;
    const delta = swipePageDelta(gesture.dx, gesture.dy, gesture.vx);
    const destination = swipeOrigin.current + delta;
    if (!delta || destination < firstPage || destination > lastPageNumber) { settleSwipe(); return; }
    if (reduceMotion) { setPrintedPageInteraction(false); navigate(destination); return; }
    swipeDestination.current = destination;
    Animated.timing(pageTranslation, { toValue: delta * swipeWidth.current, duration: 90, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) navigate(destination);
    });
  }, [navigate, firstPage, lastPageNumber, pageTranslation, reduceMotion, settleSwipe]);
  // PanResponder stores these callbacks; it does not invoke them during render.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => ready && !overlayOpen && swipeDestination.current !== null,
    onMoveShouldSetPanResponderCapture: (_, gesture) => ready && !overlayOpen && gesture.numberActiveTouches === 1 &&
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderGrant: swipeGrant,
    onPanResponderMove: swipeMove,
    onPanResponderRelease: swipeRelease,
    onPanResponderTerminate: settleSwipe,
    onPanResponderTerminationRequest: () => true,
  }), [ready, overlayOpen, swipeGrant, swipeMove, swipeRelease, settleSwipe]);
  useEffect(() => {
    if (!ready || !content || mode !== 'page') return;
    if (tajweed && riwayah === 'hafs') {
      // Page neighbors load their own data. Warm only a few small font files;
      // don't also download the unused monochrome SVG runway.
      for (const number of preloadPageNumbers(pageNumber, lastPageNumber, readingDirection.current).filter(n => n >= firstPage).slice(0, 5)) void loadTajweedFont(number).catch(() => {});
      return;
    }
    let active = true;
    const pages = content.data.pages;
    const runway = preloadPageNumbers(pageNumber, lastPageNumber, readingDirection.current).filter(n => n >= firstPage)
      .map((number) => pages[number - 1]).filter((value) => !!value);
    const imageRunway = new Set(runway.slice(0, 5).map((value) => value.number));
    preloadPrintedPages(runway, async (artwork, target) => {
      await waitForPagePreparation();
      if (active && imageRunway.has(target.number)) {
        await preloadPrintedImage(artwork, palette.foreground, palette.ornament);
      }
    });
    return () => { active = false; };
  }, [ready, content, pageNumber, firstPage, lastPageNumber, mode, palette.foreground, palette.ornament, tajweed, riwayah]);

  if (planId && (reading.error || plansError)) return <SafeAreaView style={[styles.root, { backgroundColor: palette.card }]}>
    <View style={styles.status}>
      <Text accessibilityRole="alert" style={[styles.statusTitle, { color: palette.foreground }]}>{reading.error || plansError}</Text>
      {!!plansError && <ReaderButton palette={palette} onPress={retryPlans}>{t('common.retry')}</ReaderButton>}
      <ReaderButton palette={palette} selected onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: planId } })}>{t('goals.backToGoal')}</ReaderButton>
      <ReaderButton palette={palette} onPress={() => router.replace('/')}>{t('reader.screen.openMushaf')}</ReaderButton>
    </View>
  </SafeAreaView>;

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: palette.card }]}>
      {/* Let iOS manage transient home-indicator visibility without changing its
          policy (and safe-area layout) every time the reader tools are toggled. */}
      <Stack.Screen options={{ navigationBarHidden: immersive, autoHideHomeIndicator: true }} />
      {focused && <StatusBar style={dark ? 'light' : 'dark'} hidden={immersive} animated={!reduceMotion}
        hideTransitionAnimation={reduceMotion ? 'none' : 'slide'} />}
      <View style={styles.pager} accessibilityElementsHidden={overlayOpen} importantForAccessibility={overlayOpen ? 'no-hide-descendants' : 'auto'} {...(Platform.OS === 'web' ? { 'aria-hidden': overlayOpen } : {})}
        onLayout={(event) => { swipeWidth.current = event.nativeEvent.layout.width; setPageWidth(event.nativeEvent.layout.width); }} {...swipe.panHandlers}>
      {(page && content && font.loaded ? [-1, 0, 1] : [0]).map((offset) => {
        const displayNumber = pageNumber + offset;
        const displayPage = readerPages?.find((value) => value.number === displayNumber);
        const textPage = session?.content.pages.find(p => p.number === displayNumber) ?? displayPage;
        const surahName = content?.data.quran.surahs.find((surah) => surah.number === displayPage?.ayahs[0]?.surahNumber)?.name;
        const isCurrent = offset === 0;
        const practicing = isCurrent && practiceActive;
        if (!isCurrent && !displayPage) return null;
        // The complete page shares one horizontal transform. The top and bottom
        // overlays animate independently without changing the reading viewport.
        return <Animated.View key={displayPage?.number ?? 'loading'} pointerEvents={isCurrent ? 'auto' : 'none'}
          accessibilityElementsHidden={!isCurrent} importantForAccessibility={isCurrent ? 'auto' : 'no-hide-descendants'}
          {...(Platform.OS === 'web' && !isCurrent ? { 'aria-hidden': true, inert: true } : {})}
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.card,
            transform: [{ translateX: Animated.add(pageTranslation, -offset * pageWidth) }] }]}>
      {/* Revealing tools overlays the page without resizing the Quran. */}
      <View style={styles.readingSurface}
        {...(Platform.OS === 'web' ? { onClick: toggleActions } : {})}
        onTouchStart={Platform.OS === 'web' ? undefined : (event) => {
          tapStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
        }}
        onTouchEnd={Platform.OS === 'web' ? undefined : (event) => {
          const start = tapStart.current;
          tapStart.current = null;
          if (Date.now() >= suppressClick.current && start && Math.hypot(event.nativeEvent.pageX - start.x, event.nativeEvent.pageY - start.y) < 8) {
            toggleActions();
          }
        }}
        onTouchCancel={() => { tapStart.current = null; }}>
      {/* The safe starting space scrolls with the page. Padding the viewport
          itself would create an opaque strip that cuts off text below the camera. */}
      <ScrollView ref={isCurrent ? scroll : undefined} scrollEnabled={isCurrent} scrollEventThrottle={100} onScroll={(event) => {
          if (!isCurrent || !ready) return;
          deferPrintedPagePreparation();
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
          if (practicing) { practiceScrollY.current = contentOffset.y; return; }
          // Restores land on the target, or on the end of shorter content. Any
          // other offset (wheel, keyboard, scrollbar, assistive scroll) is the reader's.
          if (restore.current.armed && !jumpPending.current &&
            Math.abs(contentOffset.y - Math.min(restoreY(), Math.max(0, contentSize.height - layoutMeasurement.height))) > 2) restore.current.armed = false;
          readingScrollY.current = contentOffset.y; recordScroll(contentOffset.y);
        }}
        automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
        onContentSizeChange={() => {
          if (!isCurrent || !ready || jumpPending.current) return;
          if (practicing) scroll.current?.scrollTo({ y: practiceScrollY.current, animated: false });
          else if (restore.current.armed) scroll.current?.scrollTo({ y: restoreY(), animated: false });
        }}
        onScrollBeginDrag={() => { tapStart.current = null; if (isCurrent && !practicing) restore.current.armed = false; }}
        onMomentumScrollBegin={() => { if (isCurrent && !practicing) restore.current.armed = false; }} showsVerticalScrollIndicator={false} style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, {
          paddingTop: topInset + (practicing && mode === 'page' ? 64 : 8),
          paddingBottom: (practicing ? 124 : 8) + bottomInset,
        }]}>
        <View style={[styles.content, mode === 'page' && !practicing && styles.centeredContent]}>
          {ready && session && displayNumber === firstPage && <View onLayout={isCurrent ? event => { openingHeight.current = event.nativeEvent.layout.height; } : undefined}><PlanReadingOpening session={session} /></View>}
          {font.error || (error && !content) ? (
            <View accessibilityRole="alert" style={styles.status}>
              <Text style={[styles.statusTitle, { color: palette.foreground }]}>{font.error ? t('reader.screen.fontError') : t('reader.screen.quranError')}</Text>
              <Text style={[styles.statusText, { color: palette.mutedForeground }]}>{font.error ? t('reader.screen.fontErrorDetail') : t('reader.screen.quranErrorDetail')}</Text>
              {!font.error && <ReaderButton palette={palette} onPress={refresh}>{t('common.retry')}</ReaderButton>}
            </View>
          ) : !font.loaded || !content || !ready ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <ActivityIndicator color={palette.primary} size="large" />
              <Text style={[styles.statusTitle, { color: palette.foreground }]}>{t('reader.screen.preparing')}</Text>
              <Text style={[styles.statusText, { color: palette.mutedForeground }]}>{t('reader.screen.preparingDetail')}</Text>
            </View>
          ) : displayPage ? (
            mode === 'page' && !practicing && tajweed && riwayah === 'hafs' ? <TajweedQuranPage key={`${displayPage.number}:${jumpRevision}`} page={displayPage} quran={content.data.quran} palette={palette} dark={dark} selectedAyah={isCurrent ? position.ayah : null} onTap={toggleActions} onSelect={select} onNavigate={navigate} onTargetOffset={isCurrent ? targetOffset : undefined} /> :
            mode === 'page' && !practicing ? <PrintedQuranPage key={`${displayPage.number}:${jumpRevision}`} page={displayPage} palette={palette}
              selectedAyah={isCurrent ? position.ayah : null} onTap={tapAyah} onSelect={select} onTargetOffset={isCurrent ? targetOffset : undefined} /> :
              <QuranPage key={`${displayPage.number}:${jumpRevision}:${mode === 'page' ? 'practice' : textLayout}`} page={practicing && practicePlan ? practicePlan.page : textPage!} quran={content.data.quran} layout={mode === 'page' ? 'ayah' : textLayout} fontFamily={font.fontFamily}
                visibleWords={practicing ? visibleWords : undefined} fontSize={fontSize} spacious={spacious} palette={palette} selectedAyah={isCurrent ? position.ayah : null}
                onTap={tapAyah} onSelect={select} onNavigate={navigate} onTargetOffset={isCurrent ? targetOffset : undefined}
                onAyahOffset={isCurrent ? recordPracticeOffset : undefined} />
          ) : <Text accessibilityRole="alert" style={{ color: palette.destructive }}>{t('reader.screen.pageUnavailable')}</Text>}
          {ready && session && displayNumber === lastPageNumber && <PlanReadingEnd session={session} actions={planActions} />}
        </View>
      </ScrollView>
      </View>
      {ready && displayPage && content && <ReaderControls visible={actionsVisible} progress={controlsProgress}
        page={displayPage} totalPages={totalPages} surahName={surahName ?? t('common.appName')} palette={palette}
        previous={readerPages?.find((value) => value.number === displayNumber - 1)}
        next={readerPages?.find((value) => value.number === displayNumber + 1)}
        pageLabel={session ? t('reader.screen.sessionPage', { index: displayNumber - firstPage + 1, total: session.pages.length, page: displayNumber }) : undefined}
        topInset={topInset} toolbarHeight={toolbarHeight} onToolbarHeight={setToolbarHeight}
        bottomInset={bottomInset} practiceActive={practicing}
        planControls={session ? <PlanReadingControls session={session} pageNumber={displayNumber} actions={planActions} /> : undefined}
        practiceComplete={!!practicePlan && !!practice && practice.revealed >= practicePlan.totalWords}
        onNavigate={navigate} onJump={() => setDrawerOpen(true)} onMenu={() => router.push('/home')} onPractice={togglePractice}
        onRevealWord={() => reveal('word')} onRevealAyah={() => reveal('ayah')}
        onDismiss={() => setActionsVisible(false)}
        listening={listening} onListen={toggleListening}
        recitation={listening || recitation.error ? <RecitationBar palette={palette} quran={content.data.quran} /> : undefined} />}
      </Animated.View>;
      })}
      </View>
      {actionAyah && content && <AyahActionSheet key={ayahKey(actionAyah)} ayah={actionAyah} quran={content.data.quran} palette={palette} onClose={() => setActionAyah(null)} onListen={listenFrom} wholeSurah={wholeSurahs} />}
      {drawerOpen && <ReaderDrawer content={session?.content ?? content?.data} limited={!!session} currentPage={pageNumber} onJump={navigate} onClose={() => setDrawerOpen(false)} palette={palette} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) },
  pager: { flex: 1, overflow: 'hidden' },
  readingSurface: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 6 },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', flexGrow: 1 },
  centeredContent: { justifyContent: 'center' },
  status: { paddingVertical: 64, paddingHorizontal: 20, alignItems: 'center', gap: 16 },
  statusTitle: { fontSize: 18, fontWeight: '500', textAlign: 'center' },
  statusText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
