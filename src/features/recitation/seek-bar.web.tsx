import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { t } from '@/i18n';
import { formatClock } from './clock';
import { seekTo, useRecitationProgress } from './player';

/** Where the whole surah's recording is, with the time gone and its length; dragging moves within it. */
export function SeekBar({ palette: p }: { palette: ReaderPalette }) {
  const { position, duration } = useRecitationProgress();
  const [held, setHeld] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const shown = held ?? Math.min(position, duration);
  const known = duration > 0;
  const share = known ? shown / duration * 100 : 0;
  // The input's `change` comes once the thumb is let go (or a key moves it): then the recording seeks.
  useEffect(() => {
    const element = input.current;
    if (!element) return;
    const commit = () => { seekTo(Number(element.value)); setHeld(null); };
    element.addEventListener('change', commit);
    return () => element.removeEventListener('change', commit);
  }, []);
  return <View style={styles.row}>
    <Text style={[styles.time, { color: p.mutedForeground }]}>{formatClock(shown)}</Text>
    <style>{`
      .qarani-seek { appearance: none; width: 100%; height: 28px; margin: 0; padding: 0; background: transparent; cursor: pointer; touch-action: pan-y; }
      .qarani-seek:disabled { cursor: default; opacity: .5; }
      .qarani-seek::-webkit-slider-runnable-track { height: 4px; border-radius: 999px; background: var(--seek-track); }
      .qarani-seek::-moz-range-track { height: 4px; border-radius: 999px; background: var(--seek-track); }
      .qarani-seek::-webkit-slider-thumb { appearance: none; width: 14px; height: 14px; margin-top: -5px; border-radius: 50%; background: var(--seek-accent); }
      .qarani-seek::-moz-range-thumb { width: 14px; height: 14px; border: 0; border-radius: 50%; background: var(--seek-accent); }
      .qarani-seek:focus-visible { outline: 2px solid var(--seek-accent); outline-offset: 3px; border-radius: 4px; }
    `}</style>
    {/* Holds on to the touch, so dragging the thumb never turns the reader's page. */}
    <View style={styles.track} onStartShouldSetResponder={() => true} onResponderTerminationRequest={() => false}>
      <input ref={input} className="qarani-seek" type="range" min={0} max={known ? duration : 1} step={1000} value={known ? shown : 0} dir="rtl" disabled={!known}
        aria-label={t('recitation.bar.seek')} aria-valuetext={t('recitation.bar.time', { position: formatClock(shown), duration: formatClock(duration) })}
        style={{ '--seek-accent': p.primary, '--seek-track': `linear-gradient(to left, ${p.primary} ${share}%, ${p.muted} ${share}%)` } as CSSProperties}
        onChange={(event) => setHeld(Number(event.currentTarget.value))} />
    </View>
    <Text style={[styles.time, { color: p.mutedForeground }]}>{known ? formatClock(duration) : '–:––'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  time: { fontSize: 11, minWidth: 34, textAlign: 'center', fontVariant: ['tabular-nums'] },
  track: { flex: 1, minWidth: 0 },
});
