import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, readingPositionKey, type Riwayah } from '../quran-reader/riwayat';
import { contentStorage } from '../quran-reader/storage/content-storage';
import { Badge, Card } from '@/components/ui';
import { usePlans } from './provider';
import { createPlan, rangeLabel, unitLabels } from './engine';
import { localDate } from './dates';
import { shortDate } from './presentation';
import { formatNumber, t } from '@/i18n';
import { remindersSupported, requestPlanReminders } from './notifications';
import { usePlanIndex } from './use-plan-index';
import { PlanDateField } from './plan-date-field';
import { isSequentialPlan, type SequentialGoal, type PlanStart, type PlanUnit } from './types';
import { MemorizationCreationScreen } from './memorization-creation-screen';
import { GoalChooser } from './goal-chooser';
import { RecurringCreationScreen } from './recurring-creation-screen';
import { RevisionCreationScreen } from './revision-creation-screen';
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
  if (!ready) return <PlanScreen title={t('goals.newGoal')} onBack={() => router.back()}><PlanNotice message={error} retry={retry} />{!error && <PlanLoading />}</PlanScreen>;
  if (type === 'memorization') return <MemorizationCreationScreen />;
  if (type === 'revision') return <RevisionCreationScreen />;
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
  const replacesRepeat = plans.some(goal => isSequentialPlan(goal) && goal.status === 'completed' && goal.repeat);
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      if (startDate < today) throw new Error(t('goals.errors.startDate'));
      const clock = time.split(':').map(parsePlanNumber);
      if (clock.length !== 2) throw new Error(t('khatma.create.errors.timeFormat'));
      return { plan: createPlan({ name: name.trim() || t(`khatma.create.defaultName.${kind}`), riwayah, unit, start, startDate, repeat,
        goal: kind === 'khatma' ? { type: kind, weeks: parsePlanNumber(weeks) } : { type: kind, amount: parsePlanNumber(amount) },
        reminder: { enabled: reminder, hour: clock[0], minute: clock[1] } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : t('khatma.create.errors.checkGoal') }; }
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
      setMessage(e instanceof Error ? e.message : t('goals.errors.saveGoal'));
      if (e instanceof DuplicateGoalError) setConflictId(e.goalId);
    } finally { setBusy(false); }
  };
  const currentPage = async () => {
    try {
      const raw = JSON.parse(await contentStorage.getItem(readingPositionKey(RIWAYAT[riwayah].mushafId)) ?? 'null');
      if (raw?.mushafId === RIWAYAT[riwayah].mushafId && index?.ayahs.some(a => a.pageNumber === raw.pageNumber)) setStart({ kind: 'page', number: raw.pageNumber });
      else setStart({ kind: 'page', number: 1 });
    } catch { setMessage(t('khatma.create.errors.savedPosition')); }
  };
  const unitOptions = [{ value: 'pages', label: t('khatma.create.units.pages') }, { value: 'hizbs', label: t('khatma.create.units.hizbs') }, { value: 'juzs', label: t('khatma.create.units.juzs') }] as const;
  const increment = unit === 'pages' ? 1 : unit === 'hizbs' ? 0.25 : 0.125;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={c.navigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={step ? t('khatma.create.backToSetup') : t('goals.backToGoals')} disabled={busy} onPress={() => step ? changeStep(0) : router.back()}
          style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}>
          <ReaderIcon name="back" color={p.foreground} size={20} /><Text style={{ color: p.foreground, fontSize: 15 }}>{step ? t('goals.setup') : t('goals.goals')}</Text>
        </Pressable>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('goals.newGoal')}</Text>
      </View>
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}>
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{blocked ? t('khatma.create.heading.blocked') : step ? t('khatma.create.heading.review') : t('khatma.create.heading.setup')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{blocked ? t('khatma.create.subheading.blocked') : step ? t('khatma.create.subheading.review') : t('khatma.create.subheading.setup')}</Text>
        </View>
        {!blocked && <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />}
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {(step === 0 || blocked) && <GoalTypeChoices kind={kind} existing={blocked} onChange={value => { setKind(value); setStep(0); setMessage(''); setConflictId(undefined); }} />}
          {blocked ? <>
            <ExistingGoalCard goal={blocked} onOpen={() => openGoal(blocked.id)} />
            <Copy muted>{t('khatma.create.blockedNote')}</Copy>
          </> : step === 0 ? <>
            <CreationSection title={kind === 'khatma' ? t('khatma.create.amount.khatmaTitle') : t('khatma.create.amount.wirdTitle')} icon={kind === 'khatma' ? 'calendar' : 'book'}
              description={kind === 'khatma' ? t('khatma.create.amount.khatmaDescription') : t('khatma.create.amount.wirdDescription')}>
              {kind === 'wird' && <Segments palette={p} value={unit} onChange={value => { setUnit(value); setAmount(value === 'pages' ? '5' : '1'); }} options={unitOptions} />}
              <AmountPicker label={kind === 'khatma' ? t('khatma.create.amount.khatmaLabel') : t('khatma.create.amount.wirdLabel')} value={kind === 'khatma' ? weeks : amount} onChange={kind === 'khatma' ? setWeeks : setAmount}
                unit={kind === 'khatma' ? t('khatma.create.amount.weeks') : t('khatma.create.amount.perDay', { unit: unitLabels[unit] })} presets={kind === 'khatma' ? ['2', '4', '8', '12'] : unit === 'pages' ? ['2', '5', '10', '20'] : unit === 'hizbs' ? ['0.25', '0.5', '1', '2'] : ['0.125', '0.25', '0.5', '1']}
                minimum={kind === 'khatma' ? 1 : increment} maximum={kind === 'khatma' ? 52 : (index?.[unit].length ?? 2) - 1} increment={kind === 'khatma' ? 1 : increment} parse={parsePlanNumber} />
              {kind === 'khatma' && <View style={{ gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16 }}><Copy muted>{t('khatma.create.amount.divideBy')}</Copy><Segments palette={p} value={unit} onChange={setUnit} options={unitOptions} /></View>}
            </CreationSection>
            <CreationSection title={t('khatma.create.timing.title')} icon="calendar">
              <View style={{ gap: 8 }}><Copy muted>{t('khatma.create.timing.riwayah')}</Copy><Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} /></View>
              <PlanDateField label={t('khatma.create.timing.startDate')} value={startDate} onChange={setStartDate} mode="date" minimum={today} />
            </CreationSection>
            {index && <CreationSection title={t('khatma.create.start.title')} icon="bookmark" description={kind === 'khatma' ? t('khatma.create.start.khatmaDescription') : t('khatma.create.start.wirdDescription')}>
              <StartPointPicker index={index} value={start} onChange={setStart} onCurrentPosition={() => void currentPage()} />
            </CreationSection>}
          </> : <>
            {preview.plan && index && <>
              <Card style={{ padding: 16, gap: 14 }}>
                <Badge variant="outline">{t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Badge>
                <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{kind === 'khatma' ? t('khatma.create.summary.khatma', { weeks: parsePlanNumber(weeks) }) : t('khatma.create.summary.wird', { amount: parsePlanNumber(amount), unit: unitLabels[unit] })}</Text>
                <View style={[c.row, { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 14, alignItems: 'flex-start' }]}>
                  <View style={c.grow}><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('khatma.create.summary.start')}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{shortDate(startDate)}</Text></View>
                  <View style={c.grow}><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{kind === 'khatma' ? t('khatma.create.summary.completion') : t('khatma.create.summary.rhythm')}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{kind === 'khatma' ? shortDate(preview.plan.cycle.sessions.at(-1)!.date) : t('khatma.create.summary.noEndDate')}</Text></View>
                  <View><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('khatma.create.summary.sessions')}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{formatNumber(preview.plan.cycle.sessions.length)}</Text></View>
                </View>
                <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('khatma.create.summary.from', { surah: index.surahNames[index.ayahs[preview.plan.cycle.start].surahNumber], ayah: index.ayahs[preview.plan.cycle.start].ayahNumber, page: index.ayahs[preview.plan.cycle.start].pageNumber })}</Text>
              </Card>
              <CreationSection title={t('khatma.create.firstSteps.title')} icon="lines" description={kind === 'wird' ? t('khatma.create.firstSteps.wirdNote') : undefined}>
                <View>{preview.plan.cycle.sessions.slice(0, 3).map((session, i) => <View key={session.date} style={[c.row, { gap: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
                  <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 20 }}>{formatNumber(i + 1)}</Text>
                  <View style={c.grow}><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{rangeLabel(index, session.start, session.end)}</Text><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{shortDate(session.date)}</Text></View>
                </View>)}</View>
              </CreationSection>
            </>}
            <CreationSection title={t('khatma.create.makeItYours')} icon="settings">
              <PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={t(`khatma.create.defaultName.${kind}`)} />
              <PlanSwitch checked={repeat} onChange={setRepeat} label={t('khatma.repeat')} detail={t('khatma.create.repeatDetail')} />
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
              <PlanSwitch checked={reminder} onChange={setReminder} disabled={!remindersSupported} label={t('khatma.create.reminder')} detail={remindersSupported ? t('khatma.create.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              {reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
            </CreationSection>
            {replacesRepeat && <Copy muted>{t('khatma.create.replacesRepeat')}</Copy>}
          </>}
        </View>
        {!blocked && <><PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}</>}
      </ScrollView>
      {!blocked && <View style={[c.footer, { backgroundColor: p.card, borderColor: p.border }]}>
        <PlanNotice message={message || preview.error} />
        {conflictId ? <ReaderButton palette={p} onPress={() => openGoal(conflictId)}>{t('goals.viewCurrent')}</ReaderButton>
          : <>
            {step === 0 && preview.plan && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('khatma.create.sessionsPreview', { sessions: preview.plan.cycle.sessions.length })}</Text>}
            <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step === 0 ? changeStep(1) : void save()}>{busy ? t('goals.saving') : step === 0 ? t('khatma.create.continueToReview') : t('khatma.create.create')}</ReaderButton>
          </>}
      </View>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
