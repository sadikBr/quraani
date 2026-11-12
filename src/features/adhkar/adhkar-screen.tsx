import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Progress, SwitchMark } from '@/components/ui';
import { ArchTile, artColors, type Motif } from '@/components/craft/art';
import { Beads, Rule } from '@/components/craft/marks';
import { page, PageBar, PageTitle, Row, RowGroup } from '@/components/craft/page';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { ReaderIcon, type ReaderIconName } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { useEmbedded } from '@/components/embedded';
import { PlanDateField } from '@/features/plans/plan-date-field';
import { formatSize } from '@/features/recitation/recitation-settings';
import { usePrayers, useNow } from '@/features/prayers/provider';
import { prayerWindow } from '@/features/prayers/times';
import { t } from '@/i18n';
import { AUDIO_BYTES, collectionIcons, collections, COLLECTION_IDS, type CollectionId } from './content';
import { collectionProgress, type CollectionProgress, type ReminderKind } from './progress';
import { useAdhkar } from './provider';
import { AdhkarReminderError, remindersSupported, requestAdhkarReminders } from './notifications';
import { cancelAudioDownload, deleteAudio, downloadAudio, downloadsSupported, useAudioDownload } from './downloads';

/**
 * Each collection's pattern, as on the home screen's tile: the sun's rosette for the morning, the
 * crescent for the evening, arches for the prayer, ripples for sleep, the star for waking.
 */
export const collectionMotifs: Record<CollectionId, Motif> = { morning: 'rosette', evening: 'crescent', afterPrayer: 'arches', sleep: 'ripple', waking: 'khatam' };

/** The adhkar of this part of the day (as on the home screen): the morning's until Dhuhr, after the prayer until Asr, the evening's until Isha, then sleep. */
export function adhkarNow(prayer: string | undefined, hour: number): CollectionId {
  if (prayer) {
    if (prayer === 'fajr' || prayer === 'sunrise') return 'morning';
    if (prayer === 'dhuhr') return 'afterPrayer';
    if (prayer === 'asr' || prayer === 'maghrib') return 'evening';
    return 'sleep';
  }
  if (hour >= 4 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 15) return 'afterPrayer';
  if (hour >= 15 && hour < 20) return 'evening';
  return 'sleep';
}

function useAdhkarNow(): CollectionId {
  const { state } = usePrayers();
  const now = useNow(60_000);
  const current = state.location ? prayerWindow(state.location, now, state).current?.prayer : undefined;
  return adhkarNow(current, now.getHours());
}

const openCollection = (id: CollectionId) => router.push({ pathname: '/adhkar/[id]', params: { id } });

/** A collection's state today, said in a line and read out. */
function describe(id: CollectionId, progress: CollectionProgress) {
  const title = t(`adhkar.collections.${id}.title`);
  const status = progress.complete ? t('adhkar.completed') : progress.started ? t('adhkar.progress', { done: progress.done, total: progress.total })
    : t('adhkar.size', { count: collections[id].length });
  return {
    title, status,
    detail: progress.started || progress.complete ? status : `${t(`adhkar.collections.${id}.detail`)} · ${status}`,
    label: t('adhkar.openLabel', { title, state: progress.complete ? t('adhkar.completed') : progress.started ? status : t('adhkar.notStarted') }),
  };
}

/**
 * The daily adhkar: the collection of this part of the day as an arched door, the others as rows
 * (each a string of beads, one a dhikr, filled as they are said today), the misbaha, then the
 * reminders and the recordings, quietly.
 */
