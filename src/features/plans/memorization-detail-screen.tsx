import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';

import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { dateLabel, localDate } from './dates';
import { assertPlanIndex, ayahRangeLabel, nextPortion, setPlanPaused } from './engine';
import { AmountPicker } from './goal-creation-components';
import { currentMemorizationGoal } from './goal-limit';
import { memorizationReplanDate, memorizationSchedule, memoryFor, quarterLabel, recordMemorizationProgress, reviseMemorization, undoMemorizationProgress } from './memorization';
import { MemorizationHero } from './memorization-components';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { remindersSupported, requestPlanReminders } from './notifications';
import { PlanDateField } from './plan-date-field';
import { DetailAction, DetailScreen, d, PlanSettingsSheet } from './plan-detail-components';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { shortDate, weekdayDateLabel } from './presentation';
import { formatDate, formatNumber, t } from '@/i18n';
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
  const [editing, setEditing] = useState(false), [choosing, setChoosing] = useState(false), [deleting, setDeleting] = useState(false);
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
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && <MemorizationHero index={index} ranges={ranges} />}
    {index && !mismatch && next && <PlanCard prominent>
      <View style={[d.row, { alignItems: 'flex-start', gap: 14 }]}>
        <View style={d.grow}>
          <Text accessibilityRole="header" style={{ color: next.due ? p.primary : p.mutedForeground, fontSize: 14, fontWeight: '600' }}>{next.due ? t('memorization.detail.next.todayTitle') : t('memorization.detail.next.upcomingTitle')}</Text>
          <SurahName number={index.ayahs[next.start].surahNumber} name={index.surahNames[index.ayahs[next.start].surahNumber]} size={56} color={p.ornament} />
          <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{next.end - next.start === 1 ? t('memorization.detail.next.ayah', { ayah: index.ayahs[next.start].ayahNumber }) : t('memorization.detail.next.ayahs', { from: index.ayahs[next.start].ayahNumber, to: index.ayahs[next.end - 1].ayahNumber })}</Text>
          {index.ayahs[next.start].surahNumber !== index.ayahs[next.end - 1].surahNumber && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.detail.next.until', { surah: index.surahNames[index.ayahs[next.end - 1].surahNumber], ayah: index.ayahs[next.end - 1].ayahNumber })}</Text>}
        </View>
        {/* The date as a calendar leaf: weekday on top, day below. */}
        <View accessible accessibilityLabel={next.due ? t('common.today') : weekdayDateLabel(next.date)} style={{ minWidth: 74, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: readerShape.lg, backgroundColor: next.due ? p.primary : p.muted }}>
          <Text style={{ color: next.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{next.due ? t('common.today') : formatDate(next.date, { weekday: 'long' })}</Text>
          <Text style={{ color: next.due ? p.primaryForeground : p.foreground, fontSize: 28, fontWeight: '600', lineHeight: 36 }}>{formatNumber(Number(next.date.slice(8)))}</Text>
          <Text style={{ color: next.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{formatDate(next.date, { month: 'long' })}</Text>
        </View>
      </View>
      <View style={[d.row, { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingVertical: 10, gap: 0 }]}>
        {[{ id: 'ayahs', label: t('memorization.detail.next.stats.ayahs'), value: formatNumber(next.end - next.start) }, { id: 'words', label: t('memorization.detail.next.stats.words'), value: formatNumber(index.ayahs.slice(next.start, next.end).reduce((n, a) => n + a.text.split(/\s+/).filter(Boolean).length, 0)) },
          { id: 'page', label: t('memorization.detail.next.stats.page'), value: index.ayahs[next.start].pageNumber === index.ayahs[next.end - 1].pageNumber ? formatNumber(index.ayahs[next.start].pageNumber) : t('memorization.detail.next.pageRange', { from: index.ayahs[next.start].pageNumber, to: index.ayahs[next.end - 1].pageNumber }) }].map((stat, i) =>
          <View key={stat.id} style={[d.grow, { alignItems: 'center', borderStartWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{stat.label}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{stat.value}</Text>
          </View>)}
      </View>
      {plan.sessions[0].ranges.length > 1 && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>{t('memorization.detail.next.segments', { segments: plan.sessions[0].ranges.length })}</Text>}
      {next.due ? <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={t('memorization.detail.next.start')} disabled={busy} onPress={openReading} />
        <DetailAction icon="check" label={t('memorization.detail.next.done')} disabled={busy} onPress={() => void mutate(current => recordMemorizationProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('memorization.detail.next.confirmNote')}</Text>
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.detail.next.opensOn', { date: weekdayDateLabel(next.date) })}</Text>}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard><Copy title>{plan.status === 'completed' ? t('memorization.detail.completedTitle') : plan.status === 'paused' ? t('memorization.detail.pausedTitle') : t('goals.archived.title')}</Copy>
      <Copy muted>{plan.status === 'archived' ? `${t('memorization.detail.archivedNote')} ${deletionDate ? t('memorization.detail.deletesOn', { date: shortDate(deletionDate) }) : ''}` : plan.status === 'paused' ? t('memorization.detail.pausedNote') : t('memorization.detail.completedNote')}</Copy>
      {plan.status === 'paused' && <DetailAction primary label={t('memorization.detail.resume')} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today), false)} />}
      {plan.status === 'archived' && <><DetailAction primary label={t('goals.actions.restore')} disabled={busy || !!other || !index || !!mismatch} onPress={() => void archive()} /><DetailAction destructive icon="trash" label={t('goals.actions.delete')} disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {index && !mismatch && <>
      {plan.status !== 'archived' && !other && <PlanCard><View style={[d.row, { gap: 12, alignItems: 'flex-start' }]}><IconTile name="check" /><View style={d.grow}><Copy title>{t('memorization.detail.record.title')}</Copy><Copy muted>{t('memorization.detail.record.description')}</Copy></View></View><DetailAction label={t('memorization.detail.record.edit')} disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} /></PlanCard>}
      {plan.undoable && plan.status !== 'archived' && !other && <DetailAction label={t('memorization.detail.undo')} disabled={busy} onPress={() => void mutate(current => undoMemorizationProgress(current, index, localDate()))} />}
      {!!schedule.length && plan.status !== 'archived' && <WeeklySchedule index={index} sessions={schedule} today={today} labels={MEMORIZATION_LABELS} summary={t('memorization.detail.scheduleSummary', { amount: quarterLabel(plan.goal.weeklyQuarters), days: weekdaysLabel(plan.weekdays) })} footer={t('memorization.detail.scheduleFooter', { date: dateLabel(schedule.at(-1)!.date) })} />}
      {!!plan.progress.length && <PlanCard><Copy title>{t('memorization.detail.recent')}</Copy><View>{plan.progress.slice(-5).reverse().map((log, i) => <View key={`${log.date}-${i}`} style={{ gap: 2, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }}><Text style={{ color: p.foreground, fontSize: 15 }}>{ayahRangeLabel(index, log.from, log.to)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(log.date)}</Text></View>)}</View></PlanCard>}
    </>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label={t('goals.name')} value={name} onChange={setName} />
      <AmountPicker label={t('memorization.weeklyAmountLabel')} value={amount} onChange={setAmount} unit={t('memorization.detail.settings.amountUnit')} presets={['1', '2', '4', '8']} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} />
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('memorization.mondayAndWednesday'), value: [1, 3] }, { label: t('common.weekdays.everyDay'), value: [0, 1, 2, 3, 4, 5, 6] }]} />
      <Copy muted>{t('memorization.detail.settings.note')}</Copy>
      <PlanSwitch label={t('memorization.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('memorization.detail.settings.reminderDetail') : t('goals.reminder.enableOnPhone')} />{reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy || !index || !!mismatch} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      {(plan.status === 'active' || plan.status === 'paused') && <DetailAction label={plan.status === 'paused' ? t('memorization.detail.resume') : t('memorization.detail.pause')} disabled={busy} onPress={() => { const pause = plan.status === 'active'; void mutate(current => setPlanPaused(current, pause, today), false).then(saved => { if (saved) setEditing(false); }); }} />}
      <DetailAction label={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')} disabled={busy || (plan.status === 'archived' && (!!other || !index || !!mismatch))} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      <Copy muted>{t('memorization.detail.settings.recordKept')}</Copy>
    </PlanSettingsSheet>}
    {choosing && index && <MemorizedSelectionSheet index={index} selected={ranges} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
