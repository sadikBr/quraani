import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { RowGroup, Row } from '@/components/craft/page';
import { GestureDetector } from '@/components/swipe-to-close';
import { Alert, Button } from '@/components/ui';
import { withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { LibrarySearch } from '@/features/quran-reader/components/ui/library-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { normalizeArabicSearch } from '@/features/quran-reader/utils/search';
import { t } from '@/i18n';
import { CITIES, type City } from './cities';
import { LocateError, locate } from './location';
import { athanSoundsSupported, fullAthanSupported } from './notifications';
import { cityName, countryName, placeName } from './place';
import { playPreview, stopPreview, usePreview, type PreviewKey } from './preview';
import { usePrayers } from './provider';
import { ADJUSTMENT_LIMIT, MOSQUE_VOICES, MUEZZIN_VOICES, type AlertKind, type TakbirId, type VoiceId } from './settings';
import { PrayerSheet, SheetListHeading, SheetOption, sheetStyles, SunMark } from './sheet';
import { alertIcons, effectiveAlert, signedMinutes } from './format';
import { dayOf, dayTimes, METHOD_IDS, PRAYERS, type PrayerId } from './times';

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

/**
 * The place: the phone's position at the top (as a row, with the place it found), the search,
 * then the bundled cities, Morocco's first.
 */
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
  const gps = state.location?.source === 'gps' ? state.location : null;
  return <PrayerSheet tall title={t('prayers.location.sheetTitle')} subtitle={t('prayers.location.sheetSubtitle')} onClose={onClose}
    header={<View style={{ gap: 12 }}>
      <RowGroup palette={p}>
        <Row palette={p} icon="locate" title={locating.busy ? t('prayers.location.locating') : t('prayers.location.useMine')} disabled={locating.busy}
          detail={gps && !locating.busy ? t('prayers.location.gpsDetail', { place: placeName(gps) }) : undefined}
          trailing={gps && !locating.busy ? <ReaderIcon name="done" color={p.primary} size={18} /> : undefined} chevron={false}
          onPress={() => void locating.run()} />
      </RowGroup>
      {!!locating.message && <Alert variant="destructive" palette={p}>{locating.message}</Alert>}
      <LibrarySearch palette={p} value={query} onChange={setQuery} label={t('prayers.location.searchLabel')} placeholder={t('prayers.location.searchPlaceholder')} />
    </View>}
    body={(swipe) => <GestureDetector gesture={swipe.scrollGesture}><FlatList {...swipe.scrollProps} data={cities} keyExtractor={(city) => city.id} extraData={selected}
      keyboardShouldPersistTaps="handled" initialNumToRender={16} windowSize={7} contentContainerStyle={sheetStyles.list}
      accessibilityRole="radiogroup" accessibilityLabel={t('prayers.location.sheetTitle')}
      ListEmptyComponent={<View style={s.empty}>
        <ReaderIcon name="map-pin" color={p.ornament} size={22} />
        <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{t('prayers.location.empty')}</Text>
      </View>}
      renderItem={({ item, index }) => {
        const section = index === 0 || cities[index - 1].country === 'MA' !== (item.country === 'MA');
        return <View>
          {section && <SheetListHeading title={item.country === 'MA' ? t('prayers.location.morocco') : t('prayers.location.others')} />}
          <SheetOption title={cityName(item.id)} detail={item.country === 'MA' ? undefined : countryName(item.id)} checked={item.id === selected}
            first={section} last={index === cities.length - 1 || (cities[index + 1].country === 'MA') !== (item.country === 'MA')} onPress={() => choose(item)} />
        </View>;
      }} /></GestureDetector>} />;
}

const ALERT_ORDER: AlertKind[] = ['off', 'notify', 'takbir', 'full'];

/** A prayer's alert: nothing, a notification, the takbir or the whole athan, each with its mark. */
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
    {!state.enabled && <Alert palette={p} icon="bell-off">{t('prayers.alerts.offNote')}</Alert>}
    <View accessibilityRole="radiogroup">
      {kinds.map((kind, i) => <SheetOption key={kind} title={t(`prayers.alerts.kinds.${kind}`)} checked={current === kind} first={i === 0} last={i === kinds.length - 1}
        detail={kind === 'full' && !fullAthanSupported ? t('prayers.alerts.details.fullFallback') : t(`prayers.alerts.details.${kind}`)} onPress={() => void choose(kind)}
        trailing={<View style={s.kind}><ReaderIcon name={alertIcons[kind]} color={current === kind ? p.ornament : p.mutedForeground} size={19} /></View>} />)}
    </View>
    {failed && <Alert variant="destructive" palette={p}>{alertIssue === 'permission' ? t('prayers.alerts.permissionDenied') : t('prayers.alerts.unavailable')}</Alert>}
  </PrayerSheet>;
}

/** A button to listen to a choice: a ring with the play mark, filled while it plays. */
function ListenButton({ name, playing, onPress }: { name: string; playing: boolean; onPress: () => void }) {
  const { palette: p } = useReadingPreferences();
  return <Pressable accessibilityRole="button" accessibilityLabel={playing ? t('prayers.voices.stopLabel', { voice: name }) : t('prayers.voices.playLabel', { voice: name })}
    onPress={onPress} hitSlop={4} style={({ pressed }) => [s.play, {
      borderColor: playing ? p.primary : withAlpha(p.ornament, 0.6),
      backgroundColor: playing ? p.primary : pressed ? withAlpha(p.ornament, 0.14) : withAlpha(p.ornament, 0.06),
    }]}>
    <ReaderIcon name={playing ? 'stop' : 'play'} color={playing ? p.primaryForeground : p.ornament} size={16} />
  </Pressable>;
}

