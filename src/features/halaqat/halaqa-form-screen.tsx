import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button, Chip } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { Segments } from '@/features/quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { usePlans } from '@/features/plans/provider';
import { PlanField, SwitchRow } from '@/features/plans/components';
import { PlanDateField } from '@/features/plans/plan-date-field';
import { WeekdayPicker } from '@/features/plans/recurring-components';
import { CreationFooter } from '@/features/plans/goal-creation-components';
import { t } from '@/i18n';
import { useHalaqat } from './provider';
import { NAME_LIMIT, newId, REMINDER_LEADS, type Clock, type ReminderLead } from './model';
import { HalaqaReminderError, remindersSupported, requestHalaqaReminders } from './notifications';
import { ConfirmDialog } from './confirm-dialog';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Making a halaqa, or changing one (`?id=`): its name, its riwayah, the days and time it meets, and a reminder before each session. */
export function HalaqaFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { palette: p, preferences } = useReadingPreferences();
  const { state, change } = useHalaqat();
  const { today } = usePlans();
  const existing = state.halaqat.find((h) => h.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [riwayah, setRiwayah] = useState<Riwayah>(existing?.riwayah ?? preferences.riwayah);
  const [days, setDays] = useState<number[]>(existing?.weekdays ?? []);
  const [deleting, setDeleting] = useState(false);
  const [time, setTime] = useState<Clock | undefined>(existing?.time);
  const [lead, setLead] = useState<ReminderLead | undefined>(existing?.reminder?.before);
  const [message, setMessage] = useState('');
  // A reminder is asked for notifications when it is turned on.
  const remind = async (on: boolean) => {
    setMessage('');
    if (!on) { setLead(undefined); return; }
    try { await requestHalaqaReminders(); } catch (error) {
      setMessage(error instanceof HalaqaReminderError ? error.message : t('halaqat.reminders.unavailable'));
      return;
    }
    setLead(60);
  };
  // The riwayah counts the halaqa's ayahs: it is fixed once a portion is recorded by it.
  const locked = !!existing && (existing.sessions.length > 0 || existing.students.some((s) => s.known.length || s.first));
  const valid = !!name.trim() && name.trim().length <= NAME_LIMIT;
  const save = () => {
    if (!valid) return;
    Keyboard.dismiss();
    const halaqaId = existing?.id ?? newId('halaqa');
    change({ type: 'saveHalaqa', halaqa: { id: halaqaId, name: name.trim(), riwayah, weekdays: [...days].sort((a, b) => a - b),
      ...(time ? { time } : {}), ...(time && lead !== undefined ? { reminder: { before: lead } } : {}), createdOn: existing?.createdOn ?? today } });
    if (existing) router.back();
    else router.replace({ pathname: '/halaqat/[id]', params: { id: halaqaId } });
  };
  const back = { label: t('common.back'), onPress: () => router.back() };
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBar back={back} palette={p} />
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, { gap: 24 }]}>
        <PageTitle title={existing ? t('halaqat.form.editTitle') : t('halaqat.form.newTitle')} subtitle={t('halaqat.form.subtitle')} palette={p} />
        <PlanField label={t('halaqat.form.name')} value={name} onChange={setName} placeholder={t('halaqat.form.namePlaceholder')} />
        <Section title={t('halaqat.form.riwayah')} palette={p}>
          {locked ? <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('halaqat.form.riwayahLocked')}</Text>
            : <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />}
        </Section>
        <Section title={t('halaqat.form.days')} palette={p}>
          <View style={[s.panel, { backgroundColor: p.card, borderColor: p.border }]}>
            <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('common.weekdays.everyDay'), value: EVERY_DAY }]} emptyLabel={t('halaqat.list.noDays')} />
          </View>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('halaqat.form.daysHint')}</Text>
        </Section>
        <Section title={t('halaqat.reminders.title')} palette={p}>
          <RowGroup palette={p}>
            <SwitchRow icon="clock" label={t('halaqat.reminders.timeSwitch')} detail={time ? undefined : t('halaqat.reminders.timeDetail')} checked={!!time}
              onChange={(on) => { setTime(on ? { hour: 17, minute: 0 } : undefined); if (!on) setLead(undefined); }} />
            {time && <View key="time" style={s.inset}>
              <PlanDateField label={t('halaqat.reminders.time')} mode="time" value={clockText(time)}
                onChange={(value) => { const [hour, minute] = value.split(':').map(Number); setTime({ hour, minute }); }} />
            </View>}
            {time && <SwitchRow key="remind" icon="bell" label={t('halaqat.reminders.remind')} detail={remindersSupported ? t('halaqat.reminders.remindDetail') : t('halaqat.reminders.phoneOnly')}
              checked={lead !== undefined} disabled={!remindersSupported} onChange={(on) => void remind(on)} />}
            {time && lead !== undefined && <View key="lead" style={[s.inset, { gap: 8 }]}>
              <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('halaqat.reminders.lead')}</Text>
              <View accessibilityRole="radiogroup" accessibilityLabel={t('halaqat.reminders.lead')} style={s.leads}>
                {REMINDER_LEADS.map((value) => <Chip key={value} accessibilityRole="radio" palette={p} label={t(`halaqat.reminders.leads.${value}`)} selected={lead === value} onPress={() => setLead(value)} />)}
              </View>
              {!days.length && <Text style={{ color: p.warning, fontSize: 13 }}>{t('halaqat.reminders.needsDays')}</Text>}
            </View>}
          </RowGroup>
          {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
        </Section>
        {existing && <Section title={t('halaqat.form.deleteTitle')} palette={p}>
          <Button variant="outline" icon="trash" tone={p.destructive} palette={p} onPress={() => setDeleting(true)} block>{t('halaqat.form.delete')}</Button>
        </Section>}
      </ScrollView>
      <CreationFooter>
        {!valid && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('halaqat.form.nameNeeded')}</Text>}
        <ReaderButton palette={p} selected disabled={!valid} onPress={save}>{existing ? t('halaqat.form.saveChanges') : t('halaqat.form.create')}</ReaderButton>
      </CreationFooter>
    </KeyboardAvoidingView>
    {deleting && existing && <ConfirmDialog title={t('halaqat.form.deleteConfirmTitle')} body={t('halaqat.form.deleteConfirmBody', { name: existing.name })}
      confirm={t('halaqat.form.delete')} onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); change({ type: 'deleteHalaqa', halaqa: existing.id }); router.dismiss(2); }} />}
  </SafeAreaView>;
}

const clockText = (time: Clock) => `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;

const s = StyleSheet.create({
  panel: { borderWidth: 1, borderRadius: 14, padding: 16 },
  inset: { paddingHorizontal: 14, paddingBottom: 14 },
  leads: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
