import { readerShape, withAlpha } from '../../design';
import { useState, type ReactNode } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import { ReaderIcon, type ReaderIconName } from '../ui/reader-chrome';
import { ReaderQuickActions } from './reader-quick-actions';
import { ArabicText as Text } from '@/components/arabic-text';
import { t } from '@/i18n';

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
  /** The page's name in place of its number (a thumun page: "الحزب 2 · الثمن 1"); the progress stays. */
  pageName?: string;
  /** A recitation is under way: the listen button stops it. */
  listening: boolean;
  onListen: () => void;
  /** The recitation controls, shown above the page navigation while listening. */
  recitation?: ReactNode;
}

/** Both edges use the same animation, over a reading surface that never resizes. */
export function ReaderControls({ page, totalPages, previous, next, surahName, palette, visible, progress,
  topInset, toolbarHeight, onToolbarHeight, bottomInset, practiceActive, practiceComplete, onNavigate, onJump, onMenu, onPractice, onRevealWord, onRevealAyah, onDismiss, planControls, pageLabel, pageName, listening, onListen, recitation }: Props) {
  const [bottomHeight, setBottomHeight] = useState(60 + bottomInset);
  const hiddenProps = {
    accessibilityElementsHidden: !visible,
    importantForAccessibility: visible ? 'auto' as const : 'no-hide-descendants' as const,
    ...(Platform.OS === 'web' && !visible ? { 'aria-hidden': true, inert: true } : {}),
  };
  const button = (icon: ReaderIconName, label: string, onPress: () => void) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.icon, { opacity: pressed ? 0.5 : 1, backgroundColor: pressed ? palette.accent : 'transparent' }]}>
      <ReaderIcon name={icon} color={palette.foreground} size={20} />
    </Pressable>
  );
  const practiceButton = (icon: ReaderIconName, text: string, label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.practiceButton, { opacity: disabled ? 0.3 : pressed ? 0.55 : 1,
        backgroundColor: pressed ? palette.accent : icon === 'eye' ? palette.secondary : 'transparent', borderColor: icon === 'eye' ? palette.secondary : palette.input }]}>
      <ReaderIcon name={icon} color={palette.foreground} size={16} />
      <Text style={{ fontSize: 14, fontWeight: '500', color: palette.foreground }}>{text}</Text>
    </Pressable>
  );
  return <>
    <View pointerEvents="box-none" style={[styles.edge, { top: 0 }]}>
      {/* Also fade the surface so a fractional-pixel border cannot remain at the clipped edge. */}
      <Animated.View style={{ backgroundColor: palette.card, opacity: progress, paddingTop: topInset,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-(topInset + toolbarHeight), 0] }) }] }}>
        <View {...hiddenProps} pointerEvents={visible ? 'auto' : 'none'}
          onLayout={(event) => onToolbarHeight(event.nativeEvent.layout.height)}
          style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: palette.border }}>
          <View style={styles.content}>
            <ReaderQuickActions page={page} surahName={surahName} palette={palette} onMenu={onMenu} />
          </View>
        </View>
      </Animated.View>
    </View>
    <View {...hiddenProps} pointerEvents={visible ? 'box-none' : 'none'} style={[styles.edge, styles.bottom]}>
      <Animated.View accessibilityLabel={t('reader.controls.navigation')} onLayout={(event) => setBottomHeight(event.nativeEvent.layout.height)}
        style={{ backgroundColor: palette.card, opacity: progress, paddingBottom: bottomInset, borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [bottomHeight, 0] }) }] }}>
        {planControls && <View style={styles.content}>{planControls}</View>}
        {practiceActive && <View style={[styles.content, styles.practice]} accessibilityLabel={t('reader.controls.practiceTools')}>
          {practiceButton('eye', t('reader.controls.showAll'), t('reader.controls.showAllLabel'), onPractice)}
          {practiceButton('word', t('reader.controls.word'), t('reader.controls.wordLabel'), onRevealWord, practiceComplete)}
          {practiceButton('lines', t('reader.controls.ayah'), t('reader.controls.ayahLabel'), onRevealAyah, practiceComplete)}
        </View>}
        {recitation && <View style={styles.content}>{recitation}</View>}
        <View style={[styles.content, styles.navigation]} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
          {/* The page sits in the middle; the two sides share the rest equally, their buttons at the edges. */}
          <View style={[styles.side, styles.left]}>
            <Link href="/bookmarks" asChild style={styles.icon}>
              <Pressable accessibilityRole="link" accessibilityLabel={t('reader.controls.bookmarks')}>
                {({ pressed }) => <ReaderIcon name="bookmark" color={pressed ? palette.primary : palette.foreground} size={20} />}
              </Pressable>
            </Link>
          </View>
          {/* Pages turn by swiping the page; with a screen reader, by adjusting this (swipe up or down). */}
          <Pressable accessibilityRole="adjustable" accessibilityLabel={t('reader.controls.jump', { position: pageLabel ?? (pageName ? t('reader.thumun.spoken', { position: pageName, page: page.number, total: totalPages }) : t('reader.controls.pageOf', { page: page.number, total: totalPages })) })}
            accessibilityActions={[{ name: 'increment', label: t('reader.controls.nextPage') }, { name: 'decrement', label: t('reader.controls.previousPage') }]}
            onAccessibilityAction={(event) => {
              const to = event.nativeEvent.actionName === 'increment' ? next : event.nativeEvent.actionName === 'decrement' ? previous : undefined;
              if (to) onNavigate(to.number);
            }}
            onPress={onJump} style={({ pressed }) => [styles.page, { opacity: pressed ? 0.6 : 1 }]}>
            <View style={[styles.pagePill, { backgroundColor: palette.muted }]}>
              <Text numberOfLines={1} style={{ color: palette.foreground, fontSize: 13, fontWeight: '500', lineHeight: 22, writingDirection: 'rtl', textAlign: 'center' }}>{pageLabel ?? pageName ?? t('reader.controls.page', { page: page.number })}</Text>
              {!pageLabel && <View style={[styles.pageTrack, { backgroundColor: withAlpha(palette.primary, 0.2) }]}>
                <View style={[styles.pageFill, { backgroundColor: palette.primary, width: `${Math.max(2, Math.min(100, page.number / Math.max(1, totalPages) * 100))}%` }]} />
              </View>}
            </View>
          </Pressable>
          <View style={[styles.side, styles.right]}>
            <Pressable accessibilityRole="button" accessibilityLabel={listening ? t('recitation.stop') : t('recitation.start')} accessibilityState={{ selected: listening }} onPress={onListen}
              style={({ pressed }) => [styles.icon, { opacity: pressed ? 0.5 : 1, backgroundColor: pressed ? palette.accent : listening ? palette.secondary : 'transparent' }]}>
              <ReaderIcon name="headphones" color={listening ? palette.primary : palette.foreground} size={20} />
            </Pressable>
            {practiceActive
              ? button('close', t('reader.controls.hideTools'), onDismiss)
              : button('eye-off', t('reader.controls.practice'), onPractice)}
          </View>
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
    paddingHorizontal: 8, paddingVertical: 4, gap: 2 },
  icon: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  side: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  page: { flexShrink: 1, minWidth: 0, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  pagePill: { minWidth: 104, maxWidth: '100%', paddingHorizontal: 14, paddingTop: 3, paddingBottom: 7, borderRadius: readerShape.lg, alignItems: 'center', gap: 3 },
  // The track fills from the reading start (right), like the mushaf.
  pageTrack: { width: 72, height: 4, borderRadius: readerShape.pill, overflow: 'hidden', flexDirection: 'row-reverse' },
  pageFill: { height: '100%', borderRadius: readerShape.pill },
  practice: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },
  practiceButton: { flex: 1, minHeight: 40, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control, borderWidth: 1 },
});
