import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Chip, Tabs } from '@/components/ui';
import { readerElevation, readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { SettingsCard, SettingsCardHeading } from '@/features/quran-reader/components/reading/settings-ui';
import { PlanSwitch } from '@/features/plans/components';
import { formatDate, formatList, t } from '@/i18n';
import { athanModule, athanPlaying, canScheduleExactAlarms, canUseFullScreenIntent, ignoresBatteryOptimizations, openBatteryOptimizationSettings, openExactAlarmSettings, openFullScreenIntentSettings, stopAthan } from './athan-native';
import { alertsSupported, athanSoundsSupported, fullAthanSupported, TEST_SECONDS, testPrayerAlert } from './notifications';
import { placeName } from './place';
import { usePrayers, useNow } from './provider';
import { BEFORE_OPTIONS, HIJRI_OFFSET_LIMIT } from './settings';
import { clock, countdown, dayOf, dayTimes, PRAYERS, prayerWindow, type PrayerId } from './times';
import { AdjustmentsSheet, AlertSheet, LocationSheet, MethodSheet, TakbirSheet, useLocate, VoiceSheet } from './prayer-sheets';
import { alertIcons, effectiveAlert, hijriLabel, signedMinutes } from './format';
import { timesNotificationSupported } from './times-notification';
import { upcomingAthan } from './athan-screen';

type Sheet = 'location' | 'method' | 'adjust' | 'voice' | 'takbir' | { alert: PrayerId };
/** Prayer times at the chosen place, the next prayer, and the alerts and athan. */
export function PrayersScreen() {
  const { palette: p } = useReadingPreferences();
  const { state, ready, error } = usePrayers();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.backToReading')} onPress={() => router.dismissTo('/')}>{t('plans.list.mushaf')}</Button>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('prayers.title')}</Text>
      {error && <Alert variant="destructive" palette={p}>{t('prayers.storageError')}</Alert>}
      {!ready ? null : state.location ? <>
        <LocationRow onPress={() => setSheet('location')} />
        <NextPrayer />
        <TodayTimes onAlert={(prayer) => setSheet({ alert: prayer })} />
      </> : <LocationSetup onChoose={() => setSheet('location')} />}
      {ready && <Alerts onVoice={() => setSheet('voice')} onTakbir={() => setSheet('takbir')} />}
      {ready && <Calculation onMethod={() => setSheet('method')} onAdjust={() => setSheet('adjust')} />}
      <Pressable accessibilityRole="link" onPress={() => router.push('/credits')} style={({ pressed }) => [s.creditsLink, { opacity: pressed ? 0.6 : 1 }]}>
        <Text style={{ color: p.mutedForeground, fontSize: 13, textDecorationLine: 'underline' }}>{t('prayers.creditsLink')}</Text>
      </Pressable>
    </ScrollView>
    {sheet === 'location' && <LocationSheet onClose={() => setSheet(null)} />}
    {sheet === 'method' && <MethodSheet onClose={() => setSheet(null)} />}
    {sheet === 'adjust' && <AdjustmentsSheet onClose={() => setSheet(null)} />}
    {sheet === 'voice' && <VoiceSheet onClose={() => setSheet(null)} />}
    {sheet === 'takbir' && <TakbirSheet onClose={() => setSheet(null)} />}
    {typeof sheet === 'object' && sheet && <AlertSheet prayer={sheet.alert} onClose={() => setSheet(null)} />}
  </SafeAreaView>;
}

function LocationSetup({ onChoose }: { onChoose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const locate = useLocate();
  return <View style={[s.setup, { borderColor: p.border }]}>
    <View style={[s.setupIcon, { backgroundColor: p.secondary }]}><ReaderIcon name="map-pin" color={p.primary} size={22} /></View>
    <Text style={{ color: p.foreground, fontSize: 17, fontWeight: '600', textAlign: 'center' }}>{t('prayers.location.emptyTitle')}</Text>
    <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 320 }}>{t('prayers.location.emptyText')}</Text>
    <View style={s.setupActions}>
      <Button palette={p} icon="locate" block disabled={locate.busy} onPress={() => void locate.run()}>{locate.busy ? t('prayers.location.locating') : t('prayers.location.useMine')}</Button>
      <Button palette={p} variant="outline" icon="search" block onPress={onChoose}>{t('prayers.location.chooseCity')}</Button>
    </View>
    {!!locate.message && <Alert variant="destructive" palette={p}>{locate.message}</Alert>}
  </View>;
}

function LocationRow({ onPress }: { onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const place = state.location ? placeName(state.location) : '';
  return <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.location.changeLabel', { place })} onPress={onPress}
    style={({ pressed }) => [s.locationRow, { opacity: pressed ? 0.7 : 1 }]}>
    <ReaderIcon name="map-pin" color={p.primary} size={18} />
    <Text numberOfLines={1} style={{ flexShrink: 1, color: p.foreground, fontSize: 16, fontWeight: '500' }}>{place}</Text>
    <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('prayers.location.change')}</Text>
  </Pressable>;
}

