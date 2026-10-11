import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import { formatClock } from './clock';
import { seekTo, useRecitationProgress } from './player';

/** How far a screen reader's swipe up or down moves in the recording. */
const ACCESSIBILITY_STEP_MS = 15_000;

/** Where the whole surah's recording is, with the time gone and its length; dragging moves within it. */
export function SeekBar({ palette: p }: { palette: ReaderPalette }) {
  const { position, duration } = useRecitationProgress();
  // While the thumb is held, the time shows where it would seek to; the slider itself is left
  // alone (its value is not controlled during a drag).
  const [held, setHeld] = useState<{ from: number; at: number } | null>(null);
  const shown = held ? held.at : Math.min(position, duration);
  const known = duration > 0;
  // Whole seconds: without a step the Android slider has only 128 positions, a minute apart in a long surah.
  const max = known ? Math.ceil(duration / 1000) * 1000 : 1000;
  const text = t('recitation.bar.time', { position: formatClock(shown), duration: formatClock(duration) });
  return <View style={styles.row}>
    <Text style={[styles.time, { color: p.mutedForeground }]}>{formatClock(shown)}</Text>
    {/* One adjustable element for screen readers, which move by 15 seconds; the slider is for touch. */}
    <View accessible={known} accessibilityRole="adjustable" accessibilityLabel={t('recitation.bar.seek')} accessibilityValue={{ text }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => seekTo(position + (event.nativeEvent.actionName === 'increment' ? ACCESSIBILITY_STEP_MS : -ACCESSIBILITY_STEP_MS))}
      style={styles.track}>
      {/* A fixed LTR base, mirrored once, as for the font size slider: the start of the surah is on the right. */}
      <Slider accessible={false} importantForAccessibility="no-hide-descendants" disabled={!known}
        minimumValue={0} maximumValue={max} step={1000} value={known ? (held ? held.from : shown) : 0} tapToSeek inverted style={styles.slider}
        minimumTrackTintColor={p.primary} maximumTrackTintColor={p.muted} thumbTintColor={p.primary}
        onSlidingStart={(value) => setHeld({ from: Math.min(position, duration), at: value })}
        onValueChange={(value) => setHeld((h) => h && { ...h, at: value })}
        onSlidingComplete={(value) => { setHeld(null); seekTo(value); }} />
    </View>
    <Text style={[styles.time, { color: p.mutedForeground }]}>{known ? formatClock(duration) : '–:––'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  time: { fontSize: 11, minWidth: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
  track: { flex: 1, minWidth: 0 },
  slider: { width: '100%', height: 28, direction: 'ltr' },
});
