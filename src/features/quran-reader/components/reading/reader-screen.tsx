import { ArabicText as Text } from '@/components/arabic-text';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, PanResponder, Platform, ScrollView, StatusBar as NativeStatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useWarshFont } from '../../hooks/use-warsh-font';
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

export function ReaderScreen() {
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
  const { surah: targetSurah, ayah: targetAyah } = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const { content, error, refresh } = useReaderContent();
  const font = useWarshFont();
  const { preferences: { mode, textLayout, fontSize, spacious }, palette, dark } = useReadingPreferences();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [controlsProgress] = useState(() => new Animated.Value(0));
  const [actionAyah, setActionAyah] = useState<Ayah | null>(null);
  const [practice, setPractice] = useState<{ pageNumber: number; revealed: number } | null>(null);
  const practiceScrollY = useRef(0);
  const readingScrollY = useRef(0);
  const practiceOffsets = useRef(new Map<string, number>());
  const { position, ready, move, recordScroll } = useReadingPosition(content?.data);
  const pageNumber = position.pageNumber;
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
      toValue: actionsVisible ? 1 : 0, duration: reduceMotion ? 0 : 220,
      easing: Easing.out(Easing.cubic), useNativeDriver: Platform.OS !== 'web',
    });
    animation.start();
    return () => animation.stop();
  }, [actionsVisible, controlsProgress, reduceMotion]);
  // Recenter the already mounted neighboring page before the next frame paints.
  useLayoutEffect(() => {
    pageTranslation.setValue(0);
    swipeOrigin.current = pageNumber;
    swipeDestination.current = null;
    if (!gestureActive.current) setPrintedPageInteraction(false);
    if (pageNumber !== lastPage.current) readingDirection.current = Math.sign(pageNumber - lastPage.current);
    lastPage.current = pageNumber;
  }, [pageNumber, pageTranslation]);
  useEffect(() => () => setPrintedPageInteraction(false), []);
  const suppressClick = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const tapStart = useRef<{ x: number; y: number } | null>(null);
  const page = ready ? content?.data.pages.find((value) => value.number === pageNumber) : undefined;
  const practiceActive = practice?.pageNumber === pageNumber;
  const practicePlan = useMemo(() => page ? createPagePractice(page,
    mode === 'page' && practiceActive ? getCachedPrintedPage(page)?.regions : undefined) : null, [page, mode, practiceActive]);
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
    practiceScrollY.current = Math.max(0, y + contentTop - toolbarHeight - 12);
    scroll.current?.scrollTo({ y: practiceScrollY.current, animated: !reduceMotion });
  }, [practiceTargetKey, reduceMotion, mode, toolbarHeight]);
  const totalPages = content?.data.pages.length ?? 604;
  const immersive = ready && !actionsVisible && !drawerOpen && !actionAyah;

  const navigate = useCallback((number: number, ayah?: AyahReference) => {
    if (!ready || !content?.data.pages.some((value) => value.number === number)) return;
    setDrawerOpen(false);
    setActionAyah(null);
    setPractice(null);
    jumpPending.current = !!ayah;
    if (ayah) {
      setJumpRevision((value) => value + 1);
    }
    move({ mushafId: 4, pageNumber: number, ayah: ayah ? { mushafId: 4, surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber } : null, scrollY: 0 });
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [ready, content, move]);
  useEffect(() => {
    if (!ready || !content || (!targetSurah && !targetAyah)) return;
    const target = indexRouteDestination(content.data, targetSurah, targetAyah);
    // Apply an external Router command once the saved reader position is ready.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (target) navigate(target.pageNumber, target);
    // Consume the jump so subsequent reloads restore the latest reading position.
    router.setParams({ surah: undefined, ayah: undefined });
  }, [ready, content, targetSurah, targetAyah, navigate]);
  const toggleActions = useCallback(() => {
    if (Date.now() < suppressClick.current) return;
    // A native text press and its enclosing touch-end can describe the same tap.
    suppressClick.current = Date.now() + 100;
    setActionsVisible((visible) => !visible);
  }, []);
  const tapAyah = toggleActions;
  const select = useCallback((ayah: Ayah) => {
    suppressClick.current = Date.now() + 500;
    setDrawerOpen(false);
    setActionsVisible(false);
    move({ ...position, ayah: { mushafId: 4, surahNumber: ayah.surahNumber, ayahNumber: ayah.ayahNumber } }, true);
    setActionAyah(ayah);
  }, [position, move]);
  const togglePractice = () => {
    if (!page) return;
    setActionAyah(null);
    setActionsVisible(true);
    if (practiceActive) {
      // Text practice shares the reading surface, so keep the current place.
      if (mode === 'text') {
        readingScrollY.current = practiceScrollY.current;
        move({ ...position, scrollY: practiceScrollY.current });
      }
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
    scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: false });
    recordScroll(Math.max(0, y - 12));
  }, [recordScroll]);
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
    const blocked = gesture.dx > 0 ? swipeOrigin.current === totalPages : swipeOrigin.current === 1;
    const offset = gesture.dx * (blocked ? 0.18 : 1);
    pageTranslation.setValue(Math.max(-swipeWidth.current, Math.min(swipeWidth.current, offset)));
  }, [totalPages, pageTranslation, reduceMotion]);
  const swipeRelease = useCallback((_: unknown, gesture: { dx: number; dy: number; vx: number }) => {
    gestureActive.current = false;
    suppressClick.current = Date.now() + 120;
    const delta = swipePageDelta(gesture.dx, gesture.dy, gesture.vx);
    const destination = swipeOrigin.current + delta;
    if (!delta || destination < 1 || destination > totalPages) { settleSwipe(); return; }
    if (reduceMotion) { setPrintedPageInteraction(false); navigate(destination); return; }
    swipeDestination.current = destination;
    Animated.timing(pageTranslation, { toValue: delta * swipeWidth.current, duration: 90, useNativeDriver: Platform.OS !== 'web' }).start(({ finished }) => {
      if (finished) navigate(destination);
    });
  }, [navigate, totalPages, pageTranslation, reduceMotion, settleSwipe]);
  // PanResponder stores these callbacks; it does not invoke them during render.
  // eslint-disable-next-line react-hooks/refs
  const swipe = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponderCapture: () => ready && !drawerOpen && !actionAyah && swipeDestination.current !== null,
    onMoveShouldSetPanResponderCapture: (_, gesture) => ready && !drawerOpen && !actionAyah && gesture.numberActiveTouches === 1 &&
      Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderGrant: swipeGrant,
    onPanResponderMove: swipeMove,
    onPanResponderRelease: swipeRelease,
    onPanResponderTerminate: settleSwipe,
    onPanResponderTerminationRequest: () => true,
  }), [ready, drawerOpen, actionAyah, swipeGrant, swipeMove, swipeRelease, settleSwipe]);
  useEffect(() => {
    if (!ready || !content || mode !== 'page') return;
    let active = true;
    const pages = content.data.pages;
    const runway = preloadPageNumbers(pageNumber, pages.length, readingDirection.current)
      .map((number) => pages[number - 1]).filter((value) => !!value);
    const imageRunway = new Set(runway.slice(0, 5).map((value) => value.number));
    preloadPrintedPages(runway, async (artwork, target) => {
      await waitForPagePreparation();
      if (active && imageRunway.has(target.number)) {
        await preloadPrintedImage(artwork, palette.text, palette.ornament);
      }
    });
    return () => { active = false; };
  }, [ready, content, pageNumber, mode, palette.text, palette.ornament]);

  return (
    <SafeAreaView edges={['left', 'right']} style={[styles.root, { backgroundColor: palette.paper, paddingTop: topInset }]}>
      {/* Let iOS manage transient home-indicator visibility without changing its
          policy (and safe-area layout) every time the reader tools are toggled. */}
      <Stack.Screen options={{ navigationBarHidden: immersive, autoHideHomeIndicator: true }} />
      {focused && <StatusBar style={dark ? 'light' : 'dark'} hidden={immersive} animated={!reduceMotion}
        hideTransitionAnimation={reduceMotion ? 'none' : 'slide'} />}
      <View style={styles.pager} accessibilityElementsHidden={!!actionAyah || drawerOpen} importantForAccessibility={actionAyah || drawerOpen ? 'no-hide-descendants' : 'auto'} {...(Platform.OS === 'web' ? { 'aria-hidden': !!actionAyah || drawerOpen } : {})}
        onLayout={(event) => { swipeWidth.current = event.nativeEvent.layout.width; setPageWidth(event.nativeEvent.layout.width); }} {...swipe.panHandlers}>
      {(page && content && font.loaded ? [-1, 0, 1] : [0]).map((offset) => {
        const displayNumber = pageNumber + offset;
        const displayPage = content?.data.pages.find((value) => value.number === displayNumber);
        const surahName = content?.data.quran.surahs.find((surah) => surah.number === displayPage?.ayahs[0]?.surahNumber)?.name;
        const isCurrent = offset === 0;
        const practicing = isCurrent && practiceActive;
        if (!isCurrent && !displayPage) return null;
        // The complete page shares one horizontal transform. The top and bottom
        // overlays animate independently without changing the reading viewport.
        return <Animated.View key={displayPage?.number ?? 'loading'} pointerEvents={isCurrent ? 'auto' : 'none'}
          accessibilityElementsHidden={!isCurrent} importantForAccessibility={isCurrent ? 'auto' : 'no-hide-descendants'}
          {...(Platform.OS === 'web' && !isCurrent ? { 'aria-hidden': true, inert: true } : {})}
          style={[StyleSheet.absoluteFill, { backgroundColor: palette.paper,
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
      <ScrollView ref={isCurrent ? scroll : undefined} scrollEnabled={isCurrent} scrollEventThrottle={100} onScroll={(event) => { if (isCurrent && ready) { deferPrintedPagePreparation(); if (practicing) practiceScrollY.current = event.nativeEvent.contentOffset.y; else { readingScrollY.current = event.nativeEvent.contentOffset.y; recordScroll(event.nativeEvent.contentOffset.y); } } }}
        automaticallyAdjustContentInsets={false} contentInsetAdjustmentBehavior="never"
        onContentSizeChange={() => { if (isCurrent && ready && !jumpPending.current) scroll.current?.scrollTo({ y: practicing ? practiceScrollY.current : position.scrollY, animated: false }); }} onScrollBeginDrag={() => { tapStart.current = null; }} showsVerticalScrollIndicator={false} style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, practicing && mode === 'page' && styles.practiceContent, { paddingBottom: (practicing ? 124 : 8) + bottomInset }]}>
        <View style={[styles.content, mode === 'page' && !practicing && styles.centeredContent]}>
          {font.error || (error && !content) ? (
            <View accessibilityRole="alert" style={styles.status}>
              <Text style={[styles.statusTitle, { color: palette.text }]}>{font.error ? 'تعذر تحميل خط المصحف' : 'تعذر تحميل القرآن'}</Text>
              <Text style={[styles.statusText, { color: palette.muted }]}>{font.error ? 'أعد فتح التطبيق لتحميل خط مصحف ورش.' : 'تحقق من الاتصال ثم أعد المحاولة.'}</Text>
              {!font.error && <ReaderButton palette={palette} onPress={refresh}>إعادة المحاولة</ReaderButton>}
            </View>
          ) : !font.loaded || !content || !ready ? (
            <View style={styles.status} accessibilityLiveRegion="polite">
              <ActivityIndicator color={palette.accent} size="large" />
              <Text style={[styles.statusTitle, { color: palette.text }]}>جارٍ تجهيز المصحف</Text>
              <Text style={[styles.statusText, { color: palette.muted }]}>جارٍ تحميل مصحف ورش وخطه.</Text>
            </View>
          ) : displayPage ? (
            mode === 'page' && !practicing ? <PrintedQuranPage key={`${displayPage.number}:${jumpRevision}`} page={displayPage} palette={palette}
              selectedAyah={isCurrent ? position.ayah : null} onTap={tapAyah} onSelect={select} onTargetOffset={isCurrent ? targetOffset : undefined} /> :
              <QuranPage key={`${displayPage.number}:${jumpRevision}:${mode === 'page' ? 'practice' : textLayout}`} page={practicing && practicePlan ? practicePlan.page : displayPage} quran={content.data.quran} layout={mode === 'page' ? 'ayah' : textLayout} fontFamily={font.fontFamily}
                visibleWords={practicing ? visibleWords : undefined} fontSize={fontSize} spacious={spacious} palette={palette} selectedAyah={isCurrent ? position.ayah : null}
                onTap={tapAyah} onSelect={select} onTargetOffset={isCurrent ? targetOffset : undefined}
                onAyahOffset={isCurrent ? recordPracticeOffset : undefined} />
          ) : <Text accessibilityRole="alert" style={{ color: palette.warning }}>هذه الصفحة غير متوفرة.</Text>}
        </View>
      </ScrollView>
      </View>
      {ready && displayPage && content && <ReaderControls visible={actionsVisible} progress={controlsProgress}
        page={displayPage} totalPages={totalPages} surahName={surahName ?? 'قراني'} palette={palette}
        previous={content.data.pages.find((value) => value.number === displayNumber - 1)}
        next={content.data.pages.find((value) => value.number === displayNumber + 1)}
        topOffset={0} toolbarHeight={toolbarHeight} onToolbarHeight={setToolbarHeight}
        bottomInset={bottomInset} practiceActive={practicing}
        practiceComplete={!!practicePlan && !!practice && practice.revealed >= practicePlan.totalWords}
        onNavigate={navigate} onJump={() => setDrawerOpen(true)} onPractice={togglePractice}
        onRevealWord={() => reveal('word')} onRevealAyah={() => reveal('ayah')}
        onDismiss={() => setActionsVisible(false)} />}
      </Animated.View>;
      })}
      </View>
      {actionAyah && content && <AyahActionSheet key={ayahKey(actionAyah)} ayah={actionAyah} quran={content.data.quran} palette={palette} onClose={() => setActionAyah(null)} />}
      {drawerOpen && <ReaderDrawer content={content?.data} currentPage={pageNumber} onJump={navigate} onClose={() => setDrawerOpen(false)} palette={palette} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, ...Platform.select({ native: { direction: 'rtl' as const } }) },
  pager: { flex: 1, overflow: 'hidden' },
  readingSurface: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 6, paddingVertical: 8 },
  practiceContent: { paddingTop: 64 },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center', flexGrow: 1 },
  centeredContent: { justifyContent: 'center' },
  status: { paddingVertical: 64, paddingHorizontal: 20, alignItems: 'center', gap: 16 },
  statusTitle: { fontSize: 18, fontWeight: '500', textAlign: 'center' },
  statusText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
