import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerShape } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import type { Riwayah } from '../quran-reader/riwayat';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { memoryFor, quarterLabel, spanCount } from './memorization';
import { createRevisionPlan, remainingPassDays, REVISION_MAX_QUARTERS, revisionPassLength } from './revision';
import { ayahRangeLabel } from './engine';
import { dateLabel, localDate } from './dates';
import { arabicNumber, weekdayDateLabel } from './presentation';
import { PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { AmountPicker, CreationSection, CreationSteps, c } from './goal-creation-components';
import { PlanDateField } from './plan-date-field';
import { WeekdayPicker } from './recurring-components';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { RevisionHero, revisionDaysLabel } from './revision-components';
import { saveWithReminder } from './save-with-reminder';
import { remindersSupported, requestPlanReminders } from './notifications';
import { currentRevisionGoal, isCurrentGoal } from './goal-limit';
import { isMemorizationPlan, type AyahSpan } from './types';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export function RevisionCreationScreen() {
  const { palette: p, preferences } = useReadingPreferences();
  const { commit, plans, memorization, today } = usePlans();
  const [id] = useState(() => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const [riwayah, setRiwayah] = useState<Riwayah>(preferences.riwayah);
  const [selected, setSelected] = useState<Partial<Record<Riwayah, AyahSpan[]>>>({});
  const [days, setDays] = useState(EVERY_DAY), [amount, setAmount] = useState('2');
  const [name, setName] = useState(''), [startDate, setStartDate] = useState(localDate);
  const [reminder, setReminder] = useState(false), [time, setTime] = useState('06:00');
  const [step, setStep] = useState<0 | 1>(0), [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const saving = useRef(false), scroll = useRef<ScrollView>(null);
  const { index, error, retry } = usePlanIndex(riwayah);
  const existing = currentRevisionGoal(plans, riwayah);
  // While a memorization goal is running it owns the record; revision only reads it.
  const owner = plans.find(plan => isMemorizationPlan(plan) && plan.riwayah === riwayah && isCurrentGoal(plan));
  const dailyQuarters = Number(normalizeArabicSearch(amount));
  const recorded = useMemo(() => { try { return index ? memoryFor(memorization, riwayah, index) : []; } catch { return []; } }, [index, memorization, riwayah]);
  const ranges = owner ? recorded : selected[riwayah] ?? recorded;
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      if (startDate < today) throw new Error('اختر اليوم أو تاريخًا قادمًا للبداية.');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('اختر وقتًا صالحًا للتذكير.');
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createRevisionPlan({ name: name.trim() || 'مراجعة المحفوظ', riwayah, dailyQuarters, weekdays: days, startDate, memorized: ranges, reminder: { enabled: reminder, hour, minute } }, index, id, { allowEmpty: !!owner }) };
    } catch (e) { return { error: e instanceof Error ? e.message : 'راجع اختياراتك.' }; }
  }, [index, startDate, today, time, name, riwayah, dailyQuarters, days, ranges, reminder, id, owner]);
  const passDays = useMemo(() => preview.plan ? revisionPassLength(preview.plan) : 0, [preview.plan]);
  const firstPass = useMemo(() => preview.plan && index ? remainingPassDays(preview.plan, today) : [], [preview.plan, index, today]);
  const changeStep = (value: 0 | 1) => {
    if (busy || (value === 1 && (!preview.plan || existing))) return;
    Keyboard.dismiss(); setStep(value); setMessage(''); scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const save = async () => {
    if (!preview.plan || saving.current || existing) return;
    saving.current = true; setBusy(true); setMessage(''); Keyboard.dismiss();
    try {
      const reminderIssue = await saveWithReminder(preview.plan, plan => commit(items => items.some(item => item.id === id) ? items : [...items, plan]), remindersSupported ? requestPlanReminders : undefined);
      router.replace({ pathname: '/plans/[id]', params: { id, ...(reminderIssue ? { reminderIssue } : {}) } });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الهدف. حاول مرة أخرى.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const memoryCard = <View style={{ padding: 16, gap: 8, minHeight: 52, borderWidth: 1, borderColor: p.border, borderRadius: readerShape.control }}>
    <View style={c.row}>
      <View style={c.grow}>
        <Text style={{ color: p.text, fontSize: 18, fontWeight: '600' }}>{ranges.length ? `${arabicNumber(spanCount(ranges))} آية في محفوظك` : 'لم تحدد محفوظك بعد'}</Text>
        <Text style={{ color: p.muted, fontSize: 13 }}>{owner ? `يتابعه هدف «${owner.name}»، وما تحفظه فيه ينضم إلى المراجعة.` : 'سور، أجزاء، أحزاب، أرباع، أو آيات محددة'}</Text>
      </View>
      {!owner && <ReaderIcon name="chevron" color={p.accent} size={20} />}
    </View>
    {!owner && <Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>{ranges.length ? 'مراجعة المحفوظ وتعديله' : 'تحديد ما أحفظه'}</Text>}
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? 'العودة إلى إعداد المراجعة' : 'العودة إلى أنواع الأهداف'} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}><ReaderIcon name="back" color={p.text} size={20} /><Text style={{ color: p.text, fontSize: 15 }}>{step ? 'الإعداد' : 'هدف جديد'}</Text></Pressable><Text style={{ color: p.muted, fontSize: 13 }}>مراجعة المحفوظ</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: '700' }}>{step ? 'دورتك على محفوظك' : 'ثبّت ما حفظت'}</Text><Text style={{ color: p.muted, fontSize: 15 }}>{step ? 'راجع أيامك الأولى، واجعل لها وقتًا.' : 'مقدار تختاره، في أيام تختارها، يمر على محفوظك كله ثم يبدأ من جديد.'}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy && !existing} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title="ما تراجعه" icon="check" description="المراجعة تمر على محفوظك بترتيب المصحف. كل ما تحفظه لاحقًا ينضم إليها تلقائيًا.">
              <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: 'ورش' }, { value: 'hafs', label: 'حفص' }]} />
              {existing ? <View style={{ gap: 10 }}>
                <PlanNotice message={`لديك هدف مراجعة جارٍ لرواية ${riwayah === 'warsh' ? 'ورش' : 'حفص'}. يمكنك تعديل مقداره وأيامه من إعداداته.`} />
                <ReaderButton palette={p} onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: existing.id } })}>{`متابعة ${existing.name}`}</ReaderButton>
              </View> : owner ? memoryCard
                : <Pressable accessibilityRole="button" accessibilityLabel="تحديد ما أحفظه من القرآن" disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ borderRadius: readerShape.control, backgroundColor: pressed ? p.accentSoft : 'transparent', opacity: !index ? 0.6 : pressed ? 0.85 : 1 })}>{memoryCard}</Pressable>}
            </CreationSection>
            {!existing && <>
              <CreationSection title="كم تراجع في اليوم؟" icon="loop" description="بأرباع الأحزاب؛ ينتهي كل يوم عند أقرب آية كاملة. إذا كان محفوظك أقل من المقدار، تراجعه كله.">
                <AmountPicker label="مقدار المراجعة اليومي بأرباع الأحزاب" value={amount} onChange={setAmount} unit="ربع حزب في اليوم" presets={['1', '2', '4', '8']} minimum={1} maximum={REVISION_MAX_QUARTERS} parse={value => Number(normalizeArabicSearch(value))} />
                {Number.isInteger(dailyQuarters) && dailyQuarters > 0 && <Text style={{ color: p.text, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{quarterLabel(dailyQuarters)} في كل يوم مراجعة</Text>}
              </CreationSection>
              <CreationSection title="أيام المراجعة" icon="calendar" description="إذا فاتك يوم، تنتظرك المراجعة نفسها في اليوم التالي من أيامك، دون تراكم.">
                <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: 'كل يوم', value: EVERY_DAY }, { label: 'عدا الجمعة', value: [0, 1, 2, 3, 4, 6] }, { label: 'الإثنين والخميس', value: [1, 4] }]} />
                <PlanDateField label="ابتداءً من" mode="date" value={startDate} onChange={setStartDate} minimum={today} />
              </CreationSection>
            </>}
          </> : preview.plan && index ? <>
            <RevisionHero plan={preview.plan} index={index} />
            <CreationSection title="جدولك الأول" icon="calendar" description={`${quarterLabel(dailyQuarters)} في الجلسة، في ${arabicNumber(days.length)} أيام من الأسبوع. ينتهي كل يوم عند آية كاملة، ثم تبدأ الدورة من أول محفوظك.`}>
              {firstPass.length ? <>{firstPass.slice(0, Math.min(days.length, 7)).map((session, i) => <View key={session.date} style={{ paddingTop: i ? 12 : 0, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border, gap: 4 }}>
                <View style={[c.row, { justifyContent: 'space-between' }]}><Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.muted, fontSize: 13 }}>{arabicNumber(spanCount(session.spans))} آية</Text></View>
                {session.spans.slice(0, 3).map(r => <Text key={r.start} style={{ color: p.muted, fontSize: 13 }}>{ayahRangeLabel(index, r.start, r.end)}</Text>)}
                {session.spans.length > 3 && <Text style={{ color: p.muted, fontSize: 12 }}>و{arabicNumber(session.spans.length - 3)} مقاطع إضافية</Text>}
              </View>)}<View style={{ paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, gap: 4 }}><Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{arabicNumber(firstPass.length)} جلسة لإتمام الدورة</Text><Text style={{ color: p.muted, fontSize: 13 }}>الإتمام المتوقع: {dateLabel(firstPass.at(-1)!.date)}</Text></View></>
                : <Text style={{ color: p.text, fontSize: 15, lineHeight: 25 }}>{owner ? `لا محفوظ بعد. ما تحفظه في «${owner.name}» ينضم إلى المراجعة تلقائيًا، وتبدأ أيامك معه.` : 'حدد ما تحفظه لتبدأ المراجعة.'}</Text>}
            </CreationSection>
            <CreationSection title="اجعله موعدك" icon="settings"><PlanField label="اسم الهدف" value={name} onChange={setName} placeholder="مراجعة المحفوظ" />
              <PlanSwitch label="ذكّرني بالمراجعة" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'تذكير في أيام المراجعة فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />
              {reminder && <PlanDateField label="وقت التذكير" mode="time" value={time} onChange={setTime} />}
            </CreationSection>
          </> : null}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      {!existing && <View style={[c.footer, { backgroundColor: p.paper, borderColor: p.border }]}><PlanNotice message={message || preview.error} />
        {step === 0 && preview.plan && passDays > 0 && <Text style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>دورة كاملة كل {revisionDaysLabel(passDays)} مراجعة</Text>}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? 'جارٍ الحفظ…' : step ? 'ابدأ المراجعة' : 'عرض أيام المراجعة'}</ReaderButton>
      </View>}
      {choosing && index && !owner && <MemorizedSelectionSheet index={index} selected={ranges} onClose={() => setChoosing(false)} onSave={value => { setSelected(items => ({ ...items, [riwayah]: value })); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
