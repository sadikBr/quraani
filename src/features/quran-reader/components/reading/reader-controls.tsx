import { readerShape, withAlpha } from '../../design';
import { useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { ReaderQuickActions } from './reader-quick-actions';
import { ArabicText as Text } from '@/components/arabic-text';

interface Props {
  page: QuranPage;
  totalPages: number;
  previous?: QuranPage;
  next?: QuranPage;
  surahName: string;
  palette: ReaderPalette;
  visible: boolean;
  progress: Animated.Value;
  topInset: number;
  toolbarHeight: number;
  onToolbarHeight: (height: number) => void;
  bottomInset: number;
  practiceActive: boolean;
  practiceComplete: boolean;
  onNavigate: (page: number) => void;
  onJump: () => void;
  onMenu: () => void;
  onPractice: () => void;
  onRevealWord: () => void;
  onRevealAyah: () => void;
  onDismiss: () => void;
  planControls?: ReactNode;
  pageLabel?: string;
}

/** Both edges use the same animation, over a reading surface that never resizes. */
export function ReaderControls({ page, totalPages, previous, next, surahName, palette, visible, progress,
  topInset, toolbarHeight, onToolbarHeight, bottomInset, practiceActive, practiceComplete, onNavigate, onJump, onMenu, onPractice, onRevealWord, onRevealAyah, onDismiss, planControls, pageLabel }: Props) {
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
  const practiceButton = (icon: ReaderIconName, text: string, label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.practiceButton, { opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
        backgroundColor: icon === 'eye' || pressed ? palette.accentSoft : 'transparent' }]}>
      <ReaderIcon name={icon} color={palette.accent} size={19} />
      <Text style={{ fontSize: 13, color: palette.text }}>{text}</Text>
    </Pressable>
  );
  return <>
    <View pointerEvents="box-none" style={[styles.edge, { top: 0 }]}>
      {/* Also fade the surface so a fractional-pixel border cannot remain at the clipped edge. */}
      <Animated.View style={{ backgroundColor: palette.paper, opacity: progress, paddingTop: topInset,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-(topInset + toolbarHeight), 0] }) }] }}>
        <View {...hiddenProps} pointerEvents={visible ? 'auto' : 'none'}
          onLayout={(event) => onToolbarHeight(event.nativeEvent.layout.height)}
          style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(palette.border, 0.6) }}>
          <View style={styles.content}>
            <ReaderQuickActions page={page} surahName={surahName} palette={palette} onMenu={onMenu} />
          </View>
        </View>
      </Animated.View>
    </View>
    <View {...hiddenProps} pointerEvents={visible ? 'box-none' : 'none'} style={[styles.edge, styles.bottom]}>
      <Animated.View accessibilityLabel="التنقل في المصحف" onLayout={(event) => setBottomHeight(event.nativeEvent.layout.height)}
        style={{ backgroundColor: palette.paper, opacity: progress, paddingBottom: bottomInset, borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: withAlpha(palette.border, 0.6), transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [bottomHeight, 0] }) }] }}>
        {planControls && <View style={styles.content}>{planControls}</View>}
        {practiceActive && <View style={[styles.content, styles.practice]} accessibilityLabel="أدوات مراجعة الصفحة">
          {practiceButton('eye', 'إظهار الكل', 'إظهار الصفحة كاملة وإنهاء المراجعة', onPractice)}
          {practiceButton('word', 'كلمة', 'إظهار الكلمة التالية', onRevealWord, practiceComplete)}
          {practiceButton('lines', 'آية', 'إظهار الآية التالية كاملة', onRevealAyah, practiceComplete)}
        </View>}
        <View style={[styles.content, styles.navigation]} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
          <Link href="/bookmarks" asChild style={styles.icon}>
            <Pressable accessibilityRole="link" accessibilityLabel="العلامات المحفوظة">
              {({ pressed }) => <ReaderIcon name="bookmark" color={pressed ? palette.accent : palette.text} size={20} />}
            </Pressable>
          </Link>
          {button('chevron', 'انتقل إلى الصفحة التالية', () => next && onNavigate(next.number), !next)}
          <Pressable accessibilityRole="button" accessibilityLabel={`${pageLabel ?? `الصفحة ${page.number} من ${totalPages}`}، الانتقال إلى صفحة أو آية`}
            onPress={onJump} style={({ pressed }) => [styles.page, { opacity: pressed ? 0.6 : 1 }]}>
            <View style={[styles.pagePill, { backgroundColor: palette.accentSoft }]}>
              <Text style={{ color: palette.text, fontSize: 13, lineHeight: 22, writingDirection: 'rtl', textAlign: 'center' }}>{pageLabel ?? `صفحة ${page.number}`}</Text>
              {!pageLabel && <View style={[styles.pageTrack, { backgroundColor: withAlpha(palette.ornament, 0.22) }]}>
                <View style={[styles.pageFill, { backgroundColor: palette.ornament, width: `${Math.max(2, Math.min(100, page.number / Math.max(1, totalPages) * 100))}%` }]} />
              </View>}
            </View>
          </Pressable>
          {button('chevron', 'انتقل إلى الصفحة السابقة', () => previous && onNavigate(previous.number), !previous, true)}
          {practiceActive
            ? button('close', 'إخفاء أدوات القراءة', onDismiss)
            : button('eye-off', 'إخفاء آيات الصفحة للمراجعة', onPractice)}
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
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  page: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  pagePill: { minWidth: 120, paddingHorizontal: 18, paddingTop: 3, paddingBottom: 7, borderRadius: readerShape.control, alignItems: 'center', gap: 3 },
  // The track fills from the reading start (right), like the mushaf.
  pageTrack: { width: 72, height: 3, borderRadius: readerShape.detail, overflow: 'hidden', flexDirection: 'row-reverse' },
  pageFill: { height: '100%', borderRadius: readerShape.detail },
  practice: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },
  practiceButton: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
});
