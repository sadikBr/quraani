import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, Progress, SwitchMark } from '@/components/ui';
import { cartoucheFrame, khatam } from '@/components/craft/art';
import { Beads, Medallion } from '@/components/craft/marks';
import { ArchPanel } from '@/components/craft/panels';
import { Row, RowGroup, Section } from '@/components/craft/page';
import type { Reciter } from '@/lib/quranpedia/reciters';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { mixColor, readerShape, withAlpha } from '@/features/quran-reader/design';
import { RIWAYAT } from '@/features/quran-reader/riwayat';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { useReaderContent } from '@/features/quran-reader/hooks/use-reader-content';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { REPEAT_CHOICES, type ListeningMode } from '@/features/quran-reader/state/reading-preferences';
import { formatList, t } from '@/i18n';
import { chooseReciter, fatihaCountsBasmala } from './catalog';
import { useReciters } from './reciter-source';
import { cancelDownload, deleteDownload, downloadsSupported, downloadSurahs, useDownload, useDownloadedReciters, type DownloadState } from './downloads';
import { setRepeat, recitationState } from './player';
import { ReciterSheet, ReciterStar, reciterDetail } from './reciter-sheet';
import { repeatTimes } from './recitation-bar';
import { SurahDownloadSheet } from './surah-download-sheet';

/** The counts the stepper moves through (0, repeating until stopped, is the switch below it). */
const COUNTS = REPEAT_CHOICES.filter((choice) => choice > 0);

/** Quranpedia's rawi id of Warsh; the app's other riwayah is Hafs. */
const WARSH_RAWI = 2;

/** "٨٤ ميغابايت", or "١٫٢ غيغابايت". */
export function formatSize(bytes: number) {
  const mb = bytes / 1_000_000;
  if (mb >= 1000) return t('recitation.settings.offline.gigabytes', { value: Math.round(mb / 100) / 10 });
  return t('recitation.settings.offline.megabytes', { value: mb < 10 ? Math.max(0.1, Math.round(mb * 10) / 10) : Math.round(mb) });
}

/**
 * The «التلاوة» settings tab: how to listen (ayah by ayah, or whole surahs, each drawn as what it
 * plays), then that way's reciter, seen through the arched window, its repetition (the count held
 * in the star), and downloads for listening offline (how much is on the device, as beads).
 */
