import { useRef, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { isMemorizationPlan, type MemorizationPlan, type AyahSpan } from './types';
import { assertPlanIndex, ayahRangeLabel, nextPortion, setPlanPaused } from './engine';
import { memorizationSchedule, memoryFor, quarterLabel, recordMemorizationProgress, reviseMemorization, spanCount, undoMemorizationProgress } from './memorization';
import { weekdaysLabel } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { arabicNumber, shortDate, weekdayDateLabel } from './presentation';
import { DetailAction, DetailScreen, PlanSettingsSheet, ReadingBounds, d } from './plan-detail-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { AmountPicker } from './goal-creation-components';
import { WeekdayPicker } from './recurring-components';
import { PlanDateField } from './plan-date-field';
import { saveWithReminder } from './save-with-reminder';
import { requestPlanReminders, remindersSupported } from './notifications';
import { savedReminderNotice, type ReminderIssue } from './reminder-errors';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';
import { MemorizationHero } from './memorization-components';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { currentMemorizationGoal } from './goal-limit';
import { normalizeArabicSearch } from '../quran-reader/utils/search';

export function MemorizationDetail({ plan, initialReminderIssue }: { plan: MemorizationPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette: p, update } = useReadingPreferences();
  const { today, commit, plans, memorization, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [editing, setEditing] = useState(false), [choosing, setChoosing] = useState(false), [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const saving = useRef(false);
  const [name, setName] = useState(plan.name), [days, setDays] = useState(plan.weekdays), [amount, setAmount] = useState(String(plan.goal.weeklyQuarters));
  const [reminder, setReminder] = useState(plan.reminder.enabled), [time, setTime] = useState('18:00'), [limit, setLimit] = useState(7);
  const next = nextPortion(plan, today), schedule = memorizationSchedule(plan, today);
  const other = currentMemorizationGoal(plans, plan.id);
  let mismatch = '', ranges = plan.memorized;
  if (index) { try { assertPlanIndex(plan, index); ranges = memoryFor(memorization, plan.riwayah, index); } catch (e) { mismatch = (e as Error).message; } }
  const mutate = async (change: (current: MemorizationPlan) => MemorizationPlan) => {
    if (saving.current || !index || mismatch) return false;
    saving.current = true; setBusy(true); setMessage('');
    try {
      await commit(items => items.map(current => {
        if (current.id !== plan.id || !isMemorizationPlan(current)) return current;
        assertPlanIndex(current, index); return change(current);
      })); return true;
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ التغيير. حاول مرة أخرى.'); return false; }
    finally { saving.current = false; setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start]; update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const replanDate = (current: MemorizationPlan) => current.progress.some(log => log.date === localDate() && log.finished) ? addDays(localDate(), 1) : localDate();
  const saveMemory = async (selected: AyahSpan[]) => {
    if (!index) return;
    if (await mutate(current => {
      if (current.revision !== plan.revision) throw new Error('تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.');
      return reviseMemorization(current, index, selected, replanDate(current));
    })) setChoosing(false);
  };
  const openSettings = () => {
    setName(plan.name); setDays(plan.weekdays); setAmount(String(plan.goal.weeklyQuarters)); setReminder(plan.reminder.enabled);
    setTime(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`); setEditing(true);
  };
  const saveSettings = async () => {
    if (!index || saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('راجع اسم الهدف والوقت.'); return; }
    const weeklyQuarters = Number(normalizeArabicSearch(amount));
    if (!days.length || !Number.isInteger(weeklyQuarters) || weeklyQuarters < 1 || weeklyQuarters > 240) { setMessage('اختر أيام الحفظ ومقدارًا صحيحًا يبدأ من ربع حزب.'); return; }
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
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الإعدادات.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const archive = () => mutate(current => current.status === 'archived' && index
    ? restoreArchivedGoal(reviseMemorization(current, index, memoryFor(memorization, current.riwayah, index), today))
    : { ...current, status: 'archived' });
  const deletionDate = archiveDeletionDate(plan);
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && <MemorizationHero index={index} ranges={ranges} />}
    {index && !mismatch && next && <PlanCard>
      <View style={d.row}><ReaderIcon name="book" color={p.accent} size={25} /><View style={d.grow}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 21, fontWeight: '600' }}>{next.due ? 'نصيبك من الحفظ اليوم' : 'موعدك القادم للحفظ'}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{shortDate(next.date)}</Text></View></View>
      <Text style={{ color: p.text, fontSize: 25, fontWeight: '600' }}>{ayahRangeLabel(index, next.start, next.end)}</Text>
      <ReadingBounds index={index} start={next.start} end={next.end} />
      {plan.sessions[0].ranges.length > 1 && <Text style={{ color: p.muted, fontSize: 12 }}>جلسة اليوم تضم {arabicNumber(plan.sessions[0].ranges.length)} مقاطع. نتجاوز ما تحفظه ونفتح كل مقطع وحده.</Text>}
      <DetailAction primary icon="book" label={next.due ? 'ابدأ الحفظ' : `متاح ${shortDate(next.date)}`} disabled={!next.due || busy} onPress={openReading} />
      {next.due && <DetailAction icon="check" label="أتممت حفظ هذا المقطع" disabled={busy} onPress={() => void mutate(current => recordMemorizationProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />}
      <Text style={{ color: p.muted, fontSize: 11 }}>لا يُضاف المقطع إلى محفوظك حتى تؤكد إتمام حفظه.</Text>
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard><Copy title>{plan.status === 'completed' ? 'أتممت حفظ القرآن، هنيئًا لك' : plan.status === 'paused' ? 'خذ وقتك، محفوظك باقٍ' : 'هذا الهدف في الأرشيف'}</Copy>
      <Copy muted>{plan.status === 'archived' ? `حذف الهدف لا يمس سجل محفوظك. ${deletionDate ? `يُحذف الهدف في ${shortDate(deletionDate)}.` : ''}` : plan.status === 'paused' ? 'عند العودة نتابع ما تبقّى في أيام الحفظ المختارة.' : 'سجلك محفوظ. ويمكنك تصحيح المقاطع المسجلة إذا احتجت.'}</Copy>
      {plan.status === 'paused' && <DetailAction primary label="استئناف الحفظ" disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today))} />}
      {plan.status === 'archived' && <><DetailAction primary label="استعادة الهدف" disabled={busy || !!other} onPress={() => void archive()} /><DetailAction destructive icon="trash" label="حذف الهدف" disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {index && !mismatch && <>
      {plan.status !== 'archived' && !other && <PlanCard><View style={d.row}><ReaderIcon name="check" color={p.accent} size={22} /><View style={d.grow}><Copy title>سجل محفوظك</Copy><Copy muted>أضف ما حفظته خارج الهدف أو صحح اختيارًا سابقًا.</Copy></View></View><DetailAction label="عرض المحفوظ وتعديله" disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} /></PlanCard>}
      {plan.undoable && plan.status !== 'archived' && !other && <DetailAction label="التراجع عن آخر تسجيل حفظ" disabled={busy} onPress={() => void mutate(current => undoMemorizationProgress(current, index, localDate()))} />}
      {!!schedule.length && plan.status !== 'archived' && <PlanCard><Copy title>خطواتك القادمة</Copy><Copy muted>{quarterLabel(plan.goal.weeklyQuarters)} أسبوعيًا · {weekdaysLabel(plan.weekdays)}</Copy>
        {schedule.slice(0, limit).map((session, i) => <View key={session.date} style={{ gap: 4, paddingTop: 12, borderTopWidth: 1, borderColor: p.border }}>
          <View style={[d.row, { justifyContent: 'space-between' }]}><Text style={{ color: i ? p.text : p.accent, fontSize: 16, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.muted, fontSize: 12 }}>{arabicNumber(spanCount(session.ranges))} آية</Text></View>
          {session.ranges.map(range => <Text key={range.start} style={{ color: p.muted, fontSize: 12 }}>{ayahRangeLabel(index, range.start, range.end)}</Text>)}
        </View>)}
        {schedule.length > limit && <DetailAction label="عرض مواعيد أكثر" onPress={() => setLimit(n => n + 14)} />}
        <Text style={{ color: p.muted, fontSize: 12 }}>الإتمام المتوقع: {dateLabel(schedule.at(-1)!.date)} · يتغير بحسب تقدمك.</Text>
      </PlanCard>}
      {!!plan.progress.length && <PlanCard><Copy title>آخر ما أضفته إلى محفوظك</Copy>{plan.progress.slice(-5).reverse().map((log, i) => <View key={`${log.date}-${i}`} style={{ gap: 2 }}><Text style={{ color: p.text, fontSize: 14 }}>{ayahRangeLabel(index, log.from, log.to)}</Text><Text style={{ color: p.muted, fontSize: 11 }}>{shortDate(log.date)}</Text></View>)}</PlanCard>}
    </>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label="اسم الهدف" value={name} onChange={setName} />
      <AmountPicker label="المقدار الأسبوعي بأرباع الأحزاب" value={amount} onChange={setAmount} unit="ربع حزب أسبوعيًا" presets={['1', '2', '4', '8']} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} />
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: 'الإثنين والأربعاء', value: [1, 3] }, { label: 'كل يوم', value: [0, 1, 2, 3, 4, 5, 6] }]} />
      <Copy muted>تغيير الأيام أو المقدار يعيد توزيع المتبقي ويحافظ على محفوظك.</Copy>
      <PlanSwitch label="ذكّرني بالحفظ" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'في أيام الحفظ فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />{reminder && <PlanDateField label="وقت التذكير" value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy || !index || !!mismatch} onPress={() => void saveSettings()}>حفظ الإعدادات</ReaderButton>
      {(plan.status === 'active' || plan.status === 'paused') && <DetailAction label={plan.status === 'paused' ? 'استئناف الحفظ' : 'إيقاف الحفظ مؤقتًا'} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, current.status === 'active', today)).then(saved => { if (saved) setEditing(false); })} />}
      <DetailAction label={plan.status === 'archived' ? 'استعادة الهدف' : 'أرشفة الهدف'} disabled={busy || (plan.status === 'archived' && !!other)} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      <Copy muted>يبقى سجل المحفوظ بعد أرشفة هذا الهدف وحذفه.</Copy>
    </PlanSettingsSheet>}
    {choosing && index && <MemorizedSelectionSheet index={index} selected={ranges} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
