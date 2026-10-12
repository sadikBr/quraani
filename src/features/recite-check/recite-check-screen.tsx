import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text as QuranText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Badge, Button } from '@/components/ui';
import type { Ayah } from '@/lib/quranpedia/types';
import { readerElevation, readerLayout, readerShape, withAlpha } from '@/features/quran-reader/design';
import { useReaderContent } from '@/features/quran-reader/hooks/use-reader-content';
import { useQuranFont } from '@/features/quran-reader/hooks/use-quran-font';
import { useReadingPreferences } from '@/features/quran-reader/state/reading-preferences-provider';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { readerTextLineHeight } from '@/features/quran-reader/utils/reader-typography';
import { ReaderIcon } from '@/features/quran-reader/components/ui/reader-chrome';
import { t } from '@/i18n';
import { ayahsToCompare, checkRecitation, writtenWords, type RecitationCheck } from './compare';
import { allowListening, listeningSupported, recognitionAvailable, startListening, type Listening, type ListeningProblem } from './listener';

type Phase =
  | { kind: 'idle' }
  | { kind: 'listening' }
  | { kind: 'finishing' }
  | { kind: 'result'; check: RecitationCheck; ayahs: Ayah[]; heard: string; recorded: number }
  | { kind: 'error'; message: string };

const QURAN_SIZE = 26;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const problemMessage = (problem: ListeningProblem) => ({
  permission: t('listening.microphone.denied'), unavailable: t('listening.noService'), language: t('listening.noArabic'),
  network: t('listening.network'), failed: t('listening.failed'),
})[problem];

/**
 * «التسميع بالصوت» (experimental): the reader recites from memory, starting at an ayah; the phone's
 * speech recognition listens (`listener`), showing what it hears as it goes, and what it heard is
 * compared with the mushaf (`compare`): each word is shown recited, said differently or left out,
 * with any words added.
 */
