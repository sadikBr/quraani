import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Alert, Button, CheckMark, Tabs } from '@/components/ui';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerLayout, readerShape } from '@/features/quran-reader/design';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { SettingsCard, SettingsCardHeading } from '@/features/quran-reader/components/reading/settings-ui';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import { RIWAYAT, type Riwayah } from '@/features/quran-reader/riwayat';
import { usePlans } from '@/features/plans/provider';
import { memoryFor, spanCount } from '@/features/plans/memorization';
import { MemorizedSelectionSheet } from '@/features/plans/memorized-selection-sheet';
import { shortDate } from '@/features/plans/presentation';
import type { PlanIndex } from '@/features/plans/engine';
import type { AyahSpan } from '@/features/plans/types';
import { formatList, t } from '@/i18n';
import { ayahOf, choosePlaces, CUE_MODES, PLACE_COUNTS, placesAt, REACHES, type PracticeOptions } from './engine';
import { scopeLabel, usePracticeContent } from './content';
import { placesToReview, placeWeight, type PracticeScope } from './progress';
import { usePractice, useRiwayahPractice } from './provider';
import { gradeTone, placeLabel, useOpenInMushaf } from './session-screen';

const isRiwayah = (value: unknown): value is Riwayah => typeof value === 'string' && Object.prototype.hasOwnProperty.call(RIWAYAT, value);
/** Places to review taken into one session. */
const REVIEW_LIMIT = 20;

/**
 * Choosing a tasmee': what to recite (everything memorized, or a selection), how the cue is
 * shown, how far to recite and how many places. Below, the places that need review.
 */
export function PracticeScreen() {
  const params = useLocalSearchParams<{ riwayah?: string; scope?: string }>();
  const { palette: p, preferences } = useReadingPreferences();
  const riwayah = isRiwayah(params.riwayah) ? params.riwayah : preferences.riwayah;
  const { state, ready, error: storageError, setSettings, setCustom, begin } = usePractice();
  const record = useRiwayahPractice(riwayah);
  const { memorization } = usePlans();
  const { index, error, retry } = usePracticeContent(riwayah);
  const settings = state.settings;
  // A goal's «سمّع محفوظك» opens on everything memorized.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current || !ready) return;
    opened.current = true;
    if (params.scope === 'memorized' && settings.scope !== 'memorized') setSettings({ ...settings, scope: 'memorized' });
  }, [ready, params.scope, settings, setSettings]);
  const [choosing, setChoosing] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState('');
  let memorized: AyahSpan[] = [];
  if (index) { try { memorized = memoryFor(memorization, riwayah, index); } catch { memorized = []; } }
  const custom = index && record.total === index.ayahs.length ? record.custom : [];
  const scope: PracticeScope = settings.scope === 'memorized' && !memorized.length && custom.length ? 'custom' : settings.scope;
  const ranges = scope === 'memorized' ? memorized : custom;
  const options: PracticeOptions = { cue: settings.cue, reach: settings.reach, count: settings.count };
  const change = (value: Partial<typeof settings>) => { setMessage(''); setSettings({ ...settings, ...value }); };
  const review = placesToReview(record);

  const start = (pick: (index: PlanIndex) => ReturnType<typeof choosePlaces>) => {
    if (!index || preparing) return;
    setMessage('');
    setPreparing(true);
    // Let the spinner show: a large scope takes a moment to search for repeated openings.
    setTimeout(() => {
      const places = pick(index);
      setPreparing(false);
      if (!places.length) { setMessage(t('practice.noPlaces')); return; }
      begin(riwayah, options, places, index.ayahs.length);
      router.push('/practice/session');
    }, 30);
  };
  const startScope = () => start((i) => choosePlaces(i, ranges, options,
    (ayah) => placeWeight(record.places[`${i.ayahs[ayah].surahNumber}:${i.ayahs[ayah].ayahNumber}`], record.sessions)));
  const startReview = () => start((i) => placesAt(i, review.slice(0, REVIEW_LIMIT).map(({ key }) => ayahOf(i, key)), options));

  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.backToReading')} onPress={() => router.dismissTo('/')}>{t('plans.list.mushaf')}</Button>
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('practice.title')}</Text>
        <Text style={{ fontSize: 15, color: p.mutedForeground }}>{t('practice.subtitle')}</Text>
        <Text style={{ fontSize: 13, color: p.mutedForeground }}>{t('practice.riwayah', { riwayah: RIWAYAT[riwayah].label })}</Text>
      </View>
      {storageError && <Alert variant="destructive" palette={p}>{t('practice.storageError')}</Alert>}
      {error && <Alert variant="destructive" palette={p} action={<Button variant="outline" size="sm" palette={p} icon="restore" onPress={retry}>{t('common.retry')}</Button>}>{error}</Alert>}
      {!index ? !error && <ActivityIndicator color={p.mutedForeground} style={{ marginVertical: 24 }} /> : <>
        <SettingsCard palette={p}>
          <SettingsCardHeading title={t('practice.scope.title')} icon="book" palette={p} />
          <View accessibilityRole="radiogroup" accessibilityLabel={t('practice.scope.title')} style={[s.list, { borderColor: p.border }]}>
            <ScopeRow selected={scope === 'memorized'} disabled={!memorized.length} title={t('practice.scope.memorized')}
              detail={memorized.length ? t('practice.scope.memorizedSize', { count: spanCount(memorized) }) : t('practice.scope.memorizedEmpty')}
              palette={p} onPress={() => change({ scope: 'memorized' })} first />
            <ScopeRow selected={scope === 'custom'} title={t('practice.scope.custom')} detail={custom.length ? scopeLabel(index, custom) : t('practice.scope.customEmpty')}
              palette={p} onPress={() => { if (custom.length) change({ scope: 'custom' }); else setChoosing(true); }} />
          </View>
          {scope === 'custom' && <Button variant="outline" palette={p} icon="pencil" block onPress={() => setChoosing(true)}>{custom.length ? t('practice.scope.change') : t('practice.scope.choose')}</Button>}
        </SettingsCard>
        <SettingsCard palette={p}>
          <Choice title={t('practice.cue.title')} palette={p}>
            <Tabs role="radio" palette={p} label={t('practice.cue.title')} value={settings.cue} onChange={(cue) => change({ cue })}
              options={CUE_MODES.map((value) => ({ value, label: t(`practice.cue.${value}`) }))} />
            <Text style={{ color: p.mutedForeground, fontSize: 13, textAlign: 'center' }}>{t(`practice.cue.${settings.cue}Detail`)}</Text>
          </Choice>
          <Choice title={t('practice.reach.title')} palette={p}>
            <Tabs role="radio" palette={p} label={t('practice.reach.title')} value={settings.reach} onChange={(reach) => change({ reach })}
              options={REACHES.map((value) => ({ value, label: t(`practice.reach.${value}`) }))} />
          </Choice>
          <Choice title={t('practice.count.title')} palette={p}>
            <Tabs role="radio" palette={p} label={t('practice.count.title')} value={String(settings.count)} onChange={(count) => change({ count: Number(count) })}
              options={PLACE_COUNTS.map((value) => ({ value: String(value), label: t('practice.count.label', { count: value }) }))} />
          </Choice>
        </SettingsCard>
        {!!message && <Alert variant="destructive" palette={p}>{message}</Alert>}
        <Button size="lg" palette={p} icon="practice" block disabled={!ranges.length || preparing} onPress={startScope}>{preparing ? t('practice.preparing') : t('practice.start')}</Button>
        {!!review.length && <ReviewCard index={index} riwayah={riwayah} review={review} palette={p} disabled={preparing} onStart={startReview} />}
      </>}
    </ScrollView>
    {choosing && index && <MemorizedSelectionSheet purpose="practice" index={index} selected={custom}
      onClose={() => setChoosing(false)}
      onSave={(value) => { setCustom(riwayah, value, index.ayahs.length); change({ scope: value.length ? 'custom' : settings.scope }); setChoosing(false); }} />}
  </SafeAreaView>;
}

