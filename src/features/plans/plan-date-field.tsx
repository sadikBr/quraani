import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { readerElevation, readerShape } from '../quran-reader/design';
import { dateLabel, localDate } from './dates';
import { localeInfo, t } from '@/i18n';

export interface PlanDateFieldProps { label: string; value: string; onChange: (value: string) => void; mode: 'date' | 'time'; minimum?: string }
/** A field that opens the platform's own picker: a Material 3 dialog on
 * Android, an inline SwiftUI wheel on iOS (both from @expo/ui). */
export function PlanDateField({ label, value, onChange, mode, minimum }: PlanDateFieldProps) {
  const { palette: p, dark } = useReadingPreferences();
  const [open, setOpen] = useState(false);
  const date = new Date(mode === 'date' ? `${value}T12:00:00` : `${localDate()}T${value}:00`);
  return <View style={{ gap: 8 }}><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={t('plans.dateField.label', { label, value: mode === 'date' ? dateLabel(value) : value })} onPress={() => setOpen(true)}
      style={({ pressed }) => [{ minHeight: 44, borderWidth: 1, borderColor: open ? p.ring : p.input, borderRadius: readerShape.control, backgroundColor: pressed ? p.accent : p.background,
        flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 }, readerElevation(1, p)]}>
      <ReaderIcon name={mode === 'date' ? 'calendar' : 'clock'} color={p.mutedForeground} size={16} />
      <Text style={{ color: p.foreground, fontSize: 16, flex: 1 }}>{mode === 'date' ? dateLabel(value) : value}</Text>
      <ReaderIcon name="chevron-down" color={p.mutedForeground} size={16} />
    </Pressable>
    {open && <DateTimePicker mode={mode} value={date} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
      themeVariant={dark ? 'dark' : 'light'} accentColor={p.primary} locale={localeInfo().tag}
      positiveButton={{ label: t('plans.dateField.done') }} negativeButton={{ label: t('common.cancel') }}
      minimumDate={minimum ? new Date(`${minimum}T00:00:00`) : undefined}
      onDismiss={() => setOpen(false)} onValueChange={(_, selected) => {
        if (Platform.OS !== 'ios') setOpen(false);
        onChange(mode === 'date' ? localDate(selected) : `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
      }} />}
    {open && Platform.OS === 'ios' && <ReaderButton palette={p} onPress={() => setOpen(false)}>{t('plans.dateField.done')}</ReaderButton>}
  </View>;
}
