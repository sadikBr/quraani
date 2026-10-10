import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerShape } from '../quran-reader/design';
import { dateLabel, localDate } from './dates';

export interface PlanDateFieldProps { label: string; value: string; onChange: (value: string) => void; mode: 'date' | 'time'; minimum?: string }
/** A field that opens the platform's own picker: a Material 3 dialog on
 * Android, an inline SwiftUI wheel on iOS (both from @expo/ui). */
export function PlanDateField({ label, value, onChange, mode, minimum }: PlanDateFieldProps) {
  const { palette: p, dark } = useReadingPreferences();
  const [open, setOpen] = useState(false);
  const date = new Date(mode === 'date' ? `${value}T12:00:00` : `${localDate()}T${value}:00`);
  return <View style={{ gap: 8 }}><Text style={{ color: p.muted, fontSize: 13 }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${mode === 'date' ? dateLabel(value) : value}`} onPress={() => setOpen(true)}
      style={({ pressed }) => ({ minHeight: 52, borderWidth: 1, borderColor: open ? p.accent : p.border, borderRadius: readerShape.control, backgroundColor: pressed ? p.accentSoft : p.paper,
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 })}>
      <ReaderIcon name={mode === 'date' ? 'calendar' : 'clock'} color={p.accent} size={20} />
      <Text style={{ color: p.text, fontSize: 16, flex: 1 }}>{mode === 'date' ? dateLabel(value) : value}</Text>
      <ReaderIcon name="chevron" color={p.muted} size={18} />
    </Pressable>
    {open && <DateTimePicker mode={mode} value={date} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      themeVariant={dark ? 'dark' : 'light'} accentColor={p.accent} locale="ar"
      positiveButton={{ label: 'تم' }} negativeButton={{ label: 'إلغاء' }}
      minimumDate={minimum ? new Date(`${minimum}T00:00:00`) : undefined}
      onDismiss={() => setOpen(false)} onValueChange={(_, selected) => {
        if (Platform.OS !== 'ios') setOpen(false);
        onChange(mode === 'date' ? localDate(selected) : `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
      }} />}
    {open && Platform.OS === 'ios' && <ReaderButton palette={p} onPress={() => setOpen(false)}>تم</ReaderButton>}
  </View>;
}
