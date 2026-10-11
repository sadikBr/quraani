import { createContext, useContext, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import { createPager, useRecentre } from './pager';

/** A tab and the ones beside it, which a swipe can bring in. */
function withNeighbours<T>(tabs: readonly T[], tab: T): T[] {
  const i = tabs.indexOf(tab);
  return tabs.filter((_, j) => Math.abs(j - i) <= 1);
}

/**
 * Tabs whose pages a horizontal swipe moves between, like the mushaf's pages: the next tab lies to
 * the left, as in a right-to-left tab bar. `open` slides to a tab beside the one shown and jumps to
 * one further away. Render the pages with `SwipePages` inside a `GestureHandlerRootView`.
 */
export function useSwipeTabs<T extends string>(tabs: readonly T[], initial: T) {
  const [tab, setTab] = useState<T>(initial);
  // A tab stays mounted once shown, so it keeps its scroll and its choices; the tabs beside the one
  // shown are mounted too, so a swipe brings them in whole.
  const [mounted, setMounted] = useState<T[]>(() => withNeighbours(tabs, initial));
  const [translation] = useState(() => new Animated.Value(0));
  const [pager] = useState(() => createPager(translation));
  const [width, setWidth] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const show = (next: T) => {
    setTab(next);
    setMounted((list) => { const add = withNeighbours(tabs, next).filter((id) => !list.includes(id)); return add.length ? [...list, ...add] : list; });
  };
  Object.assign(pager.state, { index: tabs.indexOf(tab), last: tabs.length - 1, width: width || 360, reduceMotion, onChange: (i: number) => show(tabs[i]) });
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);
  // The tab coming in is centred before it paints.
  useRecentre(translation, tab);
  const open = (next: T) => pager.go(tabs.indexOf(next));
  return { tab, open, pages: { tabs, tab, mounted, pan: pager.pan, translation, width, setWidth } };
}

export type SwipeTabsPages<T extends string> = ReturnType<typeof useSwipeTabs<T>>['pages'];

const PagerGesture = createContext<PanGesture | null>(null);

/** The pages of `useSwipeTabs`: the tab shown, with those beside it laid out to either side. */
export function SwipePages<T extends string>({ pages, render }: { pages: SwipeTabsPages<T>; render: (tab: T) => ReactNode }) {
  const { tabs, tab, mounted, pan, translation, width, setWidth } = pages;
  const index = tabs.indexOf(tab);
  return <PagerGesture.Provider value={pan}>
    <GestureDetector gesture={pan}>
      <View style={styles.pages} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {mounted.map((id) => {
          const offset = tabs.indexOf(id) - index;
          // Only the tab shown and those beside it are laid out, beside it; the rest wait hidden.
          return <Animated.View key={id} pointerEvents={offset ? 'none' : 'auto'} accessibilityElementsHidden={!!offset} importantForAccessibility={offset ? 'no-hide-descendants' : 'auto'}
            {...(Platform.OS === 'web' && offset ? { 'aria-hidden': true, inert: true } : {})}
            style={[StyleSheet.absoluteFill, Math.abs(offset) > 1 ? styles.hidden : { transform: [{ translateX: Animated.add(translation, -offset * (width || 360)) }] }]}>
            {render(id)}
          </Animated.View>;
        })}
      </View>
    </GestureDetector>
  </PagerGesture.Provider>;
}

/**
 * Something that moves sideways inside swipeable pages (a row that scrolls across): a swipe that
 * starts on it moves it, not the page. Its child must be a native view, such as a ScrollView.
 */
export function HorizontalControl({ children }: { children: ReactElement }) {
  const pan = useContext(PagerGesture);
  const [gesture] = useState(() => pan ? Gesture.Native().blocksExternalGesture(pan) : null);
  return gesture ? <GestureDetector gesture={gesture}>{children}</GestureDetector> : children;
}

const styles = StyleSheet.create({
  pages: { flex: 1, overflow: 'hidden' },
  hidden: { display: 'none' },
});
