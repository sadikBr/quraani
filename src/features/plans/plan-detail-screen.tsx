import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { Medallion } from '@/components/craft/marks';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { router, useLocalSearchParams } from 'expo-router';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { usePlans } from './provider';
import { DetailAction, DetailScreen, PlanSettingsSheet, PortionHeading, ProgressHero, ReadingBounds, d } from './plan-detail-components';
import { shortDate } from './presentation';
import { t } from '@/i18n';
import { PlanSchedule } from './plan-schedule';
import { assertPlanIndex, canUndoProgress, finishesGoal, nextPortion, rangeLabel, recordProgress, reschedulePlan, setPlanPaused, undoProgress } from './engine';
import { FinishGoalDialog } from './finish-goal-dialog';
import { dateLabel } from './dates';
import { usePlanIndex } from './use-plan-index';
import { PlanDateField } from './plan-date-field';
import { remindersSupported, requestPlanReminders } from './notifications';
import { isMemorizationPlan, isSequentialPlan, isRecurringPlan, isRevisionPlan, type SequentialPlan } from './types';
import { MemorizationDetail } from './memorization-detail-screen';
import { RecurringDetail } from './recurring-detail-screen';
import { RevisionDetail } from './revision-detail-screen';
import { saveWithReminder } from './save-with-reminder';
import { savedReminderNotice, type ReminderIssue } from './reminder-errors';
import { DuplicateGoalError } from './goal-limit';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanScreen, SwitchRow, planStyles as s } from './components';
import { archiveDeletionDate, keptInArchive, restoreArchivedGoal } from './archive';
import { ConfirmDialog } from '@/features/halaqat/confirm-dialog';
import { DeleteArchivedGoalDialog } from './archive-components';

