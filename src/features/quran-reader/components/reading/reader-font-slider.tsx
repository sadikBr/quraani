import { useRef } from 'react';
import Slider from '@react-native-community/slider';
import type { ReaderPalette } from '../../theme';
import { readerFontLabels } from '../../utils/reader-typography';

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
  return <Slider testID="reader-font-slider" accessibilityLabel="حجم نص القرآن" accessibilityHint="سبعة أحجام، من الأصغر إلى الأكبر"
    accessibilityValue={{ min: 0, max: 6, now: previewValue, text: `${readerFontLabels[previewValue]}، ${previewValue + 1} من 7` }}
    minimumValue={0} maximumValue={6} step={1} value={value} tapToSeek
    inverted style={{ width: '100%', height: 48, direction: 'ltr' }}
    minimumTrackTintColor={palette.accent} maximumTrackTintColor={palette.border} thumbTintColor={palette.accent}
    onSlidingStart={() => { dragging.current = true; }}
    onValueChange={(step) => {
      onPreview(step);
      // Accessibility adjustments have no touch-release event.
      if (!dragging.current) onCommit(step);
    }}
    onSlidingComplete={(step) => { dragging.current = false; onPreview(step); onCommit(step); }} />;
}
