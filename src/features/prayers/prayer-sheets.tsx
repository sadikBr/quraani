import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { GestureDetector } from '@/components/swipe-to-close';
import { Alert, Button } from '@/components/ui';
import { readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { t } from '@/i18n';
import { CITIES, type City } from './cities';
import { LocateError, locate } from './location';
import { athanSoundsSupported, fullAthanSupported } from './notifications';
import { cityName, countryName, placeName } from './place';
import { playPreview, stopPreview, usePreview } from './preview';
import { usePrayers } from './provider';
import { ADJUSTMENT_LIMIT, TAKBIRS, VOICES, type AlertKind } from './settings';
import { PrayerSheet, SheetOption, sheetStyles } from './sheet';
import { effectiveAlert, signedMinutes } from './format';
import { METHOD_IDS, PRAYERS, type PrayerId } from './times';

/** Finds the phone's position and makes it the place; `message` explains a failure. */
export function useLocate(onDone?: () => void) {
  const { update } = usePrayers();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async () => {
    setBusy(true); setMessage('');
    try {
      update({ location: await locate() });
      onDone?.();
    } catch (error) {
      setMessage(error instanceof LocateError && error.issue === 'denied' ? t('prayers.location.denied') : t('prayers.location.failed'));
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, run };
}

export function LocationSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const [query, setQuery] = useState('');
  const locating = useLocate(onClose);
  const cities = useMemo(() => {
    const q = normalizeArabicSearch(query.trim()), latin = query.trim().toLowerCase();
    if (!q && !latin) return CITIES;
    return CITIES.filter((city) => normalizeArabicSearch(`${cityName(city.id)} ${countryName(city.id)}`).includes(q) || (!!latin && city.id.toLowerCase().includes(latin)));
  }, [query]);
  const choose = (city: City) => {
    update({ location: { source: 'city', city: city.id, latitude: city.latitude, longitude: city.longitude, updated: new Date().toISOString() } });
    onClose();
  };
  const selected = state.location?.source === 'city' ? state.location.city : undefined;
  return <PrayerSheet tall title={t('prayers.location.sheetTitle')} subtitle={t('prayers.location.sheetSubtitle')} onClose={onClose}
    header={<View style={{ gap: 10 }}>
      <Button palette={p} variant="outline" icon="locate" block disabled={locating.busy} onPress={() => void locating.run()}>
        {locating.busy ? t('prayers.location.locating') : t('prayers.location.useMine')}
      </Button>
      {state.location?.source === 'gps' && !locating.busy && <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t('prayers.location.gpsDetail', { place: placeName(state.location) })}</Text>}
      {!!locating.message && <Alert variant="destructive" palette={p}>{locating.message}</Alert>}
      <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('prayers.location.searchLabel')} placeholder={t('prayers.location.searchPlaceholder')} />
    </View>}
    body={(swipe) => <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={cities} keyExtractor={(city) => city.id} extraData={selected}
      keyboardShouldPersistTaps="handled" initialNumToRender={16} windowSize={7} contentContainerStyle={sheetStyles.list}
      accessibilityRole="radiogroup" accessibilityLabel={t('prayers.location.sheetTitle')}
      ListEmptyComponent={<Text style={{ color: p.mutedForeground, textAlign: 'center', padding: 16 }}>{t('prayers.location.empty')}</Text>}
      renderItem={({ item, index }) => {
        const section = index === 0 || cities[index - 1].country === 'MA' !== (item.country === 'MA');
        return <View>
          {section && <Text accessibilityRole="header" style={[s.section, { color: p.mutedForeground }]}>{item.country === 'MA' ? t('prayers.location.morocco') : t('prayers.location.others')}</Text>}
          <SheetOption title={cityName(item.id)} detail={item.country === 'MA' ? undefined : countryName(item.id)} checked={item.id === selected}
            first={section} last={index === cities.length - 1 || (cities[index + 1].country === 'MA') !== (item.country === 'MA')} onPress={() => choose(item)} />
        </View>;
      }} /></GestureDetector>} />;
}

const ALERT_ORDER: AlertKind[] = ['off', 'notify', 'takbir', 'full'];

export function AlertSheet({ prayer, onClose }: { prayer: PrayerId; onClose: () => void }) {
  const { state, setAlert, alertIssue } = usePrayers();
  const { palette: p } = useReadingPreferences();
  const [failed, setFailed] = useState(false);
  // No takbir or athan at sunrise (it only ends the time of Fajr), nor on iOS, which cannot play the clips.
  const kinds = prayer === 'sunrise' || !athanSoundsSupported ? ALERT_ORDER.slice(0, 2) : ALERT_ORDER;
  const current = effectiveAlert(state.alerts[prayer]);
  const choose = async (kind: AlertKind) => {
    setFailed(false);
    if (await setAlert(prayer, kind)) onClose(); else setFailed(true);
  };
  return <PrayerSheet title={t('prayers.alerts.sheetTitle', { prayer: t(`prayers.prayerOf.${prayer}`) })} onClose={onClose}>
    {!state.enabled && <Alert palette={p}>{t('prayers.alerts.offNote')}</Alert>}
    <View accessibilityRole="radiogroup">
      {kinds.map((kind, i) => <SheetOption key={kind} title={t(`prayers.alerts.kinds.${kind}`)} checked={current === kind} first={i === 0} last={i === kinds.length - 1}
        detail={kind === 'full' && !fullAthanSupported ? t('prayers.alerts.details.fullFallback') : t(`prayers.alerts.details.${kind}`)} onPress={() => void choose(kind)} />)}
    </View>
    {failed && <Alert variant="destructive" palette={p}>{alertIssue === 'permission' ? t('prayers.alerts.permissionDenied') : t('prayers.alerts.unavailable')}</Alert>}
  </PrayerSheet>;
}

