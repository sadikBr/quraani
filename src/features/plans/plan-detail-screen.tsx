import { useState } from 'react';
import { View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { router, useLocalSearchParams } from 'expo-router';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { usePlans } from './provider';
import { DetailAction, DetailScreen, PlanSettingsSheet, ProgressHero, ReadingBounds, d } from './plan-detail-components';
import { arabicNumber, shortDate } from './presentation';
import { PlanSchedule } from './plan-schedule';
import { assertPlanIndex, nextPortion, rangeLabel, recordProgress, reschedulePlan, setPlanPaused, undoProgress, unitLabels } from './engine';
import { dateLabel } from './dates';
import { usePlanIndex } from './use-plan-index';
import { PlanDateField } from './plan-date-field';
import { remindersSupported, requestPlanReminders } from './notifications';
import { isMemorizationPlan, isSequentialPlan, isRecurringPlan, type SequentialPlan } from './types';
import { MemorizationDetail } from './memorization-detail-screen';
import { RecurringDetail } from './recurring-detail-screen';
import { saveWithReminder } from './save-with-reminder';
import { savedReminderNotice, type ReminderIssue } from './reminder-errors';
import { DuplicateGoalError } from './goal-limit';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanScreen, PlanSwitch, planStyles as s } from './components';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';