export function RecitationSettings({ palette: p }: { palette: ReaderPalette }) {
  const { preferences, update } = useReadingPreferences();
  const { content, error, refresh } = useReaderContent();
  const quran = content?.data.quran;
  const listening = preferences.listening;
  const whole = listening === 'surah';
  const catalog = useReciters(quran?.riwayah.id, listening);
  const chosen = (whole ? preferences.surahReciters : preferences.reciters)[preferences.riwayah];
  const reciter = quran ? chooseReciter(catalog.reciters, quran.riwayah.id, chosen, listening) : null;
  const riwayah = RIWAYAT[preferences.riwayah].label;
  const repeat = whole ? preferences.surahRepeat : preferences.repeat;
  const [picking, setPicking] = useState(false);
  const chooseRepeat = (next: number) => {
    update(whole ? { surahRepeat: next } : { repeat: next });
    // A recitation under way of this kind follows the new choice from its next ayah (or surah).
    if (recitationState().status !== 'idle') setRepeat(next, listening);
  };
  // The count shown (greyed while repeating without end, and given back when that is turned off).
  const [counts, setCounts] = useState<Record<ListeningMode, number>>(() => ({ ayah: preferences.repeat || 1, surah: preferences.surahRepeat || 1 }));
  const endless = repeat === 0;
  const count = repeat || counts[listening];
  const index = COUNTS.indexOf(count as typeof COUNTS[number]);
  const stepCount = (delta: number) => {
    const next = COUNTS[Math.max(0, Math.min(COUNTS.length - 1, index + delta))];
    setCounts({ ...counts, [listening]: next });
    chooseRepeat(next);
  };
  const chooseReciterFor = (next: Reciter) => {
    update(whole ? { surahReciters: { ...preferences.surahReciters, [preferences.riwayah]: next.id } } : { reciters: { ...preferences.reciters, [preferences.riwayah]: next.id } });
    setPicking(false);
  };
  const endlessDetail = t(whole ? 'recitation.settings.repeat.surahEndlessDetail' : 'recitation.settings.repeat.endlessDetail');
  return <View style={styles.tab}>
    <ListeningSection value={listening} palette={p} onChange={(next) => update({ listening: next })} />
    <Section title={t('recitation.settings.reciter.title')} palette={p}>
      <Note palette={p}>{t(whole ? 'recitation.settings.reciter.surahDescription' : 'recitation.settings.reciter.description', { riwayah })}</Note>
      {!quran && error ? <Alert variant="destructive" palette={p} action={<Button variant="outline" palette={p} onPress={refresh}>{t('common.retry')}</Button>}>{t('recitation.errors.reciters')}</Alert>
        : !quran || catalog.loading ? <View style={[styles.waiting, { borderColor: p.border, backgroundColor: p.card }]}><ActivityIndicator color={p.ornament} /><Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('recitation.settings.reciter.loading')}</Text></View>
        : catalog.failed ? <Alert variant="destructive" palette={p} action={<Button variant="outline" palette={p} onPress={catalog.retry}>{t('common.retry')}</Button>}>{t('recitation.errors.reciters')}</Alert>
        : !reciter ? <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t(whole ? 'recitation.errors.noSurahReciter' : 'recitation.errors.noReciter')}</Text>
        : <ReciterWindow reciter={reciter} listening={listening} palette={p} onPress={() => setPicking(true)} />}
    </Section>
    <Section title={t(whole ? 'recitation.settings.repeat.surahTitle' : 'recitation.settings.repeat.title')} palette={p}>
      <Note palette={p}>{t(whole ? 'recitation.settings.repeat.surahDescription' : 'recitation.settings.repeat.description')}</Note>
      <RowGroup palette={p}>
        <View style={[styles.stepper, endless && { opacity: 0.4 }]}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{t('recitation.settings.repeat.count')}</Text>
            <Text accessibilityLiveRegion="polite" style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{repeatTimes(count)}</Text>
          </View>
          <Round icon="minus" label={t('recitation.settings.repeat.fewer')} disabled={endless || index <= 0} palette={p} onPress={() => stepCount(-1)} />
          <Medallion value={count} size={52} palette={p} current={!endless} label={repeatTimes(count)} />
          <Round icon="plus" label={t('recitation.settings.repeat.more')} disabled={endless || index >= COUNTS.length - 1} palette={p} onPress={() => stepCount(1)} />
        </View>
        <Row palette={p} title={t('recitation.settings.repeat.endless')} detail={endlessDetail} label={t('recitation.settings.repeat.endless')} hint={endlessDetail}
          role="switch" selected={endless} onPress={() => chooseRepeat(endless ? count : 0)} trailing={<SwitchMark checked={endless} palette={p} />} />
      </RowGroup>
    </Section>
    {quran && reciter && <OfflineSection key={reciter.id} reciter={reciter} quran={quran} palette={p} />}
    {picking && quran && <ReciterSheet reciters={catalog.reciters} selected={reciter?.id} quran={quran} listening={listening}
      subtitle={t(whole ? 'recitation.reciterSheet.surahSubtitle' : 'recitation.reciterSheet.subtitle', { riwayah })} palette={p} onClose={() => setPicking(false)}
      onSelect={chooseReciterFor} />}
  </View>;
}

/** A section's line of explanation, under its title. */
function Note({ palette: p, children }: { palette: ReaderPalette; children: string }) {
  return <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, marginTop: -6 }}>{children}</Text>;
}