/** A choice with a button to listen to it. */
function ListenButton({ name, playing, onPress }: { name: string; playing: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('prayers.voices.stopLabel', { voice: name }) : t('prayers.voices.playLabel', { voice: name })}
    onPress={onPress} hitSlop={4} style={({ pressed }) => [s.play, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background }]}>
    <ReaderIcon name={playing ? 'stop' : 'play'} color={p.primary} size={18} />
  </Pressable>;
}

export function VoiceSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const preview = usePreview();
  const close = () => { stopPreview(); onClose(); };
  return <PrayerSheet tall title={t('prayers.voices.title')} subtitle={t('prayers.voices.subtitle')} onClose={close}>
    <View accessibilityRole="radiogroup">
      {VOICES.map((voice, i) => {
        const name = t(`prayers.voices.${voice}.name`), key = `athan:${voice}` as const, playing = preview.playing === key;
        return <SheetOption key={voice} title={name} detail={t(`prayers.voices.${voice}.source`)} checked={state.voice === voice} first={i === 0} last={i === VOICES.length - 1}
          onPress={() => update({ voice })}
          trailing={<ListenButton name={name} playing={playing} onPress={() => { if (playing) stopPreview(); else void playPreview(key); }} />} />;
      })}
    </View>
    {preview.error && <Alert variant="destructive" palette={p}>{t('prayers.voices.playFailed')}</Alert>}
  </PrayerSheet>;
}

export function TakbirSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const preview = usePreview();
  const close = () => { stopPreview(); onClose(); };
  return <PrayerSheet tall title={t('prayers.takbirs.title')} subtitle={t('prayers.takbirs.subtitle')} onClose={close}>
    <View accessibilityRole="radiogroup">
      {TAKBIRS.map((takbir, i) => {
        const name = t(`prayers.takbirs.${takbir}.name`), key = `takbir:${takbir}` as const, playing = preview.playing === key;
        return <SheetOption key={takbir} title={name} detail={t(`prayers.takbirs.${takbir}.source`)} checked={state.takbir === takbir} first={i === 0} last={i === TAKBIRS.length - 1}
          onPress={() => update({ takbir })}
          trailing={<ListenButton name={name} playing={playing} onPress={() => { if (playing) stopPreview(); else void playPreview(key); }} />} />;
      })}
    </View>
    {preview.error && <Alert variant="destructive" palette={p}>{t('prayers.voices.playFailed')}</Alert>}
  </PrayerSheet>;
}

export function MethodSheet({ onClose }: { onClose: () => void }) {
  const { state, update } = usePrayers();
  return <PrayerSheet tall title={t('prayers.calculation.methodsTitle')} onClose={onClose}>
    <View accessibilityRole="radiogroup">
      {METHOD_IDS.map((method, i) => <SheetOption key={method} title={t(`prayers.methods.${method}.name`)} detail={t(`prayers.methods.${method}.detail`)}
        checked={state.method === method} first={i === 0} last={i === METHOD_IDS.length - 1} onPress={() => { update({ method }); onClose(); }} />)}
    </View>
  </PrayerSheet>;
}

export function AdjustmentsSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const set = (prayer: PrayerId, minutes: number) => update({ adjustments: { ...state.adjustments, [prayer]: Math.max(-ADJUSTMENT_LIMIT, Math.min(ADJUSTMENT_LIMIT, minutes)) } });
  const changed = PRAYERS.some((prayer) => state.adjustments[prayer]);
  return <PrayerSheet title={t('prayers.calculation.adjustmentsTitle')} subtitle={t('prayers.calculation.adjustmentsSubtitle')} onClose={onClose}>
    <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }]}>
      {PRAYERS.map((prayer, i) => {
        const value = state.adjustments[prayer], name = t(`prayers.names.${prayer}`);
        return <View key={prayer} style={[s.stepper, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }]}>
          <Text style={{ flex: 1, color: p.foreground, fontSize: 16, fontWeight: '500' }}>{name}</Text>
          <Button size="sm" variant="outline" palette={p} icon="minus" label={t('prayers.calculation.earlier', { prayer: name })} disabled={value <= -ADJUSTMENT_LIMIT} onPress={() => set(prayer, value - 1)} />
          <Text style={{ width: 64, color: value ? p.primary : p.mutedForeground, fontSize: 15, fontWeight: '600', textAlign: 'center' }}>
            {t('prayers.calculation.minutes', { minutes: signedMinutes(value) })}
          </Text>
          <Button size="sm" variant="outline" palette={p} icon="plus" label={t('prayers.calculation.later', { prayer: name })} disabled={value >= ADJUSTMENT_LIMIT} onPress={() => set(prayer, value + 1)} />
        </View>;
      })}
    </View>
    {changed && <Button variant="ghost" palette={p} icon="restore" onPress={() => update({ adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } })}>{t('prayers.calculation.reset')}</Button>}
  </PrayerSheet>;
}

const s = StyleSheet.create({
  section: { fontSize: 13, fontWeight: '600', paddingTop: 12, paddingBottom: 8 },
  play: { width: 40, height: 40, borderRadius: readerShape.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, minHeight: 56 },
});
