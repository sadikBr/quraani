import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Row, RowGroup, Section } from '@/components/craft/page';
import { Alert, Button, SwitchMark, Tabs } from '@/components/ui';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { formatList, t } from '@/i18n';
import { pinWidget, type WidgetKind, athanModule, athanPlaying, canScheduleExactAlarms, canUseFullScreenIntent, ignoresBatteryOptimizations, openBatteryOptimizationSettings, openExactAlarmSettings, openFullScreenIntentSettings, stopAthan } from './athan-native';
import { upcomingAthan } from './athan-screen';
import { alertIcons, effectiveAlert, hijriLabel, signedMinutes } from './format';
import { alertsSupported, athanSoundsSupported, fullAthanSupported, TEST_SECONDS, testPrayerAlert } from './notifications';
import { AdjustmentsSheet, AlertSheet, MECCA, MethodSheet, TakbirSheet, VoiceSheet } from './prayer-sheets';
import { usePrayers } from './provider';
import { BEFORE_MINUTES, HIJRI_OFFSET_LIMIT } from './settings';
import { SunMark } from './sheet';
import { dayOf, dayTimes, PRAYERS, type PrayerId } from './times';
import { timesNotificationSupported } from './times-notification';

type Sheet = 'method' | 'adjust' | 'voice' | 'takbir' | { alert: PrayerId };

/**
 * The prayer settings, in the settings' «الصلاة» tab: the alerts (each prayer's, their sounds, the
 * reminder before, a test and Android's conditions), the prayer times notification, and how the
 * times are calculated. Sections titled in Naskh, their settings as rows on cards. The prayer
 * times page itself keeps the place, the next prayer and the times.
 */
export function PrayerSettings() {
  const { ready } = usePrayers();
  const [sheet, setSheet] = useState<Sheet | null>(null);
  if (!ready) return null;
  return <View style={s.page}>
    <Alerts onVoice={() => setSheet('voice')} onTakbir={() => setSheet('takbir')} onAlert={(prayer) => setSheet({ alert: prayer })} />
    {timesNotificationSupported && <TimesNotification />}
    {timesNotificationSupported && <HomeWidget />}
    <Calculation onMethod={() => setSheet('method')} onAdjust={() => setSheet('adjust')} />
    {sheet === 'method' && <MethodSheet onClose={() => setSheet(null)} />}
    {sheet === 'adjust' && <AdjustmentsSheet onClose={() => setSheet(null)} />}
    {sheet === 'voice' && <VoiceSheet onClose={() => setSheet(null)} />}
    {sheet === 'takbir' && <TakbirSheet onClose={() => setSheet(null)} />}
    {typeof sheet === 'object' && sheet && <AlertSheet prayer={sheet.alert} onClose={() => setSheet(null)} />}
  </View>;
}

/** A section with a sentence under its title. */
function Part({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const { palette: p } = useReadingPreferences();
  return <Section title={title} palette={p}>
    {!!description && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, marginTop: -8 }}>{description}</Text>}
    {children}
  </Section>;
}

/** A note under a card. */
function Note({ children }: { children: string }) {
  const { palette: p } = useReadingPreferences();
  return <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, paddingHorizontal: 4, marginTop: -4 }}>{children}</Text>;
}

/**
 * The app's widgets for the phone's home screen (Android app): the launcher is asked to add the
 * one chosen; where it cannot be asked, the way to add it by hand is told.
 */
function HomeWidget() {
  const { palette: p } = useReadingPreferences();
  const [manual, setManual] = useState(false);
  const add = (kind: WidgetKind) => setManual(!pinWidget(kind));
  return <Part title={t('prayers.widget.title')}>
    <RowGroup palette={p}>
      <Row palette={p} icon="mosque" title={t('prayers.widget.add')} detail={t('prayers.widget.detail')} onPress={() => add('prayer')} />
      <Row palette={p} icon="clock" title={t('prayers.widget.small')} detail={t('prayers.widget.smallDetail')} onPress={() => add('prayer-small')} />
      <Row palette={p} icon="book" title={t('prayers.widget.wird')} detail={t('prayers.widget.wirdDetail')} onPress={() => add('wird')} />
    </RowGroup>
    {manual && <Alert palette={p}>{t('prayers.widget.manual')}</Alert>}
  </Part>;
}

/** The prayer times kept in the phone's notifications (Android app). */
function TimesNotification() {
  const { palette: p } = useReadingPreferences();
  // `revision` changes on each return to the app, as from the exact alarms setting.
  const { state, revision, setTimesNotification } = usePrayers();
  const [refused, setRefused] = useState(false);
  const exact = revision >= 0 && canScheduleExactAlarms();
  const on = state.timesNotification;
  return <Part title={t('prayers.timesNotification.title')}>
    <RowGroup palette={p}>
      <Row palette={p} icon="bell-ring" role="switch" selected={on} title={t('prayers.timesNotification.label')} detail={t('prayers.timesNotification.detail')}
        trailing={<SwitchMark checked={on} palette={p} />} onPress={() => { setRefused(false); void setTimesNotification(!on).then((done) => setRefused(!done)); }} />
    </RowGroup>
    {refused && <Alert variant="destructive" palette={p}>{t('prayers.alerts.permissionDenied')}</Alert>}
    {!refused && on && !exact && <Alert palette={p} icon="alarm"
      action={<Button size="sm" variant="outline" palette={p} onPress={() => { openExactAlarmSettings(); }}>{t('prayers.reliability.exactAction')}</Button>}>{t('prayers.timesNotification.exact')}</Alert>}
  </Part>;
}

