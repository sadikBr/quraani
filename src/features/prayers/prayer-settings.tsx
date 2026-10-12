import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Tabs } from '@/components/ui';
import { readerElevation, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { SettingsCard, SettingsCardHeading } from '@/features/quran-reader/components/reading/settings-ui';
import { PlanSwitch } from '@/features/plans/components';
import { formatList, t } from '@/i18n';
import { athanModule, athanPlaying, canScheduleExactAlarms, canUseFullScreenIntent, ignoresBatteryOptimizations, openBatteryOptimizationSettings, openExactAlarmSettings, openFullScreenIntentSettings, stopAthan } from './athan-native';
import { upcomingAthan } from './athan-screen';
import { effectiveAlert, hijriLabel, signedMinutes } from './format';
import { alertsSupported, athanSoundsSupported, fullAthanSupported, TEST_SECONDS, testPrayerAlert } from './notifications';
import { AdjustmentsSheet, MethodSheet, TakbirSheet, VoiceSheet } from './prayer-sheets';
import { usePrayers } from './provider';
import { BEFORE_MINUTES, HIJRI_OFFSET_LIMIT } from './settings';
import { dayOf, PRAYERS } from './times';
import { timesNotificationSupported } from './times-notification';

type Sheet = 'method' | 'adjust' | 'voice' | 'takbir';

/**
 * The prayer settings, in the settings' «الصلاة» tab: the alerts and the athan (with their test and
 * Android's conditions), the prayer times notification, and how the times are calculated. The
 * prayer times page itself keeps the place, the next prayer and the times.
 */
export function PrayerSettings() {
  const { ready } = usePrayers();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  if (!ready) return null;
  return <>
    <Alerts onVoice={() => setSheet('voice')} onTakbir={() => setSheet('takbir')} />
    {timesNotificationSupported && <TimesNotificationCard />}
    <Calculation onMethod={() => setSheet('method')} onAdjust={() => setSheet('adjust')} />
    {sheet === 'method' && <MethodSheet onClose={() => setSheet(null)} />}
    {sheet === 'adjust' && <AdjustmentsSheet onClose={() => setSheet(null)} />}
    {sheet === 'voice' && <VoiceSheet onClose={() => setSheet(null)} />}
    {sheet === 'takbir' && <TakbirSheet onClose={() => setSheet(null)} />}
  </>;
}

/** The prayer times kept in the phone's notifications (Android app). */
function TimesNotificationCard() {
  const { palette: p } = useReadingPreferences();
  // `revision` changes on each return to the app, as from the exact alarms setting.
  const { state, revision, setTimesNotification } = usePrayers();
  const [refused, setRefused] = useState(false);
  const exact = revision >= 0 && canScheduleExactAlarms();
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('prayers.timesNotification.title')} icon="bell-ring" palette={p} />
    <PlanSwitch label={t('prayers.timesNotification.label')} detail={t('prayers.timesNotification.detail')} checked={state.timesNotification}
      onChange={(on) => { setRefused(false); void setTimesNotification(on).then((done) => setRefused(!done)); }} />
    {refused && <Alert variant="destructive" palette={p}>{t('prayers.alerts.permissionDenied')}</Alert>}
    {!refused && state.timesNotification && !exact && <Alert palette={p} icon="alarm"
      action={<Button size="sm" variant="outline" palette={p} onPress={() => { openExactAlarmSettings(); }}>{t('prayers.reliability.exactAction')}</Button>}>{t('prayers.timesNotification.exact')}</Alert>}
  </SettingsCard>;
}

