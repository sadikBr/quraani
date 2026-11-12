import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';

import { Row, RowGroup, Section } from '@/components/craft/page';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { archiveDeletionDate, keptInArchive, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, SwitchRow } from './components';
import { dateLabel, localDate } from './dates';
import { assertPlanIndex, ayahRangeLabel, nextPortion, setPlanPaused, finishesGoal } from './engine';
import { AmountPicker } from './goal-creation-components';
import { currentMemorizationGoal } from './goal-limit';
import { canUndoMemorizationProgress, memorizationReplanDate, memorizationSchedule, memoryFor, quarterLabel, recordMemorizationProgress, reviseMemorization, undoMemorizationProgress } from './memorization';
import { FinishGoalDialog } from './finish-goal-dialog';
import { MemorizationHero } from './memorization-components';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { PracticeGoalCard } from '../practice/goal-card';
import { remindersSupported, requestPlanReminders } from './notifications';
import { PlanDateField } from './plan-date-field';
import { DateSeal, DetailAction, DetailScreen, d, PlanSettingsSheet, PortionHeading, PortionStats } from './plan-detail-components';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { shortDate, weekdayDateLabel } from './presentation';
import { formatNumber, t } from '@/i18n';
import { usePlans } from './provider';
import { weekdaysLabel } from './recurring';
import { WeekdayPicker } from './recurring-components';
import { type ReminderIssue, savedReminderNotice } from './reminder-errors';
import { saveWithReminder } from './save-with-reminder';
import { type AyahSpan, isMemorizationPlan, type MemorizationPlan } from './types';
import { usePlanIndex } from './use-plan-index';
import { MEMORIZATION_LABELS, WeeklySchedule } from './session-schedule';

