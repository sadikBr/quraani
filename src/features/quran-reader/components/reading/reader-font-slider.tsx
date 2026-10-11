import { useRef } from 'react';
import { View } from 'react-native';
import Slider from '@react-native-community/slider';
import { HorizontalControl } from '@/components/swipe-tabs';
import type { ReaderPalette } from '../../theme';
import { readerFontLabel } from '../../utils/reader-typography';
import { t } from '@/i18n';

export interface ReaderFontSliderProps {
  value: number;
  previewValue: number;
  onPreview: (step: number) => void;
  onCommit: (step: number) => void;
  palette: ReaderPalette;
}

export function ReaderFontSlider({ value, previewValue, onPreview, onCommit, palette }: ReaderFontSliderProps) {
  const dragging = useRef(false);
  // Give the native control a fixed LTR base, then mirror it once. App-wide RTL
  // alone does not reliably determine the slider's thumb/track direction.
  // In the settings, whose tabs swipe, a drag on the slider moves the slider only.
  return <HorizontalControl><View collapsable={false}><Slider testID="reader-font-slider" accessibilityLabel={t('settings.fontSize.label')} accessibilityHint={t('settings.fontSize.hint')}
    accessibilityValue={{ min: 0, max: 6, now: previewValue, text: t('settings.fontSize.value', { label: readerFontLabel(previewValue), step: previewValue + 1, total: 7 }) }}
    minimumValue={0} maximumValue={6} step={1} value={value} tapToSeek
    inverted style={{ width: '100%', height: 48, direction: 'ltr' }}
    minimumTrackTintColor={palette.primary} maximumTrackTintColor={palette.muted} thumbTintColor={palette.primary}
    onSlidingStart={() => { dragging.current = true; }}
    onValueChange={(step) => {
      onPreview(step);
      // Accessibility adjustments have no touch-release event.
      if (!dragging.current) onCommit(step);
    }}
    onSlidingComplete={(step) => { dragging.current = false; onPreview(step); onCommit(step); }} /></View></HorizontalControl>;
}
