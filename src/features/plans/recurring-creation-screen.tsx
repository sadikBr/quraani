import { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Badge, Card, Separator } from '@/components/ui';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon, Segments } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { RIWAYAT, type Riwayah } from '../quran-reader/riwayat';
import { usePlans } from './provider';
import { usePlanIndex } from './use-plan-index';
import { createRecurringPlan, nextScheduledDate, RECURRING_PRESETS, weekdaysLabel, type RecurringPreset } from './recurring';
import { addDays, dateLabel, localDate } from './dates';
import { formatList, formatNumber, t } from '@/i18n';
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
      <View style={c.navigation}><Pressable accessibilityRole="button" accessibilityLabel={step ? t('recurring.creation.backToSetup') : t('goals.backToGoalTypes')} disabled={busy} onPress={() => step ? changeStep(0) : router.back()} style={({ pressed }) => [c.back, { opacity: pressed || busy ? 0.5 : 1 }]}>
        <ReaderIcon name="back" color={p.foreground} size={20} /><Text style={{ color: p.foreground, fontSize: 15 }}>{step ? t('goals.setup') : t('goals.newGoal')}</Text></Pressable><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('goals.types.recurring')}</Text></View>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={c.content}>
        <View style={{ gap: 2 }}><Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 24, fontWeight: '600' }}>{step ? t('recurring.creation.review.title') : preset ? initial!.name : t('recurring.creation.setup.title')}</Text><Text style={{ color: p.mutedForeground, fontSize: 15 }}>{step ? t('recurring.creation.review.subtitle') : t('recurring.creation.setup.subtitle')}</Text></View>
        <CreationSteps step={step} canReview={!!preview.plan && !busy} onChange={changeStep} />
        <View pointerEvents={busy ? 'none' : 'auto'} style={{ gap: 24 }}>
          {step === 0 ? <>
            <CreationSection title={t('recurring.creation.what.title')} icon="book">
              <Pressable accessibilityRole="button" accessibilityLabel={t('recurring.creation.what.chooseSurahs')} disabled={!index} onPress={() => { Keyboard.dismiss(); setChoosing(true); }} style={({ pressed }) => ({ gap: 8, opacity: !index || pressed ? 0.6 : 1, minHeight: 72, justifyContent: 'center' })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={{ color: p.foreground, fontSize: 20, fontWeight: '600', lineHeight: 30, flex: 1 }}>{surahs.length && index ? formatList(surahs.map(n => index.surahNames[n])) : t('recurring.creation.what.placeholder')}</Text><ReaderIcon name="chevron" color={p.mutedForeground} size={16} /></View>
                <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{surahs.length ? t('recurring.creation.what.change') : t('recurring.creation.what.browse')}</Text>
              </Pressable>
              <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border, paddingTop: 16, gap: 8 }}><Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('recurring.creation.what.riwayah')}</Text><Segments palette={p} value={riwayah} onChange={setRiwayah} options={[{ value: 'warsh', label: t('common.riwayah.warsh.name') }, { value: 'hafs', label: t('common.riwayah.hafs.name') }]} /></View>
            </CreationSection>
            <CreationSection title={t('recurring.creation.when.title')} icon="calendar" description={t('recurring.creation.when.description')}>
              <WeekdayPicker days={days} onChange={setDays} /><PlanDateField label={t('goals.startingFrom')} mode="date" value={startDate} onChange={setStartDate} minimum={today} />
            </CreationSection>
          </> : <>
            {preview.plan && index && <Card style={{ padding: 16, gap: 12 }}>
              <View style={[c.row, { gap: 6 }]}><Badge variant="secondary" icon="restore">{t('goals.types.recurring')}</Badge><Badge variant="outline">{t('common.riwayahOf', { riwayah: RIWAYAT[riwayah].label })}</Badge></View>
              <Text style={{ color: p.foreground, fontSize: 22, fontWeight: '600' }}>{formatList(surahs.map(n => index.surahNames[n]))}</Text>
              <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{weekdaysLabel(days)}</Text>
              <Separator /><Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{surahs.length > 1 ? t('recurring.creation.sessions.several') : t('recurring.creation.sessions.single')}</Text>
            </Card>}
            <CreationSection title={t('recurring.creation.firstDates')} icon="calendar"><View>{upcoming.map((date, i) => <View key={date} style={[c.row, { gap: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderColor: p.border }]}>
              <Text style={{ color: p.mutedForeground, fontSize: 13, minWidth: 20 }}>{formatNumber(i + 1)}</Text><Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{dateLabel(date)}</Text>
            </View>)}</View></CreationSection>
            <CreationSection title={t('goals.makeItYours')} icon="settings">
              <PlanField label={t('goals.name')} value={name} onChange={setName} placeholder={fallbackName} />
              <PlanSwitch label={t('recurring.creation.reminder')} checked={reminder} onChange={setReminder} disabled={!remindersSupported} detail={remindersSupported ? t('recurring.creation.reminderDetail') : t('goals.reminder.enableOnPhone')} />
              {reminder && <PlanDateField label={t('goals.reminder.time')} mode="time" value={time} onChange={setTime} />}
            </CreationSection>
            <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 22, paddingHorizontal: 4 }}>{t('recurring.creation.alongside')}</Text>
          </>}
        </View>
        <PlanNotice message={error} retry={retry} />{!index && !error && <PlanLoading />}
      </ScrollView>
      <View style={[c.footer, { backgroundColor: p.card, borderColor: p.border }]}>
        <PlanNotice message={message || (surahs.length && days.length ? preview.error : undefined)} />
        {!surahs.length || !days.length ? <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('recurring.creation.chooseToContinue')}</Text> : null}
        <ReaderButton palette={p} selected disabled={!preview.plan || busy} onPress={() => step ? void save() : changeStep(1)}>{busy ? t('goals.saving') : step ? t('recurring.creation.create') : t('recurring.creation.reviewSchedule')}</ReaderButton>
      </View>
      {choosing && index && <SurahSelectionSheet index={index} selected={surahs} onClose={() => setChoosing(false)} onSave={value => { setSurahs(value); setChoosing(false); }} />}
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
