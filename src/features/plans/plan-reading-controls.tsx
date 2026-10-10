import { Badge, Button, IconTile } from '@/components/ui';
import { SurahName } from '../quran-reader/components/ui/surah-name';
import { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { useReadingPreferences } from '../quran-reader/state/reading-preferences-provider';
import { ReaderIcon } from '../quran-reader/components/ui/reader-chrome';
import { ReaderButton } from '../quran-reader/components/reading/reader-button';
import { readerShape } from '../quran-reader/design';
import { usePlans } from './provider';
import { rangeLabel } from './engine';
import { t } from '@/i18n';
import { localDate } from './dates';
import { saveReadingSession, sessionPageEnd, type PlanReadingSession } from './reading-session';

/** Wording for each kind of goal, so the reader speaks the goal's language. */
function sessionCopy(session: PlanReadingSession) {
  if (session.memorization) return { portion: t('session.reader.memorization.portion'), complete: t('session.reader.memorization.complete'), page: t('session.reader.memorization.page'), pageLabel: t('session.reader.memorization.pageLabel'), end: t('session.reader.memorization.end'), note: t('session.reader.memorization.note'), afterSave: t('session.reader.memorization.afterSave') };
  if (session.revision) return { portion: t('session.reader.revision.portion'), complete: t('session.reader.revision.complete'), page: t('session.reader.revision.page'), pageLabel: t('session.reader.revision.pageLabel'), end: t('session.reader.revision.end'), note: t('session.reader.revision.note'), afterSave: t('session.reader.revision.afterSave') };
  return { portion: t('session.reader.reading.portion'), complete: session.recurring ? t('session.reader.reading.completeSurah') : t('session.reader.reading.complete'), page: t('session.reader.reading.page'), pageLabel: t('session.reader.reading.pageLabel'),
    end: session.recurring ? t('session.reader.reading.endSurah') : t('session.reader.reading.end'), note: t('session.reader.reading.note'), afterSave: t('session.reader.reading.afterSave') };
}

export function usePlanReadingActions(session: PlanReadingSession | undefined) {
  const { commit } = usePlans();
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const back = () => session && router.replace({ pathname: '/plans/[id]', params: { id: session.id } });
  const save = async (to: number) => {
    if (!session || saving.current) return;
    saving.current = true;
    setBusy(true); setError('');
    try {
      await commit(items => {
        if (!items.some(p => p.id === session.id)) throw new Error(t('goals.unavailable'));
        return items.map(p => p.id === session.id ? saveReadingSession(p, session, to, localDate()) : p);
      });
      router.replace({ pathname: '/plans/[id]', params: { id: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : t('session.reader.errors.saveProgress'));
      saving.current = false; setBusy(false);
    }
  };
  return { busy, error, back, save };
}
type Actions = ReturnType<typeof usePlanReadingActions>;

export function PlanReadingControls({ session, pageNumber, actions }: { session: PlanReadingSession; pageNumber: number; actions: Actions }) {
  const { palette } = useReadingPreferences();
  const last = pageNumber === session.lastPage;
  const copy = sessionCopy(session), completion = copy.complete;
  return <View style={styles.toolbar}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('goals.backToGoal')} onPress={actions.back} disabled={actions.busy}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
      <ReaderIcon name="chevron" size={18} color={palette.mutedForeground} />
      <Text numberOfLines={1} style={{ color: palette.mutedForeground, fontSize: 12, flexShrink: 1 }}>{session.name}</Text>
    </Pressable>
    <Button variant={last ? 'default' : 'secondary'} palette={palette} icon={last ? 'check' : 'bookmark'} label={last ? completion : copy.pageLabel} disabled={actions.busy}
      onPress={() => void actions.save(sessionPageEnd(session, pageNumber))}>{actions.busy ? t('goals.saving') : last ? completion : copy.page}</Button>
    {!!actions.error && <Text accessibilityRole="alert" style={{ color: palette.destructive, width: '100%' }}>{actions.error}</Text>}
  </View>;
}

/** These markers scroll with the page, so neither one hides Quran text. */
export function PlanReadingOpening({ session }: { session: PlanReadingSession }) {
  const { palette } = useReadingPreferences();
  const first = session.index.ayahs[session.portion.start], copy = sessionCopy(session);
  return <View style={[styles.opening, { borderColor: palette.border }]}>
    <View style={styles.heading}>
      <Badge palette={palette} variant="secondary" icon="book">{`${copy.portion} · ${rangeLabel(session.index, session.portion.start, session.portion.end)}`}</Badge>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('session.reader.start')}</Text><SurahName number={first.surahNumber} name={session.index.surahNames[first.surahNumber]} size={24} color={palette.ornament} /><Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('session.reader.ayah', { ayah: first.ayahNumber })}</Text></View>
  </View>;
}

export function PlanReadingEnd({ session, actions }: { session: PlanReadingSession; actions: Actions }) {
  const { palette } = useReadingPreferences();
  const last = session.index.ayahs[session.portion.end - 1], copy = sessionCopy(session);
  return <View onTouchStart={event => event.stopPropagation()} {...(Platform.OS === 'web' ? { onClick: (event: { stopPropagation: () => void }) => event.stopPropagation() } : {})}
    style={[styles.end, { backgroundColor: palette.background, borderColor: palette.border }]}>
    <IconTile name="check" palette={palette} />
    <Text accessibilityRole="header" style={{ color: palette.foreground, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>{copy.end}</Text>
    <Text style={{ color: palette.mutedForeground, fontSize: 14, lineHeight: 22, textAlign: 'center' }}>{t('session.reader.until', { surah: session.index.surahNames[last.surahNumber], ayah: last.ayahNumber })}{'\n'}{copy.note}</Text>
    {session.remainingSurahs > 0 && <Text style={{ color: palette.primary, fontSize: 13, textAlign: 'center' }}>{copy.afterSave}</Text>}
    {!!actions.error && <Text accessibilityRole="alert" style={{ color: palette.destructive, textAlign: 'center' }}>{actions.error}</Text>}
    <View style={{ alignSelf: 'stretch' }}><ReaderButton palette={palette} selected disabled={actions.busy}
      onPress={() => void actions.save(session.portion.end)}>{actions.busy ? t('session.reader.savingProgress') : copy.complete}</ReaderButton></View>
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 12, paddingTop: 8, gap: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  back: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  save: { minHeight: 44, paddingHorizontal: 12, borderRadius: readerShape.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  opening: { gap: 2, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  end: { marginHorizontal: 10, marginTop: 26, marginBottom: 12, padding: 24, gap: 10, alignItems: 'center', borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth },
  seal: { width: 48, height: 48, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
