import { Image } from 'expo-image';
import { View } from 'react-native';

/** The shared book-and-arch mark; surrounding text supplies its accessible name. */
export function QuranniLogo({ color, size = 44, onDisplay, onError }: { color?: string; size?: number; onDisplay?: () => void; onError?: () => void }) {
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
    <Image source={require('@/assets/brand/logo.png')} tintColor={color}
      contentFit="contain" transition={0} accessible={false} loading="eager" onDisplay={onDisplay} onError={onError}
      style={{ width: size, height: size }} />
  </View>;
}