export function ReciteCheckScreen() {
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const { palette: p } = useReadingPreferences();
  const { content } = useReaderContent();
  const font = useQuranFont();
  const [start, setStart] = useState(() => ({ surah: Number(params.surah) || 1, ayah: Number(params.ayah) || 1 }));
  const surah = content?.data.quran.surahs.find((item) => item.number === start.surah);
  const fromHere = surah?.ayahs.filter((ayah) => ayah.ayahNumber >= start.ayah) ?? [];
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const session = useRef<Listening | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState('');
  const [level, setLevel] = useState(-2);
  useEffect(() => {
    if (phase.kind !== 'listening') return;
    const timer = setInterval(() => setElapsed(session.current?.seconds() ?? 0), 500);
    return () => clearInterval(timer);
  }, [phase.kind]);
  // Leaving stops listening.
  useEffect(() => () => session.current?.cancel(), []);

  const compare = (ayahsFrom: Ayah[], heard: string, recorded: number) => {
    const ayahs = ayahsToCompare(ayahsFrom, heard.split(/\s+/).filter(Boolean).length);
    const check = checkRecitation(ayahs, heard);
    setPhase(check.reached < 0 ? { kind: 'error', message: t('listening.nothing') } : { kind: 'result', check, ayahs, heard, recorded });
  };
  const begin = async () => {
    if (!recognitionAvailable()) { setPhase({ kind: 'error', message: t('listening.noService') }); return; }
    if (!await allowListening()) { setPhase({ kind: 'error', message: t('listening.microphone.denied') }); return; }
    const ayahsFrom = fromHere;
    setLive(''); setLevel(-2); setElapsed(0);
    try {
      session.current = startListening({
        text: setLive, level: setLevel,
        // Listening stopped by itself: after a long silence, compare what was heard; for a problem, say it.
        ended: (heard, seconds, problem) => {
          session.current = null;
          if (problem && !heard) setPhase({ kind: 'error', message: problemMessage(problem) });
          else compare(ayahsFrom, heard, seconds);
        },
      });
      setPhase({ kind: 'listening' });
    } catch { setPhase({ kind: 'error', message: t('listening.failed') }); }
  };
  const finish = async () => {
    const current = session.current;
    session.current = null;
    if (!current) return;
    setPhase({ kind: 'finishing' });
    const { text, seconds } = await current.stop();
    compare(fromHere, text, seconds);
  };

  const startAyah = fromHere[0];
  const quranStyle = { fontFamily: font.fontFamily, fontSize: QURAN_SIZE, lineHeight: readerTextLineHeight(QURAN_SIZE, false), color: p.foreground, writingDirection: 'rtl' as const, includeFontPadding: true };
  const listening = phase.kind === 'listening' || phase.kind === 'finishing';
  return <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
    <View style={s.navigation}>
      <Button variant="outline" icon="back" label={t('common.back')} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }} />
    </View>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <View style={{ gap: 6 }}>
        <View style={s.titleRow}>
          <Text accessibilityRole="header" style={{ fontSize: 24, fontWeight: '600', color: p.foreground }}>{t('listening.title')}</Text>
          <Badge palette={p} variant="outline">{t('listening.beta')}</Badge>
        </View>
        <Text style={{ fontSize: 15, lineHeight: 24, color: p.mutedForeground }}>{t('listening.intro')}</Text>
      </View>

      {!listeningSupported ? <Text style={{ color: p.mutedForeground, fontSize: 15 }}>{t('listening.unavailable')}</Text> : <>
        {surah && startAyah && phase.kind !== 'result' && <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }, readerElevation(1, p)]}>
          <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('listening.from', { surah: surah.name, ayah: startAyah.ayahNumber })}</Text>
          {font.loaded && <Text style={{ color: p.mutedForeground, fontSize: 14 }}>
            {t('listening.cue')} <QuranText style={[quranStyle, { color: p.foreground }]}>{writtenWords(startAyah.text).slice(0, 2).map(font.display).join(' ')}…</QuranText>
          </Text>}
        </View>}

        {listening ? <View style={{ gap: 16 }}>
          <View style={s.centre}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('listening.stop')} disabled={phase.kind === 'finishing'} onPress={() => void finish()}
              style={({ pressed }) => [s.mic, { backgroundColor: p.destructive, opacity: phase.kind === 'finishing' ? 0.5 : pressed ? 0.8 : 1 }]}>
              {phase.kind === 'finishing' ? <ActivityIndicator color={p.background} /> : <ReaderIcon name="stop" color={p.background} size={30} />}
            </Pressable>
            <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 17, fontWeight: '600' }}>
              {phase.kind === 'finishing' ? t('listening.finishing') : t('listening.listening', { time: clock(elapsed) })}
            </Text>
            {/* The input volume, so the reader sees the phone hears them. */}
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.level, { backgroundColor: withAlpha(p.primary, 0.15) }]}>
              <View style={{ width: `${Math.round(Math.max(0, Math.min(1, (level + 2) / 12)) * 100)}%`, height: '100%', borderRadius: 3, backgroundColor: p.primary }} />
            </View>
            <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('listening.stopHint')}</Text>
          </View>
          <View style={[s.card, { backgroundColor: p.muted, borderColor: p.border }]}>
            <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('listening.result.heard')}</Text>
            <Text accessibilityLiveRegion="polite" style={{ color: live ? p.foreground : p.mutedForeground, fontSize: 15, lineHeight: 26 }}>{live || t('listening.waiting')}</Text>
          </View>
        </View>

        : phase.kind === 'result' ? <Result phase={phase} palette={p} quranStyle={quranStyle} display={font.display}
          onAgain={() => setPhase({ kind: 'idle' })}
          onNext={(ayah) => { setStart({ surah: start.surah, ayah }); setPhase({ kind: 'idle' }); }} />

        : <View style={s.centre}>
          {phase.kind === 'error' && <Text accessibilityRole="alert" style={{ color: p.destructive, fontSize: 14, textAlign: 'center' }}>{phase.message}</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel={t('listening.start')} disabled={!startAyah} onPress={() => void begin()}
            style={({ pressed }) => [s.mic, { backgroundColor: p.primary, opacity: !startAyah ? 0.4 : pressed ? 0.8 : 1 }]}>
            <ReaderIcon name="mic" color={p.primaryForeground} size={32} />
          </Pressable>
          <Text style={{ color: p.foreground, fontSize: 17, fontWeight: '600' }}>{t('listening.start')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, textAlign: 'center' }}>{t('listening.startHint')}</Text>
        </View>}

        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('listening.limits')} {t('listening.service')}</Text>
      </>}
    </ScrollView>
  </SafeAreaView>;
}

