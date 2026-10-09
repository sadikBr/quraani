import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { dateLabel, localDate } from './dates';

export interface PlanDateFieldProps { label: string; value: string; onChange: (value: string) => void; mode: 'date' | 'time'; minimum?: string }
export function PlanDateField({ label, value, onChange, mode, minimum }: PlanDateFieldProps) {
  const { palette, dark } = useReadingPreferences();
  const [open, setOpen] = useState(false);
  const date = new Date(mode === 'date' ? `${value}T12:00:00` : `${localDate()}T${value}:00`);
  return <View style={{ gap: 8 }}><Text style={{ color: palette.text, fontSize: 14 }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={() => setOpen(true)} style={{ minHeight: 48, borderWidth: 1, borderColor: palette.border, borderRadius: 5, justifyContent: 'center', paddingHorizontal: 12 }}>
      <Text style={{ color: palette.text, fontSize: 16 }}>{mode === 'date' ? dateLabel(value) : value}</Text>
    </Pressable>
    {open && <DateTimePicker mode={mode} value={date} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      themeVariant={dark ? 'dark' : 'light'} textColor={palette.text} accentColor={palette.accent}
      minimumDate={minimum ? new Date(`${minimum}T00:00:00`) : undefined}
      onDismiss={() => setOpen(false)} onValueChange={(_, selected) => {
        if (Platform.OS !== 'ios') setOpen(false);
        onChange(mode === 'date' ? localDate(selected) : `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
      }} />}
    {open && Platform.OS === 'ios' && <ReaderButton palette={palette} onPress={() => setOpen(false)}>تم</ReaderButton>}
  </View>;
}