/** A group of sounds on one card, under its heading (none for a group that stands first alone). */
interface SoundGroup<Id extends string> { title?: string; ids: readonly Id[] }

/**
 * The sounds to choose from, in groups (the athans of the three mosques, then the muezzins'),
 * each a radio with a button to listen to it.
 */
function SoundChoices<Id extends VoiceId | TakbirId>({ groups, chosen, name, detail, previewKey, onChoose }: {
  groups: readonly SoundGroup<Id>[]; chosen: Id; name: (id: Id) => string; detail: (id: Id) => string;
  previewKey: (id: Id) => PreviewKey; onChoose: (id: Id) => void;
}) {
  const preview = usePreview();
  return <View accessibilityRole="radiogroup">
    {groups.map((group, g) => <View key={group.ids[0]} style={{ marginTop: g > 0 && !group.title ? 16 : 0 }}>
      {!!group.title && <SheetListHeading title={group.title} />}
      {group.ids.map((id, i) => {
        const title = name(id), key = previewKey(id), playing = preview.playing === key;
        return <SheetOption key={id} title={title} detail={detail(id)} checked={chosen === id} first={i === 0} last={i === group.ids.length - 1}
          onPress={() => onChoose(id)}
          trailing={<ListenButton name={title} playing={playing} onPress={() => { if (playing) stopPreview(); else void playPreview(key); }} />} />;
      })}
    </View>)}
  </View>;
}

const voiceGroups = (): SoundGroup<VoiceId>[] => [
  { title: t('prayers.voices.groups.mosques'), ids: MOSQUE_VOICES },
  { title: t('prayers.voices.groups.muezzins'), ids: MUEZZIN_VOICES },
];

export function VoiceSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const preview = usePreview();
  const close = () => { stopPreview(); onClose(); };
  return <PrayerSheet title={t('prayers.voices.title')} subtitle={t('prayers.voices.subtitle')} onClose={close}>
    <SoundChoices<VoiceId> groups={voiceGroups()} chosen={state.voice} onChoose={(voice) => update({ voice })} previewKey={(voice) => `athan:${voice}`}
      name={(voice) => t(`prayers.voices.${voice}.name`)} detail={(voice) => t(`prayers.voices.${voice}.source`)} />
    {preview.error && <Alert variant="destructive" palette={p}>{t('prayers.voices.playFailed')}</Alert>}
  </PrayerSheet>;
}

export function TakbirSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const preview = usePreview();
  const close = () => { stopPreview(); onClose(); };
  const groups: SoundGroup<TakbirId>[] = [{ ids: ['single'] }, ...voiceGroups()];
  return <PrayerSheet title={t('prayers.takbirs.title')} subtitle={t('prayers.takbirs.subtitle')} onClose={close}>
    <SoundChoices<TakbirId> groups={groups} chosen={state.takbir} onChoose={(takbir) => update({ takbir })} previewKey={(takbir) => `takbir:${takbir}`}
      name={(takbir) => t(`prayers.takbirs.${takbir}.name`)} detail={(takbir) => t(`prayers.takbirs.${takbir}.source`)} />
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

/** Each time a few minutes earlier or later, to match one's mosque: the prayers as rows with a stepper. */
export function AdjustmentsSheet({ onClose }: { onClose: () => void }) {
  const { palette: p } = useReadingPreferences();
  const { state, update } = usePrayers();
  const set = (prayer: PrayerId, minutes: number) => update({ adjustments: { ...state.adjustments, [prayer]: Math.max(-ADJUSTMENT_LIMIT, Math.min(ADJUSTMENT_LIMIT, minutes)) } });
  const changed = PRAYERS.some((prayer) => state.adjustments[prayer]);
  // The sun's place at each time, at the chosen place (or Mecca's, before one is chosen).
  const times = dayTimes(state.location ?? MECCA, dayOf(new Date()), state);
  return <PrayerSheet title={t('prayers.calculation.adjustmentsTitle')} subtitle={t('prayers.calculation.adjustmentsSubtitle')} onClose={onClose}>
    <RowGroup palette={p}>
      {PRAYERS.map((prayer) => {
        const value = state.adjustments[prayer], name = t(`prayers.names.${prayer}`);
        return <View key={prayer} style={s.stepper}>
          <SunMark times={times} prayer={prayer} palette={p} tone={value ? p.ornament : p.mutedForeground} />
          <Text style={{ flex: 1, color: p.foreground, fontSize: 16, fontWeight: '600' }}>{name}</Text>
          <Button size="sm" variant="outline" palette={p} icon="minus" label={t('prayers.calculation.earlier', { prayer: name })} disabled={value <= -ADJUSTMENT_LIMIT} onPress={() => set(prayer, value - 1)} />
          <Text style={{ width: 58, color: value ? p.primary : p.mutedForeground, fontSize: 15, fontWeight: value ? '700' : '500', textAlign: 'center' }}>
            {t('prayers.calculation.minutes', { minutes: signedMinutes(value) })}
          </Text>
          <Button size="sm" variant="outline" palette={p} icon="plus" label={t('prayers.calculation.later', { prayer: name })} disabled={value >= ADJUSTMENT_LIMIT} onPress={() => set(prayer, value + 1)} />
        </View>;
      })}
    </RowGroup>
    {changed && <Button variant="ghost" palette={p} icon="restore" onPress={() => update({ adjustments: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 } })}>{t('prayers.calculation.reset')}</Button>}
  </PrayerSheet>;
}

/** Where the sun's marks are drawn for before a place is chosen. */
export const MECCA = { latitude: 21.4225, longitude: 39.8262 };

const s = StyleSheet.create({
  play: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  kind: { width: 36, alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 32, paddingHorizontal: 24 },
});