/** The recited ayahs with each word as recited, the counts, the places to look at, and what was heard. */
function Result({ phase, palette: p, quranStyle, display, onAgain, onNext }: {
  phase: Extract<Phase, { kind: 'result' }>; palette: ReaderPalette; quranStyle: object; display: (text: string) => string;
  onAgain: () => void; onNext: (ayah: number) => void;
}) {
  const { check, ayahs, heard, recorded } = phase;
  const byWord = new Map(check.words.map((word) => [`${word.ayah}:${word.word}`, word]));
  const extrasAfter = new Map<string, string[]>();
  for (const extra of check.extras) {
    const key = extra.after ? `${extra.after.ayah}:${extra.after.word}` : 'start';
    extrasAfter.set(key, [...(extrasAfter.get(key) ?? []), extra.text]);
  }
  const shown = ayahs.slice(0, check.reached + 1);
  const next = ayahs[check.reached + 1];
  const wrongStyle = { color: p.destructive, textDecorationLine: 'underline' as const };
  const missedStyle = { color: p.destructive, backgroundColor: withAlpha(p.destructive, 0.14) };
  const extraStyle = { color: p.primary, backgroundColor: withAlpha(p.primary, 0.12) };
  const counts: { key: 'ok' | 'wrong' | 'missed' | 'extra'; tone: string }[] = [
    { key: 'ok', tone: p.foreground }, { key: 'wrong', tone: p.destructive }, { key: 'missed', tone: p.destructive }, { key: 'extra', tone: p.primary },
  ];
  const mistakes = check.words.filter((word) => word.status !== 'ok');
  const perfect = !mistakes.length && !check.extras.length;
  return <View style={{ gap: 16 }}>
    <View style={[s.counts, { backgroundColor: p.card, borderColor: p.border }, readerElevation(1, p)]}>
      {counts.map(({ key, tone }) => <View key={key} style={s.count}>
        <Text style={{ color: tone, fontSize: 22, fontWeight: '700' }}>{check.counts[key]}</Text>
        <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t(`listening.result.${key}`)}</Text>
      </View>)}
    </View>
    {perfect && <Text style={{ color: p.primary, fontSize: 16, fontWeight: '600', textAlign: 'center' }}>{t('listening.result.perfect')}</Text>}

    <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }, readerElevation(1, p)]}>
      {(extrasAfter.get('start') ?? []).length > 0 && <QuranText style={quranStyle}><QuranText style={extraStyle}>+{extrasAfter.get('start')!.join(' ')}</QuranText></QuranText>}
      {shown.map((ayah, a) => <QuranText key={ayah.ayahNumber} style={quranStyle}>
        {writtenWords(ayah.text).map((text, w) => {
          const word = byWord.get(`${a}:${w}`);
          const added = extrasAfter.get(`${a}:${w}`);
          // Words after where the recitation stopped (in its last ayah) are dimmed.
          const style = !word ? { color: p.mutedForeground, opacity: 0.55 } : word.status === 'wrong' ? wrongStyle : word.status === 'missed' ? missedStyle : undefined;
          return <QuranText key={w}>
            <QuranText style={style}>{display(text)}</QuranText>{' '}
            {added && <><QuranText style={extraStyle}>+{added.join(' ')}</QuranText>{' '}</>}
          </QuranText>;
        })}
        <QuranText style={{ color: p.ornament }}>{ayah.marker}</QuranText>
      </QuranText>)}
      <View style={s.legend}>
        <Text style={[{ fontSize: 12 }, wrongStyle]}>{t('listening.result.wrong')}</Text>
        <Text style={[{ fontSize: 12, paddingHorizontal: 4 }, missedStyle]}>{t('listening.result.missed')}</Text>
        <Text style={[{ fontSize: 12, paddingHorizontal: 4 }, extraStyle]}>+{t('listening.result.extra')}</Text>
        <Text style={{ fontSize: 12, color: p.mutedForeground, opacity: 0.7 }}>{t('listening.result.after')}</Text>
      </View>
    </View>

    {!perfect && <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('listening.result.mistakes')}</Text>
      {mistakes.map((word) => <Text key={`${word.ayah}:${word.word}`} style={{ color: p.foreground, fontSize: 14, lineHeight: 22 }}>
        • {word.status === 'wrong'
          ? t('listening.result.wrongItem', { ayah: ayahs[word.ayah].ayahNumber, word: display(word.text), heard: word.heard ?? '' })
          : t('listening.result.missedItem', { ayah: ayahs[word.ayah].ayahNumber, word: display(word.text) })}
      </Text>)}
      {check.extras.map((extra, i) => <Text key={`extra:${i}`} style={{ color: p.foreground, fontSize: 14, lineHeight: 22 }}>
        • {extra.after
          ? t('listening.result.extraItem', { ayah: ayahs[extra.after.ayah].ayahNumber, word: display(writtenWords(ayahs[extra.after.ayah].text)[extra.after.word] ?? ''), heard: extra.text })
          : t('listening.result.extraStartItem', { heard: extra.text })}
      </Text>)}
    </View>}

    <View style={[s.card, { backgroundColor: p.muted, borderColor: p.border }]}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, fontWeight: '600' }}>{t('listening.result.heard')}</Text>
      <Text selectable style={{ color: p.foreground, fontSize: 15, lineHeight: 26 }}>{heard}</Text>
      <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('listening.result.timing', { recorded })}</Text>
    </View>

    <View style={s.actions}>
      <Button palette={p} icon="mic" onPress={onAgain}>{t('listening.result.again')}</Button>
      {next && <Button palette={p} variant="outline" onPress={() => onNext(next.ayahNumber)}>{t('listening.result.next', { ayah: next.ayahNumber })}</Button>}
    </View>
  </View>;
}

const s = StyleSheet.create({
  navigation: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  content: { width: '100%', maxWidth: readerLayout.maxWidth, alignSelf: 'center', padding: 16, paddingTop: 8, paddingBottom: 40, gap: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 16, gap: 10 },
  centre: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  mic: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  level: { width: 120, height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row-reverse' },
  counts: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingVertical: 12 },
  count: { flex: 1, alignItems: 'center', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