function ScopeRow({ selected, disabled = false, title, detail, palette: p, onPress, first = false }: {
  selected: boolean; disabled?: boolean; title: string; detail: string; palette: ReaderPalette; onPress: () => void; first?: boolean;
}) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} aria-checked={selected} accessibilityLabel={title} accessibilityHint={detail}
    disabled={disabled} onPress={onPress}
    style={({ pressed }) => [s.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: selected ? p.secondary : pressed ? p.accent : 'transparent', opacity: disabled ? 0.6 : 1 }]}>
    <CheckMark checked={selected} radio palette={p} />
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{detail}</Text>
    </View>
  </Pressable>;
}

function Choice({ title, palette: p, children }: { title: string; palette: ReaderPalette; children: ReactNode }) {
  return <View style={{ gap: 8 }}>
    <Text style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{title}</Text>
    {children}
  </View>;
}

/** The places last missed or hesitated over, to open in the mushaf or recite again. */
function ReviewCard({ index, riwayah, review, palette: p, disabled, onStart }: {
  index: PlanIndex; riwayah: Riwayah; review: ReturnType<typeof placesToReview>; palette: ReaderPalette; disabled: boolean; onStart: () => void;
}) {
  const open = useOpenInMushaf(riwayah);
  const shown = review.slice(0, 5).map((item) => ({ ...item, ayah: ayahOf(index, item.key) })).filter((item) => item.ayah >= 0);
  const more = review.length - shown.length;
  return <SettingsCard palette={p}>
    <SettingsCardHeading title={t('practice.review.title')} detail={t('practice.review.description')} icon="hint" palette={p} />
    <View style={[s.list, { borderColor: p.border }]}>
      {shown.map(({ key, stat, ayah }, i) => {
        const label = placeLabel(index, ayah);
        const last = t(stat.last === 'wrong' ? 'practice.review.wrong' : 'practice.review.hesitant', { date: shortDate(stat.date) });
        return <Pressable key={key} accessibilityRole="link" accessibilityLabel={formatList([label, last])} accessibilityHint={t('practice.session.open')}
          onPress={() => open(index, ayah)}
          style={({ pressed }) => [s.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: p.border }, { backgroundColor: pressed ? p.accent : 'transparent' }]}>
          <ReaderIcon name={stat.last === 'wrong' ? 'wrong' : 'alert'} color={gradeTone(stat.last, p)} size={18} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={{ color: p.foreground, fontSize: 15 }}>{label}</Text>
            <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{last}</Text>
          </View>
          <ReaderIcon name="chevron" color={p.mutedForeground} size={16} />
        </Pressable>;
      })}
    </View>
    {more > 0 && <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('practice.review.more', { count: more })}</Text>}
    <Button variant="outline" palette={p} icon="restore" block disabled={disabled} onPress={onStart}>{t('practice.review.start')}</Button>
  </SettingsCard>;
}


const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 20 },
  list: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.lg, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 60 },
});
