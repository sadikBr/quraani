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
import { arabicNumber } from './presentation';
import { localDate } from './dates';
import { saveReadingSession, sessionPageEnd, type PlanReadingSession } from './reading-session';

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
        if (!items.some(p => p.id === session.id)) throw new Error('هذا الهدف لم يعد متاحًا.');
        return items.map(p => p.id === session.id ? saveReadingSession(p, session, to, localDate()) : p);
      });
      router.replace({ pathname: '/plans/[id]', params: { id: session.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ التقدم. أعد المحاولة.');
      saving.current = false; setBusy(false);
    }
  };
  return { busy, error, back, save };
}
type Actions = ReturnType<typeof usePlanReadingActions>;

export function PlanReadingControls({ session, pageNumber, actions }: { session: PlanReadingSession; pageNumber: number; actions: Actions }) {
  const { palette } = useReadingPreferences();
  const last = pageNumber === session.lastPage;
  const completion = session.memorization ? 'حفظت هذا المقطع' : session.recurring ? 'أكملت السورة' : 'أكملت الورد';
  return <View style={styles.toolbar}>
    <Pressable accessibilityRole="button" accessibilityLabel="العودة إلى الهدف" onPress={actions.back} disabled={actions.busy}
      style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
      <ReaderIcon name="chevron" size={18} color={palette.muted} />
      <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 12, flexShrink: 1 }}>{session.name}</Text>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={last ? completion : session.memorization ? 'حفظت حتى نهاية هذه الصفحة' : 'حفظ حتى نهاية هذه الصفحة والعودة إلى الهدف'} disabled={actions.busy}
      onPress={() => void actions.save(sessionPageEnd(session, pageNumber))}
      style={({ pressed }) => [styles.save, { backgroundColor: palette.accentSoft, opacity: actions.busy ? 0.5 : pressed ? 0.7 : 1 }]}>
      <ReaderIcon name={last ? 'check' : 'bookmark'} color={palette.accent} size={18} />
      <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600' }}>{actions.busy ? 'جارٍ الحفظ…' : last ? completion : session.memorization ? 'حفظت حتى نهاية الصفحة' : 'حفظ حتى نهاية الصفحة'}</Text>
    </Pressable>
    {!!actions.error && <Text accessibilityRole="alert" style={{ color: palette.warning, width: '100%' }}>{actions.error}</Text>}
  </View>;
}

/** These markers scroll with the page, so neither one hides Quran text. */
export function PlanReadingOpening({ session }: { session: PlanReadingSession }) {
  const { palette } = useReadingPreferences();
  const first = session.index.ayahs[session.portion.start];
  return <View style={[styles.opening, { borderColor: palette.border }]}>
    <View style={styles.heading}>
      <Text style={{ color: palette.accent, fontSize: 13, fontWeight: '600' }}>{session.memorization ? 'مقطع الحفظ' : 'وردك'} · {rangeLabel(session.index, session.portion.start, session.portion.end)}</Text>
      <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: palette.border }} />
      <ReaderIcon name="book" color={palette.accent} size={20} />
    </View>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Text style={{ color: palette.muted, fontSize: 12 }}>البداية:</Text><SurahName number={first.surahNumber} name={session.index.surahNames[first.surahNumber]} size={24} color={palette.ornament} /><Text style={{ color: palette.muted, fontSize: 12 }}>الآية {arabicNumber(first.ayahNumber)}</Text></View>
  </View>;
}

export function PlanReadingEnd({ session, actions }: { session: PlanReadingSession; actions: Actions }) {
  const { palette } = useReadingPreferences();
  const last = session.index.ayahs[session.portion.end - 1];
  return <View onTouchStart={event => event.stopPropagation()} {...(Platform.OS === 'web' ? { onClick: (event: { stopPropagation: () => void }) => event.stopPropagation() } : {})}
    style={[styles.end, { backgroundColor: palette.background, borderColor: palette.border }]}>
    <View style={[styles.seal, { backgroundColor: palette.accentSoft }]}><ReaderIcon name="check" color={palette.accent} size={26} /></View>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 19, fontWeight: '600', textAlign: 'center' }}>{session.memorization ? 'بلغت نهاية مقطع الحفظ' : session.recurring ? 'بلغت نهاية السورة' : 'بلغت نهاية وردك'}</Text>
    <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 22, textAlign: 'center' }}>حتى {session.index.surahNames[last.surahNumber]}، الآية {arabicNumber(last.ayahNumber)}{'\n'}{session.memorization ? 'أكد إتمام الحفظ لإضافة هذه الآيات إلى محفوظك.' : 'تقبّل الله قراءتك. احفظ إتمامك عندما تنتهي.'}</Text>
    {session.remainingSurahs > 0 && <Text style={{ color: palette.accent, fontSize: 13, textAlign: 'center' }}>بعد الحفظ نعود إلى هدفك لمتابعة السورة التالية.</Text>}
    {!!actions.error && <Text accessibilityRole="alert" style={{ color: palette.warning, textAlign: 'center' }}>{actions.error}</Text>}
    <View style={{ alignSelf: 'stretch' }}><ReaderButton palette={palette} selected disabled={actions.busy}
      onPress={() => void actions.save(session.portion.end)}>{actions.busy ? 'جارٍ حفظ التقدم…' : session.memorization ? 'حفظت هذا المقطع' : session.recurring ? 'أكملت السورة' : 'أكملت الورد'}</ReaderButton></View>
  </View>;
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 12, paddingTop: 8, gap: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  back: { minHeight: 44, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  save: { minHeight: 44, paddingHorizontal: 12, borderRadius: readerShape.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  opening: { gap: 2, paddingVertical: 12, paddingHorizontal: 10, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  end: { marginHorizontal: 10, marginTop: 26, marginBottom: 12, padding: 20, gap: 10, alignItems: 'center', borderRadius: readerShape.card, borderWidth: 1 },
  seal: { width: 48, height: 48, borderRadius: readerShape.control, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
});
