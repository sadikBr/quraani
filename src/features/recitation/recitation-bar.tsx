import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { REPEAT_CHOICES } from '@/features/quran-reader/state/reading-preferences';
import { t } from '@/i18n';
import { dismissError, setRepeat, step, toggle, useRecitation } from './player';
import { SeekBar } from './seek-bar';

/** "٣ مرات", or "حتى تُوقفها" for endless repetition. */
export const repeatTimes = (repeat: number) => repeat === 0 ? t('recitation.repeat.endless') : t('recitation.repeat.times', { count: repeat });

/**
 * The listening controls in the reader's bottom toolbar, shown while a recitation is under way.
 * While whole surahs play, the buttons move by surah, the repetition is the surah's, and a seek
 * bar shows where the recording is.
 */
export function RecitationBar({ palette, quran }: { palette: ReaderPalette; quran: Quran }) {
  const recitation = useRecitation();
  const { update } = useReadingPreferences();
  const { status, kind, current, basmala, repeat, heard, reciter, error } = recitation;
  if (status === 'idle' && !error) return null;
  const whole = kind === 'surah';
  const surahNumber = current?.surahNumber ?? recitation.surah;
  const surah = surahNumber ? quran.surahs.find((s) => s.number === surahNumber)?.name ?? '' : '';
  const title = !current ? surah : basmala ? t('recitation.bar.basmala', { surah }) : t('recitation.bar.ayah', { surah, ayah: current.ayahNumber });
  const detail = status === 'loading' ? t('recitation.bar.loading')
    // An ayah's repetitions start after its surah's basmala; a whole surah's include it.
    : [reciter?.name, (basmala && !whole) || repeat === 1 ? '' : repeat === 0 ? t('recitation.bar.repeatProgressEndless', { heard: heard + 1 })
      : t('recitation.bar.repeatProgress', { heard: Math.min(heard + 1, repeat), repeat })].filter(Boolean).join(' · ');
  const cycleRepeat = () => {
    const choices = REPEAT_CHOICES as readonly number[];
    const next = choices[(choices.indexOf(repeat) + 1) % choices.length];
    setRepeat(next);
    update(whole ? { surahRepeat: next } : { repeat: next });
  };
  const playing = status === 'playing' || status === 'loading';
  const control = (icon: ReaderIconName, label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} hitSlop={4}
      style={({ pressed }) => [styles.control, { opacity: disabled ? 0.3 : 1, backgroundColor: pressed ? palette.accent : 'transparent' }]}>
      <ReaderIcon name={icon} color={palette.foreground} size={20} />
    </Pressable>
  );
  if (error && status === 'idle') return <View accessibilityRole="alert" style={[styles.row, styles.errorRow]}>
    <Text style={{ flex: 1, color: palette.destructive, fontSize: 13, lineHeight: 20 }}>{error}</Text>
    {control('close', t('common.close'), dismissError)}
  </View>;
  return <View accessibilityLabel={t('recitation.bar.label')}>
    <View style={styles.row}>
      <View style={styles.info}>
        <Text numberOfLines={1} style={{ color: palette.foreground, fontSize: 14, fontWeight: '600' }}>{title}</Text>
        <Text numberOfLines={1} style={{ color: error ? palette.destructive : palette.mutedForeground, fontSize: 12 }}>{error ?? detail}</Text>
      </View>
      {/* Reading runs right to left: the previous ayah (or surah) is to the right, the next to the left. */}
      {control('skip-forward', whole ? t('recitation.previousSurah') : t('recitation.previous'), () => step(-1), status === 'loading')}
      <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('recitation.pause') : t('recitation.play')} onPress={toggle} hitSlop={4}
        style={({ pressed }) => [styles.play, { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 }]}>
        {status === 'loading' ? <ActivityIndicator size="small" color={palette.primaryForeground} />
          : <ReaderIcon name={playing ? 'pause' : 'play'} color={palette.primaryForeground} size={20} />}
      </Pressable>
      {control('skip-back', whole ? t('recitation.nextSurah') : t('recitation.next'), () => step(1), status === 'loading')}
      <Pressable accessibilityRole="button" accessibilityLabel={t(whole ? 'recitation.repeat.surahSpoken' : 'recitation.repeat.spoken', { times: repeatTimes(repeat) })} onPress={cycleRepeat} hitSlop={4}
        style={({ pressed }) => [styles.repeat, { borderColor: repeat === 1 ? palette.input : palette.primary, backgroundColor: pressed ? palette.accent : repeat === 1 ? 'transparent' : palette.secondary }]}>
        <ReaderIcon name="loop" color={repeat === 1 ? palette.mutedForeground : palette.foreground} size={14} />
        <Text style={{ color: repeat === 1 ? palette.mutedForeground : palette.foreground, fontSize: 13, fontWeight: '600', lineHeight: 18 }}>
          {repeat === 0 ? t('recitation.repeat.chipEndless') : t('recitation.repeat.chip', { count: repeat })}
        </Text>
      </Pressable>
    </View>
    {whole && <SeekBar palette={palette} />}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 },
  errorRow: { gap: 8 },
  info: { flex: 1, minWidth: 0, gap: 1, paddingEnd: 4 },
  control: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.control },
  play: { width: 44, height: 44, borderRadius: readerShape.pill, alignItems: 'center', justifyContent: 'center', marginHorizontal: 2 },
  repeat: { minWidth: 52, height: 32, paddingHorizontal: 8, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: readerShape.pill, borderWidth: 1, marginStart: 4 },
});
