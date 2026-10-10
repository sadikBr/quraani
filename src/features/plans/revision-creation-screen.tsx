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
import { weekdayDateLabel } from './presentation';
import { t } from '@/i18n';
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
      if (startDate < today) throw new Error(t('goals.errors.startDate'));
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(t('goals.errors.reminderTime'));
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createRevisionPlan({ name: name.trim() || t('revision.defaultName'), riwayah, dailyQuarters, weekdays: days, startDate, memorized: ranges, reminder: { enabled: reminder, hour, minute } }, index, id, { allowEmpty: !!owner }) };
    } catch (e) { return { error: e instanceof Error ? e.message : t('goals.errors.checkChoices') }; }
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
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveGoal')); }
    finally { saving.current = false; setBusy(false); }
  };
  const memoryCard = <View style={{ padding: 16, gap: 6, minHeight: 52, borderWidth: 1, borderColor: p.input, borderRadius: readerShape.control }}>
    <View style={c.row}>
      <View style={c.grow}>
        <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{ranges.length ? t('revision.creation.memory.count', { count: spanCount(ranges) }) : t('revision.creation.memory.none')}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{owner ? t('revision.creation.memory.followedBy', { name: owner.name }) : t('revision.creation.memory.kinds')}</Text>
      </View>
      {!owner && <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />}
    </View>
    {!owner && <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{ranges.length ? t('revision.creation.memory.edit') : t('revision.chooseMemorized')}</Text>}
  </View>;
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? t('revision.creation.backToSetup') : t('goals.backToGoalTypes')} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}><ReaderIcon name="back" color={p.foreground} size={20} /><Text style={{ color: p.foreground, fontSize: 15 }}>{step ? t('goals.setup') : t('goals.newGoal')}</Text></Pressable><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.title')}</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{step ? t('revision.creation.heading.review') : t('revision.creation.heading.setup')}</Text><Text style={{ color: p.mutedForeground, fontSize: 15 }}>{step ? t('revision.creation.intro.review') : t('revision.creation.intro.setup')}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy && !existing} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title={t('revision.creation.memory.title')} icon="check" description={t('revision.creation.memory.description')}>
              <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />
              {existing ? <View style={{ gap: 10 }}>
                <PlanNotice message={t('revision.creation.memory.existing', { riwayah: riwayah === 'warsh' ? t('common.riwayah.warsh.name') : t('common.riwayah.hafs.name') })} />
                <ReaderButton palette={p} onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: existing.id } })}>{t('revision.creation.memory.continueExisting', { name: existing.name })}</ReaderButton>
              </View> : owner ? memoryCard
                : <Pressable accessibilityRole="button" accessibilityLabel={t('revision.creation.memory.chooseLabel')} disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ borderRadius: readerShape.control, backgroundColor: pressed ? p.accent : 'transparent', opacity: !index ? 0.6 : pressed ? 0.85 : 1 })}>{memoryCard}</Pressable>}
            </CreationSection>
            {!existing && <>
              <CreationSection title={t('revision.creation.amount.title')} icon="loop" description={t('revision.creation.amount.description')}>
                <AmountPicker label={t('revision.amount.label')} value={amount} onChange={setAmount} unit={t('revision.amount.unit')} presets={['1', '2', '4', '8']} presetLabel={quarterLabel} minimum={1} maximum={REVISION_MAX_QUARTERS} parse={value => Number(normalizeArabicSearch(value))} />
                {Number.isInteger(dailyQuarters) && dailyQuarters > 0 && <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>{t('revision.dailyAmount', { amount: quarterLabel(dailyQuarters) })}</Text>}
              </CreationSection>
              <CreationSection title={t('revision.creation.days.title')} icon="calendar" description={t('revision.creation.days.description')}>
                <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('common.weekdays.everyDay'), value: EVERY_DAY }, { label: t('revision.weekdays.exceptFriday'), value: [0, 1, 2, 3, 4, 6] }, { label: t('revision.weekdays.mondayThursday'), value: [1, 4] }]} />
                <PlanDateField label={t('goals.startingFrom')} mode="date" value={startDate} onChange={setStartDate} minimum={today} />
              </CreationSection>
            </>}
          </> : preview.plan && index ? <>
            <RevisionHero plan={preview.plan} index={index} />
            <CreationSection title={t('goals.firstSchedule')} icon="calendar" description={t('revision.creation.schedule.description', { amount: quarterLabel(dailyQuarters), count: days.length })}>
              {firstPass.length ? <>{firstPass.slice(0, Math.min(days.length, 7)).map((session, i) => <View key={session.date} style={{ paddingTop: i ? 12 : 0, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border, gap: 4 }}>
                <View style={[c.row, { justifyContent: 'space-between' }]}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{weekdayDateLabel(session.date)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.ayahCount', { count: spanCount(session.spans) })}</Text></View>
                {session.spans.slice(0, 3).map(r => <Text key={r.start} style={{ color: p.mutedForeground, fontSize: 13 }}>{ayahRangeLabel(index, r.start, r.end)}</Text>)}
                {session.spans.length > 3 && <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('revision.creation.schedule.moreSpans', { count: session.spans.length - 3 })}</Text>}
              </View>)}<View style={{ paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, gap: 4 }}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('revision.creation.schedule.sessions', { count: firstPass.length })}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('revision.creation.schedule.expectedEnd', { date: dateLabel(firstPass.at(-1)!.date) })}</Text></View></>
                : <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 25 }}>{owner ? t('revision.creation.schedule.ownerEmpty', { name: owner.name }) : t('revision.creation.schedule.chooseFirst')}</Text>}
            </CreationSection>
            <CreationSection title={t('goals.makeItYours')} icon="settings"><PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={t('revision.defaultName')} />
              <PlanSwitch label={t('revision.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('revision.creation.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
            </CreationSection>
          </> : null}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      {!existing && <View style={[c.footer, { backgroundColor: p.card, borderColor: p.border }]}><PlanNotice message={message || preview.error} />
        {step === 0 && preview.plan && passDays > 0 && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('revision.creation.passEvery', { days: revisionDaysLabel(passDays) })}</Text>}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? t('goals.saving') : step ? t('revision.creation.submit') : t('revision.creation.showDays')}</ReaderButton>
      </View>}
      {choosing && index && !owner && <MemorizedSelectionSheet index={index} selected={ranges} onClose={() => setChoosing(false)} onSave={value => { setSelected(items => ({ ...items, [riwayah]: value })); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
