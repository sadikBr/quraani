import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../quran-reader/design';
import { Badge, Card, IconTile } from '@/components/ui';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { SurahName } from '../quran-reader/components/ui/surah-name';

import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { isRecurringPlan, type RecurringPlan } from './types';
import { assertPlanIndex, nextPortion, recordProgress, setPlanPaused } from './engine';
import { completedOccurrences, occurrenceProgress, scheduledOn, undoRecurringProgress, weekdaysLabel } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { shortDate } from './presentation';
import { formatDate, formatNumber, t } from '@/i18n';
import { DetailAction, DetailScreen, PlanSettingsSheet, ReadingBounds, d } from './plan-detail-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { WeekdayPicker } from './recurring-components';
import { PlanDateField } from './plan-date-field';
import { saveWithReminder } from './save-with-reminder';
import { requestPlanReminders, remindersSupported } from './notifications';
import { savedReminderNotice, type ReminderIssue } from './reminder-errors';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';

export function RecurringDetail({ plan, initialReminderIssue }: { plan: RecurringPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette: p, update } = useReadingPreferences();
  const { today, commit, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [editing, setEditing] = useState(false), [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const saving = useRef(false);
  const [name, setName] = useState(plan.name), [days, setDays] = useState(plan.weekdays);
  const [reminder, setReminder] = useState(plan.reminder.enabled), [time, setTime] = useState('20:00');
  const [historyLimit, setHistoryLimit] = useState(7);
  const next = nextPortion(plan, today), progress = occurrenceProgress(plan, today);
  const viewingDate = next?.due ? today : next?.date ?? today;
  const upcomingProgress = occurrenceProgress(plan, viewingDate);
  let mismatch = '';
  if (index) { try { assertPlanIndex(plan, index); } catch (e) { mismatch = (e as Error).message; } }
  const mutate = async (change: (current: RecurringPlan) => RecurringPlan) => {
    if (saving.current) return false;
    saving.current = true; setBusy(true); setMessage('');
    try { await commit(items => items.map(current => current.id === plan.id && isRecurringPlan(current) ? change(current) : current)); return true; }
    catch (e) { setMessage(e instanceof Error ? e.message : t('recurring.detail.errors.saveChange')); return false; }
    finally { saving.current = false; setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const openSettings = () => {
    setName(plan.name); setDays(plan.weekdays); setReminder(plan.reminder.enabled);
    setTime(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`); setMessage(''); setEditing(true);
  };
  const saveSettings = async () => {
    if (saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage(t('recurring.detail.errors.settings')); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), weekdays: days, reminder: { enabled: reminder, hour, minute } }, saved => commit(items => items.map(current =>
        current.id === plan.id && isRecurringPlan(current) ? { ...current, name: saved.name, weekdays: saved.weekdays, reminder: saved.reminder } : current)), remindersSupported ? requestPlanReminders : undefined);
      if (issue) setMessage(savedReminderNotice(issue));
      setEditing(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveSettings')); }
    finally { saving.current = false; setBusy(false); }
  };
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    <Card style={{ padding: 16, gap: 20 }}>
      <View style={[d.row, { gap: 16 }]}><View style={d.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recurring.summary', { days: weekdaysLabel(plan.weekdays) })}</Text>
        <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', marginVertical: 4 }}>{progress.done ? t('recurring.detail.title.done') : next?.due ? t('recurring.detail.title.dueToday') : t('recurring.detail.title.waiting')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recurring.detail.completedSinceStart', { n: completedOccurrences(plan) })}</Text>
      </View><IconTile name={progress.done ? 'check' : 'restore'} /></View>
      <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16 }}>{Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(date => {
        const state = occurrenceProgress(plan, date), scheduled = scheduledOn(plan, date);
        const label = formatDate(date, { weekday: 'short' });
        return <View key={date} accessible accessibilityLabel={t('recurring.detail.week.day', { date: dateLabel(date), state: state.done ? t('recurring.detail.week.done') : state.read ? t('recurring.detail.week.partial') : scheduled ? date === today ? t('common.today') : t('recurring.detail.week.missed') : t('recurring.detail.week.notScheduled') })} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
          <View style={{ width: 32, height: 32, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', backgroundColor: state.done ? p.primary : 'transparent', borderWidth: 1, borderColor: state.done ? p.primary : date === today ? p.ring : p.border }}>
            {state.done ? <ReaderIcon name="check" size={16} color={p.primaryForeground} /> : <View style={{ width: state.read ? 8 : 4, height: state.read ? 8 : 4, borderRadius: readerShape.detail, backgroundColor: scheduled || state.read ? p.mutedForeground : 'transparent' }} />}
          </View>
        </View>;
      })}</View>
    </Card>
    {!index && !error && <PlanLoading />}
    {next && index && !mismatch && <PlanCard prominent>
      <View style={d.row}><IconTile name="book" size={36} /><Text accessibilityRole="header" style={{ color: next.due ? p.foreground : p.mutedForeground, fontSize: 16, fontWeight: '600', flex: 1 }}>{next.due ? t('recurring.detail.next.today') : t('recurring.detail.next.upcoming')}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(next.date)}</Text></View>
      <SurahName number={plan.ranges[next.slot].surah} name={index.surahNames[plan.ranges[next.slot].surah]} size={48} color={p.ornament} />
      {plan.ranges.length > 1 && <View>{plan.ranges.map((range, slot) => <View key={range.surah} style={[d.row, { paddingVertical: 10, borderTopWidth: slot ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
        <View style={{ width: 24, alignItems: 'center' }}>{upcomingProgress.cursors[slot] === range.end ? <ReaderIcon name="check" color={p.primary} size={18} /> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{formatNumber(slot + 1)}</Text>}</View>
        <Text style={{ color: slot === next.slot ? p.foreground : p.mutedForeground, fontSize: 15, fontWeight: slot === next.slot ? '600' : '400', flex: 1 }}>{index.surahNames[range.surah]}</Text>
        {slot === next.slot && <Badge variant="secondary">{next.start > range.start ? t('recurring.detail.next.continuing') : t('recurring.detail.next.starting')}</Badge>}
      </View>)}</View>}
      <ReadingBounds index={index} start={next.start} end={next.end} />
      <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={next.due ? next.start > plan.ranges[next.slot].start ? t('goals.continueReading') : t('goals.startReading') : t('recurring.detail.next.availableOn', { date: shortDate(next.date) })} disabled={!next.due || busy} onPress={openReading} />
        {next.due && <DetailAction icon="check" label={t('recurring.detail.next.finishSurah')} disabled={busy} onPress={() => void mutate(current => recordProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />}
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>{plan.ranges.length > 1 ? t('recurring.detail.next.several') : t('recurring.detail.next.single')}</Text>
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <Copy title>{plan.status === 'paused' ? t('recurring.detail.paused.title') : t('goals.archived.title')}</Copy>
      <Copy muted>{plan.status === 'paused' ? t('recurring.detail.paused.body') : archiveDeletionDate(plan) ? t('recurring.detail.archived.deletionOn', { date: shortDate(archiveDeletionDate(plan)!) }) : t('recurring.detail.archived.deletionLater')}</Copy>
      <DetailAction primary label={plan.status === 'paused' ? t('goals.actions.resume') : t('goals.actions.restore')} disabled={busy} onPress={() => void mutate(current => current.status === 'paused' ? setPlanPaused(current, false, localDate()) : restoreArchivedGoal(current))} />
      {plan.status === 'archived' && <DetailAction destructive icon="trash" label={t('goals.actions.delete')} onPress={() => setDeleting(true)} />}
    </PlanCard>}
    {!!progress.logs.length && plan.status !== 'archived' && <DetailAction label={t('recurring.detail.undo')} disabled={busy} onPress={() => void mutate(current => undoRecurringProgress(current, localDate()))} />}
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('recurring.detail.history.title')}</Text>
      {plan.occurrences.length ? <PlanCard><View>{[...plan.occurrences].reverse().slice(0, historyLimit).map((occurrence, i) => {
        const state = occurrenceProgress(plan, occurrence.date);
        return <View key={occurrence.date} style={[d.row, { paddingVertical: 10, gap: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}><ReaderIcon name={state.done ? 'check' : 'book'} color={state.done ? p.primary : p.mutedForeground} size={20} />
          <View style={d.grow}><Text style={{ color: p.foreground, fontSize: 15 }}>{dateLabel(occurrence.date)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{state.done ? t('recurring.detail.history.completed') : t('recurring.detail.history.partial', { completed: state.completed, total: plan.ranges.length })}</Text></View>
        </View>;
      })}</View>{plan.occurrences.length > historyLimit && <DetailAction label={t('recurring.detail.history.older')} onPress={() => setHistoryLimit(limit => limit + 14)} />}</PlanCard>
        : <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{t('recurring.detail.history.empty')}</Text>}
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 13, paddingHorizontal: 4 }}>{weekdaysLabel(plan.weekdays)} · {plan.reminder.enabled ? t('recurring.detail.reminderAt', { time: `${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}` }) : t('recurring.detail.reminderOff')}</Text>
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}>
      <PlanNotice message={message} />
      <PlanField label={t('goals.name')} value={name} onChange={setName} />
      <Copy title>{t('recurring.detail.settings.days')}</Copy><WeekdayPicker days={days} onChange={setDays} /><Copy muted>{t('recurring.detail.settings.daysNote')}</Copy>
      <PlanSwitch label={t('recurring.detail.settings.reminder')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('recurring.detail.settings.reminderDetail') : t('goals.reminder.changeOnPhone')} />
      {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
      <ReaderButton palette={p} selected disabled={busy || !days.length} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 12, gap: 4 }}>
        {plan.status !== 'archived' && <DetailAction label={plan.status === 'paused' ? t('goals.actions.resume') : t('goals.actions.pause')} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, current.status === 'active', localDate())).then(saved => { if (saved) setEditing(false); })} />}
        <DetailAction label={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')} disabled={busy} onPress={() => void mutate(current => current.status === 'archived' ? restoreArchivedGoal(current) : { ...current, status: 'archived' }).then(saved => { if (saved) setEditing(false); })} />
        <Copy muted>{t('recurring.detail.settings.archiveNote')}</Copy>
      </View>
    </PlanSettingsSheet>}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
