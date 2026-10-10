import { useEffect, useState } from 'react';
import { Animated, Easing, Keyboard, Platform, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

export { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

/** A sheet container that can follow the finger. */
export const AnimatedSafeAreaView = Animated.createAnimatedComponent(SafeAreaView);

const nativeDriver = Platform.OS !== 'web';
/** Dragged further than this (or flicked down), the sheet closes; otherwise it springs back. */
const closeDistance = (height: number) => Math.min(140, height * 0.3);

function createSwipeToClose() {
  const offset = new Animated.Value(0);
  // One mutable object, not closure variables: gesture callbacks may be compiled as worklets,
  // which copy the variables they capture, so plain `let` assignments would not be shared.
  const state = { onClose: () => {}, enabled: true, height: 0, headerBottom: 0, atTop: true, closing: false, dragging: false };

  const springBack = () => Animated.spring(offset, { toValue: 0, speed: 20, bounciness: 0, useNativeDriver: nativeDriver }).start();
  const settle = (dy: number, vy: number) => {
    if (state.enabled && (dy > closeDistance(state.height || 400) || (vy > 900 && dy > 24))) {
      state.closing = true;
      Animated.timing(offset, { toValue: (state.height || 600) + 40, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver })
        .start(() => state.onClose());
    } else springBack();
  };

  // The sheet's list keeps scrolling natively; the drag runs alongside it and only moves the
  // sheet when it starts on the header, or while the list is scrolled to the top.
  const scroll = Gesture.Native();
  const drag = Gesture.Pan().runOnJS(true)
    .activeOffsetY(8).failOffsetX([-24, 24])
    .simultaneousWithExternalGesture(scroll)
    .onBegin(e => { state.dragging = state.enabled && !state.closing && (e.y <= state.headerBottom || state.atTop); })
    .onStart(() => { if (state.dragging) Keyboard.dismiss(); })
    .onUpdate(e => { if (state.dragging) offset.setValue(Math.max(0, e.translationY)); })
    .onEnd(e => { if (state.dragging) settle(e.translationY, e.velocityY); })
    .onFinalize((_, success) => { if (state.dragging && !success && !state.closing) springBack(); state.dragging = false; });

  return {
    update(next: () => void, isEnabled: boolean) { state.onClose = next; state.enabled = isEnabled; },
    swipe: {
      offset,
      /** On the sheet's GestureDetector. */
      gesture: drag,
      /** On a GestureDetector around the sheet's ScrollView or FlatList. */
      scrollGesture: scroll,
      sheetStyle: { transform: [{ translateY: offset }] },
      onSheetLayout: (e: LayoutChangeEvent) => { state.height = e.nativeEvent.layout.height; },
      /** On the header (title row); a drag that starts above its bottom edge always moves the sheet. */
      onHeaderLayout: (e: LayoutChangeEvent) => { state.headerBottom = e.nativeEvent.layout.y + e.nativeEvent.layout.height; },
      scrollProps: {
        scrollEventThrottle: 16,
        onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { state.atTop = e.nativeEvent.contentOffset.y <= 1; },
        // The sheet itself is the overscroll: no stretch or bounce under the finger while it moves.
        overScrollMode: 'never' as const,
        bounces: false,
      },
    },
  };
}

/**
 * Drag a bottom sheet down to close it, the way native sheets behave: from the handle and header
 * at any time, and from anywhere on the sheet while its content is scrolled to the top.
 * The sheet follows the finger (`sheetStyle`); a short drag springs back, and `onClose` runs once
 * the sheet has slid away, so it closes exactly like the close button.
 *
 * Inside a React Native `Modal`, wrap the content in `GestureHandlerRootView` (Android needs it).
 */
export function useSwipeToClose(onClose: () => void, { enabled = true }: { enabled?: boolean } = {}) {
  const [controller] = useState(createSwipeToClose);
  useEffect(() => { controller.update(onClose, enabled); });
  return controller.swipe;
}
