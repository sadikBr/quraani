import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { PageTitle, Row, RowGroup, Section } from '@/components/craft/page';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import type { Riwayah } from '../quran-reader/riwayat';
import { normalizeArabicSearch } from '../quran-reader/utils/search';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { memoryFor, quarterLabel, spanCount } from './memorization';
import { createRevisionPlan, remainingPassDays, REVISION_MAX_QUARTERS, revisionPassLength } from './revision';
import { ayahRangeLabel } from './engine';
import { dateLabel, localDate } from './dates';
import { t } from '@/i18n';
import { PlanField, PlanLoading, PlanNotice, SwitchRow } from './components';
import { AmountPicker, BoardLabel, CreationBar, CreationBoard, CreationFooter, CreationSection, CreationSteps, MemoryPicker, ScheduleRow, c } from './goal-creation-components';
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
  const memoryTitle = ranges.length ? t('revision.creation.memory.count', { count: spanCount(ranges) }) : t('revision.creation.memory.none');
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CreationBar kind="revision" label={t('revision.title')} back={{ label: step ? t('revision.creation.backToSetup') : t('goals.backToGoalTypes'), onPress: () => { if (step) changeStep(0); else router.back(); } }} disabled={busy} />
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <PageTitle title={step ? t('revision.creation.heading.review') : t('revision.creation.heading.setup')} subtitle={step ? t('revision.creation.intro.review') : t('revision.creation.intro.setup')} palette={p} />
        <CreationSteps step={step} canReview={!!preview.plan && !busy && !existing} onChange={changeStep} />
        {/* Always a native view: blocking touches while saving makes it one, and unblocking
            would flatten it away again, which, with the content changing at the same time,
            crashed Android's renderer (a view inserted while it still had a parent). */}
        <View collapsable={false} pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title={t('revision.creation.memory.title')} description={t('revision.creation.memory.description')}>
              <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />
              {existing ? <View style={{ gap: 10 }}>
                <PlanNotice message={t('revision.creation.memory.existing', { riwayah: riwayah === 'warsh' ? t('common.riwayah.warsh.name') : t('common.riwayah.hafs.name') })} />
                <ReaderButton palette={p} onPress={() => router.replace({ pathname: '/plans/[id]', params: { id: existing.id } })}>{t('revision.creation.memory.continueExisting', { name: existing.name })}</ReaderButton>
              </View> : owner ? <MemoryPicker title={memoryTitle} detail={t('revision.creation.memory.followedBy', { name: owner.name })} />
                : <MemoryPicker title={memoryTitle} detail={t('revision.creation.memory.kinds')} action={ranges.length ? t('revision.creation.memory.edit') : t('revision.chooseMemorized')}
                  label={t('revision.creation.memory.chooseLabel')} disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} />}
            </CreationSection>
            {!existing && <>
              <CreationBoard>
                <BoardLabel center>{t('revision.creation.amount.title')}</BoardLabel>
                <AmountPicker label={t('revision.amount.label')} value={amount} onChange={setAmount} unit={t('revision.amount.unit')} presets={['1', '2', '4', '8']} presetLabel={quarterLabel} minimum={1} maximum={REVISION_MAX_QUARTERS} parse={value => Number(normalizeArabicSearch(value))} />
                {Number.isInteger(dailyQuarters) && dailyQuarters > 0 && <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '700', textAlign: 'center' }}>{t('revision.dailyAmount', { amount: quarterLabel(dailyQuarters) })}</Text>}
                <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{t('revision.creation.amount.description')}</Text>
              </CreationBoard>
              <CreationSection title={t('revision.creation.days.title')} description={t('revision.creation.days.description')}>
                <WeekdayPicker days={days} onChange={setDays} quickOptions={[{ label: t('common.weekdays.everyDay'), value: EVERY_DAY }, { label: t('revision.weekdays.exceptFriday'), value: [0, 1, 2, 3, 4, 6] }, { label: t('revision.weekdays.mondayThursday'), value: [1, 4] }]} />
                <PlanDateField label={t('goals.startingFrom')} mode="date" value={startDate} onChange={setStartDate} minimum={today} />
              </CreationSection>
            </>}
          </> : preview.plan && index ? <>
            <RevisionHero plan={preview.plan} index={index} compact />
            <Section title={t('goals.firstSchedule')} palette={p}>
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, marginTop: -4 }}>{t('revision.creation.schedule.description', { amount: quarterLabel(dailyQuarters), count: days.length })}</Text>
              {firstPass.length ? <RowGroup palette={p}>
                {firstPass.slice(0, Math.min(days.length, 7)).map(session => <ScheduleRow key={session.date} date={session.date} count={t('revision.ayahCount', { count: spanCount(session.spans) })}
                  lines={[...session.spans.slice(0, 3).map(r => ayahRangeLabel(index, r.start, r.end)), ...(session.spans.length > 3 ? [t('revision.creation.schedule.moreSpans', { count: session.spans.length - 3 })] : [])]} />)}
                <Row icon="loop" palette={p} title={t('revision.creation.schedule.sessions', { count: firstPass.length })} detail={t('revision.creation.schedule.expectedEnd', { date: dateLabel(firstPass.at(-1)!.date) })} />
              </RowGroup> : <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 25 }}>{owner ? t('revision.creation.schedule.ownerEmpty', { name: owner.name }) : t('revision.creation.schedule.chooseFirst')}</Text>}
            </Section>
            <Section title={t('goals.makeItYours')} palette={p}>
              <PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={t('revision.defaultName')} />
              <RowGroup palette={p}>
                <SwitchRow icon="bell" label={t('revision.remindMe')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('revision.creation.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              </RowGroup>
              {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
            </Section>
          </> : null}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      {!existing && <CreationFooter><PlanNotice message={message || preview.error} />
        {step === 0 && preview.plan && passDays > 0 && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('revision.creation.passEvery', { days: revisionDaysLabel(passDays) })}</Text>}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? t('goals.saving') : step ? t('revision.creation.submit') : t('revision.creation.showDays')}</ReaderButton>
      </CreationFooter>}
      {choosing && index && !owner && <MemorizedSelectionSheet index={index} selected={ranges} onClose={() => setChoosing(false)} onSave={value => { setSelected(items => ({ ...items, [riwayah]: value })); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