/** The next time and a live countdown, with today's Hijri and Gregorian dates. */
function NextPrayer() {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const now = useNow(1000);
  if (!state.location) return null;
  const { next } = prayerWindow(state.location, now, state);
  if (!next) return null;
  const today = dayOf(now);
  const name = t(`prayers.names.${next.prayer}`), time = clock(next.at), left = countdown(now, next.at);
  return <View style={[s.hero, { backgroundColor: p.card, borderColor: p.border }, readerElevation(2, p)]}>
    <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{hijriLabel(today, state.hijriOffset)} · {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
    <View accessible accessibilityLabel={t('prayers.next.spoken', { prayer: name, time, countdown: left })} style={{ gap: 4 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{next.prayer === 'sunrise' ? t('prayers.next.sunriseLabel') : t('prayers.next.label')}</Text>
      <View style={s.heroRow}>
        <Text style={{ color: p.foreground, fontSize: 30, fontWeight: '700' }}>{name}</Text>
        <Text style={{ color: p.foreground, fontSize: 30, fontWeight: '600' }}>{time}</Text>
      </View>
      <View style={s.heroRow}>
        <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{t('prayers.next.in')}</Text>
        <Text style={{ color: p.primary, fontSize: 20, fontWeight: '600' }}>{left}</Text>
      </View>
    </View>
  </View>;
}

function TodayTimes({ onAlert }: { onAlert: (prayer: PrayerId) => void }) {
  const { palette: p } = useReadingPreferences();
  const { state } = usePrayers();
  const now = useNow(30_000);
  if (!state.location) return null;
  const today = dayOf(now);
  const times = dayTimes(state.location, today, state);
  const { current } = prayerWindow(state.location, now, state);
  return <View style={{ gap: 10 }}>
    <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 18, fontWeight: '600' }}>{t('prayers.today.title')}</Text>
    <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
      {PRAYERS.map((prayer, i) => {
        const isCurrent = current?.day === today && current.prayer === prayer;
        // With alerts off, each bell still shows its setting, dimmed.
        const kind = effectiveAlert(state.alerts[prayer]), on = state.enabled && kind !== 'off';
        const alert = state.enabled ? t(`prayers.alerts.kinds.${kind}`) : t('prayers.today.alertsOff'), name = t(`prayers.names.${prayer}`);
        return <View key={prayer} style={[s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, isCurrent && { backgroundColor: p.accent }]}>
          <View accessible accessibilityLabel={t('prayers.today.row', { prayer: name, time: clock(times[prayer]), alert })} style={s.rowText}>
            <Text style={{ flex: 1, color: prayer === 'sunrise' ? p.mutedForeground : p.foreground, fontSize: 16, fontWeight: isCurrent ? '700' : '500' }}>{name}</Text>
            {isCurrent && <Text style={{ color: p.primary, fontSize: 12, fontWeight: '500' }}>{t('prayers.today.current')}</Text>}
            <Text style={{ color: p.foreground, fontSize: 17, fontWeight: isCurrent ? '700' : '500' }}>{clock(times[prayer])}</Text>
          </View>
          {alertsSupported && <Pressable accessibilityRole="button" accessibilityLabel={t('prayers.today.alertLabel', { prayer: name, alert })} hitSlop={4} onPress={() => onAlert(prayer)}
            style={({ pressed }) => [s.alertButton, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
            <ReaderIcon name={alertIcons[kind]} color={on ? p.primary : p.mutedForeground} size={20} />
          </Pressable>}
        </View>;
      })}
    </View>
    {timesNotificationSupported && <TimesNotificationSwitch />}
  </View>;
}

/** The prayer times kept in the phone's notifications (Android app). */
function TimesNotificationSwitch() {
  const { palette: p } = useReadingPreferences();
  // `revision` changes on each return to the app, as from the exact alarms setting.
  const { state, revision, setTimesNotification } = usePrayers();
  const [refused, setRefused] = useState(false);
  const exact = revision >= 0 && canScheduleExactAlarms();
  const note = refused || (state.timesNotification && !exact);
  return <View style={[s.timesNotification, { borderColor: p.border, backgroundColor: p.card }, note && { paddingBottom: 12 }]}>
    <PlanSwitch label={t('prayers.timesNotification.label')} detail={t('prayers.timesNotification.detail')} checked={state.timesNotification}
      onChange={(on) => { setRefused(false); void setTimesNotification(on).then((done) => setRefused(!done)); }} />
    {refused && <Alert variant="destructive" palette={p}>{t('prayers.alerts.permissionDenied')}</Alert>}
    {!refused && state.timesNotification && !exact && <Alert palette={p} icon="alarm"
      action={<Button size="sm" variant="outline" palette={p} onPress={() => { openExactAlarmSettings(); }}>{t('prayers.reliability.exactAction')}</Button>}>{t('prayers.timesNotification.exact')}</Alert>}
  </View>;
}

function Alerts({ onVoice, onTakbir }: { onVoice: () => void; onTakbir: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, alertIssue, setEnabled, update } = usePrayers();
  const kinds = PRAYERS.map((prayer) => effectiveAlert(state.alerts[prayer]));
  const before = state.before;
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
        <View style={{ gap: 8 }}>
          <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{t('prayers.alerts.before')}</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel={t('prayers.alerts.before')} style={s.chips}>
            {BEFORE_OPTIONS.map((minutes) => <Chip key={minutes} accessibilityRole="radio" palette={p} selected={before === minutes}
              label={minutes ? t('prayers.alerts.beforeChip', { count: minutes }) : t('prayers.alerts.beforeNone')} onPress={() => update({ before: minutes })} />)}
          </View>
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
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 20 },
  setup: { alignItems: 'center', gap: 10, padding: 20, borderWidth: 1, borderStyle: 'dashed', borderRadius: readerShape.lg },
  setupIcon: { width: 48, height: 48, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  setupActions: { alignSelf: 'stretch', gap: 8, marginTop: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', marginTop: -8 },
  hero: { borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth, padding: 20, gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  timesNotification: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingHorizontal: 16, paddingVertical: 4, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingStart: 16, paddingEnd: 6, minHeight: 56 },
  rowText: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  alertButton: { width: 44, height: 44, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  section: { gap: 10, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  testButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  creditsLink: { alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderRadius: readerShape.control },
});