/** A round − or + beside the count. */
function Round({ icon, label, disabled, palette: p, onPress }: { icon: 'minus' | 'plus'; label: string; disabled: boolean; palette: ReaderPalette; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} hitSlop={6}
    style={({ pressed }) => [styles.round, { borderColor: withAlpha(p.ornament, 0.55), backgroundColor: pressed ? p.accent : p.background, opacity: disabled ? 0.4 : 1 }]}>
    <ReaderIcon name={icon} color={p.foreground} size={16} />
  </Pressable>;
}

/**
 * The chosen reciter, the tab's main figure, in an arched window: the star with his initial
 * (filled: he is the one chosen), his name in Naskh, what sets his recitation apart, and the way
 * to choose another.
 */
function ReciterWindow({ reciter, listening, palette: p, onPress }: { reciter: Reciter; listening: ListeningMode; palette: ReaderPalette; onPress: () => void }) {
  const detail = reciterDetail(reciter, listening);
  return <Pressable accessibilityRole="button" accessibilityLabel={t('recitation.settings.reciter.change')} accessibilityHint={formatList([reciter.name, detail])} onPress={onPress}
    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
    <ArchPanel palette={p} rise={40} contentStyle={styles.window}>
      <ReciterStar name={reciter.name} size={64} palette={p} current />
      <Text style={{ color: p.foreground, fontSize: 24, lineHeight: 40, fontFamily: 'ReaderNaskhBold', textAlign: 'center', marginTop: 4 }}>{reciter.name}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>{detail}</Text>
      <View style={[styles.change, { borderColor: withAlpha(p.ornament, 0.7) }]}>
        <ReaderIcon name="headphones" color={p.ornament} size={15} />
        <Text style={{ color: p.foreground, fontSize: 14, fontWeight: '600' }}>{t('recitation.settings.reciter.changeShort')}</Text>
      </View>
    </ArchPanel>
  </Pressable>;
}

/** Ayah by ayah, or whole surahs: two choices side by side, each drawn as what it plays and saying what it gives. */
function ListeningSection({ value, palette: p, onChange }: { value: ListeningMode; palette: ReaderPalette; onChange: (value: ListeningMode) => void }) {
  return <Section title={t('recitation.settings.listening.title')} palette={p}>
    <Note palette={p}>{t('recitation.settings.listening.description')}</Note>
    <View accessibilityRole="radiogroup" accessibilityLabel={t('recitation.settings.listening.title')} style={styles.listening}>
      {(['ayah', 'surah'] as const).map((mode) => {
        const selected = value === mode;
        return <Pressable key={mode} accessibilityRole="radio" accessibilityLabel={t(`recitation.settings.listening.${mode}.label`)} accessibilityHint={t(`recitation.settings.listening.${mode}.detail`)}
          accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => onChange(mode)}
          style={({ pressed }) => [styles.choice, {
            backgroundColor: selected ? mixColor(p.card, p.ornament, 0.1) : pressed ? p.accent : p.card,
            borderColor: selected ? withAlpha(p.ornament, 0.65) : p.border,
          }]}>
          <ListeningDrawing mode={mode} active={selected} palette={p} />
          <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontWeight: selected ? '700' : '600', textAlign: 'center' }}>{t(`recitation.settings.listening.${mode}.label`)}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>{t(`recitation.settings.listening.${mode}.detail`)}</Text>
        </Pressable>;
      })}
    </View>
    {value === 'surah' && <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('recitation.settings.listening.surahNote')}</Text>}
  </Section>;
}

const DRAWING = { w: 120, h: 46 };

/**
 * What each way plays, drawn as the mushaf writes it: ayah by ayah, lines broken at each ayah's
 * star (each its own recording); the whole surah, its title's frame over lines that run on unbroken.
 */
