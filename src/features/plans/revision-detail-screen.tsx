import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { IconTile } from '@/components/ui';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { archiveDeletionDate, restoreArchivedGoal } from './archive';
import { DeleteArchivedGoalDialog } from './archive-components';
import { Copy, PlanCard, PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { dateLabel, localDate } from './dates';
import { assertPlanIndex, ayahRangeLabel, setPlanPaused } from './engine';
import { AmountPicker } from './goal-creation-components';
import { currentRevisionGoal, isCurrentGoal } from './goal-limit';
import { quarterLabel, spanCount } from './memorization';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { remindersSupported, requestPlanReminders } from './notifications';
import { PlanDateField } from './plan-date-field';
import { DetailAction, DetailScreen, d, PlanSettingsSheet } from './plan-detail-components';
import { arabicNumber, shortDate, weekdayDateLabel } from './presentation';
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
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ التغيير. حاول مرة أخرى.'); return false; }
    finally { saving.current = false; setBusy(false); }
  };
  const openReading = () => {
    if (!index || !next?.due || mismatch) return;
    const ayah = index.ayahs[next.start]; update({ riwayah: plan.riwayah });
    router.push({ pathname: '/', params: { surah: String(ayah.surahNumber), ayah: String(ayah.ayahNumber), plan: plan.id, planCycle: String(next.cycle), planSlot: String(next.slot) } });
  };
  const saveMemory = async (selected: AyahSpan[]) => {
    if (await mutate(current => {
      if (current.revision !== plan.revision) throw new Error('تغيّر محفوظك. أغلق النافذة وافتحها مجددًا.');
      return { ...current, memorized: selected, revision: current.revision + 1, undo: undefined };
    })) setChoosing(false);
  };
  const openSettings = () => {
    setName(plan.name); setDays(plan.weekdays); setAmount(String(plan.goal.dailyQuarters)); setReminder(plan.reminder.enabled); setTime(clock(plan)); setMessage(''); setEditing(true);
  };
  const saveSettings = async () => {
    if (saving.current) return;
    if (!name.trim() || name.trim().length > 80 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) { setMessage('راجع اسم الهدف والوقت.'); return; }
    const dailyQuarters = Number(normalizeArabicSearch(amount));
    if (!days.length || !Number.isInteger(dailyQuarters) || dailyQuarters < 1 || dailyQuarters > REVISION_MAX_QUARTERS) { setMessage('اختر أيام المراجعة ومقدارًا صحيحًا يبدأ من ربع حزب.'); return; }
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
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الإعدادات.'); }
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
        <View style={d.grow}>
          <Text accessibilityRole="header" style={{ color: day.due ? p.primary : p.mutedForeground, fontSize: 14, fontWeight: '600' }}>{day.due ? 'مراجعة اليوم' : doneToday ? 'أتممت مراجعة اليوم · القادمة' : 'مراجعتك القادمة'}</Text>
          <SurahName number={first.surahNumber} name={index.surahNames[first.surahNumber]} size={56} color={p.ornament} />
          <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{first.surahNumber !== last.surahNumber ? `من الآية ${arabicNumber(first.ayahNumber)}` : ayahs.length === 1 ? `الآية ${arabicNumber(first.ayahNumber)}` : `الآيات ${arabicNumber(first.ayahNumber)} – ${arabicNumber(last.ayahNumber)}`}</Text>
          {first.surahNumber !== last.surahNumber && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>حتى {index.surahNames[last.surahNumber]}، الآية {arabicNumber(last.ayahNumber)}</Text>}
        </View>
        {/* The date as a calendar leaf, as on the memorization goal. */}
        <View accessible accessibilityLabel={day.due ? 'اليوم' : weekdayDateLabel(day.date)} style={{ minWidth: 74, paddingVertical: 10, paddingHorizontal: 12, alignItems: 'center', borderRadius: readerShape.lg, backgroundColor: day.due ? p.primary : p.muted }}>
          <Text style={{ color: day.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{day.due ? 'اليوم' : new Intl.DateTimeFormat('ar-MA', { weekday: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</Text>
          <Text style={{ color: day.due ? p.primaryForeground : p.foreground, fontSize: 28, fontWeight: '600', lineHeight: 36 }}>{arabicNumber(Number(day.date.slice(8)))}</Text>
          <Text style={{ color: day.due ? p.primaryForeground : p.mutedForeground, fontSize: 12 }}>{new Intl.DateTimeFormat('ar-MA', { month: 'long', timeZone: 'UTC' }).format(new Date(`${day.date}T12:00:00Z`))}</Text>
        </View>
      </View>
      <View style={[d.row, { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingVertical: 10, gap: 0 }]}>
        {[{ label: 'الآيات', value: arabicNumber(ayahs.length) }, { label: 'الكلمات', value: arabicNumber(ayahs.reduce((n, a) => n + a.text.split(/\s+/).filter(Boolean).length, 0)) },
          { label: first.pageNumber === last.pageNumber ? 'الصفحة' : 'الصفحات', value: first.pageNumber === last.pageNumber ? arabicNumber(first.pageNumber) : `${arabicNumber(first.pageNumber)}–${arabicNumber(last.pageNumber)}` }].map((stat, i) =>
          <View key={stat.label} style={[d.grow, { alignItems: 'center', borderStartWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{stat.label}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{stat.value}</Text>
          </View>)}
      </View>
      {day.spans.length > 1 && <View style={{ gap: 6 }}>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>تضم مراجعتك {arabicNumber(day.spans.length)} مقاطع من محفوظك؛ نفتح كل مقطع وحده.</Text>
        {day.spans.map(range => { const done = !day.remaining.some(r => r.end === range.end); return <View key={range.start} style={[d.row, { gap: 8 }]}>
          <ReaderIcon name={done ? 'check' : 'bookmark'} color={done ? p.primary : p.mutedForeground} size={15} />
          <Text style={{ color: done ? p.mutedForeground : p.foreground, fontSize: 13, flex: 1, textDecorationLine: done ? 'line-through' : 'none' }}>{ayahRangeLabel(index, range.start, range.end)}</Text>
        </View>; })}
      </View>}
      {day.due ? <View style={{ gap: 4 }}>
        <DetailAction primary icon="book" label={resumed ? 'تابع المراجعة' : 'ابدأ المراجعة'} disabled={busy} onPress={openReading} />
        <DetailAction icon="check" label="أتممت مراجعة اليوم" disabled={busy} onPress={() => void mutate(current => {
          if (current.revision !== plan.revision) throw new Error('تغيّرت مراجعتك. راجع المقطع المعروض ثم أعد المحاولة.');
          return finishRevisionDay(current, localDate());
        })} />
        {resumed && <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center' }}>نكمل من حيث توقفت.</Text>}
      </View> : <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>{doneToday ? 'تقبّل الله منك. ' : ''}تُفتح هذه المراجعة يوم {weekdayDateLabel(day.date)}.</Text>}
    </PlanCard>}
    {plan.status === 'active' && index && !mismatch && !plan.memorized.length && <PlanCard prominent>
      <View style={[d.row, { gap: 12, alignItems: 'flex-start' }]}><IconTile name="loop" /><View style={d.grow}><Copy title>لا محفوظ لنراجعه بعد</Copy><Copy muted>{owner ? `ما تحفظه في «${owner.name}» ينضم إلى المراجعة تلقائيًا.` : 'حدد ما تحفظه من القرآن، ونبدأ دورتك من أوله.'}</Copy></View></View>
      {owner ? <DetailAction label={`فتح ${owner.name}`} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: owner.id } })} />
        : <DetailAction primary label="تحديد ما أحفظه" disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} />}
    </PlanCard>}
    {plan.status !== 'active' && <PlanCard><Copy title>{plan.status === 'paused' ? 'المراجعة متوقفة مؤقتًا' : 'هذا الهدف في الأرشيف'}</Copy>
      <Copy muted>{plan.status === 'archived' ? `حذف الهدف لا يمس سجل محفوظك. ${deletionDate ? `يُحذف الهدف في ${shortDate(deletionDate)}.` : ''}` : 'موضعك في الدورة محفوظ. عند الاستئناف تنتظرك المراجعة نفسها في أول يوم من أيامك.'}</Copy>
      {plan.status === 'paused' && <DetailAction primary label="استئناف المراجعة" disabled={busy} onPress={() => void mutate(current => setPlanPaused(current, false, today), false)} />}
      {plan.status === 'archived' && <><DetailAction primary label="استعادة الهدف" disabled={busy || !!other || !index || !!mismatch} onPress={() => void archive()} />
        {!!other && <Copy muted>لديك هدف مراجعة آخر لهذه الرواية. أرشفه أولًا لاستعادة هذا الهدف.</Copy>}
        <DetailAction destructive icon="trash" label="حذف الهدف" disabled={busy} onPress={() => setDeleting(true)} /></>}
    </PlanCard>}
    {plan.undo?.date === today && plan.status === 'active' && <DetailAction label="التراجع عن آخر تسجيل مراجعة" disabled={busy} onPress={() => void mutate(current => undoRevisionProgress(current, localDate()))} />}
    {index && !mismatch && !!schedule.length && <WeeklySchedule index={index} sessions={schedule} today={today} labels={REVISION_LABELS}
      summary={`${quarterLabel(plan.goal.dailyQuarters)} في الجلسة · ${weekdaysLabel(plan.weekdays)}`} footer={`الموعد المتوقع لإتمام الدورة: ${dateLabel(schedule.at(-1)!.date)} · يتحدّث مع محفوظك.`} />}
    {index && !mismatch && plan.status !== 'archived' && !!plan.memorized.length && <PlanCard>
      <View style={[d.row, { gap: 12, alignItems: 'flex-start' }]}><IconTile name="check" /><View style={d.grow}><Copy title>محفوظك</Copy>
        <Copy muted>{owner ? `${arabicNumber(spanCount(plan.memorized))} آية. يتابعه هدف «${owner.name}»، وكل ما تحفظه فيه ينضم إلى المراجعة.` : `${arabicNumber(spanCount(plan.memorized))} آية. أضف ما حفظته أو صحح اختيارًا سابقًا؛ نحافظ على موضعك في الدورة.`}</Copy></View></View>
      {owner ? <DetailAction label={`فتح ${owner.name}`} onPress={() => router.push({ pathname: '/plans/[id]', params: { id: owner.id } })} />
        : <DetailAction label="عرض المحفوظ وتعديله" disabled={busy} onPress={() => { setMessage(''); setChoosing(true); }} />}
    </PlanCard>}
    {index && !mismatch && !!plan.log.length && <PlanCard><Copy title>آخر مراجعاتك</Copy><View>{plan.log.slice(-5).reverse().map((log, i) => <View key={`${log.date}-${i}`} style={{ gap: 2, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }}>
      <Text style={{ color: p.foreground, fontSize: 15 }}>{ayahRangeLabel(index, log.from, log.to)}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(log.date)} · الدورة {arabicNumber(log.pass)} · {ayahCountLabel(spanCount(plan.memorized.flatMap(r => r.end <= log.from || r.start >= log.to ? [] : [{ start: Math.max(r.start, log.from), end: Math.min(r.end, log.to) }])))}</Text>
    </View>)}</View></PlanCard>}
    {editing && <PlanSettingsSheet onClose={() => { if (!busy) setEditing(false); }}><PlanNotice message={message} /><PlanField label="اسم الهدف" value={name} onChange={setName} />
      <AmountPicker label="مقدار المراجعة اليومي بأرباع الأحزاب" value={amount} onChange={setAmount} unit="ربع حزب في اليوم" presets={['1', '2', '4', '8']} minimum={1} maximum={REVISION_MAX_QUARTERS} parse={value => Number(normalizeArabicSearch(value))} />
      <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: 'كل يوم', value: EVERY_DAY }, { label: 'عدا الجمعة', value: [0, 1, 2, 3, 4, 6] }, { label: 'الإثنين والخميس', value: [1, 4] }]} />
      <Copy muted>تغيير المقدار أو الأيام يحافظ على موضعك في الدورة؛ يتغير ما بعده فقط.</Copy>
      <PlanSwitch label="ذكّرني بالمراجعة" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'في أيام المراجعة فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />{reminder && <PlanDateField label="وقت التذكير" value={time} onChange={setTime} mode="time" />}
      <ReaderButton palette={p} selected disabled={busy} onPress={() => void saveSettings()}>حفظ الإعدادات</ReaderButton>
      {(plan.status === 'active' || plan.status === 'paused') && <DetailAction label={plan.status === 'paused' ? 'استئناف المراجعة' : 'إيقاف المراجعة مؤقتًا'} disabled={busy} onPress={() => { const pause = plan.status === 'active'; void mutate(current => setPlanPaused(current, pause, today), false).then(saved => { if (saved) setEditing(false); }); }} />}
      <DetailAction label={plan.status === 'archived' ? 'استعادة الهدف' : 'أرشفة الهدف'} disabled={busy || (plan.status === 'archived' && (!!other || !index || !!mismatch))} onPress={() => void archive().then(saved => { if (saved) setEditing(false); })} />
      <Copy muted>أرشفة هدف المراجعة أو حذفه لا يمس سجل محفوظك.</Copy>
    </PlanSettingsSheet>}
    {choosing && index && !owner && <MemorizedSelectionSheet index={index} selected={plan.memorized} busy={busy} error={message} onClose={() => { if (!busy) setChoosing(false); }} onSave={value => void saveMemory(value)} />}
    {deleting && <DeleteArchivedGoalDialog plan={plan} onClose={() => setDeleting(false)} onDeleted={() => router.replace('/plans')} />}
  </DetailScreen>;
}
