import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { Badge, IconTile } from '@/components/ui';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';

import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { isRecurringPlan, type RecurringPlan } from './types';
import { assertPlanIndex, nextPortion, recordProgress, setPlanPaused } from './engine';
import { completedOccurrences, occurrenceProgress, scheduledOn, undoRecurringProgress, weekdaysLabel } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { shortDate } from './presentation';
import { formatDate, formatList, t } from '@/i18n';
import { DetailAction, DetailScreen, HeroPanel, PlanSettingsSheet, PortionHeading, ReadingBounds, SurahFrames, d } from './plan-detail-components';
import { GoalMark, Trail, type TrailState } from './goal-card';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, SwitchRow } from './components';
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
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(date => {
    const state = occurrenceProgress(plan, date), scheduled = scheduledOn(plan, date);
    const trail: TrailState = state.done ? 'done' : state.read ? 'partial' : !scheduled ? 'off' : date === today ? 'today' : 'missed';
    return { date, trail, label: t('recurring.detail.week.day', { date: dateLabel(date), state: state.done ? t('recurring.detail.week.done') : state.read ? t('recurring.detail.week.partial') : scheduled ? date === today ? t('common.today') : t('recurring.detail.week.missed') : t('recurring.detail.week.notScheduled') }) };
  });
  const clock = `${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`;
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    <HeroPanel figure={index ? <SurahFrames index={index} surahs={plan.ranges.map(range => range.surah)} /> : <GoalMark kind="recurring" width={56} />}
      title={progress.done ? t('recurring.detail.title.done') : next?.due ? t('recurring.detail.title.dueToday') : t('recurring.detail.title.waiting')}
      detail={t('recurring.summary', { days: weekdaysLabel(plan.weekdays) })}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('recurring.detail.completedSinceStart', { count: completedOccurrences(plan) })}</Text>
      <View accessible accessibilityLabel={formatList(week.map(day => day.label))} style={{ alignSelf: 'stretch', marginTop: 16, paddingHorizontal: 6 }}>
        <Trail states={week.map(day => day.trail)} palette={p} size={18} labels={week.map(day => formatDate(day.date, { weekday: 'short' }))} />
      </View>
    </HeroPanel>
    {!index && !error && <PlanLoading />}
    {next && index && !mismatch && <PlanCard prominent>
      <PortionHeading due={next.due} title={next.due ? t('recurring.detail.next.today') : t('recurring.detail.next.upcoming')}
        aside={<Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(next.date)}</Text>} />
      {plan.ranges.length > 1 && <View>{plan.ranges.map((range, slot) => <View key={range.surah} style={[d.row, { paddingVertical: 10, borderTopWidth: slot ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
        <Medallion value={slot + 1} size={30} palette={p} current={upcomingProgress.cursors[slot] === range.end} />
        <Text style={{ color: slot === next.slot ? p.foreground : p.mutedForeground, fontSize: 15, fontWeight: slot === next.slot ? '700' : '400', flex: 1 }}>{index.surahNames[range.surah]}</Text>
        {slot === next.slot && <Badge variant="secondary">{next.start > range.start ? t('recurring.detail.next.continuing') : t('recurring.detail.next.starting')}</Badge>}
      </View>)}</View>}
      <ReadingBounds index={index} start={next.start} end={next.end} />
      <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={next.due ? next.start > plan.ranges[next.slot].start ? t('goals.continueReading') : t('goals.startReading') : t('recurring.detail.next.availableOn', { date: shortDate(next.date) })} disabled={!next.due || busy} onPress={openReading} />
        {next.due && <DetailAction icon="check" label={t('recurring.detail.next.finishSurah')} disabled={busy} onPress={() => void mutate(current => recordProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />}
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{plan.ranges.length > 1 ? t('recurring.detail.next.several') : t('recurring.detail.next.single')}</Text>
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <View style={[d.row, { gap: 12 }]}><IconTile name={plan.status === 'paused' ? 'pause' : 'archive'} /><View style={d.grow}><Copy title>{plan.status === 'paused' ? t('recurring.detail.paused.title') : t('goals.archived.title')}</Copy></View></View>
      <Copy muted>{plan.status === 'paused' ? t('recurring.detail.paused.body') : archiveDeletionDate(plan) ? t('recurring.detail.archived.deletionOn', { date: shortDate(archiveDeletionDate(plan)!) }) : t('recurring.detail.archived.deletionLater')}</Copy>
      <DetailAction primary label={plan.status === 'paused' ? t('goals.actions.resume') : t('goals.actions.restore')} disabled={busy} onPress={() => void mutate(current => current.status === 'paused' ? setPlanPaused(current, false, localDate()) : restoreArchivedGoal(current))} />
      {plan.status === 'archived' && <DetailAction destructive icon="trash" label={t('goals.actions.delete')} onPress={() => setDeleting(true)} />}
    </PlanCard>}
    {!!progress.logs.length && plan.status !== 'archived' && <DetailAction icon="undo" label={t('recurring.detail.undo')} disabled={busy} onPress={() => void mutate(current => undoRecurringProgress(current, localDate()))} />}
    <Section title={t('recurring.detail.history.title')} palette={p}>
      {plan.occurrences.length ? <View style={{ gap: 6 }}><RowGroup palette={p}>{[...plan.occurrences].reverse().slice(0, historyLimit).map(occurrence => {
        const state = occurrenceProgress(plan, occurrence.date);
        return <Row key={occurrence.date} palette={p} icon={state.done ? 'check' : 'book'} tone={state.done ? undefined : p.mutedForeground}
          title={dateLabel(occurrence.date)} detail={state.done ? t('recurring.detail.history.completed') : t('recurring.detail.history.partial', { completed: state.completed, count: plan.ranges.length })} />;
      })}</RowGroup>{plan.occurrences.length > historyLimit && <DetailAction label={t('recurring.detail.history.older')} onPress={() => setHistoryLimit(limit => limit + 14)} />}</View>
        : <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recurring.detail.history.empty')}</Text>}
    </Section>
    <Section title={t('plans.detail.settings')} palette={p}>
      <RowGroup palette={p}>
        <Row icon="calendar" palette={p} title={weekdaysLabel(plan.weekdays)} />
        <Row icon={plan.reminder.enabled ? 'bell' : 'bell-off'} palette={p} title={plan.reminder.enabled ? t('recurring.detail.reminderAt', { time: clock }) : t('recurring.detail.reminderOff')} />
      </RowGroup>
    </Section>
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}>
      <PlanNotice message={message} />
      <PlanField label={t('goals.name')} value={name} onChange={setName} />
      <View style={{ gap: 10 }}><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('recurring.detail.settings.days')}</Text><WeekdayPicker days={days} onChange={setDays} /><Copy muted>{t('recurring.detail.settings.daysNote')}</Copy></View>
      <RowGroup palette={p}><SwitchRow icon="bell" label={t('recurring.detail.settings.reminder')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('recurring.detail.settings.reminderDetail') : t('goals.reminder.changeOnPhone')} /></RowGroup>
      {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
      <ReaderButton palette={p} selected disabled={busy || !days.length} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      <RowGroup palette={p}>
        {plan.status !== 'archived' && <Row icon={plan.status === 'paused' ? 'play' : 'pause'} palette={p} chevron={false} disabled={busy} title={plan.status === 'paused' ? t('goals.actions.resume') : t('goals.actions.pause')}
          onPress={() => void mutate(current => setPlanPaused(current, current.status === 'active', localDate())).then(saved => { if (saved) setEditing(false); })} />}
        <Row icon={plan.status === 'archived' ? 'restore' : 'archive'} palette={p} chevron={false} disabled={busy} title={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')} detail={t('recurring.detail.settings.archiveNote')}
          onPress={() => void mutate(current => current.status === 'archived' ? restoreArchivedGoal(current) : { ...current, status: 'archived' }).then(saved => { if (saved) setEditing(false); })} />
      </RowGroup>
    </PlanSettingsSheet>}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