function Alerts({ onVoice, onTakbir, onAlert }: { onVoice: () => void; onTakbir: () => void; onAlert: (prayer: PrayerId) => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, alertIssue, setEnabled, update } = usePrayers();
  const kinds = PRAYERS.map((prayer) => effectiveAlert(state.alerts[prayer]));
  const before = state.before;
  // The length chosen last, given back when the reminder is turned on again.
  const [length, setLength] = useState(before || 10);
  // The sun's place at each time, at the chosen place (or Mecca's, before one is chosen).
  const times = dayTimes(state.location ?? MECCA, dayOf(new Date()), state);
  const enabled = alertsSupported && state.enabled;
  return <>
    <Part title={t('prayers.alerts.title')} description={t('prayers.alerts.description')}>
      {!alertsSupported ? <Alert palette={p} icon="bell-off">{t('prayers.alerts.phoneOnly')}</Alert> : <>
        <RowGroup palette={p}>
          <Row palette={p} icon="bell" role="switch" selected={state.enabled} title={t('prayers.alerts.enable')}
            trailing={<SwitchMark checked={state.enabled} palette={p} />} onPress={() => void setEnabled(!state.enabled)} />
        </RowGroup>
        {state.enabled && !state.location && <Alert palette={p}>{t('prayers.alerts.noLocation')}</Alert>}
        {alertIssue && <Alert variant="destructive" palette={p}>{alertIssue === 'permission' ? t('prayers.alerts.permissionDenied') : alertIssue === 'sync' ? t('prayers.alerts.syncFailed') : t('prayers.alerts.unavailable')}</Alert>}
        {state.enabled && <>
          <RowGroup palette={p}>
            {PRAYERS.map((prayer, i) => {
              const kind = kinds[i], name = t(`prayers.names.${prayer}`), alert = t(`prayers.alerts.kinds.${kind}`);
              return <Row key={prayer} palette={p} title={name} label={t('prayers.today.alertLabel', { prayer: name, alert })} onPress={() => onAlert(prayer)} chevron
                leading={<SunMark times={times} prayer={prayer} palette={p} tone={kind === 'off' ? p.mutedForeground : p.ornament} />}
                trailing={<View style={s.kind}>
                  <Text numberOfLines={1} style={{ flexShrink: 1, color: kind === 'off' ? p.mutedForeground : p.foreground, fontSize: 14, fontWeight: '500' }}>{alert}</Text>
                  <ReaderIcon name={alertIcons[kind]} color={kind === 'off' ? p.mutedForeground : p.ornament} size={18} />
                </View>} />;
            })}
          </RowGroup>
          {(athanSoundsSupported || fullAthanSupported) && <RowGroup palette={p}>
            {athanSoundsSupported && <Row palette={p} icon="bell-ring" title={t('prayers.alerts.takbirSound')} detail={t(`prayers.takbirs.${state.takbir}.name`)} onPress={onTakbir} />}
            {fullAthanSupported && <Row palette={p} icon="volume" title={t('prayers.alerts.voice')} detail={t(`prayers.voices.${state.voice}.name`)} onPress={onVoice} />}
            {fullAthanSupported && <Row palette={p} icon="mosque" role="link" title={t('prayers.screen.title')} detail={t(`prayers.screen.backgrounds.${state.screen.background}`)} onPress={() => router.push('/athan-screen')} />}
          </RowGroup>}
          <RowGroup palette={p}>
            <View>
              <Row palette={p} icon="alarm" role="switch" selected={before > 0} title={t('prayers.alerts.before')}
                trailing={<SwitchMark checked={before > 0} palette={p} />} onPress={() => update({ before: before > 0 ? 0 : length })} />
              {before > 0 && <View style={s.lengths}>
                <Tabs palette={p} role="radio" label={t('prayers.alerts.beforeLength')} value={String(before)}
                  onChange={(value) => { setLength(Number(value)); update({ before: Number(value) }); }}
                  options={BEFORE_MINUTES.map((minutes) => ({ value: String(minutes), label: t('prayers.alerts.beforeChip', { count: minutes }) }))} />
              </View>}
            </View>
          </RowGroup>
        </>}
      </>}
    </Part>
    {enabled && <AlertTest usesFull={kinds.includes('full')} />}
    {enabled && athanModule && <Reliability usesFull={kinds.includes('full')} />}
  </>;
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
  return <Part title={t('prayers.test.heading')} description={t(fullAthanSupported ? 'prayers.test.detailScreen' : 'prayers.test.detail', { seconds: TEST_SECONDS })}>
    <View style={s.testButtons}>
      {athanSoundsSupported
        ? <Button variant="outline" palette={p} icon="bell-ring" onPress={() => void send('takbir')}>{t('prayers.test.takbir')}</Button>
        : <Button variant="outline" palette={p} icon="bell" onPress={() => void send('notify')}>{t('prayers.test.notify')}</Button>}
      {fullAthanSupported && (playing
        ? <Button palette={p} icon="stop" onPress={() => { stopAthan(); setPlaying(false); }}>{t('prayers.test.stop')}</Button>
        : <Button variant="outline" palette={p} icon="volume" onPress={() => void send('full')}>{t('prayers.test.full')}</Button>)}
    </View>
    {status === 'sent' && <View accessibilityLiveRegion="polite" style={s.ok}>
      <ReaderIcon name="done" color={p.success} size={16} />
      <Text style={{ flex: 1, color: p.foreground, fontSize: 13, lineHeight: 20 }}>{t('prayers.test.sent', { seconds: TEST_SECONDS })}</Text>
    </View>}
    {status === 'failed' && <Alert variant="destructive" palette={p}>{t('prayers.test.failed')}</Alert>}
    {usesFull && <Note>{t('prayers.reliability.silent')}</Note>}
  </Part>;
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
  return <Part title={t('prayers.reliability.title')}>
    {!checks.exact && <Alert palette={p} icon="alarm" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openExactAlarmSettings(); }}>{t('prayers.reliability.exactAction')}</Button>}>{t('prayers.reliability.exact')}</Alert>}
    {!screen && <Alert palette={p} icon="volume" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openFullScreenIntentSettings(); }}>{t('prayers.reliability.screenAction')}</Button>}>{t('prayers.reliability.screen')}</Alert>}
    {!checks.battery && <Alert palette={p} icon="battery" action={<Button size="sm" variant="outline" palette={p} onPress={() => { openBatteryOptimizationSettings(); }}>{t('prayers.reliability.batteryAction')}</Button>}>{t('prayers.reliability.battery')}</Alert>}
    {checks.exact && checks.battery && screen && <RowGroup palette={p}>
      <Row palette={p} title={t('prayers.reliability.ok')} leading={<View style={[s.check, { borderColor: p.success }]}><ReaderIcon name="done" color={p.success} size={18} /></View>} />
    </RowGroup>}
  </Part>;
}