export function PlanDetailScreen() {
  const { id, reminderIssue } = useLocalSearchParams<{ id: string; reminderIssue?: string }>();
  const { plans, ready, error, retry } = usePlans();
  const plan = plans.find(p => p.id === id);
  if (!ready || !plan) return <PlanScreen title={t('khatma.detail.title')} onBack={() => router.replace('/plans')}>
    <PlanNotice message={error} retry={retry} />{!ready ? <PlanLoading /> : <Copy>{t('khatma.detail.notFound')}</Copy>}
  </PlanScreen>;
  if (isMemorizationPlan(plan)) return <MemorizationDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
  if (isRecurringPlan(plan)) return <RecurringDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
  if (isRevisionPlan(plan)) return <RevisionDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
  return <PlanDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
}
function PlanDetail({ plan, initialReminderIssue }: { plan: SequentialPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette, update } = useReadingPreferences();
  const { commit, today, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [conflictId, setConflictId] = useState<string>();
  const [message, setMessage] = useState(() => initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [finishing, setFinishing] = useState(false);
  /** The change of schedule asked about: it rewrites every remaining date, and is not undone. */
  const [rescheduling, setRescheduling] = useState<'extend' | 'redistribute'>();
  const [name, setName] = useState(plan.name);
  const [repeat, setRepeat] = useState(plan.repeat);
  const [reminder, setReminder] = useState(plan.reminder.enabled);
  const [time, setTime] = useState(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`);
  let mismatch = '';
  if (index) { try { assertPlanIndex(plan, index); } catch (e) { mismatch = (e as Error).message; } }
  const next = nextPortion(plan, today);
  const mutate = async (change: (p: SequentialPlan) => SequentialPlan) => {
    // A ref, not render state: a second tap queued before the re-render must not undo/pause twice.
    if (saving.current) return false;
    saving.current = true; setBusy(true); setMessage(''); setConflictId(undefined);
    try { await commit(items => items.map(p => p.id === plan.id && isSequentialPlan(p) ? change(p) : p)); return true; }
    catch (e) {
      setMessage(e instanceof Error ? e.message : t('goals.errors.saveChange'));
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
      return false;
    }
    finally { saving.current = false; setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber),
      plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const saveSettings = async () => {
    if (saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage(t('khatma.detail.errors.settings')); return; }
    saving.current = true; setBusy(true); setMessage(''); setConflictId(undefined);
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), repeat, reminder: { enabled: reminder, hour, minute } },
        saved => commit(items => items.map(p => p.id === plan.id ? { ...p, name: saved.name, repeat: saved.repeat, reminder: saved.reminder } : p)),
        remindersSupported ? requestPlanReminders : undefined);
      if (issue) { setReminder(false); setMessage(savedReminderNotice(issue)); }
      setEditing(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t('goals.errors.saveSettings'));
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
    }
    finally { saving.current = false; setBusy(false); }
  };
  const openSettings = () => {
    setName(plan.name); setRepeat(plan.repeat); setReminder(plan.reminder.enabled);
    setTime(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`);
    setEditing(true);
  };
  const archive = () => { const restore = plan.status === 'archived'; return mutate(p => restore ? p.status === 'archived' ? restoreArchivedGoal(p) : p : p.status === 'archived' ? p : { ...p, status: 'archived' }); };
  const deletionDate = archiveDeletionDate(plan);
  const openConflict = () => {
    if (conflictId) { setEditing(false); router.replace({ pathname: '/plans/[id]', params: { id: conflictId } }); }
  };
  // The last wird finishes the goal, which is asked about first (it is not undone).
  const markDone = () => { if (next) void mutate(p => recordProgress(p, { cycle: next.cycle, slot: next.slot, to: next.end }, today)); };
  const partial = !!next && next.start > plan.cycle.sessions[next.slot].start;
  const clock = `${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`;
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} />
    {!!conflictId && !editing && <DetailAction label={t('goals.viewCurrent')} onPress={openConflict} />}
    <PlanNotice message={reminderError} />
    <ProgressHero plan={plan} index={index && !mismatch ? index : undefined} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && next && <PlanCard prominent>
      <PortionHeading due={next.due} title={next.due ? next.date < today ? t('khatma.detail.next.overdue') : t('khatma.detail.next.today') : t('khatma.detail.next.upcoming')}
        aside={<Medallion value={next.slot + 1} size={42} palette={palette} current={next.due} label={t('khatma.detail.next.number', { number: next.slot + 1 })} />} />
      <View style={{ gap: 2, marginTop: -8 }}>
        <Text style={{ color: palette.foreground, fontSize: 26, lineHeight: 42, fontFamily: 'ReaderNaskhBold' }}>{rangeLabel(index, next.start, next.end)}</Text>
        <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{shortDate(next.date)}{partial ? ` · ${t('khatma.detail.next.resume')}` : ''}</Text>
      </View>
      <ReadingBounds index={index} start={next.start} end={next.end} />
      <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={partial ? t('goals.continueReading') : next.due ? t('goals.startReading') : t('khatma.detail.next.availableOn', { date: shortDate(next.date) })} disabled={!next.due || busy} onPress={openReading} />
        {next.due && <DetailAction icon="check" label={t('khatma.detail.next.markDone')} disabled={busy} onPress={() => finishesGoal(plan, next.end) ? setFinishing(true) : markDone()} />}
      </View>
      {plan.goal.type === 'khatma' && next.date < today && <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: palette.border, paddingTop: 8 }}>
        <DetailAction icon="calendar" label={showCatchUp ? t('khatma.detail.catchUp.hide') : t('khatma.detail.catchUp.show')} onPress={() => setShowCatchUp(x => !x)} />
        {showCatchUp && <View style={s.section}><Copy muted>{t('khatma.detail.catchUp.note')}</Copy>
          <ReaderButton palette={palette} disabled={busy} onPress={() => setRescheduling('extend')}>{t('khatma.detail.catchUp.extend')}</ReaderButton>
          <ReaderButton palette={palette} disabled={busy || plan.cycle.sessions.at(-1)!.date < today} onPress={() => setRescheduling('redistribute')}>{t('khatma.detail.catchUp.redistribute')}</ReaderButton>
        </View>}
      </View>}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <View style={[d.row, { gap: 12 }]}><IconTile name={plan.status === 'completed' ? 'check' : plan.status === 'paused' ? 'pause' : 'archive'} />
        <View style={d.grow}><Copy title>{plan.status === 'completed' ? t('khatma.detail.status.completedTitle') : plan.status === 'paused' ? t('khatma.detail.status.pausedTitle') : t('goals.archived.title')}</Copy></View></View>
      <Copy muted>{plan.status === 'completed' ? plan.repeat ? t('khatma.detail.status.completedRepeat') : t('khatma.detail.status.completedOnce') : plan.status === 'paused' ? t('khatma.detail.status.paused') : deletionDate ? t('khatma.detail.status.archivedUntil', { date: shortDate(deletionDate) }) : keptInArchive(plan) ? t('khatma.detail.status.archivedKept') : t('khatma.detail.status.archived')}</Copy>
      {plan.status === 'paused' && <DetailAction primary label={t('goals.actions.resume')} icon="book" disabled={busy} onPress={() => void mutate(p => setPlanPaused(p, false, today))} />}
      {plan.status === 'archived' && <><DetailAction primary label={t('goals.actions.restore')} icon="restore" disabled={busy} onPress={() => void archive()} />
        <DetailAction destructive label={t('goals.actions.delete')} icon="trash" disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {canUndoProgress(plan, today) && <DetailAction icon="undo" label={t('khatma.detail.undo')} disabled={busy} onPress={() => { const count = plan.cycle.progress.length; void mutate(p => p.cycle.progress.length === count ? undoProgress(p, today) : p); }} />}
    {index && !mismatch && <PlanSchedule plan={plan} index={index} today={today} />}
    <Section title={t('plans.detail.settings')} palette={palette}>
      <RowGroup palette={palette}>
        <Row icon="lines" palette={palette} title={plan.goal.type === 'khatma' ? t(`khatma.detail.info.dividedBy.${plan.unit}`) : t(`khatma.detail.info.dailyAmount.${plan.unit}`, { count: plan.goal.amount })} />
        <Row icon="loop" palette={palette} title={plan.repeat ? t('khatma.detail.info.repeats') : t('khatma.detail.info.once')} />
        <Row icon="calendar" palette={palette} title={t('khatma.detail.info.cycleStart', { date: dateLabel(plan.cycle.sessions[0].date) })} />
        <Row icon={plan.reminder.enabled ? 'bell' : 'bell-off'} palette={palette} title={plan.reminder.enabled ? t('khatma.detail.info.reminderAt', { time: clock }) : t('khatma.detail.info.reminderOff')} />
      </RowGroup>
    </Section>
    {!!plan.history.length && <Section title={t('khatma.detail.history.title')} palette={palette}>
      <RowGroup palette={palette}>{plan.history.map(h => <Row key={h.number} palette={palette} leading={<Medallion value={h.number} size={36} palette={palette} current />}
        title={t('khatma.detail.history.cycle', { number: h.number, date: dateLabel(h.completedOn) })} />)}</RowGroup>
    </Section>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}>
      <PlanNotice message={message} />
      {!!conflictId && <DetailAction label={t('goals.viewCurrent')} onPress={openConflict} />}
      <PlanField label={t('goals.name')} value={name} onChange={setName} />
      <RowGroup palette={palette}>
        <SwitchRow icon="loop" label={t('khatma.repeat')} checked={repeat} onChange={setRepeat} detail={t('khatma.detail.settings.repeatDetail')} />
        <SwitchRow icon="bell" label={t('khatma.detail.settings.reminder')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={!remindersSupported ? t('goals.reminder.changeOnPhone') : t('khatma.detail.settings.reminderDetail')} />
      </RowGroup>
      {reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={palette} selected disabled={busy} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      <RowGroup palette={palette}>
        {(plan.status === 'active' || plan.status === 'paused') && <Row icon={plan.status === 'active' ? 'pause' : 'play'} palette={palette} chevron={false} disabled={busy} title={plan.status === 'active' ? t('goals.actions.pause') : t('goals.actions.resume')}
          onPress={() => { const pause = plan.status === 'active'; void mutate(p => setPlanPaused(p, pause, today)).then(saved => { if (saved) setEditing(false); }); }} />}
        <Row icon={plan.status === 'archived' ? 'restore' : 'archive'} palette={palette} chevron={false} disabled={busy} title={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')}
          detail={plan.status !== 'archived' ? keptInArchive(plan) ? t('khatma.detail.settings.keptNote') : t('khatma.detail.settings.deletionNote') : undefined} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      </RowGroup>
    </PlanSettingsSheet>}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
    {rescheduling && index && <ConfirmDialog tone="primary" icon="calendar" title={t(`khatma.detail.catchUp.confirm.${rescheduling}.title`)} body={t(`khatma.detail.catchUp.confirm.${rescheduling}.body`)}
      confirm={t(`khatma.detail.catchUp.confirm.${rescheduling}.action`)} onClose={() => setRescheduling(undefined)}
      onConfirm={() => { const mode = rescheduling; setRescheduling(undefined); void mutate(p => reschedulePlan(p, index, mode, today)); }} />}
    {finishing && <FinishGoalDialog memorization={false} onClose={() => setFinishing(false)} onConfirm={() => { setFinishing(false); markDone(); }} />}
  </DetailScreen>;
}