function ListeningDrawing({ mode, active, palette: p }: { mode: ListeningMode; active: boolean; palette: ReaderPalette }) {
  const ink = active ? p.foreground : withAlpha(p.mutedForeground, 0.7);
  const gold = active ? p.ornament : withAlpha(p.ornament, 0.55);
  const { w, h } = DRAWING;
  const line = { stroke: ink, strokeWidth: 2.2, strokeLinecap: 'round' as const, fill: 'none' };
  if (mode === 'ayah') {
    // Right to left, as the text runs: a segment, then its ayah's star, three times on each line.
    const row = (y: number, lengths: number[]) => {
      let x = w - 4;
      return lengths.map((length) => {
        const end = x - length, star = end - 8;
        const part = { d: `M ${x} ${y} H ${end}`, star: khatam(star, y, 3.2) };
        x = star - 8;
        return part;
      });
    };
    const parts = [...row(14, [22, 28, 16]), ...row(33, [34, 22])];
    return <Svg width={w} height={h} aria-hidden>
      {parts.map((part, i) => <Path key={i} d={part.d} {...line} />)}
      <Path d={parts.map((part) => part.star).join(' ')} fill={withAlpha(gold, 0.18)} stroke={gold} strokeWidth={1} strokeLinejoin="round" />
    </Svg>;
  }
  const frame = { w: 64, h: 16 };
  return <Svg width={w} height={h} aria-hidden>
    <Path d={cartoucheFrame(frame.w, frame.h)} transform={`translate(${(w - frame.w) / 2} 1)`} fill={withAlpha(gold, 0.14)} stroke={gold} strokeWidth={1} />
    <Path d={`M ${w - 4} 28 H 4 M ${w - 4} 40 H 30`} {...line} />
  </Svg>;
}

function savedSummary(state: DownloadState, reciter: Reciter) {
  const saved = state.surahs.filter((s) => reciter.surahs.includes(s)).length;
  const label = saved >= reciter.surahs.length ? t('recitation.settings.offline.complete') : t('recitation.settings.offline.saved', { count: saved });
  return state.bytes > 0 ? t('recitation.settings.offline.size', { saved: label, size: formatSize(state.bytes) }) : label;
}

