import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Chip, Progress } from '@/components/ui';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerShape } from '@/features/quran-reader/design';
import { RIWAYAT } from '@/features/quran-reader/riwayat';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { SettingsCard, SettingsCardHeading } from '@/features/quran-reader/components/reading/settings-ui';
import { useReaderContent } from '@/features/quran-reader/hooks/use-reader-content';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { REPEAT_CHOICES } from '@/features/quran-reader/state/reading-preferences';
import { formatList, t } from '@/i18n';
import { chooseReciter, fatihaCountsBasmala } from './catalog';
import { useReciters } from './reciter-source';
import { cancelDownload, deleteDownload, downloadsSupported, downloadSurahs, useDownload, useDownloadedReciters, type DownloadState } from './downloads';
import { setRepeat, recitationState } from './player';
import { ReciterSheet, reciterDetail } from './reciter-sheet';
import { repeatTimes } from './recitation-bar';
import { SurahDownloadSheet } from './surah-download-sheet';

/** Quranpedia's rawi id of Warsh; the app's other riwayah is Hafs. */
const WARSH_RAWI = 2;

/** "٨٤ ميغابايت", or "١٫٢ غيغابايت". */
export function formatSize(bytes: number) {
  const mb = bytes / 1_000_000;
  if (mb >= 1000) return t('recitation.settings.offline.gigabytes', { value: Math.round(mb / 100) / 10 });
  return t('recitation.settings.offline.megabytes', { value: mb < 10 ? Math.max(0.1, Math.round(mb * 10) / 10) : Math.round(mb) });
}

/** The «التلاوة» settings tab: reciter, repetition, and downloads for listening offline. */
export function RecitationSettings({ palette: p }: { palette: ReaderPalette }) {
  const { preferences, update } = useReadingPreferences();
  const { content, error, refresh } = useReaderContent();
  const quran = content?.data.quran;
  const catalog = useReciters(quran?.riwayah.id);
  const chosen = preferences.reciters[preferences.riwayah];
  const reciter = quran ? chooseReciter(catalog.reciters, quran.riwayah.id, chosen) : null;
  const riwayah = RIWAYAT[preferences.riwayah].label;
  const [picking, setPicking] = useState(false);
  const chooseRepeat = (repeat: number) => {
    update({ repeat });
    // A recitation under way follows the new choice from its next ayah.
    if (recitationState().status !== 'idle') setRepeat(repeat);
  };
  return <>
    <SettingsCard palette={p}>
      <SettingsCardHeading title={t('recitation.settings.reciter.title')} detail={t('recitation.settings.reciter.description', { riwayah })} icon="headphones" palette={p} />
      {!quran && error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" palette={p} onPress={refresh}>{t('common.retry')}</Button>}>{t('recitation.errors.reciters')}</Alert>
        : !quran || catalog.loading ? <View style={styles.loading}><ActivityIndicator color={p.primary} /><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recitation.settings.reciter.loading')}</Text></View>
        : catalog.failed ? <Alert variant="destructive" palette={p} action={<Button variant="outline" palette={p} onPress={catalog.retry}>{t('common.retry')}</Button>}>{t('recitation.errors.reciters')}</Alert>
        : !reciter ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recitation.errors.noReciter')}</Text>
        : <Pressable accessibilityRole="button" accessibilityLabel={t('recitation.settings.reciter.change')} accessibilityHint={formatList([reciter.name, reciterDetail(reciter)])} onPress={() => setPicking(true)}
          style={({ pressed }) => [styles.current, { borderColor: p.input, backgroundColor: pressed ? p.accent : p.background }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: p.foreground, fontSize: 18, lineHeight: 30, fontWeight: '600' }}>{reciter.name}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{reciterDetail(reciter)}</Text>
          </View>
          <View style={styles.change}>
            <Text style={{ color: p.primary, fontSize: 14, fontWeight: '500' }}>{t('recitation.settings.reciter.changeShort')}</Text>
            <ReaderIcon name="chevron" color={p.primary} size={16} />
          </View>
        </Pressable>}
    </SettingsCard>
    <SettingsCard palette={p}>
      <SettingsCardHeading title={t('recitation.settings.repeat.title')} detail={t('recitation.settings.repeat.description')} icon="loop" palette={p} />
      <View accessibilityRole="radiogroup" accessibilityLabel={t('recitation.settings.repeat.title')} style={styles.chips}>
        {REPEAT_CHOICES.map((choice) => <Chip key={choice} palette={p} accessibilityRole="radio" label={repeatTimes(choice)}
          selected={preferences.repeat === choice} onPress={() => chooseRepeat(choice)} />)}
      </View>
    </SettingsCard>
    {quran && reciter && <OfflineCard reciter={reciter} quran={quran} palette={p} />}
    {picking && quran && <ReciterSheet reciters={catalog.reciters} selected={reciter?.id} riwayah={riwayah} palette={p} onClose={() => setPicking(false)}
      onSelect={(next) => { update({ reciters: { ...preferences.reciters, [preferences.riwayah]: next.id } }); setPicking(false); }} />}
  </>;
}

function savedSummary(state: DownloadState, reciter: Reciter) {
  const saved = state.surahs.filter((s) => reciter.surahs.includes(s)).length;
  const label = saved >= reciter.surahs.length ? t('recitation.settings.offline.complete') : t('recitation.settings.offline.saved', { count: saved });
  return state.bytes > 0 ? t('recitation.settings.offline.size', { saved: label, size: formatSize(state.bytes) }) : label;
}

