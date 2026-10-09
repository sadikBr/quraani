import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, readingPositionKey, type Riwayah } from '../quran-reader/riwayat';
import { contentStorage } from '../quran-reader/storage/content-storage';
import { readerShape } from '../quran-reader/design';
import { usePlans } from './provider';
import { createPlan, rangeLabel, unitLabels } from './engine';
import { localDate } from './dates';
import { arabicNumber, shortDate } from './presentation';
import { remindersSupported, requestPlanReminders } from './notifications';
import { usePlanIndex } from './use-plan-index';
import { PlanDateField } from './plan-date-field';
import { isRecurringPlan, type SequentialGoal, type PlanStart, type PlanUnit } from './types';
import { GoalChooser } from './goal-chooser';
import { RecurringCreationScreen } from './recurring-creation-screen';
import { saveWithReminder } from './save-with-reminder';
import { currentGoal, DuplicateGoalError } from './goal-limit';
import { AmountPicker, CreationSection, CreationSteps, ExistingGoalCard, GoalTypeChoices, c } from './goal-creation-components';
import { Copy, PlanField, PlanLoading, PlanNotice, PlanScreen, PlanSwitch } from './components';
import { StartPointPicker } from './start-point-picker';

export function parsePlanNumber(value: string) {
  return Number(value.replace(/[٠-٩]/g, n => String(n.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, n => String(n.charCodeAt(0) - 1776)).replace(/[٫,]/g, '.').trim());
}
export function NewPlanScreen() {
  const { ready, error, retry } = usePlans();
  const { type, preset } = useLocalSearchParams<{ type?: string; preset?: string }>();
  if (!ready) return <PlanScreen title="هدف جديد" onBack={() => router.back()}><PlanNotice message={error} retry={retry} />{!error && <PlanLoading />}</PlanScreen>;
  if (type === 'recurring') return <RecurringCreationScreen preset={preset === 'kahf' || preset === 'mulk' ? preset : undefined} />;
  if (type === 'khatma' || type === 'wird') return <GoalCreationForm key={type} initialKind={type} />;
  return <GoalChooser />;
}
function GoalCreationForm({ initialKind }: { initialKind: SequentialGoal['type'] }) {
  const { palette: p, preferences } = useReadingPreferences();
  const { commit, plans, today } = usePlans();
  const [id] = useState(() => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const [kind, setKind] = useState<SequentialGoal['type']>(initialKind);
  const [step, setStep] = useState<0 | 1>(0);
  const [name, setName] = useState('');
  const [riwayah, setRiwayah] = useState<Riwayah>(preferences.riwayah);
  const [unit, setUnit] = useState<PlanUnit>('pages');
  const [weeks, setWeeks] = useState('4');
  const [amount, setAmount] = useState('5');
  const [start, setStart] = useState<PlanStart>({ kind: 'page', number: 1 });
  const [startDate, setStartDate] = useState(localDate);
  const [repeat, setRepeat] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [time, setTime] = useState('20:00');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [conflictId, setConflictId] = useState<string>();
  const scroll = useRef<ScrollView>(null);
  const { index, error, retry } = usePlanIndex(riwayah);
  const blocked = currentGoal(plans);
  const replacesRepeat = plans.some(goal => !isRecurringPlan(goal) && goal.status === 'completed' && goal.repeat);
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      if (startDate < today) throw new Error('اختر اليوم أو تاريخًا قادمًا للبداية.');
      const clock = time.split(':').map(parsePlanNumber);
      if (clock.length !== 2) throw new Error('اكتب الوقت مثل 20:00');
      return { plan: createPlan({ name: name.trim() || (kind === 'khatma' ? 'ختمتي' : 'وردي اليومي'), riwayah, unit, start, startDate, repeat,
        goal: kind === 'khatma' ? { type: kind, weeks: parsePlanNumber(weeks) } : { type: kind, amount: parsePlanNumber(amount) },
        reminder: { enabled: reminder, hour: clock[0], minute: clock[1] } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : 'راجع بيانات الهدف.' }; }
  }, [index, startDate, today, time, name, kind, riwayah, unit, start, repeat, weeks, amount, reminder, id]);
  const changeStep = (value: 0 | 1) => {
    if (busy || (value === 1 && (!preview.plan || blocked))) return;
    Keyboard.dismiss(); setStep(value); setMessage(''); setConflictId(undefined);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const openGoal = (goalId: string) => router.replace({ pathname: '/plans/[id]', params: { id: goalId } });
  const save = async () => {
    if (!preview.plan || busy || blocked) return;
    setBusy(true); setMessage(''); setConflictId(undefined); Keyboard.dismiss();
    try {
      const reminderIssue = await saveWithReminder(preview.plan,
        goal => commit(items => items.some(item => item.id === id) ? items : [...items, goal]),
        remindersSupported ? requestPlanReminders : undefined);
      router.replace({ pathname: '/plans/[id]', params: { id, ...(reminderIssue ? { reminderIssue } : {}) } });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'تعذر حفظ الهدف. حاول مرة أخرى.');
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
    } finally { setBusy(false); }
  };
  const currentPage = async () => {
    try {
      const raw = JSON.parse(await contentStorage.getItem(readingPositionKey(RIWAYAT[riwayah].mushafId)) ?? 'null');
      if (raw?.mushafId === RIWAYAT[riwayah].mushafId && index?.ayahs.some(a => a.pageNumber === raw.pageNumber)) setStart({ kind: 'page', number: raw.pageNumber });
      else setStart({ kind: 'page', number: 1 });
    } catch { setMessage('تعذر قراءة موضعك المحفوظ. اختر بداية القراءة.'); }
  };
  const unitOptions = [{ value: 'pages', label: 'صفحات' }, { value: 'hizbs', label: 'أحزاب' }, { value: 'juzs', label: 'أجزاء' }] as const;
  const increment = unit === 'pages' ? 1 : unit === 'hizbs' ? 0.25 : 0.125;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={step ? 'العودة إلى إعداد الهدف' : 'العودة إلى الأهداف'} disabled={busy} onPress={() => step ? changeStep(0) : router.back()}
          style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}>
          <ReaderIcon name="back" color={p.text} size={21} /><Text style={{ color: p.text, fontSize: 15 }}>{step ? 'الإعداد' : 'الأهداف'}</Text>
        </Pressable>
        <Text style={{ color: p.muted, fontSize: 12 }}>هدف جديد</Text>
      </View>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={c.content}>
        <View>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: p.text, fontSize: 30, fontWeight: '700' }}>{blocked ? 'هدفك الحالي أولًا' : step ? 'جاهز للبداية؟' : 'على قدر استطاعتك'}</Text>
          <Text style={{ color: p.muted, fontSize: 14 }}>{blocked ? 'رحلة واحدة مع القرآن، على مهلٍ وثبات.' : step ? 'راجع وردك، واجعل له وقتًا في يومك.' : 'اختر المدة أو المقدار، ونحن نرتّب وردك.'}</Text>
        </View>
        {!blocked && <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />}
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {(step === 0 || blocked) && <GoalTypeChoices kind={kind} existing={blocked} onChange={value => { setKind(value); setStep(0); setMessage(''); setConflictId(undefined); }} />}
          {blocked ? <>
            <ExistingGoalCard goal={blocked} onOpen={() => openGoal(blocked.id)} />
            <Copy muted>الختمة والورد اليومي طريقتان لتنظيم القراءة. يمكنك بدء أيٍّ منهما بعد إكمال هدفك الحالي أو أرشفته.</Copy>
          </> : step === 0 ? <>
            <CreationSection title={kind === 'khatma' ? 'في كم أسبوع؟' : 'كم تقرأ كل يوم؟'} icon={kind === 'khatma' ? 'calendar' : 'book'}
              description={kind === 'khatma' ? 'نحسب وردك اليومي لإتمام القراءة في المدة التي تختارها.' : 'مقدارك ثابت، بلا موعد إتمام. إذا فاتك يوم، تتابع من حيث توقفت.'}>
              {kind === 'wird' && <Segments palette={p} value={unit} onChange={value => { setUnit(value); setAmount(value === 'pages' ? '5' : '1'); }} options={unitOptions} />}
              <AmountPicker label={kind === 'khatma' ? 'مدة الختمة بالأسابيع' : 'مقدار الورد اليومي'} value={kind === 'khatma' ? weeks : amount} onChange={kind === 'khatma' ? setWeeks : setAmount}
                unit={kind === 'khatma' ? 'أسابيع' : `${unitLabels[unit]} يوميًا`} presets={kind === 'khatma' ? ['2', '4', '8', '12'] : unit === 'pages' ? ['2', '5', '10', '20'] : unit === 'hizbs' ? ['0.25', '0.5', '1', '2'] : ['0.125', '0.25', '0.5', '1']}
                minimum={kind === 'khatma' ? 1 : increment} maximum={kind === 'khatma' ? 52 : (index?.[unit].length ?? 2) - 1} increment={kind === 'khatma' ? 1 : increment} parse={parsePlanNumber} />
              {kind === 'khatma' && <><View style={{ height: 1, backgroundColor: p.border }} /><Copy muted>قسّم القراءة حسب</Copy><Segments palette={p} value={unit} onChange={setUnit} options={unitOptions} /></>}
            </CreationSection>
            <CreationSection title="الرواية والموعد" icon="calendar">
              <View style={{ gap: 8 }}><Copy>الرواية</Copy><Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: 'ورش' }, { value: 'hafs', label: 'حفص' }]} /></View>
              <PlanDateField label="تاريخ البداية" value={startDate} onChange={setStartDate} mode="date" minimum={today} />
            </CreationSection>
            {index && <CreationSection title="من أين تبدأ؟" icon="bookmark" description={kind === 'khatma' ? 'نوزّع القراءة من الموضع المختار حتى نهاية المصحف على مدّتك.' : 'تبدأ من هنا، ثم تواصل كل يوم بالمقدار الذي اخترته.'}>
              <StartPointPicker index={index} value={start} onChange={setStart} onCurrentPosition={() => void currentPage()} />
            </CreationSection>}
          </> : <>
            {preview.plan && index && <>
              <View style={{ backgroundColor: p.hero, padding: 20, borderRadius: readerShape.card, gap: 14 }}>
                <View style={c.row}><ReaderIcon name="book" color={p.heroMuted} size={21} /><Text style={{ color: p.heroMuted, fontSize: 12 }}>رواية {RIWAYAT[riwayah].label}</Text></View>
                <Text style={{ color: p.onHero, fontSize: 25, fontWeight: '600' }}>{kind === 'khatma' ? `ختمة في ${arabicNumber(parsePlanNumber(weeks))} أسابيع` : `${arabicNumber(parsePlanNumber(amount))} ${unitLabels[unit]} كل يوم`}</Text>
                <View style={[c.row, { borderTopWidth: 1, borderColor: `${p.onHero}26`, paddingTop: 12, alignItems: 'flex-start' }]}>
                  <View style={c.grow}><Text style={{ color: p.heroMuted, fontSize: 11 }}>البداية</Text><Text style={{ color: p.onHero, fontSize: 16 }}>{shortDate(startDate)}</Text></View>
                  <View style={c.grow}><Text style={{ color: p.heroMuted, fontSize: 11 }}>{kind === 'khatma' ? 'الإتمام' : 'الإيقاع'}</Text><Text style={{ color: p.onHero, fontSize: 16 }}>{kind === 'khatma' ? shortDate(preview.plan.cycle.sessions.at(-1)!.date) : 'بلا موعد إتمام'}</Text></View>
                  <View><Text style={{ color: p.heroMuted, fontSize: 11 }}>الأوراد</Text><Text style={{ color: p.onHero, fontSize: 16 }}>{arabicNumber(preview.plan.cycle.sessions.length)}</Text></View>
                </View>
                <Text style={{ color: p.heroMuted, fontSize: 13 }}>من {index.surahNames[index.ayahs[preview.plan.cycle.start].surahNumber]} · الآية {arabicNumber(index.ayahs[preview.plan.cycle.start].ayahNumber)} · صفحة {arabicNumber(index.ayahs[preview.plan.cycle.start].pageNumber)}</Text>
              </View>
              <CreationSection title="أول خطواتك" icon="lines" description={kind === 'wird' ? 'المواعيد تقديرية؛ كل ورد جديد يتبع إتمام سابقه.' : undefined}>
                {preview.plan.cycle.sessions.slice(0, 3).map((session, i) => <View key={session.date} style={[c.row, { gap: 12 }]}>
                  <View style={{ width: 30, height: 30, borderRadius: readerShape.detail, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accentSoft }}><Text style={{ color: p.accent, fontSize: 13 }}>{arabicNumber(i + 1)}</Text></View>
                  <View style={c.grow}><Text style={{ color: p.text, fontSize: 16 }}>{rangeLabel(index, session.start, session.end)}</Text><Text style={{ color: p.muted, fontSize: 11 }}>{shortDate(session.date)}</Text></View>
                </View>)}
              </CreationSection>
            </>}
            <CreationSection title="اجعله هدفك" icon="settings">
              <PlanField label="اسم الهدف" value={name} onChange={setName} placeholder={kind === 'khatma' ? 'ختمتي' : 'وردي اليومي'} />
              <PlanSwitch checked={repeat} onChange={setRepeat} label="التكرار بعد الإكمال" detail="دورة جديدة في اليوم التالي للإتمام." />
              <View style={{ height: 1, backgroundColor: p.border }} />
              <PlanSwitch checked={reminder} onChange={setReminder} disabled={!remindersSupported} label="ذكّرني بموعد وردي" detail={remindersSupported ? 'تذكير يومي في الوقت الذي يناسبك.' : 'فعّل التذكير من تطبيق الهاتف.'} />
              {reminder && <PlanDateField label="وقت التذكير" value={time} onChange={setTime} mode="time" />}
            </CreationSection>
            {replacesRepeat && <Copy muted>سيوقف هذا الهدف التكرار التلقائي لهدف القراءة المكتمل، مع الاحتفاظ بإنجازك السابق.</Copy>}
          </>}
        </View>
        {!blocked && <><PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}</>}
      </ScrollView>
      {!blocked && <View style={[c.footer, { backgroundColor: p.paper, borderColor: p.border }]}>
        <PlanNotice message={message || preview.error} />
        {conflictId ? <ReaderButton palette={p} onPress={() => openGoal(conflictId)}>عرض الهدف الحالي</ReaderButton>
          : <>
            {step === 0 && preview.plan && <Text style={{ color: p.muted, fontSize: 12, textAlign: 'center' }}>{arabicNumber(preview.plan.cycle.sessions.length)} وردًا · نراجع التفاصيل في الخطوة التالية</Text>}
            <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step === 0 ? changeStep(1) : void save()}>{busy ? 'جارٍ الحفظ…' : step === 0 ? 'متابعة إلى المراجعة' : 'إنشاء الهدف'}</ReaderButton>
          </>}
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
