import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { readerShape } from '../quran-reader/design';
import type { PlanDateFieldProps } from './plan-date-field';

export function PlanDateField({ label, value, onChange, mode, minimum }: PlanDateFieldProps) {
  const { palette, dark } = useReadingPreferences();
  return <View style={{ gap: 8 }}><Text style={{ color: palette.muted, fontSize: 13 }}>{label}</Text>
    <input aria-label={label} type={mode} value={value} min={minimum} onChange={event => { if (event.target.value) onChange(event.target.value); }}
      style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, padding: '8px 14px', border: `1px solid ${palette.border}`, borderRadius: readerShape.control,
        background: palette.paper, color: palette.text, colorScheme: dark ? 'dark' : 'light', fontFamily: 'ReaderNaskh', fontSize: 16 }} />
  </View>;
}