function Alerts({ onVoice, onTakbir }: { onVoice: () => void; onTakbir: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, alertIssue, setEnabled, update } = usePrayers();
  const kinds = PRAYERS.map((prayer) => effectiveAlert(state.alerts[prayer]));
  const before = state.before;
  // The length chosen last, given back when the reminder is turned on again.
  const [length, setLength] = useState(before || 10);
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('prayers.alerts.title')} detail={t('prayers.alerts.description')} icon="bell" palette={p} />
    {!alertsSupported ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('prayers.alerts.phoneOnly')}</Text> : <View style={{ gap: 16 }}>
      <PlanSwitch label={t('prayers.alerts.enable')} checked={state.enabled} onChange={(on) => void setEnabled(on)} />
      {state.enabled && !state.location && <Alert palette={p}>{t('prayers.alerts.noLocation')}</Alert>}
      {alertIssue && <Alert variant="destructive" palette={p}>{alertIssue === 'permission' ? t('prayers.alerts.permissionDenied') : alertIssue === 'sync' ? t('prayers.alerts.syncFailed') : t('prayers.alerts.unavailable')}</Alert>}
      {state.enabled && <>
        {athanSoundsSupported && <SettingRow label={t('prayers.alerts.takbirSound')} value={t(`prayers.takbirs.${state.takbir}.name`)} onPress={onTakbir} />}
        {fullAthanSupported && <SettingRow label={t('prayers.alerts.voice')} value={t(`prayers.voices.${state.voice}.name`)} onPress={onVoice} />}
        {fullAthanSupported && <SettingRow label={t('prayers.screen.title')} value={t(`prayers.screen.backgrounds.${state.screen.background}`)} onPress={() => router.push('/athan-screen')} />}
        <View style={{ gap: 10 }}>
          <PlanSwitch label={t('prayers.alerts.before')} checked={before > 0} onChange={(on) => update({ before: on ? length : 0 })} />
          {before > 0 && <Tabs palette={p} role="radio" label={t('prayers.alerts.beforeLength')} value={String(before)}
            onChange={(value) => { setLength(Number(value)); update({ before: Number(value) }); }}
            options={BEFORE_MINUTES.map((minutes) => ({ value: String(minutes), label: t('prayers.alerts.beforeChip', { count: minutes }) }))} />}
        </View>
        <AlertTest usesFull={kinds.includes('full')} />
        {athanModule && <Reliability usesFull={kinds.includes('full')} />}
      </>}
    </View>}
  </SettingsCard>;
}

/**
 * Sends an alert in a few seconds, the way it comes at prayer time (for the next prayer), so the
 * takbir, the whole athan and its screen over the lock screen can be checked without waiting.
 */
function AlertTest({ usesFull }: { usesFull: boolean }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const [status, setStatus] = useState<'sent' | 'failed' | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!fullAthanSupported) return;
    const timer = setInterval(() => setPlaying(athanPlaying()), 1000);
    return () => clearInterval(timer);
  }, []);
  const send = async (kind: 'notify' | 'takbir' | 'full') => {
    setStatus(null);
    const { prayer, time } = upcomingAthan(state);
    try {
      await testPrayerAlert(state, kind, prayer, time);
      setStatus('sent');
    } catch {
      setStatus('failed');
    }
  };
  return <View style={[s.section, { borderColor: p.border }]}>
    <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('prayers.test.heading')}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t(fullAthanSupported ? 'prayers.test.detailScreen' : 'prayers.test.detail', { seconds: TEST_SECONDS })}</Text>
    <View style={s.testButtons}>
      {athanSoundsSupported
        ? <Button variant="outline" palette={p} icon="bell-ring" onPress={() => void send('takbir')}>{t('prayers.test.takbir')}</Button>
        : <Button variant="outline" palette={p} icon="bell" onPress={() => void send('notify')}>{t('prayers.test.notify')}</Button>}
      {fullAthanSupported && (playing
        ? <Button variant="outline" palette={p} icon="stop" onPress={() => { stopAthan(); setPlaying(false); }}>{t('prayers.test.stop')}</Button>
        : <Button variant="outline" palette={p} icon="volume" onPress={() => void send('full')}>{t('prayers.test.full')}</Button>)}
    </View>
    {status === 'sent' && <Text accessibilityLiveRegion="polite" style={{ color: p.primary, fontSize: 13 }}>{t('prayers.test.sent', { seconds: TEST_SECONDS })}</Text>}
    {status === 'failed' && <Alert variant="destructive" palette={p}>{t('prayers.test.failed')}</Alert>}
    {usesFull && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('prayers.reliability.silent')}</Text>}
  </View>;
}

const readChecks = () => ({ exact: canScheduleExactAlarms(), battery: ignoresBatteryOptimizations(), screen: canUseFullScreenIntent() });

