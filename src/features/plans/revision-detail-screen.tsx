import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { Medallion } from '@/components/craft/marks';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, SwitchRow } from './components';
import { dateLabel, localDate } from './dates';
import { assertPlanIndex, ayahRangeLabel, setPlanPaused } from './engine';
import { AmountPicker } from './goal-creation-components';
import { currentRevisionGoal, isCurrentGoal } from './goal-limit';
import { quarterLabel, spanCount } from './memorization';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { PracticeGoalCard } from '../practice/goal-card';
import { remindersSupported, requestPlanReminders } from './notifications';
import { PlanDateField } from './plan-date-field';
import { DateSeal, DetailAction, DetailScreen, d, PlanSettingsSheet, PortionHeading, PortionStats } from './plan-detail-components';
import { shortDate, weekdayDateLabel } from './presentation';
import { formatNumber, t } from '@/i18n';
import { usePlans } from './provider';
import { WeekdayPicker } from './recurring-components';
import { type ReminderIssue, savedReminderNotice } from './reminder-errors';
import { finishRevisionDay, nextRevisionPortion, remainingPassDays, REVISION_MAX_QUARTERS, revisionDay, reviseRevisionSettings, undoRevisionProgress } from './revision';
import { weekdaysLabel } from './recurring';
import { RevisionHero } from './revision-components';
import { ayahCountLabel, REVISION_LABELS, WeeklySchedule } from './session-schedule';
import { saveWithReminder } from './save-with-reminder';
import { type AyahSpan, isMemorizationPlan, isRevisionPlan, type RevisionPlan } from './types';
import { usePlanIndex } from './use-plan-index';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const clock = (plan: RevisionPlan) => `${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`;

