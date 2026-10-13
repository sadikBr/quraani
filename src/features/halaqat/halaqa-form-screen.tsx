import { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageBar, PageTitle, Row, RowGroup, Section, page } from '@/components/craft/page';
import { Alert, Button, Chip } from '@/components/ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { Segments } from '@/features/quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '@/features/quran-reader/components/reading/reader-button';
import type { Riwayah } from '@/features/quran-reader/riwayat';
import { usePlans } from '@/features/plans/provider';
import { SwitchRow } from '@/features/plans/components';
import { weekdaysLabel } from '@/features/plans/recurring';
import { CreationFooter } from '@/features/plans/goal-creation-components';
import { t } from '@/i18n';
import { useHalaqat, useMembership } from './provider';
import { arrivalOf, clockText, NAME_LIMIT, newId, type Clock, type ReminderLead } from './model';
import { HalaqaReminderError, remindersSupported, requestHalaqaReminders } from './notifications';
import { ConfirmDialog } from './confirm-dialog';
import { halaqaFacts, pastHalaqa } from './shared';
import { DayArcade, LeadTrack, NamePlate } from './form-parts';
import { TimeField } from './time-field';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

/**
 * Making a halaqa, or changing one (`?id=`): its name on an arched plate (how it reads so far under
 * it), its riwayah, its days as an arcade of seven arches, and on one card the time it meets and
 * when its reminder comes, on a thread running up to the session.
 */
export function HalaqaFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { palette: p, preferences } = useReadingPreferences();
  const { state, change } = useHalaqat();
  const { roleOf, leave } = useMembership();
  const { today } = usePlans();
  const existing = state.halaqat.find((h) => h.id === id);
  const [name, setName] = useState(existing?.name ?? '');
  const [riwayah, setRiwayah] = useState<Riwayah>(existing?.riwayah ?? preferences.riwayah);
  const [days, setDays] = useState<number[]>(existing?.weekdays ?? []);
  const [deleting, setDeleting] = useState(false);
  const [time, setTime] = useState<Clock | undefined>(existing?.time);
  const [lead, setLead] = useState<ReminderLead | undefined>(existing?.reminder?.before);
  const [message, setMessage] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [leaveFailed, setLeaveFailed] = useState(false);
  // Only its owner deletes a halaqa; a co-teacher leaves it.
  const owner = !existing || roleOf(existing.id) === 'owner';
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
        <NamePlate value={name} onChange={setName} palette={p} facts={halaqaFacts({ riwayah, weekdays: days, time })} />
        <Section title={t('halaqat.form.riwayah')} palette={p}>
          {locked ? <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('halaqat.form.riwayahLocked')}</Text>
            : <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />}
        </Section>
        <Section title={t('halaqat.form.days')} palette={p}
          action={<Chip soft palette={p} label={t('common.weekdays.everyDay')} selected={days.length === 7} onPress={() => setDays(days.length === 7 ? [] : EVERY_DAY)} />}>
          <DayArcade days={days} onChange={setDays} palette={p} />
          <Text accessibilityLiveRegion="polite" style={{ color: days.length ? p.foreground : p.mutedForeground, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
            {days.length ? weekdaysLabel(days) : t('halaqat.list.noDays')}
          </Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center', marginTop: -6 }}>{t('halaqat.form.daysHint')}</Text>
        </Section>
        <Section title={t('halaqat.reminders.title')} palette={p}>
          <RowGroup palette={p}>
            <Row key="time" icon="clock" palette={p} title={t('halaqat.reminders.time')} detail={time ? undefined : t('halaqat.form.noTime')}
              trailing={time ? <View style={s.time}>
                <TimeField label={t('halaqat.reminders.time')} value={clockText(time)} onChange={(value) => { const [hour, minute] = value.split(':').map(Number); setTime({ hour, minute }); }} />
                <Button size="sm" variant="ghost" icon="close" palette={p} label={t('halaqat.form.clearTime')} onPress={() => { setTime(undefined); setLead(undefined); }} />
              </View> : <Button size="sm" variant="outline" icon="plus" palette={p} onPress={() => setTime({ hour: 17, minute: 0 })}>{t('halaqat.form.setTime')}</Button>} />
            {time && <SwitchRow key="remind" icon="bell" label={t('halaqat.reminders.remind')} detail={remindersSupported ? t('halaqat.reminders.remindDetail') : t('halaqat.reminders.phoneOnly')}
              checked={lead !== undefined} disabled={!remindersSupported} onChange={(on) => void remind(on)} />}
            {time && lead !== undefined && <View key="lead" style={s.lead}>
              <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('halaqat.reminders.lead')}</Text>
              <LeadTrack value={lead} onChange={setLead} palette={p} />
              <Text style={{ color: days.length ? p.foreground : p.warning, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>
                {days.length ? t('halaqat.reminders.arrives', { time: clockText(arrivalOf(time, lead)) }) : t('halaqat.reminders.needsDays')}
              </Text>
            </View>}
          </RowGroup>
          {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
        </Section>
        {existing && owner && <Button variant="ghost" icon="trash" tone={p.destructive} palette={p} onPress={() => setDeleting(true)}>{t('halaqat.form.delete')}</Button>}
        {existing && !owner && <View style={{ gap: 8 }}>
          <Button variant="ghost" icon="log-out" tone={p.destructive} palette={p} onPress={() => { setLeaveFailed(false); setLeaving(true); }}>{t('halaqat.sharing.leave')}</Button>
          {leaveFailed && <Alert variant="destructive" palette={p}>{t('halaqat.sharing.leaveFailed')}</Alert>}
        </View>}
      </ScrollView>
      <CreationFooter>
        {!valid && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('halaqat.form.nameNeeded')}</Text>}
        <ReaderButton palette={p} selected disabled={!valid} onPress={save}>{existing ? t('halaqat.form.saveChanges') : t('halaqat.form.create')}</ReaderButton>
      </CreationFooter>
    </KeyboardAvoidingView>
    {deleting && existing && <ConfirmDialog title={t('halaqat.form.deleteConfirmTitle')} body={t('halaqat.form.deleteConfirmBody', { name: existing.name })}
      confirm={t('halaqat.form.delete')} onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); change({ type: 'deleteHalaqa', halaqa: existing.id }); router.dismiss(2); }} />}
    {leaving && existing && <ConfirmDialog icon="log-out" title={t('halaqat.sharing.leaveTitle')} body={t('halaqat.sharing.leaveTeacherBody', { name: existing.name })}
      confirm={t('halaqat.sharing.leave')} onClose={() => setLeaving(false)}
      onConfirm={() => { setLeaving(false); leave(existing.id).then(() => pastHalaqa(2), () => setLeaveFailed(true)); }} />}
  </SafeAreaView>;
}

const s = StyleSheet.create({
  time: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  lead: { paddingHorizontal: 14, paddingTop: 4, paddingBottom: 16, gap: 10 },
});