function Calculation({ onMethod, onAdjust }: { onMethod: () => void; onAdjust: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const adjusted = PRAYERS.filter((prayer) => state.adjustments[prayer]);
  const today = dayOf(new Date());
  return <Part title={t('prayers.calculation.title')} description={t('prayers.calculation.description')}>
    <RowGroup palette={p}>
      <Row palette={p} icon="mosque" title={t('prayers.calculation.method')} detail={t(`prayers.methods.${state.method}.name`)} onPress={onMethod} />
      <View>
        <Row palette={p} icon="sun" title={t('prayers.calculation.madhab')} detail={t(`prayers.calculation.madhabDetail.${state.madhab}`)} />
        <View style={s.madhab}>
          <Tabs palette={p} role="radio" label={t('prayers.calculation.madhab')} value={state.madhab} onChange={(madhab) => update({ madhab })}
            options={(['shafi', 'hanafi'] as const).map((value) => ({ value, label: t(`prayers.calculation.madhabs.${value}`) }))} />
        </View>
      </View>
      <Row palette={p} icon="clock" title={t('prayers.calculation.adjustments')} onPress={onAdjust}
        detail={adjusted.length ? formatList(adjusted.map((prayer) => t('prayers.calculation.adjustmentItem', { prayer: t(`prayers.names.${prayer}`), minutes: signedMinutes(state.adjustments[prayer]) }))) : t('prayers.calculation.adjustmentsNone')} />
      <Row palette={p} icon="moon-star" title={t('prayers.calculation.hijri')} detail={hijriLabel(today, state.hijriOffset)}
        trailing={<View style={s.steps}>
          <Button size="sm" variant="outline" palette={p} icon="minus" label={t('prayers.calculation.hijriEarlier')} disabled={state.hijriOffset <= -HIJRI_OFFSET_LIMIT}
            onPress={() => update({ hijriOffset: state.hijriOffset - 1 })} />
          <Button size="sm" variant="outline" palette={p} icon="plus" label={t('prayers.calculation.hijriLater')} disabled={state.hijriOffset >= HIJRI_OFFSET_LIMIT}
            onPress={() => update({ hijriOffset: state.hijriOffset + 1 })} />
        </View>} />
    </RowGroup>
    <Note>{t('prayers.calculation.hijriDetail')}</Note>
  </Part>;
}

const s = StyleSheet.create({
  page: { gap: 30, paddingTop: 4 },
  kind: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, maxWidth: '55%' },
  lengths: { paddingHorizontal: 14, paddingBottom: 14 },
  madhab: { paddingHorizontal: 14, paddingBottom: 14, marginTop: -4 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ok: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  check: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
