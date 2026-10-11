import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, IconTile, Progress } from '@/components/ui';
import { readerElevation, readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { SettingsCard, SettingsCardHeading } from '@/features/quran-reader/components/reading/settings-ui';
import { PlanSwitch } from '@/features/plans/components';
import { useEmbedded } from '@/components/embedded';
import { PlanDateField } from '@/features/plans/plan-date-field';
import { formatSize } from '@/features/recitation/recitation-settings';
import { t } from '@/i18n';
import { AUDIO_BYTES, collectionIcons, collections, COLLECTION_IDS, type CollectionId } from './content';
import { collectionProgress, type ReminderKind } from './progress';
import { useAdhkar } from './provider';
import { AdhkarReminderError, remindersSupported, requestAdhkarReminders } from './notifications';
import { cancelAudioDownload, deleteAudio, downloadAudio, downloadsSupported, useAudioDownload } from './downloads';

/** The daily adhkar: each collection with today's progress, the reminders, and the recordings. */
export function AdhkarScreen() {
  const { palette: p } = useReadingPreferences();
  const { error } = useAdhkar();
  const embedded = useEmbedded();
  const Frame = embedded ? View : SafeAreaView;
  return <Frame style={{ flex: 1, backgroundColor: p.background }}>
    {!embedded && <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.backToReading')} onPress={() => router.dismissTo('/')}>{t('plans.list.mushaf')}</Button>
    </View>}
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, embedded && { paddingTop: 16 }]}>
      <View style={{ gap: 4 }}>
        {!embedded && <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('adhkar.title')}</Text>}
        <Text style={{ fontSize: 15, color: p.mutedForeground }}>{t('adhkar.subtitle')}</Text>
      </View>
      {error && <Alert variant="destructive">{t('adhkar.storageError')}</Alert>}
      <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
        {COLLECTION_IDS.map((id, i) => <CollectionRow key={id} id={id} first={i === 0} />)}
      </View>
      <View style={[s.list, { borderColor: p.border, backgroundColor: p.card }, readerElevation(2, p)]}>
        <MisbahaRow first />
      </View>
      <Reminders />
      <OfflineAudio />
      <Text style={{ color: p.mutedForeground, fontSize: 12, textAlign: 'center', paddingHorizontal: 12 }}>{t('adhkar.source')}</Text>
    </ScrollView>
  </Frame>;
}

/** A collection in a list: today's progress, opening its counter. Also used on the home screen. */
export function CollectionRow({ id, first }: { id: CollectionId; first: boolean }) {
  const { palette: p } = useReadingPreferences();
  const { state, today } = useAdhkar();
  const progress = collectionProgress(state, id, today);
  const title = t(`adhkar.collections.${id}.title`);
  const status = progress.complete ? t('adhkar.completed') : progress.started ? t('adhkar.progress', { done: progress.done, total: progress.total })
    : t('adhkar.size', { count: collections[id].length });
  return <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.openLabel', { title, state: progress.complete ? t('adhkar.completed') : progress.started ? status : t('adhkar.notStarted') })}
    onPress={() => router.push({ pathname: '/adhkar/[id]', params: { id } })}
    style={({ pressed }) => [s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <IconTile name={collectionIcons[id]} palette={p} tone={progress.complete ? p.primary : undefined} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: progress.complete ? p.primary : p.mutedForeground, fontSize: 13 }}>
        {progress.started || progress.complete ? status : `${t(`adhkar.collections.${id}.detail`)} · ${status}`}
      </Text>
      {progress.started && !progress.complete && <View style={{ marginTop: 6 }}><Progress value={progress.done / progress.total} palette={p} height={4} /></View>}
    </View>
    {progress.complete ? <ReaderIcon name="done" color={p.primary} size={20} /> : <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />}
  </Pressable>;
}

/** Opens the misbaha, showing its count. Also used on the home screen. */
export function MisbahaRow({ first }: { first: boolean }) {
  const { palette: p } = useReadingPreferences();
  const { state } = useAdhkar();
  const title = t('adhkar.misbaha.title');
  const detail = state.misbaha ? t('adhkar.misbaha.count', { count: state.misbaha }) : t('adhkar.misbaha.empty');
  return <Pressable accessibilityRole="link" accessibilityLabel={t('adhkar.openLabel', { title, state: detail })} onPress={() => router.push('/misbaha')}
    style={({ pressed }) => [s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
    <IconTile name="beads" palette={p} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{detail}</Text>
    </View>
    <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
  </Pressable>;
}

const clock = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

function Reminders() {
  const { palette: p } = useReadingPreferences();
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
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('adhkar.reminders.title')} detail={t('adhkar.reminders.description')} icon="bell" palette={p} />
    {!remindersSupported ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('adhkar.reminders.phoneOnly')}</Text> : <View style={{ gap: 12 }}>
      {(['morning', 'evening'] as const).map((kind) => {
        const reminder = state.reminders[kind];
        return <View key={kind} style={{ gap: 8 }}>
          <PlanSwitch label={t(`adhkar.reminders.${kind}`)} checked={reminder.enabled} onChange={(on) => void toggle(kind, on)} />
          {reminder.enabled && <PlanDateField label={t('adhkar.reminders.time')} mode="time" value={clock(reminder.hour, reminder.minute)}
            onChange={(value) => { const [hour, minute] = value.split(':').map(Number); setReminder(kind, { ...reminder, hour, minute }); }} />}
        </View>;
      })}
      {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
      {reminderError && <Alert variant="destructive" palette={p}>{t('adhkar.reminders.syncFailed')}</Alert>}
    </View>}
  </SettingsCard>;
}

function OfflineAudio() {
  const { palette: p } = useReadingPreferences();
  const download = useAudioDownload();
  const [confirming, setConfirming] = useState(false);
  const { active } = download;
  const complete = download.saved >= download.total;
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('adhkar.audio.title')} detail={t('adhkar.audio.description')} icon="download" palette={p} />
    {!downloadsSupported ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('adhkar.audio.phoneOnly')}</Text>
      : active ? <View style={{ gap: 10 }}>
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500' }}>{t('adhkar.audio.progress', { done: Math.min(active.done + 1, active.total), total: active.total })}</Text>
        <Progress palette={p} label={t('adhkar.audio.title')} value={active.done / Math.max(1, active.total)} />
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('adhkar.audio.keepOpen')}</Text>
        <Button variant="outline" palette={p} icon="close" onPress={cancelAudioDownload}>{t('adhkar.audio.cancel')}</Button>
      </View> : <View style={{ gap: 10 }}>
        {download.saved > 0 && <View style={s.status}>
          <ReaderIcon name={complete ? 'done' : 'download'} color={p.primary} size={16} />
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
      </View>}
  </SettingsCard>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 20 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, minHeight: 68 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirm: { gap: 10, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg },
  confirmActions: { flexDirection: 'row', gap: 8 },
});
