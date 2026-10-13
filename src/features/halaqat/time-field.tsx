import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import { readerShape, withAlpha } from '@/features/quran-reader/design';
import { PrayerSheet } from '@/features/prayers/sheet';
import { localDate } from '@/features/plans/dates';
import { localeInfo, t } from '@/i18n';

export interface TimeFieldProps { label: string; value: string; onChange: (value: string) => void }

/**
 * A time written large on a gold-edged pill («18:00»): tapping it opens the platform's own picker
 * (Android's dialog; on iOS a wheel in a sheet).
 */
export function TimeField({ label, value, onChange }: TimeFieldProps) {
  const { palette: p, dark } = useReadingPreferences();
  const [open, setOpen] = useState(false);
  const date = new Date(`${localDate()}T${value}:00`);
  const picker = <DateTimePicker mode="time" value={date} is24Hour display={Platform.OS === 'ios' ? 'spinner' : 'default'}
    themeVariant={dark ? 'dark' : 'light'} accentColor={p.primary} locale={localeInfo().tag}
    positiveButton={{ label: t('plans.dateField.done') }} negativeButton={{ label: t('common.cancel') }}
    onDismiss={() => setOpen(false)} onValueChange={(_, selected) => {
      if (Platform.OS !== 'ios') setOpen(false);
      onChange(`${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`);
    }} />;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={t('plans.dateField.label', { label, value })} onPress={() => setOpen(true)} hitSlop={4}
      style={({ pressed }) => [s.pill, { borderColor: withAlpha(p.ornament, 0.6), backgroundColor: pressed ? p.accent : withAlpha(p.ornament, 0.08) }]}>
      <Text style={{ color: p.foreground, fontSize: 20, lineHeight: 26, fontFamily: 'UiNumericSemiBold', writingDirection: 'ltr' }}>{value}</Text>
    </Pressable>
    {open && Platform.OS !== 'ios' && picker}
    {open && Platform.OS === 'ios' && <PrayerSheet title={label} onClose={() => setOpen(false)}>
      <View style={{ gap: 12, paddingBottom: 8 }}>
        {picker}
        <ReaderButton palette={p} selected onPress={() => setOpen(false)}>{t('plans.dateField.done')}</ReaderButton>
      </View>
    </PrayerSheet>}
  </>;
}

const s = StyleSheet.create({
  pill: { minHeight: 40, minWidth: 84, paddingHorizontal: 14, borderRadius: readerShape.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