export function PlanDetailScreen() {
  const { id, reminderIssue } = useLocalSearchParams<{ id: string; reminderIssue?: string }>();
  const { plans, ready, error, retry } = usePlans();
  const plan = plans.find(p => p.id === id);
  if (!ready || !plan) return <PlanScreen title="الهدف" onBack={() => router.replace('/plans')}>
    <PlanNotice message={error} retry={retry} />{!ready ? <PlanLoading /> : <Copy>هذا الهدف غير موجود.</Copy>}
  </PlanScreen>;
  if (isMemorizationPlan(plan)) return <MemorizationDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
  if (isRecurringPlan(plan)) return <RecurringDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
  return <PlanDetail key={plan.id} plan={plan} initialReminderIssue={reminderIssue === 'permission' || reminderIssue === 'unavailable' ? reminderIssue : undefined} />;
}
function PlanDetail({ plan, initialReminderIssue }: { plan: SequentialPlan; initialReminderIssue?: ReminderIssue }) {
  const { palette, update } = useReadingPreferences();
  const { commit, today, reminderError } = usePlans();
  const { index, error, retry } = usePlanIndex(plan.riwayah);
  const [busy, setBusy] = useState(false);
  const [conflictId, setConflictId] = useState<string>();
  const [message, setMessage] = useState(() => initialReminderIssue ? savedReminderNotice(initialReminderIssue) : '');
  const [showCatchUp, setShowCatchUp] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState(plan.name);
  const [repeat, setRepeat] = useState(plan.repeat);
  const [reminder, setReminder] = useState(plan.reminder.enabled);
  const [time, setTime] = useState(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`);
  let mismatch = '';
  if (index) { try { assertPlanIndex(plan, index); } catch (e) { mismatch = (e as Error).message; } }
  const next = nextPortion(plan, today);
  const mutate = async (change: (p: SequentialPlan) => SequentialPlan) => {
    if (busy) return false;
    setBusy(true); setMessage(''); setConflictId(undefined);
    try { await commit(items => items.map(p => p.id === plan.id && isSequentialPlan(p) ? change(p) : p)); return true; }
    catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر حفظ التغيير. حاول مرة أخرى.');
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
      return false;
    }
    finally { setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start];
    update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber),
      plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const saveSettings = async () => {
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('راجع اسم الهدف والوقت (مثل 20:00).'); return; }
    setBusy(true); setMessage(''); setConflictId(undefined);
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), repeat, reminder: { enabled: reminder, hour, minute } },
        saved => commit(items => items.map(p => p.id === plan.id ? { ...p, name: saved.name, repeat: saved.repeat, reminder: saved.reminder } : p)),
        remindersSupported ? requestPlanReminders : undefined);
      if (issue) { setReminder(false); setMessage(savedReminderNotice(issue)); }
      setEditing(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر حفظ الإعدادات.');
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
    }
    finally { setBusy(false); }
  };
  const openSettings = () => {
    setName(plan.name); setRepeat(plan.repeat); setReminder(plan.reminder.enabled);
    setTime(`${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}`);
    setEditing(true);
  };
  const archive = () => mutate(p => p.status === 'archived' ? restoreArchivedGoal(p) : { ...p, status: 'archived' });
  const deletionDate = archiveDeletionDate(plan);
  const openConflict = () => {
    if (conflictId) { setEditing(false); router.replace({ pathname: '/plans/[id]', params: { id: conflictId } }); }
  };
  const partial = !!next && next.start > plan.cycle.sessions[next.slot].start;
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} />
    {!!conflictId && !editing && <DetailAction label="عرض الهدف الحالي" onPress={openConflict} />}
    <PlanNotice message={reminderError} />
    <ProgressHero plan={plan} />
    {!index && !error && <PlanLoading />}
    {index && !mismatch && next && <PlanCard>
      <View style={d.row}>
        <View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}><ReaderIcon name="book" color={palette.accent} size={21} /></View>
        <View style={d.grow}>
          <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 20, fontWeight: '600' }}>{next.due ? next.date < today ? 'ورد بانتظارك' : 'ورد اليوم' : 'وردك القادم'}</Text>
        </View>
        <Text style={{ color: palette.muted, fontSize: 12 }}>الورد {arabicNumber(next.slot + 1)}</Text>
      </View>
      <View>
        <Text style={{ color: palette.text, fontSize: 27, fontWeight: '600' }}>{rangeLabel(index, next.start, next.end)}</Text>
        <Text style={{ color: palette.muted, fontSize: 12 }}>{shortDate(next.date)}{partial ? ' · نكمل من حيث توقفت' : ''}</Text>
      </View>
      <ReadingBounds index={index} start={next.start} end={next.end} />
      <View style={{ gap: 2 }}>
        <DetailAction primary icon="book" label={partial ? 'تابع القراءة' : next.due ? 'ابدأ القراءة' : `متاح ${shortDate(next.date)}`} disabled={!next.due || busy} onPress={openReading} />
        {next.due && <DetailAction icon="check" label="أتممت هذا الورد" disabled={busy} onPress={() => void mutate(p => recordProgress(p, { cycle: next.cycle, slot: next.slot, to: next.end }, today))} />}
      </View>
      {plan.goal.type === 'khatma' && next.date < today && <View style={{ borderTopWidth: 1, borderColor: palette.border, paddingTop: 8 }}>
        <DetailAction icon="calendar" label={showCatchUp ? 'إخفاء خيارات تعديل الجدول' : 'تحتاج إلى تعديل الجدول؟'} onPress={() => setShowCatchUp(x => !x)} />
        {showCatchUp && <View style={s.section}><Copy muted>تقدمك محفوظ. يمكنك تمديد الموعد أو توزيع المتبقي على الأيام القادمة.</Copy>
          <ReaderButton palette={palette} disabled={busy} onPress={() => void mutate(p => reschedulePlan(p, index, 'extend', today))}>تمديد الجدول من اليوم</ReaderButton>
          <ReaderButton palette={palette} disabled={busy || plan.cycle.sessions.at(-1)!.date < today} onPress={() => void mutate(p => reschedulePlan(p, index, 'redistribute', today))}>توزيع المتبقي حتى الموعد الأصلي</ReaderButton>
        </View>}
      </View>}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <View style={d.row}><ReaderIcon name={plan.status === 'completed' ? 'check' : 'bookmark'} color={palette.accent} size={24} />
        <View style={d.grow}><Copy title>{plan.status === 'completed' ? 'أتممت رحلتك، تقبّل الله منك' : plan.status === 'paused' ? 'خذ وقتك، تقدمك محفوظ' : 'هذا الهدف في الأرشيف'}</Copy></View></View>
      <Copy muted>{plan.status === 'completed' ? plan.repeat ? 'تبدأ دورة جديدة في اليوم التالي للإكمال.' : 'يمكنك مراجعة جميع أورادك في الجدول أدناه.' : plan.status === 'paused' ? 'عند الاستئناف نمدد الجدول بمدة التوقف.' : `تذكيراته متوقفة. ${deletionDate ? `سيُحذف نهائيًا في ${shortDate(deletionDate)}.` : 'سيُحذف نهائيًا بعد أسبوعين.'} استعده قبل ذلك للاحتفاظ به.`}</Copy>
      {plan.status === 'paused' && <DetailAction primary label="استئناف الهدف" icon="book" disabled={busy} onPress={() => void mutate(p => setPlanPaused(p, false, today))} />}
      {plan.status === 'archived' && <><DetailAction primary label="استعادة الهدف" icon="restore" disabled={busy} onPress={() => void archive()} />
        <DetailAction destructive label="حذف الهدف" icon="trash" disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {plan.cycle.progress.length > 0 && plan.status !== 'archived' && <DetailAction label="التراجع عن آخر تسجيل قراءة" disabled={busy} onPress={() => void mutate(undoProgress)} />}
    {index && !mismatch && <PlanSchedule plan={plan} index={index} today={today} />}
    <View style={{ gap: 8, paddingHorizontal: 4 }}>
      <Text style={{ color: palette.muted, fontSize: 12 }}>{plan.goal.type === 'khatma' ? `التوزيع حسب ${unitLabels[plan.unit]}` : `المقدار اليومي: ${arabicNumber(plan.goal.amount)} ${unitLabels[plan.unit]}`} · {plan.repeat ? 'تتكرر بعد الإكمال' : 'دورة واحدة'}</Text>
      <Text style={{ color: palette.muted, fontSize: 12 }}>بداية الدورة: {dateLabel(plan.cycle.sessions[0].date)}{plan.reminder.enabled ? ` · التذكير ${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}` : ' · التذكير غير مفعّل'}</Text>
    </View>
    {!!plan.history.length && <PlanCard><Copy title>الدورات السابقة</Copy>{plan.history.map(h => <Copy key={h.number}>الدورة {arabicNumber(h.number)} · اكتملت {dateLabel(h.completedOn)}</Copy>)}</PlanCard>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}>
      <PlanNotice message={message} />
      {!!conflictId && <DetailAction label="عرض الهدف الحالي" onPress={openConflict} />}
      <PlanField label="اسم الهدف" value={name} onChange={setName} />
      <PlanSwitch label="التكرار بعد الإكمال" checked={repeat} onChange={setRepeat} detail="ابدأ دورة جديدة في اليوم التالي للإتمام." />
      <PlanSwitch label="تذكير بالورد" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={!remindersSupported ? 'غيّر التذكيرات من تطبيق الهاتف.' : 'وقت يومي تخصصه لقراءة القرآن.'} />
      {reminder && <PlanDateField label="وقت التذكير" value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={palette} selected disabled={busy} onPress={() => void saveSettings()}>حفظ الإعدادات</ReaderButton>
      <View style={{ borderTopWidth: 1, borderColor: palette.border, paddingTop: 12, gap: 4 }}>
        {(plan.status === 'active' || plan.status === 'paused') && <DetailAction label={plan.status === 'active' ? 'إيقاف الهدف مؤقتًا' : 'استئناف الهدف'} disabled={busy} onPress={() => void mutate(p => setPlanPaused(p, p.status === 'active', today)).then(saved => { if (saved) setEditing(false); })} />}
        <DetailAction label={plan.status === 'archived' ? 'استعادة الهدف' : 'أرشفة الهدف'} disabled={busy} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
        {plan.status !== 'archived' && <Copy muted>يُحذف الهدف نهائيًا بعد أسبوعين من أرشفته. يمكنك استعادته خلال هذه المدة.</Copy>}
      </View>
    </PlanSettingsSheet>}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