/** Android's conditions for alerts on time: exact alarms, the athan's screen, no battery restriction. */
function Reliability({ usesFull }: { usesFull: boolean }) {
  const { palette: p } = useReadingPreferences();
  const [checks, setChecks] = useState(readChecks);
  // The permissions change in the system settings.
  useEffect(() => {
    const timer = setInterval(() => setChecks((c) => {
      const n = readChecks();
      return n.exact === c.exact && n.battery === c.battery && n.screen === c.screen ? c : n;
    }), 1500);
    return () => clearInterval(timer);
  }, []);
  const screen = checks.screen || !usesFull;
  return <View style={[s.section, { borderColor: p.border }]}>
    <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('prayers.reliability.title')}</Text>
    {!checks.exact && <Alert palette={p} icon="alarm" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openExactAlarmSettings(); }}>{t('prayers.reliability.exactAction')}</Button>}>{t('prayers.reliability.exact')}</Alert>}
    {!screen && <Alert palette={p} icon="volume" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openFullScreenIntentSettings(); }}>{t('prayers.reliability.screenAction')}</Button>}>{t('prayers.reliability.screen')}</Alert>}
    {!checks.battery && <Alert palette={p} icon="battery" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openBatteryOptimizationSettings(); }}>{t('prayers.reliability.batteryAction')}</Button>}>{t('prayers.reliability.battery')}</Alert>}
    {checks.exact && checks.battery && screen && <View style={s.ok}><ReaderIcon name="done" color={p.primary} size={16} /><Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{t('prayers.reliability.ok')}</Text></View>}
  </View>;
}

function Calculation({ onMethod, onAdjust }: { onMethod: () => void; onAdjust: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const adjusted = PRAYERS.filter((prayer) => state.adjustments[prayer]);
  const today = dayOf(new Date());
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('prayers.calculation.title')} detail={t('prayers.calculation.description')} icon="clock" palette={p} />
    <View style={{ gap: 16 }}>
      <SettingRow label={t('prayers.calculation.method')} value={t(`prayers.methods.${state.method}.name`)} onPress={onMethod} />
      <View style={{ gap: 8 }}>
        <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{t('prayers.calculation.madhab')}</Text>
        <Tabs palette={p} role="radio" label={t('prayers.calculation.madhab')} value={state.madhab} onChange={(madhab) => update({ madhab })}
          options={(['shafi', 'hanafi'] as const).map((value) => ({ value, label: t(`prayers.calculation.madhabs.${value}`) }))} />
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t(`prayers.calculation.madhabDetail.${state.madhab}`)}</Text>
      </View>
      <SettingRow label={t('prayers.calculation.adjustments')} onPress={onAdjust}
        value={adjusted.length ? formatList(adjusted.map((prayer) => t('prayers.calculation.adjustmentItem', { prayer: t(`prayers.names.${prayer}`), minutes: signedMinutes(state.adjustments[prayer]) }))) : t('prayers.calculation.adjustmentsNone')} />
      <View style={{ gap: 8 }}>
        <View style={s.stepperRow}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{t('prayers.calculation.hijri')}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{hijriLabel(today, state.hijriOffset)}</Text>
          </View>
          <Button size="sm" variant="outline" palette={p} icon="minus" label={t('prayers.calculation.hijriEarlier')} disabled={state.hijriOffset <= -HIJRI_OFFSET_LIMIT}
            onPress={() => update({ hijriOffset: state.hijriOffset - 1 })} />
          <Button size="sm" variant="outline" palette={p} icon="plus" label={t('prayers.calculation.hijriLater')} disabled={state.hijriOffset >= HIJRI_OFFSET_LIMIT}
            onPress={() => update({ hijriOffset: state.hijriOffset + 1 })} />
        </View>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('prayers.calculation.hijriDetail')}</Text>
      </View>
    </View>
  </SettingsCard>;
}

/** A setting that opens a sheet: its name, the current choice, and a chevron. */
function SettingRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress}
    style={({ pressed }) => [s.settingRow, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background }, readerElevation(1, p)]}>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{value}</Text>
    </View>
    <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
  </Pressable>;
}

const s = StyleSheet.create({
  section: { gap: 10, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  testButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: readerShape.control },
});