export function MemorizationDetail({ plan, initialReminderIssue }: { plan: MemorizationPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette: p, update } = useReadingPreferences();
  const { today, commit, plans, memorization, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [editing, setEditing] = useState(false), [choosing, setChoosing] = useState(false), [deleting, setDeleting] = useState(false), [finishing, setFinishing] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const saving = useRef(false);
  const [name, setName] = useState(plan.name), [days, setDays] = useState(plan.weekdays), [amount, setAmount] = useState(String(plan.goal.weeklyQuarters));
  const [reminder, setReminder] = useState(plan.reminder.enabled), [time, setTime] = useState('18:00');
  const next = nextPortion(plan, today), schedule = memorizationSchedule(plan, today);
  const other = currentMemorizationGoal(plans, plan.id);
  let mismatch = '', ranges = plan.memorized;
  if (index) { try { assertPlanIndex(plan, index); ranges = memoryFor(memorization, plan.riwayah, index); } catch (e) { mismatch = (e as Error).message; } }
  /** Status-only changes (pause, archive) never need the mushaf, so an offline
   * or re-downloading edition cannot lock a goal. Content changes do. */
  const mutate = async (change: (current: MemorizationPlan) => MemorizationPlan, needsIndex = true) => {
    if (saving.current || (needsIndex && (!index || mismatch))) return false;
    saving.current = true; setBusy(true); setMessage('');
    try {
      await commit(items => items.map(current => {
        if (current.id !== plan.id || !isMemorizationPlan(current)) return current;
        if (needsIndex && index) assertPlanIndex(current, index);
        return change(current);
      })); return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveChange')); return false; }
    finally { saving.current = false; setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start]; update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const replanDate = (current: MemorizationPlan) => memorizationReplanDate(current, localDate());
  const saveMemory = async (selected: AyahSpan[]) => {
    if (!index) return;
    if (await mutate(current => {
      if (current.revision !== plan.revision) throw new Error(t('memorization.detail.errors.memoryChanged'));
      return reviseMemorization(current, index, selected, replanDate(current));
    })) setChoosing(false);
  };
  const openSettings = () => {
    setName(plan.name); setDays(plan.weekdays); setAmount(String(plan.goal.weeklyQuarters)); setReminder(plan.reminder.enabled);
    setTime(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`); setEditing(true);
  };
  const saveSettings = async () => {
    if (!index || saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage(t('memorization.detail.errors.nameAndTime')); return; }
    const weeklyQuarters = Number(normalizeArabicSearch(amount));
    if (!days.length || !Number.isInteger(weeklyQuarters) || weeklyQuarters < 1 || weeklyQuarters > 240) { setMessage(t('memorization.detail.errors.daysAndAmount')); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), reminder: { enabled: reminder, hour, minute } }, saved => commit(items => items.map(current => {
        if (current.id !== plan.id || !isMemorizationPlan(current)) return current;
        assertPlanIndex(current, index);
        const changed = weeklyQuarters !== current.goal.weeklyQuarters || [...days].sort().join() !== [...current.weekdays].sort().join();
        const revised = changed ? reviseMemorization(current, index, current.memorized, replanDate(current), { weeklyQuarters, weekdays: days }) : current;
        return { ...revised, name: saved.name, reminder: saved.reminder };
      })), remindersSupported ? requestPlanReminders : undefined);
      if (issue) setMessage(savedReminderNotice(issue)); setEditing(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveSettings')); }
    finally { saving.current = false; setBusy(false); }
  };
  const archive = () => plan.status === 'archived'
    ? mutate(current => current.status === 'archived' && index ? restoreArchivedGoal(reviseMemorization(current, index, memoryFor(memorization, current.riwayah, index), replanDate(current))) : current)
    : mutate(current => ({ ...current, status: 'archived' }), false);
  const deletionDate = archiveDeletionDate(plan);
  // The last passage finishes the goal, which is asked about first (it is not undone).
  const markDone = () => { if (next) void mutate(current => recordMemorizationProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate())); };
  const first = next && index ? index.ayahs[next.start] : undefined, last = next && index ? index.ayahs[next.end - 1] : undefined;
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && <MemorizationHero index={index} ranges={ranges} />}
    {index && !mismatch && next && first && last && <PlanCard prominent>
      <View style={[d.row, { alignItems: 'flex-start', gap: 14 }]}>
        <View style={[d.grow, { gap: 2 }]}>
          <PortionHeading due={next.due} title={next.due ? t('memorization.detail.next.todayTitle') : t('memorization.detail.next.upcomingTitle')} />
          <SurahName number={first.surahNumber} name={index.surahNames[first.surahNumber]} size={54} color={p.ornament} />
          <Text style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold' }}>{next.end - next.start === 1 ? t('memorization.detail.next.ayah', { ayah: first.ayahNumber }) : t('memorization.detail.next.ayahs', { from: first.ayahNumber, to: last.ayahNumber })}</Text>
          {first.surahNumber !== last.surahNumber && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.detail.next.until', { surah: index.surahNames[last.surahNumber], ayah: last.ayahNumber })}</Text>}
        </View>
        <DateSeal date={next.date} due={next.due} />
      </View>
      <PortionStats items={[{ id: 'ayahs', label: t('memorization.detail.next.stats.ayahs'), value: formatNumber(next.end - next.start) }, { id: 'words', label: t('memorization.detail.next.stats.words'), value: formatNumber(index.ayahs.slice(next.start, next.end).reduce((n, a) => n + a.text.split(/\s+/).filter(Boolean).length, 0)) },
        { id: 'page', label: t('memorization.detail.next.stats.page'), value: first.pageNumber === last.pageNumber ? formatNumber(first.pageNumber) : t('memorization.detail.next.pageRange', { from: first.pageNumber, to: last.pageNumber }) }]} />
      {plan.sessions[0].ranges.length > 1 && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('memorization.detail.next.segments', { count: plan.sessions[0].ranges.length })}</Text>}
      {next.due ? <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={t('memorization.detail.next.start')} disabled={busy} onPress={openReading} />
        <DetailAction icon="check" label={t('memorization.detail.next.done')} disabled={busy} onPress={() => finishesGoal(plan, next.end) ? setFinishing(true) : markDone()} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('memorization.detail.next.confirmNote')}</Text>
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.detail.next.opensOn', { date: weekdayDateLabel(next.date) })}</Text>}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <View style={[d.row, { gap: 12 }]}><IconTile name={plan.status === 'completed' ? 'check' : plan.status === 'paused' ? 'pause' : 'archive'} /><View style={d.grow}><Copy title>{plan.status === 'completed' ? t('memorization.detail.completedTitle') : plan.status === 'paused' ? t('memorization.detail.pausedTitle') : t('goals.archived.title')}</Copy></View></View>
      <Copy muted>{plan.status === 'archived' ? `${t('memorization.detail.archivedNote')} ${deletionDate ? t('memorization.detail.deletesOn', { date: shortDate(deletionDate) }) : keptInArchive(plan) ? t('memorization.detail.archivedKept') : ''}` : plan.status === 'paused' ? t('memorization.detail.pausedNote') : t('memorization.detail.completedNote')}</Copy>
      {plan.status === 'paused' && <DetailAction primary label={t('memorization.detail.resume')} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today), false)} />}
      {plan.status === 'archived' && <><DetailAction primary label={t('goals.actions.restore')} disabled={busy || !!other || !index || !!mismatch} onPress={() => void archive()} /><DetailAction destructive icon="trash" label={t('goals.actions.delete')} disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {index && !mismatch && <>
      {plan.status !== 'archived' && !other && <RowGroup palette={p}>
        <Row icon="check" palette={p} title={t('memorization.detail.record.title')} detail={t('memorization.detail.record.description')} label={t('memorization.detail.record.edit')} hint={t('memorization.detail.record.description')}
          disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} />
      </RowGroup>}
      {!!ranges.length && plan.status !== 'archived' && <PracticeGoalCard riwayah={plan.riwayah} />}
      {canUndoMemorizationProgress(plan, today) && !other && <DetailAction icon="undo" label={t('memorization.detail.undo')} disabled={busy} onPress={() => void mutate(current => undoMemorizationProgress(current, index, localDate()))} />}
      {!!schedule.length && plan.status !== 'archived' && <WeeklySchedule index={index} sessions={schedule} today={today} labels={MEMORIZATION_LABELS} summary={t('memorization.detail.scheduleSummary', { amount: quarterLabel(plan.goal.weeklyQuarters), days: weekdaysLabel(plan.weekdays) })} footer={t('memorization.detail.scheduleFooter', { date: dateLabel(schedule.at(-1)!.date) })} />}
      {!!plan.progress.length && <Section title={t('memorization.detail.recent')} palette={p}>
        <RowGroup palette={p}>{plan.progress.slice(-5).reverse().map((log, i) => <Row key={`${log.date}-${i}`} palette={p} icon="check" title={ayahRangeLabel(index, log.from, log.to)} detail={shortDate(log.date)} />)}</RowGroup>
      </Section>}
    </>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label={t('goals.name')} value={name} onChange={setName} />
      <View style={{ gap: 10 }}><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('memorization.weeklyAmountLabel')}</Text>
        <AmountPicker label={t('memorization.weeklyAmountLabel')} value={amount} onChange={setAmount} unit={t('memorization.detail.settings.amountUnit')} presets={['1', '2', '4', '8']} presetLabel={quarterLabel} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} /></View>
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('memorization.mondayAndWednesday'), value: [1, 3] }, { label: t('common.weekdays.everyDay'), value: [0, 1, 2, 3, 4, 5, 6] }]} />
      <Copy muted>{t('memorization.detail.settings.note')}</Copy>
      <RowGroup palette={p}><SwitchRow icon="bell" label={t('memorization.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('memorization.detail.settings.reminderDetail') : t('goals.reminder.enableOnPhone')} /></RowGroup>
      {reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy || !index || !!mismatch} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      <RowGroup palette={p}>
        {(plan.status === 'active' || plan.status === 'paused') && <Row icon={plan.status === 'paused' ? 'play' : 'pause'} palette={p} chevron={false} disabled={busy} title={plan.status === 'paused' ? t('memorization.detail.resume') : t('memorization.detail.pause')}
          onPress={() => { const pause = plan.status === 'active'; void mutate(current => setPlanPaused(current, pause, today), false).then(saved => { if (saved) setEditing(false); }); }} />}
        <Row icon={plan.status === 'archived' ? 'restore' : 'archive'} palette={p} chevron={false} title={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')} detail={t('memorization.detail.settings.recordKept')}
          disabled={busy || (plan.status === 'archived' && (!!other || !index || !!mismatch))} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      </RowGroup>
    </PlanSettingsSheet>}
    {choosing && index && <MemorizedSelectionSheet confirmRemoval index={index} selected={ranges} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
    {finishing && <FinishGoalDialog memorization onClose={() => setFinishing(false)} onConfirm={() => { setFinishing(false); markDone(); }} />}
  </DetailScreen>;
}