export function AdhkarScreen() {
  const { palette: p } = useReadingPreferences();
  const { error } = useAdhkar();
  const embedded = useEmbedded();
  const now = useAdhkarNow();
  const Frame = embedded ? View : SafeAreaView;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <PageBar title={t('adhkar.title')} palette={p} back={{ label: t('common.backToReading'), text: t('common.mushaf'), onPress: () => router.dismissTo('/') }} />}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[page.content, embedded && { paddingTop: 16 }]}>
      {embedded ? <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('adhkar.subtitle')}</Text>
        : <PageTitle subtitle={t('adhkar.subtitle')} palette={p} />}
      {error && <Alert variant="destructive" palette={p}>{t('adhkar.storageError')}</Alert>}
      <View style={{ gap: 14 }}>
        <FeaturedCollection id={now} palette={p} />
        <RowGroup palette={p}>
          {COLLECTION_IDS.filter((id) => id !== now).map((id) => <CollectionRow key={id} id={id} palette={p} />)}
        </RowGroup>
      </View>
      <RowGroup palette={p}><MisbahaRow palette={p} /></RowGroup>
      <Rule palette={p} style={{ marginHorizontal: 24 }} />
      <Reminders palette={p} />
      <OfflineAudio palette={p} />
      <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 20, textAlign: 'center', paddingHorizontal: 12 }}>{t('adhkar.source')}</Text>
    </ScrollView>
  </Frame>;
}

/**
 * Beads centred under a title: as wide as they need, at most `max`. Many beads draw closer, then
 * smaller, so the string always fits (the beads keep a gap of 2 at least).
 */
export function CentredBeads({ count, done, size: wanted, max, palette: p }: { count: number; done: number; size: number; max: number; palette: ReaderPalette }) {
  const size = count > 1 ? Math.max(3, Math.min(wanted, (max - 2 * (count - 1)) / count)) : wanted;
  const gap = count > 1 ? Math.max(2, Math.min(size, (max - count * size) / (count - 1))) : 0;
  return <View style={{ width: Math.ceil(count * size + (count - 1) * gap), alignSelf: 'center' }}>
    <Beads count={count} done={done} size={size} max={count} palette={p} />
  </View>;
}

/**
 * The adhkar of this part of the day, as a wide arched door: its pattern and its icon on a
 * medallion in the arch, its name, its string of beads, and what a tap does.
 */
