import { Animated, Easing, Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { swipePageDelta } from '@/features/quran-reader/utils/navigation';

const nativeDriver = Platform.OS !== 'web';

/**
 * Horizontal paging like the mushaf: the next page lies to the left, so dragging to the right
 * moves forward. Mutable gesture state lives in one object (gesture callbacks may be compiled as
 * worklets, which copy the plain variables they capture). The screen keeps `state` current
 * (index, last, width, reduceMotion, onChange) on every render.
 */
export function createPager(translation: Animated.Value) {
  const state = { index: 0, last: 0, width: 360, reduceMotion: false, animating: false, onChange: (_: number) => {} };
  const settle = () => Animated.spring(translation, { toValue: 0, speed: 24, bounciness: 0, useNativeDriver: nativeDriver }).start();
  const go = (target: number) => {
    if (target < 0 || target > state.last || target === state.index) { settle(); return; }
    // Only neighbours slide in; a longer jump changes the page at once.
    if (state.reduceMotion || Math.abs(target - state.index) > 1) { state.onChange(target); return; }
    state.animating = true;
    Animated.timing(translation, { toValue: Math.sign(target - state.index) * state.width, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver })
      .start(({ finished }) => { state.animating = false; if (finished) state.onChange(target); else settle(); });
  };
  const pan = Gesture.Pan().runOnJS(true)
    .activeOffsetX([-14, 14]).failOffsetY([-18, 18])
    .onUpdate((e) => {
      if (state.animating || state.reduceMotion) return;
      const blocked = e.translationX > 0 ? state.index >= state.last : state.index <= 0;
      translation.setValue(Math.max(-state.width, Math.min(state.width, e.translationX * (blocked ? 0.2 : 1))));
    })
    .onEnd((e) => {
      if (state.animating) return;
      const delta = swipePageDelta(e.translationX, e.translationY, e.velocityX / 1000);
      if (delta) go(state.index + delta); else settle();
    })
    .onFinalize((_, success) => { if (!success && !state.animating) settle(); });
  return { state, pan, go };
}