export function RevisionDetail({ plan, initialReminderIssue }: { plan: RevisionPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette: p, update } = useReadingPreferences();
  const { today, commit, plans, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [editing, setEditing] = useState(false), [choosing, setChoosing] = useState(false), [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const saving = useRef(false);
  const [name, setName] = useState(plan.name), [days, setDays] = useState(plan.weekdays), [amount, setAmount] = useState(String(plan.goal.dailyQuarters));
  const [reminder, setReminder] = useState(plan.reminder.enabled), [time, setTime] = useState(clock(plan));
  const day = revisionDay(plan, today), next = nextRevisionPortion(plan, today);
  const owner = plans.find(item => isMemorizationPlan(item) && item.riwayah === plan.riwayah && isCurrentGoal(item));
  const other = currentRevisionGoal(plans, plan.riwayah, plan.id);
  const doneToday = plan.log.some(log => log.date === today);
  let mismatch = '';
  if (index) { try { assertPlanIndex(plan, index); } catch (e) { mismatch = (e as Error).message; } }
  /** Status-only changes never need the mushaf, so an offline edition cannot lock the goal. */
  const mutate = async (change: (current: RevisionPlan) => RevisionPlan, needsIndex = true) => {
    if (saving.current || (needsIndex && (!index || mismatch))) return false;
    saving.current = true; setBusy(true); setMessage('');
    try {
      await commit(items => items.map(current => {
        if (current.id !== plan.id || !isRevisionPlan(current)) return current;
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
  const saveMemory = async (selected: AyahSpan[]) => {
    if (await mutate(current => {
      if (current.revision !== plan.revision) throw new Error(t('revision.detail.errors.memoryChanged'));
      return { ...current, memorized: selected, revision: current.revision + 1, undo: undefined };
    })) setChoosing(false);
  };
  const openSettings = () => {
    setName(plan.name); setDays(plan.weekdays); setAmount(String(plan.goal.dailyQuarters)); setReminder(plan.reminder.enabled); setTime(clock(plan)); setMessage(''); setEditing(true);
  };
  const saveSettings = async () => {
    if (saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage(t('revision.detail.errors.nameAndTime')); return; }
    const dailyQuarters = Number(normalizeArabicSearch(amount));
    if (!days.length || !Number.isInteger(dailyQuarters) || dailyQuarters < 1 || dailyQuarters > REVISION_MAX_QUARTERS) { setMessage(t('revision.detail.errors.daysAndAmount')); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), reminder: { enabled: reminder, hour, minute } }, saved => commit(items => items.map(current => {
        if (current.id !== plan.id || !isRevisionPlan(current)) return current;
        const changed = dailyQuarters !== current.goal.dailyQuarters || [...days].sort().join() !== [...current.weekdays].sort().join();
        const revised = changed ? reviseRevisionSettings(current, { dailyQuarters, weekdays: days }, localDate()) : current;
        return { ...revised, name: saved.name, reminder: saved.reminder };
      })), remindersSupported ? requestPlanReminders : undefined);
      if (issue) setMessage(savedReminderNotice(issue)); setEditing(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveSettings')); }
    finally { saving.current = false; setBusy(false); }
  };
  const archive = () => plan.status === 'archived'
    ? mutate(current => current.status === 'archived' ? restoreArchivedGoal(current) : current)
    : mutate(current => ({ ...current, status: 'archived' }), false);
  const deletionDate = archiveDeletionDate(plan);
  const portion = day && index ? { start: day.spans[0].start, end: day.spans.at(-1)!.end } : undefined;
  const ayahs = portion && index ? index.ayahs.slice(portion.start, portion.end).filter((_, i) => day!.spans.some(r => r.start <= portion.start + i && portion.start + i < r.end)) : [];
  const first = ayahs[0], last = ayahs.at(-1);
  const resumed = !!day && day.remaining[0].start > day.spans[0].start;
  const schedule = useMemo(() => index && plan.status === 'active' ? remainingPassDays(plan, today).map(item => ({ date: item.date, ranges: item.spans })) : [], [index, plan, today]);
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && <RevisionHero plan={plan} index={index} />}
    {index && !mismatch && day && first && last && <PlanCard prominent>
      <View style={[d.row, { alignItems: 'flex-start', gap: 14 }]}>
        <View style={[d.grow, { gap: 2 }]}>
          <PortionHeading due={day.due} title={day.due ? t('revision.detail.portion.due') : doneToday ? t('revision.detail.portion.doneNext') : t('revision.detail.portion.next')} />
          <SurahName number={first.surahNumber} name={index.surahNames[first.surahNumber]} size={54} color={p.ornament} />
          <Text style={{ color: p.foreground, fontSize: 22, lineHeight: 36, fontFamily: 'ReaderNaskhBold' }}>{first.surahNumber !== last.surahNumber ? t('revision.detail.portion.fromAyah', { ayah: first.ayahNumber }) : ayahs.length === 1 ? t('revision.detail.portion.ayah', { ayah: first.ayahNumber }) : t('revision.detail.portion.ayahs', { from: first.ayahNumber, to: last.ayahNumber })}</Text>
          {first.surahNumber !== last.surahNumber && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.detail.portion.until', { surah: index.surahNames[last.surahNumber], ayah: last.ayahNumber })}</Text>}
        </View>
        <DateSeal date={day.date} due={day.due} />
      </View>
      <PortionStats items={[{ id: 'ayahs', label: t('revision.detail.stats.ayahs'), value: formatNumber(ayahs.length) }, { id: 'words', label: t('revision.detail.stats.words'), value: formatNumber(ayahs.reduce((n, a) => n + a.text.split(/\s+/).filter(Boolean).length, 0)) },
        { id: 'pages', label: first.pageNumber === last.pageNumber ? t('revision.detail.stats.page') : t('revision.detail.stats.pages'), value: first.pageNumber === last.pageNumber ? formatNumber(first.pageNumber) : t('revision.detail.stats.pageRange', { from: first.pageNumber, to: last.pageNumber }) }]} />
      {day.spans.length > 1 && <View style={{ gap: 6 }}>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.detail.portion.spans', { count: day.spans.length })}</Text>
        {day.spans.map(range => { const done = !day.remaining.some(r => r.end === range.end); return <View key={range.start} style={[d.row, { gap: 8 }]}>
          <ReaderIcon name={done ? 'check' : 'bookmark'} color={done ? p.ornament : p.mutedForeground} size={15} />
          <Text style={{ color: done ? p.mutedForeground : p.foreground, fontSize: 13, flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}>{ayahRangeLabel(index, range.start, range.end)}</Text>
        </View>; })}
      </View>}
      {day.due ? <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={resumed ? t('revision.detail.actions.continue') : t('revision.detail.actions.start')} disabled={busy} onPress={openReading} />
        <DetailAction icon="check" label={t('revision.detail.actions.finishToday')} disabled={busy} onPress={() => void mutate(current => {
          if (current.revision !== plan.revision) throw new Error(t('revision.detail.errors.portionChanged'));
          return finishRevisionDay(current, localDate());
        })} />
        {resumed && <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>{t('revision.detail.portion.resumeNote')}</Text>}
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{doneToday ? `${t('revision.detail.portion.accepted')} ` : ''}{t('revision.detail.portion.opensOn', { date: weekdayDateLabel(day.date) })}</Text>}
    </PlanCard>}
    {plan.status === 'active' && index && !mismatch && !plan.memorized.length && <PlanCard prominent>
      <View style={[d.row, { gap: 12, alignItems: 'flex-start' }]}><IconTile name="loop" /><View style={d.grow}><Copy title>{t('revision.detail.empty.title')}</Copy><Copy muted>{owner ? t('revision.detail.empty.owner', { name: owner.name }) : t('revision.detail.empty.choose')}</Copy></View></View>
      {owner ? <DetailAction label={t('revision.detail.actions.openGoal', { name: owner.name })} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: owner.id } })} />
        : <DetailAction primary label={t('revision.chooseMemorized')} disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} />}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <View style={[d.row, { gap: 12 }]}><IconTile name={plan.status === 'paused' ? 'pause' : 'archive'} /><View style={d.grow}><Copy title>{plan.status === 'paused' ? t('revision.detail.paused.title') : t('goals.archived.title')}</Copy></View></View>
      <Copy muted>{plan.status === 'archived' ? `${t('revision.detail.archived.keepsRecord')} ${deletionDate ? t('revision.detail.archived.deletedOn', { date: shortDate(deletionDate) }) : ''}` : t('revision.detail.paused.detail')}</Copy>
      {plan.status === 'paused' && <DetailAction primary label={t('revision.detail.actions.resume')} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today), false)} />}
      {plan.status === 'archived' && <><DetailAction primary label={t('goals.actions.restore')} disabled={busy || !!other || !index || !!mismatch} onPress={() => void archive()} />
        {!!other && <Copy muted>{t('revision.detail.archived.otherGoal')}</Copy>}
        <DetailAction destructive icon="trash" label={t('goals.actions.delete')} disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {plan.undo?.date === today && plan.status === 'active' && <DetailAction icon="undo" label={t('revision.detail.actions.undo')} disabled={busy} onPress={() => void mutate(current => undoRevisionProgress(current, localDate()))} />}
    {index && !mismatch && !!schedule.length && <WeeklySchedule index={index} sessions={schedule} today={today} labels={REVISION_LABELS}
      summary={`${t('revision.perSession', { amount: quarterLabel(plan.goal.dailyQuarters) })} · ${weekdaysLabel(plan.weekdays)}`} footer={t('revision.detail.scheduleFooter', { date: dateLabel(schedule.at(-1)!.date) })} />}
    {index && !mismatch && plan.status !== 'archived' && !!plan.memorized.length && <RowGroup palette={p}>
      {owner ? <Row icon="check" palette={p} title={t('revision.detail.memorized.title')} detail={t('revision.detail.memorized.owner', { count: spanCount(plan.memorized), name: owner.name })}
        label={t('revision.detail.actions.openGoal', { name: owner.name })} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: owner.id } })} />
        : <Row icon="check" palette={p} title={t('revision.detail.memorized.title')} detail={t('revision.detail.memorized.own', { count: spanCount(plan.memorized) })}
          label={t('revision.detail.actions.editMemorized')} disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} />}
    </RowGroup>}
    {index && !mismatch && plan.status !== 'archived' && !!plan.memorized.length && <PracticeGoalCard riwayah={plan.riwayah} />}
    {index && !mismatch && !!plan.log.length && <Section title={t('revision.detail.logTitle')} palette={p}>
      <RowGroup palette={p}>{plan.log.slice(-5).reverse().map((log, i) => <Row key={`${log.date}-${i}`} palette={p} leading={<Medallion value={log.pass} size={34} palette={p} label={t('revision.passNumber', { pass: log.pass })} />}
        title={ayahRangeLabel(index, log.from, log.to)}
        detail={`${shortDate(log.date)} · ${t('revision.passNumber', { pass: log.pass })} · ${ayahCountLabel(spanCount(plan.memorized.flatMap(r => r.end <= log.from || r.start >= log.to ? [] : [{ start: Math.max(r.start, log.from), end: Math.min(r.end, log.to) }])))}`} />)}</RowGroup>
    </Section>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label={t('goals.name')} value={name} onChange={setName} />
      <View style={{ gap: 10 }}><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('revision.amount.label')}</Text>
        <AmountPicker label={t('revision.amount.label')} value={amount} onChange={setAmount} unit={t('revision.amount.unit')} presets={['1', '2', '4', '8']} presetLabel={quarterLabel} minimum={1} maximum={REVISION_MAX_QUARTERS} parse={value => Number(normalizeArabicSearch(value))} /></View>
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('common.weekdays.everyDay'), value: EVERY_DAY }, { label: t('revision.weekdays.exceptFriday'), value: [0, 1, 2, 3, 4, 6] }, { label: t('revision.weekdays.mondayThursday'), value: [1, 4] }]} />
      <Copy muted>{t('revision.detail.settings.keepsPlace')}</Copy>
      <RowGroup palette={p}><SwitchRow icon="bell" label={t('revision.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('revision.detail.settings.reminderDetail') : t('goals.reminder.enableOnPhone')} /></RowGroup>
      {reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy} onPress={() => void saveSettings()}>{t('goals.actions.saveSettings')}</ReaderButton>
      <RowGroup palette={p}>
        {(plan.status === 'active' || plan.status === 'paused') && <Row icon={plan.status === 'paused' ? 'play' : 'pause'} palette={p} chevron={false} disabled={busy} title={plan.status === 'paused' ? t('revision.detail.actions.resume') : t('revision.detail.actions.pause')}
          onPress={() => { const pause = plan.status === 'active'; void mutate(current => setPlanPaused(current, pause, today), false).then(saved => { if (saved) setEditing(false); }); }} />}
        <Row icon={plan.status === 'archived' ? 'restore' : 'archive'} palette={p} chevron={false} title={plan.status === 'archived' ? t('goals.actions.restore') : t('goals.actions.archive')} detail={t('revision.detail.settings.archiveNote')}
          disabled={busy || (plan.status === 'archived' && (!!other || !index || !!mismatch))} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      </RowGroup>
    </PlanSettingsSheet>}
    {choosing && index && !owner && <MemorizedSelectionSheet index={index} selected={plan.memorized} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
