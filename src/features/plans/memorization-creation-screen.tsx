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
import { createMemorizationPlan, memoryFor, quarterLabel, spanCount } from './memorization';
import { dateLabel, localDate } from './dates';
import { weekdayDateLabel } from './presentation';
import { t } from '@/i18n';
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
      if (startDate < today) throw new Error(t('goals.errors.startDate'));
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(t('goals.errors.reminderTime'));
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createMemorizationPlan({ name: name.trim() || t('memorization.defaultName'), riwayah, weeklyQuarters, weekdays: days, startDate,
        memorized: selected[riwayah] ?? initialRecord, initialRecord, reminder: { enabled: reminder, hour, minute } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : t('goals.errors.checkChoices') }; }
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
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveGoal')); }
    finally { saving.current = false; setBusy(false); }
  };
  if (blocked) return <PlanScreen title={t('memorization.creation.blocked.title')} subtitle={t('memorization.creation.blocked.subtitle')} onBack={() => router.back()}>
    <PlanNotice message={t('memorization.creation.blocked.notice')} />
    <ReaderButton palette={p} selected onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: blocked.id } })}>{t('memorization.creation.blocked.continue', { name: blocked.name })}</ReaderButton>
  </PlanScreen>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? t('memorization.creation.backToSetup') : t('goals.backToGoalTypes')} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}><ReaderIcon name="back" color={p.foreground} size={20} /><Text style={{ color: p.foreground, fontSize: 15 }}>{step ? t('goals.setup') : t('goals.newGoal')}</Text></Pressable><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.kind')}</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{step ? t('memorization.creation.reviewTitle') : t('memorization.creation.setupTitle')}</Text><Text style={{ color: p.mutedForeground, fontSize: 15 }}>{step ? t('memorization.creation.reviewSubtitle') : t('memorization.creation.setupSubtitle')}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title={t('memorization.creation.memorized.title')} icon="check" description={t('memorization.creation.memorized.description')}>
              <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />
              <Pressable accessibilityRole="button" accessibilityLabel={t('memorization.creation.memorized.chooseLabel')} disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ padding: 16, gap: 6, minHeight: 52, borderWidth: 1, borderColor: p.input, borderRadius: readerShape.control, backgroundColor: pressed ? p.accent : p.background, opacity: !index ? 0.5 : 1 })}>
                <View style={c.row}><View style={c.grow}><Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{ranges.length ? t('memorization.memorizedAyahs', { ayahs: spanCount(ranges) }) : t('memorization.creation.memorized.empty')}</Text><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('memorization.creation.memorized.units')}</Text></View><ReaderIcon name="chevron" color={p.mutedForeground} size={16} /></View>
                <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{ranges.length ? t('memorization.creation.memorized.edit') : t('memorization.creation.memorized.choose')}</Text>
              </Pressable>
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22 }}>{t('memorization.creation.memorized.note')}</Text>
            </CreationSection>
            <CreationSection title={t('memorization.creation.amount.title')} icon="book" description={t('memorization.creation.amount.description')}>
              <AmountPicker label={t('memorization.weeklyAmountLabel')} value={amount} onChange={setAmount} unit={t('memorization.creation.amount.unit')} presets={['1', '2', '4', '8']} minimum={1} maximum={240} parse={value => Number(normalizeArabicSearch(value))} />
              {Number.isInteger(weeklyQuarters) && weeklyQuarters > 0 && <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{t('memorization.creation.amount.summary', { amount: quarterLabel(weeklyQuarters) })}</Text>}
            </CreationSection>
            <CreationSection title={t('memorization.creation.days.title')} icon="calendar" description={t('memorization.creation.days.description')}>
              <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('memorization.mondayAndWednesday'), value: [1, 3] }, { label: t('common.weekdays.everyDay'), value: [0, 1, 2, 3, 4, 5, 6] }]} />
              <PlanDateField label={t('goals.startingFrom')} mode="date" value={startDate} onChange={setStartDate} minimum={today} />
            </CreationSection>
          </> : preview.plan && index ? <>
            <MemorizationHero index={index} ranges={preview.plan.memorized} compact />
            <CreationSection title={t('goals.firstSchedule')} icon="calendar" description={t('memorization.creation.schedule.description', { amount: quarterLabel(weeklyQuarters), days: days.length })}>
              {preview.plan.sessions.length ? <>{preview.plan.sessions.slice(0, Math.min(days.length, 7)).map((session, i) => <View key={session.date} style={{ paddingTop: i ? 12 : 0, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border, gap: 4 }}>
                <View style={[c.row, { justifyContent: 'space-between' }]}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.ayahCount', { ayahs: spanCount(session.ranges) })}</Text></View>
                {session.ranges.slice(0, 3).map(r => <Text key={r.start} style={{ color: p.mutedForeground, fontSize: 13 }}>{ayahRangeLabel(index, r.start, r.end)}</Text>)}
                {session.ranges.length > 3 && <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('memorization.creation.schedule.moreSegments', { segments: session.ranges.length - 3 })}</Text>}
              </View>)}<View style={{ paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, gap: 4 }}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('memorization.creation.schedule.sessions', { sessions: preview.plan.sessions.length })}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('memorization.creation.schedule.expectedEnd', { date: dateLabel(preview.plan.sessions.at(-1)!.date) })}</Text></View></>
              : <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 25 }}>{t('memorization.creation.schedule.allMemorized')}</Text>}
            </CreationSection>
            <CreationSection title={t('goals.makeItYours')} icon="settings"><PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={t('memorization.defaultName')} />
              <PlanSwitch label={t('memorization.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported || !preview.plan.sessions.length} detail={remindersSupported ? t('memorization.creation.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
            </CreationSection>
            <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22, paddingHorizontal: 4 }}>{t('memorization.creation.howItWorks')}</Text>
          </> : null}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      <View style={[c.footer, { backgroundColor: p.card, borderColor: p.border }]}><PlanNotice message={message || preview.error} />
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? t('goals.saving') : step ? preview.plan?.sessions.length ? t('memorization.creation.start') : t('memorization.creation.saveRecord') : t('memorization.creation.review')}</ReaderButton>
      </View>
      {choosing && index && <MemorizedSelectionSheet index={index} selected={ranges} onClose={() => setChoosing(false)} onSave={value => { setSelected(items => ({ ...items, [riwayah]: value })); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
