import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { readerElevation, readerShape, withAlpha } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, type Riwayah } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { createRecurringPlan, nextScheduledDate, RECURRING_PRESETS, weekdaysLabel, type RecurringPreset } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { arabicNumber } from './presentation';
import { PlanField, PlanLoading, PlanNotice, PlanSwitch } from './components';
import { CreationSection, CreationSteps, c } from './goal-creation-components';
import { PlanDateField } from './plan-date-field';
import { SurahSelectionSheet } from './surah-selection-sheet';
import { WeekdayPicker } from './recurring-components';
import { saveWithReminder } from './save-with-reminder';
import { remindersSupported, requestPlanReminders } from './notifications';

export function RecurringCreationScreen({ preset }: { preset?: RecurringPreset }) {
  const initial = preset ? RECURRING_PRESETS[preset] : undefined;
  const { palette: p, preferences } = useReadingPreferences();
  const { commit, today } = usePlans();
  const [id] = useState(() => `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`);
  const [riwayah, setRiwayah] = useState<Riwayah>(preferences.riwayah);
  const [surahs, setSurahs] = useState<number[]>(initial ? [...initial.surahs] : []);
  const [days, setDays] = useState<number[]>(initial ? [...initial.weekdays] : [0, 1, 2, 3, 4, 5, 6]);
  const [name, setName] = useState(initial?.name ?? '');
  const [startDate, setStartDate] = useState(localDate);
  const [reminder, setReminder] = useState(false);
  const [time, setTime] = useState(`${String(initial?.hour ?? 20).padStart(2, '0')}:00`);
  const [step, setStep] = useState<0 | 1>(0), [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const saving = useRef(false), scroll = useRef<ScrollView>(null);
  const { index, error, retry } = usePlanIndex(riwayah);
  const fallbackName = surahs.length === 1 && index ? `قراءة ${index.surahNames[surahs[0]]}` : 'قراءتي المتكررة';
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      if (startDate < today) throw new Error('اختر اليوم أو تاريخًا قادمًا للبداية.');
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('اختر وقتًا صالحًا للتذكير.');
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createRecurringPlan({ name: name.trim() || fallbackName, riwayah, surahs, weekdays: days, startDate, reminder: { enabled: reminder, hour, minute } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : 'راجع اختياراتك.' }; }
  }, [index, startDate, today, time, name, fallbackName, riwayah, surahs, days, reminder, id]);
  const changeStep = (value: 0 | 1) => {
    if (busy || (value === 1 && !preview.plan)) return;
    Keyboard.dismiss(); setStep(value); setMessage(''); scroll.current?.scrollTo({ y: 0, animated: false });
  };
  const save = async () => {
    if (!preview.plan || saving.current) return;
    saving.current = true; setBusy(true); setMessage(''); Keyboard.dismiss();
    try {
      const reminderIssue = await saveWithReminder(preview.plan, plan => commit(items => items.some(p => p.id === id) ? items : [...items, plan]), remindersSupported ? requestPlanReminders : undefined);
      router.replace({ pathname: '/plans/[id]', params: { id, ...(reminderIssue ? { reminderIssue } : {}) } });
    } catch (e) { setMessage(e instanceof Error ? e.message : 'تعذر حفظ الهدف. حاول مرة أخرى.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const upcoming: string[] = [];
  if (preview.plan) for (let i = 0; i < 3; i++) upcoming.push(nextScheduledDate(preview.plan, i ? addDays(upcoming[i - 1], 1) : startDate));
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? 'العودة إلى إعداد القراءة المتكررة' : 'العودة إلى أنواع الأهداف'} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}>
        <ReaderIcon name="back" color={p.text} size={20} /><Text style={{ color: p.text, fontSize: 15 }}>{step ? 'الإعداد' : 'هدف جديد'}</Text></Pressable><Text style={{ color: p.muted, fontSize: 13 }}>قراءة متكررة</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}><Text accessibilityRole="header" style={{ color: p.text, fontSize: 28, fontWeight: '700' }}>{step ? 'موعد خير يتجدد' : preset ? initial!.name : 'سور تحب العودة إليها'}</Text><Text style={{ color: p.muted, fontSize: 15 }}>{step ? 'هذه قراءتك ومواعيدها. كل موعد بداية جديدة.' : 'اختر السور، ثم امنحها موعدًا في أسبوعك.'}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title="ماذا تقرأ؟" icon="book">
              <Pressable accessibilityRole="button" accessibilityLabel="اختيار السور" disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ gap: 8, opacity: !index || pressed ? 0.6 : 1, minHeight: 72, justifyContent: 'center' })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ color: p.text, fontSize: 20, fontWeight: '600', lineHeight: 30, flex: 1 }}>{surahs.length && index ? surahs.map(n => index.surahNames[n]).join('، ') : 'اختر سورة أو أكثر'}</Text><ReaderIcon name="chevron" color={p.accent} size={20} /></View>
                <Text style={{ color: p.accent, fontSize: 13, fontWeight: '600' }}>{surahs.length ? 'تغيير السور المختارة' : 'تصفّح سور القرآن'}</Text>
              </Pressable>
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16, gap: 8 }}><Text style={{ color: p.muted, fontSize: 13 }}>الرواية</Text><Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: 'ورش' }, { value: 'hafs', label: 'حفص' }]} /></View>
            </CreationSection>
            <CreationSection title="متى تعود إليها؟" icon="calendar" description="يتجدد الهدف في الأيام المختارة، دون تراكم قراءة الأيام الفائتة.">
              <WeekdayPicker days={days} onChange={setDays} /><PlanDateField label="ابتداءً من" mode="date" value={startDate} onChange={setStartDate} minimum={today} />
            </CreationSection>
          </> : <>
            {preview.plan && index && <View style={[{ padding: 22, borderRadius: readerShape.hero, backgroundColor: p.hero, gap: 12 }, readerElevation(2, p)]}>
              <View style={c.row}><ReaderIcon name="restore" color={p.heroMuted} size={20} /><Text style={{ color: p.heroMuted, fontSize: 13 }}>قراءة متكررة · رواية {RIWAYAT[riwayah].label}</Text></View>
              <Text style={{ color: p.onHero, fontSize: 24, fontWeight: '600' }}>{surahs.map(n => index.surahNames[n]).join('، ')}</Text>
              <Text style={{ color: p.heroMuted, fontSize: 15 }}>{weekdaysLabel(days)}</Text>
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: withAlpha(p.onHero, 0.2) }} /><Text style={{ color: p.heroMuted, fontSize: 13, lineHeight: 22 }}>{surahs.length > 1 ? 'تقرأ السور بالترتيب، في جلسة مخصصة لكل سورة.' : 'جلسة قراءة مخصصة للسورة، مع حفظ تقدمك خلال اليوم.'}</Text>
            </View>}
            <CreationSection title="مواعيدك الأولى" icon="calendar"><View>{upcoming.map((date, i) => <View key={date} style={[c.row, { gap: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
              <Text style={{ color: p.muted, fontSize: 13, minWidth: 20 }}>{arabicNumber(i + 1)}</Text><Text style={{ color: p.text, fontSize: 15, fontWeight: '600' }}>{dateLabel(date)}</Text>
            </View>)}</View></CreationSection>
            <CreationSection title="اجعله موعدك" icon="settings">
              <PlanField label="اسم الهدف" value={name} onChange={setName} placeholder={fallbackName} />
              <PlanSwitch label="ذكّرني بالقراءة" checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? 'تذكير في الأيام المختارة فقط.' : 'فعّل التذكير من تطبيق الهاتف.'} />
              {reminder && <PlanDateField label="وقت التذكير" mode="time" value={time} onChange={setTime} />}
            </CreationSection>
            <Text style={{ color: p.muted, fontSize: 13, lineHeight: 22, paddingHorizontal: 4 }}>يمكنك متابعة هذا الهدف بجانب ختمتك أو وردك اليومي، وإيقافه أو أرشفته متى شئت.</Text>
          </>}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      <View style={[c.footer, { backgroundColor: p.paper, borderColor: p.border }]}>
        <PlanNotice message={message || (surahs.length && days.length ? preview.error : undefined)} />
        {!surahs.length || !days.length ? <Text style={{ color: p.muted, fontSize: 13, textAlign: 'center' }}>اختر السور وأيام القراءة للمتابعة.</Text> : null}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? 'جارٍ الحفظ…' : step ? 'إنشاء القراءة المتكررة' : 'مراجعة الموعد'}</ReaderButton>
      </View>
      {choosing && index && <SurahSelectionSheet index={index} selected={surahs} onClose={() => setChoosing(false)} onSave={value => { setSurahs(value); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
