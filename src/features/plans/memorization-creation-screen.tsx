import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
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
import { createMemorizationPlan, memoryFor, quarterLabel, spanCount } from './memorization';
import { dateLabel, localDate } from './dates';
import { arabicNumber, weekdayDateLabel } from './presentation';
import { PlanField, PlanLoading, PlanNotice, PlanScreen, PlanSwitch } from './components';
import { AmountPicker, CreationSection, CreationSteps, c } from './goal-creation-components';
import { PlanDateField } from './plan-date-field';
import { WeekdayPicker } from './recurring-components';
import { MemorizedSelectionSheet } from './memorized-selection-sheet';
import { MemorizationHero } from './memorization-components';
import { saveWithReminder } from './save-with-reminder';
import { remindersSupported, requestPlanReminders } from './notifications';
import { currentMemorizationGoal } from './goal-limit';
import { ayahRangeLabel } from './engine';
import type { AyahSpan } from './types';

export function MemorizationCreationScreen() {
  const { palette: p, preferences } = useReadingPreferences();
  const { commit, plans, memorization, today } = usePlans();
  const [id] = useState(() => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const [riwayah, setRiwayah] = useState<Riwayah>(preferences.riwayah);
  const [selected, setSelected] = useState<Partial<Record<Riwayah, AyahSpan[]>>>({});
  const [days, setDays] = useState([1, 3]), [amount, setAmount] = useState('1');
  const [name, setName] = useState(''), [startDate, setStartDate] = useState(localDate);
  const [reminder, setReminder] = useState(false), [time, setTime] = useState('18:00');
  const [step, setStep] = useState<0 | 1>(0), [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const saving = useRef(false), scroll = useRef<ScrollView>(null);
  const { index, error, retry } = usePlanIndex(riwayah);
  const blocked = currentMemorizationGoal(plans);
  const weeklyQuarters = Number(normalizeArabicSearch(amount));
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      const initialRecord = memoryFor(memorization, riwayah, index);
      if (startDate < today) throw new Error('اختر اليوم أو تاريخًا قادمًا للبداية.');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('اختر وقتًا صالحًا للتذكير.');
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createMemorizationPlan({ name: name.trim() || 'رحلتي مع الحفظ', riwayah, weeklyQuarters, weekdays: days, startDate,
        memorized: selected[riwayah] ?? initialRecord, initialRecord, reminder: { enabled: reminder, hour, minute } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : 'راجع اختياراتك.' }; }
  }, [index, memorization, riwayah, startDate, today, time, name, weeklyQuarters, days, selected, reminder, id]);
  const ranges = selected[riwayah] ?? memorization.find(r => r.riwayah === riwayah)?.ranges ?? [];
  const changeStep = (value: 0 | 1) => {
    if (busy || (value === 1 && !preview.plan)) return;
    Keyboard.dismiss(); setStep(value); setMessage(''); scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const save = async () => {
    if (!preview.plan || saving.current || blocked) return;
    saving.current = true; setBusy(true); setMessage(''); Keyboard.dismiss();
    try {
      const reminderIssue = await saveWithReminder(preview.plan, plan => commit(items => items.some(p => p.id === id) ? items : [...items, plan]), remindersSupported ? requestPlanReminders : undefined);
      router.replace({ pathname: '/plans/[id]', params: { id, ...(reminderIssue ? { reminderIssue } : {}) } });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الهدف. حاول مرة أخرى.'); }
    finally { saving.current = false; setBusy(false); }
  };
  if (blocked) return <PlanScreen title="رحلتك مع الحفظ" subtitle="هدف حفظ واحد، بخطوات متصلة." onBack={() => router.back()}>
    <PlanNotice message="لديك هدف حفظ جارٍ. أكمله أو أرشفه قبل بدء هدف حفظ جديد." />
    <ReaderButton palette={p} selected onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: blocked.id } })}>{`متابعة ${blocked.name}`}</ReaderButton>
  </PlanScreen>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? 'العودة إلى إعداد الحفظ' : 'العودة إلى أنواع الأهداف'} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={c.back}><ReaderIcon name="back" color={p.text} size={22} /><Text style={{ color: p.text, fontSize: 15 }}>{step ? 'الإعداد' : 'هدف جديد'}</Text></Pressable><Text style={{ color: p.muted, fontSize: 12 }}>حفظ القرآن</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View><Text accessibilityRole="header" style={{ color: p.text, fontSize: 30, fontWeight: '700' }}>{step ? 'خطوات واضحة للحفظ' : 'ليكن القرآن في صدرك'}</Text><Text style={{ color: p.muted, fontSize: 14 }}>{step ? 'راجع نصيبك ومواعيدك، وابدأ على مهل.' : 'أيام تختارها، ومقدار يناسبك، ورحلة تكبر آيةً آية.'}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title="ما حفظته من قبل" icon="check" description="يُستبعد محفوظك من الجدول. كل مقطع تتم حفظه لاحقًا يُضاف إليه تلقائيًا.">
              <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: 'ورش' }, { value: 'hafs', label: 'حفص' }]} />
              <Pressable accessibilityRole="button" accessibilityLabel="تحديد ما أحفظه من القرآن" disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ padding: 16, gap: 8, borderWidth: 1, borderColor: p.border, borderRadius: readerShape.control, backgroundColor: p.background, opacity: !index || pressed ? 0.6 : 1 })}>
                <View style={c.row}><View style={c.grow}><Text style={{ color: p.text, fontSize: 22, fontWeight: '600' }}>{ranges.length ? `${arabicNumber(spanCount(ranges))} آية في محفوظك` : 'من أين تبدأ رحلتك؟'}</Text><Text style={{ color: p.muted, fontSize: 12 }}>سور، أجزاء، أحزاب، أرباع، أو آيات محددة</Text></View><ReaderIcon name="chevron" color={p.accent} size={22} /></View>
                <Text style={{ color: p.accent, fontSize: 13 }}>{ranges.length ? 'مراجعة المحفوظ وتعديله' : 'تحديد ما أحفظه'}</Text>
              </Pressable>
              <Text style={{ color: p.muted, fontSize: 11 }}>يمكنك تركه فارغًا للبدء من الفاتحة. لكل رواية سجل مستقل.</Text>
            </CreationSection>
            <CreationSection title="نصيبك من الحفظ" icon="book" description="اختر مقدار الأسبوع بأرباع الأحزاب؛ أربعة أرباع تساوي حزبًا.">
              <AmountPicker label="المقدار الأسبوعي بأرباع الأحزاب" value={amount} onChange={setAmount} unit="ربع حزب في الأسبوع" presets={['1', '2', '4', '8']} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} />
              {Number.isInteger(weeklyQuarters) && weeklyQuarters > 0 && <Text style={{ color: p.accent, fontSize: 15, textAlign: 'center' }}>{quarterLabel(weeklyQuarters)} كل أسبوع</Text>}
            </CreationSection>
            <CreationSection title="أيام تحفظ فيها" icon="calendar" description="نقسّم المقدار على هذه الأيام، وننهي كل جلسة عند آية كاملة.">
              <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: 'الإثنين والأربعاء', value: [1, 3] }, { label: 'كل يوم', value: [0, 1, 2, 3, 4, 5, 6] }]} />
              <PlanDateField label="ابتداءً من" mode="date" value={startDate} onChange={setStartDate} minimum={today} />
            </CreationSection>
          </> : preview.plan && index ? <>
            <MemorizationHero index={index} ranges={preview.plan.memorized} compact />
            <CreationSection title="جدولك الأول" icon="calendar" description={`${quarterLabel(weeklyQuarters)} أسبوعيًا، موزّع على ${arabicNumber(days.length)} أيام. التوزيع تقريبي عند حدود الآيات.`}>
              {preview.plan.sessions.length ? <>{preview.plan.sessions.slice(0, Math.min(days.length, 7)).map((session, i) => <View key={session.date} style={{ paddingTop: i ? 12 : 0, borderTopWidth: i ? 1 : 0, borderColor: p.border, gap: 4 }}>
                <View style={[c.row, { justifyContent: 'space-between' }]}><Text style={{ color: p.text, fontSize: 16, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.accent, fontSize: 12 }}>{arabicNumber(spanCount(session.ranges))} آية</Text></View>
                {session.ranges.slice(0, 3).map(r => <Text key={r.start} style={{ color: p.muted, fontSize: 12 }}>{ayahRangeLabel(index, r.start, r.end)}</Text>)}
                {session.ranges.length > 3 && <Text style={{ color: p.muted, fontSize: 11 }}>و{arabicNumber(session.ranges.length - 3)} مقاطع إضافية</Text>}
              </View>)}<View style={{ paddingTop: 12, borderTopWidth: 1, borderColor: p.border, gap: 4 }}><Text style={{ color: p.text, fontSize: 14 }}>{arabicNumber(preview.plan.sessions.length)} جلسة حتى الإتمام</Text><Text style={{ color: p.muted, fontSize: 12 }}>الإتمام المتوقع: {dateLabel(preview.plan.sessions.at(-1)!.date)}</Text></View></>
              : <Text style={{ color: p.accent, fontSize: 16 }}>حددت القرآن كاملًا كمحفوظ. سنحفظ سجلك دون إنشاء جلسات جديدة.</Text>}
            </CreationSection>
            <CreationSection title="اجعله موعدك" icon="settings"><PlanField label="اسم الهدف" value={name} onChange={setName} placeholder="رحلتي مع الحفظ" />
              <PlanSwitch label="ذكّرني بالحفظ" checked={reminder} onChange={setReminder} disabled={!remindersSupported || !preview.plan.sessions.length} detail={remindersSupported ? 'تذكير في أيام الحفظ فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />
              {reminder && <PlanDateField label="وقت التذكير" mode="time" value={time} onChange={setTime} />}
            </CreationSection>
            <Text style={{ color: p.muted, fontSize: 12 }}>نبدأ بأول آية غير محفوظة ونتابع بترتيب المصحف. إذا فاتك موعد، يبقى المقطع ليوم الحفظ التالي. يمكنك تعديل أيامك ومقدارك لاحقًا.</Text>
          </> : null}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      <View style={[c.footer, { backgroundColor: p.paper, borderColor: p.border }]}><PlanNotice message={message || preview.error} />
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? 'جارٍ الحفظ…' : step ? preview.plan?.sessions.length ? 'ابدأ رحلة الحفظ' : 'حفظ سجل المحفوظ' : 'مراجعة جدول الحفظ'}</ReaderButton>
      </View>
      {choosing && index && <MemorizedSelectionSheet index={index} selected={ranges} onClose={() => setChoosing(false)} onSave={value => { setSelected(items => ({ ...items, [riwayah]: value })); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