function OfflineCard({ reciter, quran, palette: p }: { reciter: Reciter; quran: Quran; palette: ReaderPalette }) {
  const download = useDownload(reciter.id);
  const [choosing, setChoosing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const plan = useMemo(() => ({ ayahCounts: Object.fromEntries(quran.surahs.map((s) => [s.number, s.ayahs.length])), fatihaCountsBasmala: fatihaCountsBasmala(quran) }), [quran]);
  const saved = download.surahs.filter((s) => reciter.surahs.includes(s)).length;
  const complete = saved >= reciter.surahs.length;
  const active = download.active;
  const others = useDownloadedReciters().filter((r) => r.id !== reciter.id);
  const surahName = (n: number) => quran.surahs.find((s) => s.number === n)?.name ?? '';
  const start = (surahs: number[]) => { setConfirming(false); void downloadSurahs(reciter, surahs, plan); };
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('recitation.settings.offline.title')} detail={t('recitation.settings.offline.description')} icon="download" palette={p} />
    {!downloadsSupported ? <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recitation.settings.offline.phoneOnly')}</Text> : <>
      {active ? <View style={styles.progress}>
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '500' }}>
          {t('recitation.settings.offline.progress', { surah: surahName(active.surah), done: Math.min(active.done + 1, active.total), total: active.total })}
        </Text>
        <Progress palette={p} label={t('recitation.settings.offline.title')} value={(active.done + (active.files ? active.filesDone / active.files : 0)) / Math.max(1, active.total)} />
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('recitation.settings.offline.keepOpen')}</Text>
        <Button variant="outline" palette={p} icon="close" onPress={() => cancelDownload(reciter.id)}>{t('recitation.settings.offline.cancel')}</Button>
      </View> : <>
        <View style={styles.status}>
          {saved > 0 && <ReaderIcon name={complete ? 'done' : 'download'} color={p.primary} size={16} />}
          <Text style={{ flex: 1, color: saved > 0 ? p.foreground : p.mutedForeground, fontSize: 14 }}>{saved > 0 ? savedSummary(download, reciter) : t('recitation.settings.offline.none')}</Text>
        </View>
        {download.error && <Alert variant="destructive" palette={p}>{download.error === 'storage' ? t('recitation.settings.offline.storageError') : t('recitation.settings.offline.networkError')}</Alert>}
        {!complete && <View style={styles.actions}>
          <Button palette={p} icon="download" block onPress={() => start(reciter.surahs)}>{saved > 0 ? t('recitation.settings.offline.resume') : t('recitation.settings.offline.downloadAll')}</Button>
          <Button variant="outline" palette={p} block onPress={() => setChoosing(true)}>{t('recitation.settings.offline.chooseSurahs')}</Button>
        </View>}
        {saved > 0 && (confirming ? <View style={[styles.confirm, { borderColor: p.border }]}>
          <Text style={{ color: p.foreground, fontSize: 14 }}>{t('recitation.settings.offline.deleteConfirm', { name: reciter.name })}</Text>
          <View style={styles.confirmActions}>
            <Button variant="destructive" size="sm" palette={p} onPress={() => { deleteDownload(reciter.id); setConfirming(false); }}>{t('recitation.settings.offline.confirmDelete')}</Button>
            <Button variant="ghost" size="sm" palette={p} onPress={() => setConfirming(false)}>{t('recitation.settings.offline.keep')}</Button>
          </View>
        </View> : <Button variant="ghost" palette={p} icon="trash" onPress={() => setConfirming(true)}>{t('recitation.settings.offline.delete')}</Button>)}
      </>}
      {others.length > 0 && <View style={[styles.others, { borderColor: p.border }]}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('recitation.settings.offline.others')}</Text>
        {others.map((other) => <SavedReciter key={other.id} reciter={other} palette={p} />)}
      </View>}
    </>}
    {choosing && <SurahDownloadSheet quran={quran} available={reciter.surahs} saved={download.surahs} palette={p} onClose={() => setChoosing(false)}
      onDownload={(surahs) => { setChoosing(false); start(surahs); }} />}
  </SettingsCard>;
}

/** Another reciter saved on the device, with a way to free its space. */
function SavedReciter({ reciter, palette: p }: { reciter: Reciter; palette: ReaderPalette }) {
  const state = useDownload(reciter.id);
  const [confirming, setConfirming] = useState(false);
  if (!state.surahs.length && !state.active) return null;
  return <View style={styles.saved}>
    <View style={styles.savedRow}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '500' }}>{reciter.name}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{[t(`common.riwayah.${reciter.riwayahId === WARSH_RAWI ? 'warsh' : 'hafs'}.name`), savedSummary(state, reciter)].join(' · ')}</Text>
      </View>
      {!confirming && <Pressable accessibilityRole="button" accessibilityLabel={t('recitation.settings.offline.deleteOther', { name: reciter.name })} onPress={() => setConfirming(true)} hitSlop={4}
        style={({ pressed }) => [styles.trash, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
        <ReaderIcon name="trash" color={p.mutedForeground} size={18} />
      </Pressable>}
    </View>
    {confirming && <View style={styles.confirmActions}>
      <Button variant="destructive" size="sm" palette={p} onPress={() => deleteDownload(reciter.id)}>{t('recitation.settings.offline.confirmDelete')}</Button>
      <Button variant="ghost" size="sm" palette={p} onPress={() => setConfirming(false)}>{t('recitation.settings.offline.keep')}</Button>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  current: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, borderRadius: readerShape.lg },
  change: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  progress: { gap: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { gap: 10 },
  confirm: { gap: 10, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg },
  confirmActions: { flexDirection: 'row', gap: 8 },
  others: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 12 },
  saved: { gap: 8 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trash: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
