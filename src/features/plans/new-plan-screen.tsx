import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { Segments } from '../quran-reader/components/ui/reader-chrome';
import { withAlpha } from '../quran-reader/design';
import { Medallion } from '@/components/craft/marks';
import { PageTitle, Row, RowGroup, Section } from '@/components/craft/page';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, readingPositionKey, type Riwayah } from '../quran-reader/riwayat';
import { contentStorage } from '../quran-reader/storage/content-storage';
import { usePlans } from './provider';
import { createPlan, rangeLabel } from './engine';
import { localDate } from './dates';
import { shortDate } from './presentation';
import { formatList, formatNumber, t } from '@/i18n';
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
import { AmountPicker, BoardLabel, CreationBar, CreationBoard, CreationFooter, CreationSection, CreationSteps, ExistingGoalCard, GoalTypeChoices, c } from './goal-creation-components';
import { HeroPanel, HeroStat, JuzRing, juzShares } from './plan-detail-components';
import { Copy, PlanField, PlanLoading, PlanNotice, PlanScreen, SwitchRow } from './components';
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
  const startAyah = preview.plan && index ? index.ayahs[preview.plan.cycle.start] : undefined;
  return <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CreationBar kind={kind} label={t('goals.newGoal')} back={{ label: step ? t('khatma.create.backToSetup') : t('goals.backToGoals'), onPress: () => { if (step) changeStep(0); else router.back(); } }} disabled={busy} />
      <ScrollView ref={scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={c.content}>
        <PageTitle title={blocked ? t('khatma.create.heading.blocked') : step ? t('khatma.create.heading.review') : t('khatma.create.heading.setup')}
          subtitle={blocked ? t('khatma.create.subheading.blocked') : step ? t('khatma.create.subheading.review') : t('khatma.create.subheading.setup')} palette={p} />
        {!blocked && <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />}
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {blocked ? <>
            <GoalTypeChoices kind={kind} existing={blocked} onChange={() => {}} />
            <ExistingGoalCard goal={blocked} onOpen={() => openGoal(blocked.id)} />
            <Copy muted>{t('khatma.create.blockedNote')}</Copy>
          </> : step === 0 ? <>
            <CreationBoard>
              <GoalTypeChoices kind={kind} onChange={value => { setKind(value); setStep(0); setMessage(''); setConflictId(undefined); }} />
              <View style={{ gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(p.ornament, 0.35), paddingTop: 14 }}>
                <BoardLabel>{kind === 'khatma' ? t('khatma.create.amount.khatmaTitle') : t('khatma.create.amount.wirdTitle')}</BoardLabel>
                {kind === 'wird' && <Segments palette={p} value={unit} onChange={value => { setUnit(value); setAmount(value === 'pages' ? '5' : '1'); }} options={unitOptions} />}
                <AmountPicker label={kind === 'khatma' ? t('khatma.create.amount.khatmaLabel') : t('khatma.create.amount.wirdLabel')} value={kind === 'khatma' ? weeks : amount} onChange={kind === 'khatma' ? setWeeks : setAmount}
                  unit={kind === 'khatma' ? t('khatma.create.amount.weeks', { count: parsePlanNumber(weeks) }) : t(`khatma.create.amount.perDay.${unit}`, { count: parsePlanNumber(amount) })} presets={kind === 'khatma' ? ['2', '4', '8', '12'] : unit === 'pages' ? ['2', '5', '10', '20'] : unit === 'hizbs' ? ['0.25', '0.5', '1', '2'] : ['0.125', '0.25', '0.5', '1']}
                  minimum={kind === 'khatma' ? 1 : increment} maximum={kind === 'khatma' ? 52 : (index?.[unit].length ?? 2) - 1} increment={kind === 'khatma' ? 1 : increment} parse={parsePlanNumber}
                  presetLabel={value => t(`plans.units.${kind === 'khatma' ? 'weeks' : unit}`, { count: value })} />
              </View>
              {kind === 'khatma' && <View style={{ gap: 8 }}><Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('khatma.create.amount.divideBy')}</Text><Segments palette={p} value={unit} onChange={setUnit} options={unitOptions} /></View>}
              <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, textAlign: 'center' }}>{kind === 'khatma' ? t('khatma.create.amount.khatmaDescription') : t('khatma.create.amount.wirdDescription')}</Text>
            </CreationBoard>
            <CreationSection title={t('khatma.create.timing.title')}>
              <View style={{ gap: 8 }}><Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('khatma.create.timing.riwayah')}</Text><Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} /></View>
              <PlanDateField label={t('khatma.create.timing.startDate')} value={startDate} onChange={setStartDate} mode="date" minimum={today} />
            </CreationSection>
            {index && <CreationSection title={t('khatma.create.start.title')} description={kind === 'khatma' ? t('khatma.create.start.khatmaDescription') : t('khatma.create.start.wirdDescription')}>
              <StartPointPicker index={index} value={start} onChange={setStart} onCurrentPosition={() => void currentPage()} />
            </CreationSection>}
          </> : <>
            {preview.plan && index && startAyah && <>
              <HeroPanel title={kind === 'khatma' ? t('khatma.create.summary.khatma', { count: parsePlanNumber(weeks) }) : t(`khatma.create.summary.wird.${unit}`, { count: parsePlanNumber(amount) })}
                detail={t('khatma.create.summary.from', { surah: index.surahNames[startAyah.surahNumber], ayah: startAyah.ayahNumber, page: startAyah.pageNumber })}
                figure={<JuzRing size={212} done={[]} held={juzShares(index, [{ start: preview.plan.cycle.start, end: preview.plan.totalAyahs }])} current={index.juzs.findIndex((at, i) => at <= preview.plan!.cycle.start && preview.plan!.cycle.start < index.juzs[i + 1])}
                  label={formatList([t('khatma.create.summary.sessions'), t('session.plan.total', { count: preview.plan.cycle.sessions.length })])}>
                  <Text style={{ color: p.foreground, fontSize: 36, lineHeight: 56, fontFamily: 'ReaderNaskhBold' }}>{formatNumber(preview.plan.cycle.sessions.length)}</Text>
                  <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('khatma.create.summary.sessions')}</Text>
                </JuzRing>}
                stats={<>
                  <HeroStat label={t('khatma.create.summary.start')} value={shortDate(startDate)} />
                  <HeroStat divided label={kind === 'khatma' ? t('khatma.create.summary.completion') : t('khatma.create.summary.rhythm')} value={kind === 'khatma' ? shortDate(preview.plan.cycle.sessions.at(-1)!.date) : t('khatma.create.summary.noEndDate')} />
                </>}>
                <Text style={{ color: p.mutedForeground, fontSize: 12, marginTop: 4 }}>{t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
              </HeroPanel>
              <Section title={t('khatma.create.firstSteps.title')} palette={p}>
                {kind === 'wird' && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, marginTop: -4 }}>{t('khatma.create.firstSteps.wirdNote')}</Text>}
                <RowGroup palette={p}>{preview.plan.cycle.sessions.slice(0, 3).map((session, i) => <Row key={session.date} palette={p} leading={<Medallion value={i + 1} size={36} palette={p} />}
                  title={rangeLabel(index, session.start, session.end)} detail={shortDate(session.date)} />)}</RowGroup>
              </Section>
            </>}
            <Section title={t('khatma.create.makeItYours')} palette={p}>
              <PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={t(`khatma.create.defaultName.${kind}`)} />
              <RowGroup palette={p}>
                <SwitchRow icon="loop" checked={repeat} onChange={setRepeat} label={t('khatma.repeat')} detail={t('khatma.create.repeatDetail')} />
                <SwitchRow icon="bell" checked={reminder} onChange={setReminder} disabled={!remindersSupported} label={t('khatma.create.reminder')} detail={remindersSupported ? t('khatma.create.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              </RowGroup>
              {reminder && <PlanDateField label={t('goals.reminder.time')} value={time} onChange={setTime} mode="time" />}
            </Section>
            {replacesRepeat && <Copy muted>{t('khatma.create.replacesRepeat')}</Copy>}
          </>}
        </View>
        {!blocked && <><PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}</>}
      </ScrollView>
      {!blocked && <CreationFooter>
        <PlanNotice message={message || preview.error} />
        {conflictId ? <ReaderButton palette={p} onPress={() => openGoal(conflictId)}>{t('goals.viewCurrent')}</ReaderButton>
          : <>
            {step === 0 && preview.plan && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('khatma.create.sessionsPreview', { count: preview.plan.cycle.sessions.length })}</Text>}
            <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step === 0 ? changeStep(1) : void save()}>{busy ? t('goals.saving') : step === 0 ? t('khatma.create.continueToReview') : t('khatma.create.create')}</ReaderButton>
          </>}
      </CreationFooter>}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
