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
import { arabicNumber, shortDate } from './presentation';
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
    catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ التغيير.'); return false; }
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
    if (!name.trim() || name.trim().length > 80 || !days.length || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('راجع اسم الهدف، الأيام ووقت التذكير.'); return; }
    saving.current = true; setBusy(true); setMessage('');
    try {
      const [hour, minute] = time.split(':').map(Number);
      const issue = await saveWithReminder({ ...plan, name: name.trim(), weekdays: days, reminder: { enabled: reminder, hour, minute } }, saved => commit(items => items.map(current =>
        current.id === plan.id && isRecurringPlan(current) ? { ...current, name: saved.name, weekdays: saved.weekdays, reminder: saved.reminder } : current)), remindersSupported ? requestPlanReminders : undefined);
      if (issue) setMessage(savedReminderNotice(issue));
      setEditing(false);
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الإعدادات.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <DetailScreen plan={plan} onBack={() => router.dismissTo('/plans')} onSettings={openSettings}>
    <PlanNotice message={message || mismatch || error} retry={error ? retry : undefined} /><PlanNotice message={reminderError} />
    <Card style={{ padding: 16, gap: 20 }}>
      <View style={[d.row, { gap: 16 }]}><View style={d.grow}>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>قراءة متكررة · {weekdaysLabel(plan.weekdays)}</Text>
        <Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', marginVertical: 4 }}>{progress.done ? 'قراءة طيبة، تقبّل الله منك' : next?.due ? 'موعدك مع القرآن اليوم' : 'رفقة تتجدد'}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{arabicNumber(completedOccurrences(plan))} قراءة مكتملة منذ البداية</Text>
      </View><IconTile name={progress.done ? 'check' : 'restore'} /></View>
      <View style={{ flexDirection: 'row', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16 }}>{Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map(date => {
        const state = occurrenceProgress(plan, date), scheduled = scheduledOn(plan, date);
        const label = new Intl.DateTimeFormat('ar', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
        return <View key={date} accessible accessibilityLabel={`${dateLabel(date)}، ${state.done ? 'مكتمل' : state.read ? 'قراءة جزئية' : scheduled ? date === today ? 'اليوم' : 'دون تسجيل قراءة' : 'غير مقرر'}`} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{label}</Text>
          <View style={{ width: 32, height: 32, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', backgroundColor: state.done ? p.primary : 'transparent', borderWidth: 1, borderColor: state.done ? p.primary : date === today ? p.ring : p.border }}>
            {state.done ? <ReaderIcon name="check" size={16} color={p.primaryForeground} /> : <View style={{ width: state.read ? 8 : 4, height: state.read ? 8 : 4, borderRadius: readerShape.detail, backgroundColor: scheduled || state.read ? p.mutedForeground : 'transparent' }} />}
          </View>
        </View>;
      })}</View>
    </Card>
    {!index && !error && <PlanLoading />}
    {next && index && !mismatch && <PlanCard prominent>
      <View style={d.row}><IconTile name="book" size={36} /><Text accessibilityRole="header" style={{ color: next.due ? p.foreground : p.mutedForeground, fontSize: 16, fontWeight: '600', flex: 1 }}>{next.due ? 'قراءة اليوم' : 'موعدك القادم'}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(next.date)}</Text></View>
      <SurahName number={plan.ranges[next.slot].surah} name={index.surahNames[plan.ranges[next.slot].surah]} size={48} color={p.ornament} />
      {plan.ranges.length > 1 && <View>{plan.ranges.map((range, slot) => <View key={range.surah} style={[d.row, { paddingVertical: 10, borderTopWidth: slot ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
        <View style={{ width: 24, alignItems: 'center' }}>{upcomingProgress.cursors[slot] === range.end ? <ReaderIcon name="check" color={p.primary} size={18} /> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{arabicNumber(slot + 1)}</Text>}</View>
        <Text style={{ color: slot === next.slot ? p.foreground : p.mutedForeground, fontSize: 15, fontWeight: slot === next.slot ? '600' : '400', flex: 1 }}>{index.surahNames[range.surah]}</Text>
        {slot === next.slot && <Badge variant="secondary">{next.start > range.start ? 'نكمل قراءتها' : 'نبدأ بها'}</Badge>}
      </View>)}</View>}
      <ReadingBounds index={index} start={next.start} end={next.end} />
      <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={next.due ? next.start > plan.ranges[next.slot].start ? 'تابع القراءة' : 'ابدأ القراءة' : `متاح ${shortDate(next.date)}`} disabled={!next.due || busy} onPress={openReading} />
        {next.due && <DetailAction icon="check" label="أتممت هذه السورة" disabled={busy} onPress={() => void mutate(current => recordProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />}
      </View>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>{plan.ranges.length > 1 ? 'جلسة مخصصة لكل سورة، ثم نتابع إلى التي تليها.' : 'قراءة الأيام الفائتة لا تتراكم. كل موعد بداية جديدة.'}</Text>
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard>
      <Copy title>{plan.status === 'paused' ? 'موعدك في انتظارك' : 'هذا الهدف في الأرشيف'}</Copy>
      <Copy muted>{plan.status === 'paused' ? 'تذكيراتك متوقفة. عند الاستئناف تعود إلى أيامك المعتادة، دون إضافة قراءة فائتة.' : `التذكيرات متوقفة. الحذف التلقائي: ${archiveDeletionDate(plan) ? shortDate(archiveDeletionDate(plan)!) : 'بعد أسبوعين'}.`}</Copy>
      <DetailAction primary label={plan.status === 'paused' ? 'استئناف الهدف' : 'استعادة الهدف'} disabled={busy} onPress={() => void mutate(current => current.status === 'paused' ? setPlanPaused(current, false, localDate()) : restoreArchivedGoal(current))} />
      {plan.status === 'archived' && <DetailAction destructive icon="trash" label="حذف الهدف" onPress={() => setDeleting(true)} />}
    </PlanCard>}
    {!!progress.logs.length && plan.status !== 'archived' && <DetailAction label="التراجع عن آخر تسجيل اليوم" disabled={busy} onPress={() => void mutate(current => undoRecurringProgress(current, localDate()))} />}
    <View style={{ gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>سجل القراءة</Text>
      {plan.occurrences.length ? <PlanCard><View>{[...plan.occurrences].reverse().slice(0, historyLimit).map((occurrence, i) => {
        const state = occurrenceProgress(plan, occurrence.date);
        return <View key={occurrence.date} style={[d.row, { paddingVertical: 10, gap: 12, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}><ReaderIcon name={state.done ? 'check' : 'book'} color={state.done ? p.primary : p.mutedForeground} size={20} />
          <View style={d.grow}><Text style={{ color: p.foreground, fontSize: 15 }}>{dateLabel(occurrence.date)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{state.done ? 'قراءة مكتملة' : `قراءة جزئية · ${arabicNumber(state.completed)} من ${arabicNumber(plan.ranges.length)} سور`}</Text></View>
        </View>;
      })}</View>{plan.occurrences.length > historyLimit && <DetailAction label="عرض قراءات أقدم" onPress={() => setHistoryLimit(limit => limit + 14)} />}</PlanCard>
        : <Text style={{ color: p.mutedForeground, fontSize: 15 }}>ستجد هنا قراءاتك بعد حفظ تقدمك الأول.</Text>}
    </View>
    <Text style={{ color: p.mutedForeground, fontSize: 13, paddingHorizontal: 4 }}>{weekdaysLabel(plan.weekdays)} · {plan.reminder.enabled ? `التذكير ${String(plan.reminder.hour).padStart(2, '0')}:${String(plan.reminder.minute).padStart(2, '0')}` : 'التذكير غير مفعّل'}</Text>
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}>
      <PlanNotice message={message} />
      <PlanField label="اسم الهدف" value={name} onChange={setName} />
      <Copy title>أيام القراءة</Copy><WeekdayPicker days={days} onChange={setDays} /><Copy muted>تطبق الأيام الجديدة على المواعيد القادمة، وتبقى قراءاتك السابقة محفوظة.</Copy>
      <PlanSwitch label="تذكير بالقراءة" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'في الأيام المختارة فقط.' : 'غيّر التذكيرات من تطبيق الهاتف.'} />
      {reminder && <PlanDateField label="وقت التذكير" mode="time" value={time} onChange={setTime} />}
      <ReaderButton palette={p} selected disabled={busy || !days.length} onPress={() => void saveSettings()}>حفظ الإعدادات</ReaderButton>
      <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 12, gap: 4 }}>
        {plan.status !== 'archived' && <DetailAction label={plan.status === 'paused' ? 'استئناف الهدف' : 'إيقاف الهدف مؤقتًا'} disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, current.status === 'active', localDate())).then(saved => { if (saved) setEditing(false); })} />}
        <DetailAction label={plan.status === 'archived' ? 'استعادة الهدف' : 'أرشفة الهدف'} disabled={busy} onPress={() => void mutate(current => current.status === 'archived' ? restoreArchivedGoal(current) : { ...current, status: 'archived' }).then(saved => { if (saved) setEditing(false); })} />
        <Copy muted>الأهداف المؤرشفة تُحذف بعد أسبوعين. يمكنك استعادتها خلال هذه المدة.</Copy>
      </View>
    </PlanSettingsSheet>}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