function FeaturedCollection({ id, palette: p }: { id: CollectionId; palette: ReaderPalette }) {
  const { width: screen } = useWindowDimensions();
  const { state, today } = useAdhkar();
  const progress = collectionProgress(state, id, today);
  const { title, detail, label } = describe(id, progress);
  const colors = artColors(p);
  const width = Math.min(Math.min(screen, readerLayout.maxWidth) - 32, 520);
  const rise = Math.round(width * 0.27), focus = Math.round(rise * 0.8 + 4), medallion = Math.round(Math.min(width * 0.095, 40));
  const top = focus + medallion + 8;
  const height = top + 160;
  // The empty beads take the tile's colour, so they read as holes in a string, not as dots of paper.
  const beads = { ...p, card: colors.surface };
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => openCollection(id)}
    style={({ pressed }) => [{ width, height, alignSelf: 'center', transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
    <ArchTile w={width} h={height} rise={rise} motif={collectionMotifs[id]} palette={p} focus={focus} medallion={medallion} faded={0.5} />
    <View style={[s.figure, { top: focus - medallion, height: medallion * 2 }]}><ReaderIcon name={collectionIcons[id]} color={p.ornament} size={Math.round(medallion * 0.95)} /></View>
    <View style={[StyleSheet.absoluteFill, s.featured, { paddingTop: top }]}>
      <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 26, lineHeight: 44, fontFamily: 'ReaderNaskhBold', textAlign: 'center' }}>{title}</Text>
      <Text numberOfLines={1} style={{ color: colors.soft, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{progress.started || progress.complete ? t(`adhkar.collections.${id}.detail`) : detail}</Text>
      <View style={{ alignSelf: 'stretch', marginTop: 14 }}>
        <CentredBeads count={progress.total} done={progress.done} size={8} max={width - 72} palette={beads} />
      </View>
      <View style={{ marginTop: 14 }}>
        {progress.complete ? <View style={s.done}>
          <ReaderIcon name="done" color={p.ornament} size={16} />
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>{t('adhkar.completed')}</Text>
        </View> : <View style={[s.pill, { borderColor: colors.edge }]}>
          <ReaderIcon name="play" color={colors.ink} size={13} />
          <Text numberOfLines={1} style={{ color: colors.ink, fontSize: 13, fontWeight: '600' }}>
            {progress.started ? t('adhkar.resume') : t('adhkar.begin')}
          </Text>
        </View>}
      </View>
    </View>
  </Pressable>;
}

/** A small arched tile: a collection's pattern, and its mark in the arch. */
function SmallArch({ motif, icon, palette: p }: { motif: Motif; icon: ReaderIconName; palette: ReaderPalette }) {
  return <View style={s.smallArch}>
    <ArchTile w={44} h={54} rise={21} motif={motif} palette={p} faded={0.9} />
    <View style={[StyleSheet.absoluteFill, s.smallMark]}><ReaderIcon name={icon} color={artColors(p).ink} size={19} /></View>
  </View>;
}

/** A collection in the list: its small arch, its name and state today, and its string of beads. */
function CollectionRow({ id, palette: p }: { id: CollectionId; palette: ReaderPalette }) {
  const { state, today } = useAdhkar();
  const progress = collectionProgress(state, id, today);
  const { title, detail, label } = describe(id, progress);
  return <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={() => openCollection(id)}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <SmallArch motif={collectionMotifs[id]} icon={collectionIcons[id]} palette={p} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{title}</Text>
      <Text numberOfLines={1} style={{ color: progress.complete ? p.ornament : p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>
      <View style={{ marginTop: 6 }}><Beads count={progress.total} done={progress.done} size={7} palette={p} /></View>
    </View>
    {progress.complete ? <ReaderIcon name="done" color={p.ornament} size={20} /> : <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />}
  </Pressable>;
}

/** Opens the misbaha, showing its count. */
function MisbahaRow({ palette: p }: { palette: ReaderPalette }) {
  const { state } = useAdhkar();
  const title = t('adhkar.misbaha.title');
  const detail = state.misbaha ? t('adhkar.misbaha.count', { count: state.misbaha }) : t('adhkar.misbaha.empty');
  return <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.openLabel', { title, state: detail })} onPress={() => router.push('/misbaha')}
    style={({ pressed }) => [s.row, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <SmallArch motif="lattice" icon="beads" palette={p} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>{title}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>
    </View>
    <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
  </Pressable>;
}

/** The head of a quiet group: its icon, its name, what it does. */
function GroupHead({ icon, title, detail, palette: p, children }: { icon: ReaderIconName; title: string; detail: string; palette: ReaderPalette; children?: ReactNode }) {
  return <View style={s.head}>
    <View style={[s.icon, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name={icon} color={p.ornament} size={19} /></View>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 15, fontWeight: '600', lineHeight: 22 }}>{title}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>
      {children}
    </View>
  </View>;
}

/** Said under a group's head when it can only be used in the phone app. */
function PhoneOnly({ text, palette: p }: { text: string; palette: ReaderPalette }) {
  return <View style={s.phoneOnly}>
    <ReaderIcon name="info" color={p.mutedForeground} size={13} />
    <Text style={{ flex: 1, color: p.mutedForeground, fontSize: 12, lineHeight: 18 }}>{text}</Text>
  </View>;
}

const clock = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

function Reminders({ palette: p }: { palette: ReaderPalette }) {
  const { state, setReminder, reminderError } = useAdhkar();
  const [message, setMessage] = useState('');
  const toggle = async (kind: ReminderKind, enabled: boolean) => {
    setMessage('');
    const current = state.reminders[kind];
    if (enabled) {
      try { await requestAdhkarReminders(); } catch (error) {
        setMessage(error instanceof AdhkarReminderError ? error.message : t('adhkar.reminders.unavailable'));
        return;
      }
    }
    setReminder(kind, { ...current, enabled });
  };
  return <View style={{ gap: 10 }}>
    <RowGroup palette={p}>
      <GroupHead key="head" icon="bell" title={t('adhkar.reminders.title')} detail={t('adhkar.reminders.description')} palette={p}>
        {!remindersSupported && <PhoneOnly text={t('adhkar.reminders.phoneOnly')} palette={p} />}
      </GroupHead>
      {remindersSupported && (['morning', 'evening'] as const).map((kind) => {
        const reminder = state.reminders[kind];
        return <View key={kind}>
          <Row role="switch" icon={collectionIcons[kind]} title={t(`adhkar.reminders.${kind}`)} detail={reminder.enabled ? clock(reminder.hour, reminder.minute) : undefined}
            label={t(`adhkar.reminders.${kind}`)} selected={reminder.enabled} onPress={() => void toggle(kind, !reminder.enabled)}
            trailing={<SwitchMark checked={reminder.enabled} palette={p} />} palette={p} />
          {reminder.enabled && <View style={s.time}>
            <PlanDateField label={t('adhkar.reminders.time')} mode="time" value={clock(reminder.hour, reminder.minute)}
              onChange={(value) => { const [hour, minute] = value.split(':').map(Number); setReminder(kind, { ...reminder, hour, minute }); }} />
          </View>}
        </View>;
      })}
    </RowGroup>
    {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
    {reminderError && <Alert variant="destructive" palette={p}>{t('adhkar.reminders.syncFailed')}</Alert>}
  </View>;
}

function OfflineAudio({ palette: p }: { palette: ReaderPalette }) {
  const download = useAudioDownload();
  const [confirming, setConfirming] = useState(false);
  const { active } = download;
  const complete = download.saved >= download.total;
  return <RowGroup palette={p}>
    <GroupHead key="head" icon="download" title={t('adhkar.audio.title')} detail={t('adhkar.audio.description')} palette={p}>
      {!downloadsSupported && <PhoneOnly text={t('adhkar.audio.phoneOnly')} palette={p} />}
    </GroupHead>
    {downloadsSupported && (active ? <View key="active" style={s.block}>
      <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500' }}>{t('adhkar.audio.progress', { done: Math.min(active.done + 1, active.total), total: active.total })}</Text>
      <Progress palette={p} label={t('adhkar.audio.title')} value={active.done / Math.max(1, active.total)} />
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('adhkar.audio.keepOpen')}</Text>
      <Button variant="outline" palette={p} icon="close" onPress={cancelAudioDownload}>{t('adhkar.audio.cancel')}</Button>
    </View> : <View key="idle" style={s.block}>
      {download.saved > 0 && <View style={s.status}>
        <ReaderIcon name={complete ? 'done' : 'download'} color={p.ornament} size={16} />
        <Text style={{ flex: 1, color: p.foreground, fontSize: 14 }}>
          {complete ? t('adhkar.audio.saved', { size: formatSize(download.bytes) }) : t('adhkar.audio.partial', { done: download.saved, total: download.total, size: formatSize(download.bytes) })}
        </Text>
      </View>}
      {download.error && <Alert variant="destructive" palette={p}>{download.error === 'storage' ? t('adhkar.audio.storageError') : t('adhkar.audio.networkError')}</Alert>}
      {!complete && <Button palette={p} icon="download" block onPress={() => void downloadAudio()}>
        {download.saved > 0 ? t('adhkar.audio.resume') : t('adhkar.audio.download', { size: formatSize(AUDIO_BYTES) })}
      </Button>}
      {download.saved > 0 && (confirming ? <View style={[s.confirm, { borderColor: p.border }]}>
        <Text style={{ color: p.foreground, fontSize: 14 }}>{t('adhkar.audio.deleteConfirm')}</Text>
        <View style={s.confirmActions}>
          <Button variant="destructive" size="sm" palette={p} onPress={() => { deleteAudio(); setConfirming(false); }}>{t('recitation.settings.offline.confirmDelete')}</Button>
          <Button variant="ghost" size="sm" palette={p} onPress={() => setConfirming(false)}>{t('recitation.settings.offline.keep')}</Button>
        </View>
      </View> : <Button variant="ghost" palette={p} icon="trash" onPress={() => setConfirming(true)}>{t('adhkar.audio.delete')}</Button>)}
    </View>)}
  </RowGroup>;
}

const s = StyleSheet.create({
  figure: { position: 'absolute', left: 0, right: 0, alignItems: 'center', justifyContent: 'center' },
  featured: { alignItems: 'center', paddingHorizontal: 24 },
  pill: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 16, height: 34, borderRadius: readerShape.pill, borderWidth: 1 },
  done: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 78 },
  smallArch: { width: 44, height: 54 },
  smallMark: { alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  icon: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  phoneOnly: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  time: { paddingHorizontal: 14, paddingBottom: 14 },
  block: { gap: 10, padding: 14 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirm: { gap: 10, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg },
  confirmActions: { flexDirection: 'row', gap: 8 },
});
