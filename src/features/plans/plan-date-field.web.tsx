import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerShape, withAlpha } from '../quran-reader/design';
import type { PlanDateFieldProps } from './plan-date-field';

export function PlanDateField({ label, value, onChange, mode, minimum }: PlanDateFieldProps) {
  const { palette, dark } = useReadingPreferences();
  return <View style={{ gap: 8 }}><Text style={{ color: palette.foreground, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    <input aria-label={label} type={mode} value={value} min={minimum} onChange={event => { if (event.target.value) onChange(event.target.value); }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 44, padding: '6px 12px', border: `1px solid ${palette.input}`, borderRadius: readerShape.control, boxShadow: `0 1px 2px 0 ${withAlpha(palette.foreground, 0.05)}`,
        background: palette.background, color: palette.foreground, colorScheme: dark ? 'dark' : 'light', fontFamily: 'UiSans', fontSize: 16 }} />
  </View>;
}