function OfflineSection({ reciter, quran, palette: p }: { reciter: Reciter; quran: Quran; palette: ReaderPalette }) {
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
  return <Section title={t('recitation.settings.offline.title')} palette={p}>
    <Note palette={p}>{t('recitation.settings.offline.description')}</Note>
    {!downloadsSupported ? <Card palette={p}>
      <View style={styles.status}>
        <View style={[styles.tile, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name="download" color={p.ornament} size={19} /></View>
        <Text style={{ flex: 1, color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>{t('recitation.settings.offline.phoneOnly')}</Text>
      </View>
    </Card> : <>
      {active ? <Card palette={p}>
        <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontWeight: '600' }}>
          {t('recitation.settings.offline.progress', { surah: surahName(active.surah), done: Math.min(active.done + 1, active.total), total: active.total })}
        </Text>
        <Progress palette={p} label={t('recitation.settings.offline.title')} value={(active.done + (active.files ? active.filesDone / active.files : 0)) / Math.max(1, active.total)} />
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('recitation.settings.offline.keepOpen')}</Text>
        <Button variant="outline" palette={p} icon="close" onPress={() => cancelDownload(reciter.id)}>{t('recitation.settings.offline.cancel')}</Button>
      </Card> : <>
        <Card palette={p}>
          <View style={styles.status}>
            <View style={[styles.tile, { backgroundColor: withAlpha(p.ornament, 0.12) }]}><ReaderIcon name={complete ? 'done' : 'download'} color={p.ornament} size={19} /></View>
            <Text style={{ flex: 1, color: saved > 0 ? p.foreground : p.mutedForeground, fontSize: 14, lineHeight: 22, fontWeight: saved > 0 ? '600' : '400' }}>{saved > 0 ? savedSummary(download, reciter) : t('recitation.settings.offline.none')}</Text>
          </View>
          <Beads count={reciter.surahs.length} done={saved} palette={p} size={8} label={savedSummary(download, reciter)} />
        </Card>
        {download.error && <Alert variant="destructive" palette={p}>{download.error === 'storage' ? t('recitation.settings.offline.storageError') : t('recitation.settings.offline.networkError')}</Alert>}
        {!complete && <View style={styles.actions}>
          <Button palette={p} size="lg" icon="download" block onPress={() => start(reciter.surahs)}>{saved > 0 ? t('recitation.settings.offline.resume') : t('recitation.settings.offline.downloadAll')}</Button>
          <Button variant="outline" size="lg" palette={p} block onPress={() => setChoosing(true)}>{t('recitation.settings.offline.chooseSurahs')}</Button>
        </View>}
        {saved > 0 && (confirming ? <Card palette={p} tone={withAlpha(p.destructive, 0.4)}>
          <Text style={{ color: p.foreground, fontSize: 14, lineHeight: 22 }}>{t('recitation.settings.offline.deleteConfirm', { name: reciter.name })}</Text>
          <View style={styles.confirmActions}>
            <Button variant="destructive" size="sm" palette={p} onPress={() => { deleteDownload(reciter.id); setConfirming(false); }}>{t('recitation.settings.offline.confirmDelete')}</Button>
            <Button variant="ghost" size="sm" palette={p} onPress={() => setConfirming(false)}>{t('recitation.settings.offline.keep')}</Button>
          </View>
        </Card> : <Button variant="ghost" palette={p} icon="trash" tone={p.destructive} onPress={() => setConfirming(true)}>{t('recitation.settings.offline.delete')}</Button>)}
      </>}
      {others.length > 0 && <View style={styles.others}>
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, lineHeight: 28, fontFamily: 'ReaderNaskhBold' }}>{t('recitation.settings.offline.others')}</Text>
        <RowGroup palette={p}>{others.map((other) => <SavedReciter key={other.id} reciter={other} palette={p} />)}</RowGroup>
      </View>}
    </>}
    {choosing && <SurahDownloadSheet quran={quran} available={reciter.surahs} saved={download.surahs} palette={p} onClose={() => setChoosing(false)}
      onDownload={(surahs) => { setChoosing(false); start(surahs); }} />}
  </Section>;
}

/** A card of the offline section (a status, a download under way, a confirmation). */
function Card({ palette: p, tone, children }: { palette: ReaderPalette; tone?: string; children: ReactNode }) {
  return <View style={[styles.card, { backgroundColor: p.card, borderColor: tone ?? p.border }]}>{children}</View>;
}

/** Another reciter saved on the device, with a way to free its space. */
function SavedReciter({ reciter, palette: p }: { reciter: Reciter; palette: ReaderPalette }) {
  const state = useDownload(reciter.id);
  const [confirming, setConfirming] = useState(false);
  if (!state.surahs.length && !state.active) return null;
  return <View style={styles.saved}>
    <View style={styles.savedRow}>
      <ReciterStar name={reciter.name} size={40} palette={p} />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={{ color: p.foreground, fontSize: 15, lineHeight: 24, fontWeight: '600' }}>{reciter.name}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{[t(`common.riwayah.${reciter.riwayahId === WARSH_RAWI ? 'warsh' : 'hafs'}.name`), savedSummary(state, reciter)].join(' · ')}</Text>
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
  tab: { gap: 26 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, paddingHorizontal: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card },
  window: { alignItems: 'center', gap: 2, paddingTop: 52, paddingBottom: 22 },
  change: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 16, height: 36, borderRadius: readerShape.pill, borderWidth: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, minHeight: 72 },
  round: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listening: { flexDirection: 'row', gap: 12 },
  choice: { flex: 1, minWidth: 0, alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: readerShape.card, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 14 },
  card: { gap: 12, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card },
  status: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 40, height: 40, borderRadius: readerShape.lg, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 10 },
  confirmActions: { flexDirection: 'row', gap: 8 },
  others: { gap: 10, marginTop: 4 },
  saved: { gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  trash: { width: 40, height: 40, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center' },
});
