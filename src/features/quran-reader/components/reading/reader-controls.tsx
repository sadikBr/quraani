import { useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { ReaderQuickActions } from './reader-quick-actions';

interface Props {
  page: QuranPage;
  previous?: QuranPage;
  next?: QuranPage;
  surahName: string;
  palette: ReaderPalette;
  visible: boolean;
  progress: Animated.Value;
  topOffset: number;
  toolbarHeight: number;
  onToolbarHeight: (height: number) => void;
  bottomInset: number;
  practiceActive: boolean;
  onNavigate: (page: number) => void;
  onPractice: () => void;
  onDismiss: () => void;
}

/** Both edges use the same animation, over a reading surface that never resizes. */
export function ReaderControls({ page, previous, next, surahName, palette, visible, progress,
  topOffset, toolbarHeight, onToolbarHeight, bottomInset, practiceActive, onNavigate, onPractice, onDismiss }: Props) {
  const [bottomHeight, setBottomHeight] = useState(60 + bottomInset);
  const hiddenProps = {
    accessibilityElementsHidden: !visible,
    importantForAccessibility: visible ? 'auto' as const : 'no-hide-descendants' as const,
    ...(Platform.OS === 'web' && !visible ? { 'aria-hidden': true, inert: true } : {}),
  };
  const button = (icon: ReaderIconName, label: string, onPress: () => void, disabled = false, reversed = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.icon, { opacity: disabled ? 0.25 : pressed ? 0.5 : 1,
        backgroundColor: pressed ? palette.accentSoft : 'transparent' }]}>
      <View style={reversed ? { transform: [{ rotate: '180deg' }] } : undefined}>
        <ReaderIcon name={icon} color={palette.text} size={20} />
      </View>
    </Pressable>
  );
  return <>
    <View pointerEvents="box-none" style={[styles.edge, { top: topOffset }]}>
      <Animated.View style={{ backgroundColor: palette.paper,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-toolbarHeight, 0] }) }] }}>
        <View {...hiddenProps} pointerEvents={visible ? 'auto' : 'none'}
          onLayout={(event) => onToolbarHeight(event.nativeEvent.layout.height)}
          style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border }}>
          <View style={styles.content}>
            <ReaderQuickActions page={page} surahName={surahName} palette={palette} />
          </View>
        </View>
      </Animated.View>
    </View>
    <View {...hiddenProps} pointerEvents={visible ? 'box-none' : 'none'} style={[styles.edge, styles.bottom]}>
      <Animated.View accessibilityLabel="التنقل في المصحف" onLayout={(event) => setBottomHeight(event.nativeEvent.layout.height)}
        style={{ backgroundColor: palette.paper, paddingBottom: bottomInset, borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [bottomHeight, 0] }) }] }}>
        <View style={[styles.content, styles.navigation]} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
          <Link href="/bookmarks" asChild style={styles.icon}>
            <Pressable accessibilityRole="link" accessibilityLabel="العلامات المحفوظة">
              {({ pressed }) => <ReaderIcon name="bookmark" color={pressed ? palette.accent : palette.text} size={20} />}
            </Pressable>
          </Link>
          {button('chevron', 'انتقل إلى الصفحة التالية', () => next && onNavigate(next.number), !next)}
          {/* The reader's persistent page number stays centered above this gap. */}
          <View style={styles.page} />
          {button('chevron', 'انتقل إلى الصفحة السابقة', () => previous && onNavigate(previous.number), !previous, true)}
          {practiceActive
            ? button('book', 'إدارة المقطع المخفي', onPractice)
            : button('close', 'إخفاء أدوات القراءة', onDismiss)}
        </View>
      </Animated.View>
    </View>
  </>;
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, overflow: 'hidden', zIndex: 2 },
  bottom: { bottom: 0 },
  content: { width: '100%', maxWidth: 700, alignSelf: 'center' },
  navigation: { ...Platform.select({ native: { direction: 'ltr' as const } }), flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4, gap: 4 },
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  page: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
