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
import { arabicNumber, shortDate, weekdayDateLabel } from './presentation';
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
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ التغيير. حاول مرة أخرى.'); return false; }
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
          <Text accessibilityRole="header" style={{ color: next.due ? p.primary : p.mutedForeground, fontSize: 14, fontWeight: '600' }}>{next.due ? 'نصيبك من الحفظ اليوم' : 'موعدك القادم للحفظ'}</Text>
          <SurahName number={index.ayahs[next.start].surahNumber} name={index.surahNames[index.ayahs[next.start].surahNumber]} size={56} color={p.ornament} />
          <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{next.end - next.start === 1 ? `الآية ${arabicNumber(index.ayahs[next.start].ayahNumber)}` : `الآيات ${arabicNumber(index.ayahs[next.start].ayahNumber)} – ${arabicNumber(index.ayahs[next.end - 1].ayahNumber)}`}</Text>
          {index.ayahs[next.start].surahNumber !== index.ayahs[next.end - 1].surahNumber && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>حتى {index.surahNames[index.ayahs[next.end - 1].surahNumber]}، الآية {arabicNumber(index.ayahs[next.end - 1].ayahNumber)}</Text>}
        </View>
        {/* The date as a calendar leaf: weekday on top, day below. */}
        <View accessible accessibilityLabel={next.due ? 'اليوم' : weekdayDateLabel(next.date)} style={{ minWidth: 74, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: readerShape.lg, backgroundColor: next.due ? p.primary : p.muted }}>
          <Text style={{ color: next.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{next.due ? 'اليوم' : new Intl.DateTimeFormat('ar-MA', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${next.date}T12:00:00Z`))}</Text>
          <Text style={{ color: next.due ? p.primaryForeground : p.foreground, fontSize: 28, fontWeight: '600', lineHeight: 36 }}>{arabicNumber(Number(next.date.slice(8)))}</Text>
          <Text style={{ color: next.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{new Intl.DateTimeFormat('ar-MA', { month: 'long', timeZone: 'UTC' }).format(new Date(`${next.date}T12:00:00Z`))}</Text>
        </View>
      </View>
      <View style={[d.row, { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingVertical: 10, gap: 0 }]}>
        {[{ label: 'الآيات', value: arabicNumber(next.end - next.start) }, { label: 'الكلمات', value: arabicNumber(index.ayahs.slice(next.start, next.end).reduce((n, a) => n + a.text.split(/\s+/).filter(Boolean).length, 0)) },
          { label: 'الصفحة', value: index.ayahs[next.start].pageNumber === index.ayahs[next.end - 1].pageNumber ? arabicNumber(index.ayahs[next.start].pageNumber) : `${arabicNumber(index.ayahs[next.start].pageNumber)}–${arabicNumber(index.ayahs[next.end - 1].pageNumber)}` }].map((stat, i) =>
          <View key={stat.label} style={[d.grow, { alignItems: 'center', borderStartWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{stat.label}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{stat.value}</Text>
          </View>)}
      </View>
      {plan.sessions[0].ranges.length > 1 && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>جلسة اليوم تضم {arabicNumber(plan.sessions[0].ranges.length)} مقاطع؛ نفتح كل مقطع وحده.</Text>}
      {next.due ? <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label="ابدأ الحفظ" disabled={busy} onPress={openReading} />
        <DetailAction icon="check" label="أتممت حفظ هذا المقطع" disabled={busy} onPress={() => void mutate(current => recordMemorizationProgress(current, { cycle: next.cycle, slot: next.slot, to: next.end }, localDate()))} />
        <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>لا يُضاف المقطع إلى محفوظك حتى تؤكد إتمام حفظه.</Text>
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13 }}>يُفتح هذا المقطع يوم {weekdayDateLabel(next.date)}. حتى ذلك الحين راجع ما حفظته.</Text>}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard><Copy title>{plan.status === 'completed' ? 'أتممت حفظ القرآن، هنيئًا لك' : plan.status === 'paused' ? 'خذ وقتك، محفوظك باقٍ' : 'هذا الهدف في الأرشيف'}</Copy>
      <Copy muted>{plan.status === 'archived' ? `حذف الهدف لا يمس سجل محفوظك. ${deletionDate ? `يُحذف الهدف في ${shortDate(deletionDate)}.` : ''}` : plan.status === 'paused' ? 'عند العودة نتابع ما تبقّى في أيام الحفظ المختارة.' : 'سجلك محفوظ. ويمكنك تصحيح المقاطع المسجلة إذا احتجت.'}</Copy>
      {plan.status === 'paused' && <DetailAction primary label="استئناف الحفظ" disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today), false)} />}
      {plan.status === 'archived' && <><DetailAction primary label="استعادة الهدف" disabled={busy || !!other || !index || !!mismatch} onPress={() => void archive()} /><DetailAction destructive icon="trash" label="حذف الهدف" disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {index && !mismatch && <>
      {plan.status !== 'archived' && !other && <PlanCard><View style={[d.row, { gap: 12, alignItems: 'flex-start' }]}><IconTile name="check" /><View style={d.grow}><Copy title>سجل محفوظك</Copy><Copy muted>أضف ما حفظته خارج الهدف أو صحح اختيارًا سابقًا.</Copy></View></View><DetailAction label="عرض المحفوظ وتعديله" disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} /></PlanCard>}
      {plan.undoable && plan.status !== 'archived' && !other && <DetailAction label="التراجع عن آخر تسجيل حفظ" disabled={busy} onPress={() => void mutate(current => undoMemorizationProgress(current, index, localDate()))} />}
      {!!schedule.length && plan.status !== 'archived' && <WeeklySchedule index={index} sessions={schedule} today={today} labels={MEMORIZATION_LABELS} summary={`${quarterLabel(plan.goal.weeklyQuarters)} أسبوعيًا · ${weekdaysLabel(plan.weekdays)}`} footer={`الموعد المتوقع لإتمام الحفظ: ${dateLabel(schedule.at(-1)!.date)} · يتحدّث مع تقدّمك.`} />}
      {!!plan.progress.length && <PlanCard><Copy title>آخر ما أضفته إلى محفوظك</Copy><View>{plan.progress.slice(-5).reverse().map((log, i) => <View key={`${log.date}-${i}`} style={{ gap: 2, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }}><Text style={{ color: p.foreground, fontSize: 15 }}>{ayahRangeLabel(index, log.from, log.to)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(log.date)}</Text></View>)}</View></PlanCard>}
    </>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label="اسم الهدف" value={name} onChange={setName} />
      <AmountPicker label="المقدار الأسبوعي بأرباع الأحزاب" value={amount} onChange={setAmount} unit="ربع حزب أسبوعيًا" presets={['1', '2', '4', '8']} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} />
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: 'الإثنين والأربعاء', value: [1, 3] }, { label: 'كل يوم', value: [0, 1, 2, 3, 4, 5, 6] }]} />
      <Copy muted>تغيير الأيام أو المقدار يعيد توزيع المتبقي ويحافظ على محفوظك.</Copy>
      <PlanSwitch label="ذكّرني بالحفظ" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'في أيام الحفظ فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />{reminder && <PlanDateField label="وقت التذكير" value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy || !index || !!mismatch} onPress={() => void saveSettings()}>حفظ الإعدادات</ReaderButton>
      {(plan.status === 'active' || plan.status === 'paused') && <DetailAction label={plan.status === 'paused' ? 'استئناف الحفظ' : 'إيقاف الحفظ مؤقتًا'} disabled={busy} onPress={() => { const pause = plan.status === 'active'; void mutate(current => setPlanPaused(current, pause, today), false).then(saved => { if (saved) setEditing(false); }); }} />}
      <DetailAction label={plan.status === 'archived' ? 'استعادة الهدف' : 'أرشفة الهدف'} disabled={busy || (plan.status === 'archived' && (!!other || !index || !!mismatch))} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      <Copy muted>يبقى سجل المحفوظ بعد أرشفة هذا الهدف وحذفه.</Copy>
    </PlanSettingsSheet>}
    {choosing && index && <MemorizedSelectionSheet index={index} selected={ranges} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
