import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import { PageTitle, Row, RowGroup, Section } from '@/components/craft/page';
import { withAlpha } from '../quran-reader/design';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, type Riwayah } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { createRecurringPlan, nextScheduledDate, RECURRING_PRESETS, weekdaysLabel, type RecurringPreset } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { formatList, t } from '@/i18n';
import { PlanField, PlanLoading, PlanNotice, SwitchRow } from './components';
import { BoardLabel, CreationBar, CreationBoard, CreationFooter, CreationSection, CreationSteps, c } from './goal-creation-components';
import { HeroPanel, SurahFrames } from './plan-detail-components';
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
  const fallbackName = surahs.length === 1 && index ? t('recurring.creation.fallbackNameSurah', { surah: index.surahNames[surahs[0]] }) : t('recurring.creation.fallbackName');
  const preview = useMemo(() => {
    if (!index) return {};
    try {
      if (startDate < today) throw new Error(t('goals.errors.startDate'));
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error(t('goals.errors.reminderTime'));
      const [hour, minute] = time.split(':').map(Number);
      return { plan: createRecurringPlan({ name: name.trim() || fallbackName, riwayah, surahs, weekdays: days, startDate, reminder: { enabled: reminder, hour, minute } }, index, id) };
    } catch (e) { return { error: e instanceof Error ? e.message : t('goals.errors.checkChoices') }; }
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
    } catch (e) { setMessage(e instanceof Error ? e.message : t('goals.errors.saveGoal')); }
    finally { saving.current = false; setBusy(false); }
  };
  const upcoming: string[] = [];
  if (preview.plan) for (let i = 0; i < 3; i++) upcoming.push(nextScheduledDate(preview.plan, i ? addDays(upcoming[i - 1], 1) : startDate));
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CreationBar kind="recurring" label={t('goals.types.recurring')} back={{ label: step ? t('recurring.creation.backToSetup') : t('goals.backToGoalTypes'), onPress: () => { if (step) changeStep(0); else router.back(); } }} disabled={busy} />
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <PageTitle title={step ? t('recurring.creation.review.title') : preset ? initial!.name : t('recurring.creation.setup.title')} subtitle={step ? t('recurring.creation.review.subtitle') : t('recurring.creation.setup.subtitle')} palette={p} />
        <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />
        {/* Always a native view: blocking touches while saving makes it one, and unblocking
            would flatten it away again, which, with the content changing at the same time,
            crashed Android's renderer (a view inserted while it still had a parent). */}
        <View collapsable={false} pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationBoard>
              <BoardLabel center>{t('recurring.creation.what.title')}</BoardLabel>
              <Pressable accessibilityRole="button" accessibilityLabel={t('recurring.creation.what.chooseSurahs')} accessibilityHint={surahs.length && index ? formatList(surahs.map(n => index.surahNames[n])) : undefined} disabled={!index}
                onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ alignItems: 'center', gap: 10, opacity: !index ? 0.5 : pressed ? 0.7 : 1, minHeight: 72, justifyContent: 'center' })}>
                {surahs.length && index ? <SurahFrames index={index} surahs={surahs} />
                  : <View style={[c.row, { gap: 10 }]}><ReaderIcon name="book" color={p.ornament} size={20} /><Text style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontFamily: 'ReaderNaskhBold' }}>{t('recurring.creation.what.placeholder')}</Text></View>}
                <View style={[c.row, { gap: 6 }]}><ReaderIcon name={surahs.length ? 'pencil' : 'search'} size={14} color={p.primary} /><Text style={{ color: p.primary, fontSize: 14, fontWeight: '600' }}>{surahs.length ? t('recurring.creation.what.change') : t('recurring.creation.what.browse')}</Text></View>
              </Pressable>
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: withAlpha(p.ornament, 0.35), paddingTop: 14, gap: 8 }}>
                <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('recurring.creation.what.riwayah')}</Text>
                <Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} />
              </View>
            </CreationBoard>
            <CreationSection title={t('recurring.creation.when.title')} description={t('recurring.creation.when.description')}>
              <WeekdayPicker days={days} onChange={setDays} /><PlanDateField label={t('goals.startingFrom')} mode="date" value={startDate} onChange={setStartDate} minimum={today} />
            </CreationSection>
          </> : <>
            {preview.plan && index && <HeroPanel figure={<SurahFrames index={index} surahs={surahs} />} title={weekdaysLabel(days)}
              detail={surahs.length > 1 ? t('recurring.creation.sessions.several') : t('recurring.creation.sessions.single')}>
              <Text style={{ color: p.mutedForeground, fontSize: 12, marginTop: 6 }}>{t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Text>
            </HeroPanel>}
            <Section title={t('recurring.creation.firstDates')} palette={p}>
              <RowGroup palette={p}>{upcoming.map(date => <Row key={date} palette={p} leading={<Medallion value={Number(date.slice(8))} size={38} palette={p} />} title={dateLabel(date)} />)}</RowGroup>
            </Section>
            <Section title={t('goals.makeItYours')} palette={p}>
              <PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={fallbackName} />
              <RowGroup palette={p}>
                <SwitchRow icon="bell" label={t('recurring.creation.reminder')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('recurring.creation.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              </RowGroup>
              {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
            </Section>
            <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21, paddingHorizontal: 2 }}>{t('recurring.creation.alongside')}</Text>
          </>}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      <CreationFooter>
        <PlanNotice message={message || (surahs.length && days.length ? preview.error : undefined)} />
        {!surahs.length || !days.length ? <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('recurring.creation.chooseToContinue')}</Text> : null}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? t('goals.saving') : step ? t('recurring.creation.create') : t('recurring.creation.reviewSchedule')}</ReaderButton>
      </CreationFooter>
      {choosing && index && <SurahSelectionSheet index={index} selected={surahs} onClose={() => setChoosing(false)} onSave={value => { setSurahs(value); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
