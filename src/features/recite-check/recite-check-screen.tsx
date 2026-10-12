import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text as QuranText, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArabicText as Text } from '@/components/arabic-text';
import { Badge, Button, Progress } from '@/components/ui';
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
import { allowMicrophone, listeningSupported, startRecording, transcribe, type Recording } from './listener';
import { downloadListeningModel, LISTENING_MODEL, listeningModelPath, removeListeningModel } from './model';

type Phase =
  | { kind: 'idle' }
  | { kind: 'downloading'; fraction: number }
  | { kind: 'recording' }
  | { kind: 'checking'; percent: number }
  | { kind: 'result'; check: RecitationCheck; ayahs: Ayah[]; heard: string; recorded: number; took: number }
  | { kind: 'error'; message: string };

const QURAN_SIZE = 26;
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * «التسميع بالصوت» (experimental): the reader recites from memory, starting at an ayah; the phone
 * listens (`listener`), and what it heard is compared with the mushaf (`compare`): each word is
 * shown recited, said differently or left out, with any words added. The listening model is
 * downloaded once (`model`); everything runs on the phone.
 */
export function ReciteCheckScreen() {
  const params = useLocalSearchParams<{ surah?: string; ayah?: string }>();
  const { palette: p } = useReadingPreferences();
  const { content } = useReaderContent();
  const font = useQuranFont();
  const [start, setStart] = useState(() => ({ surah: Number(params.surah) || 1, ayah: Number(params.ayah) || 1 }));
  const surah = content?.data.quran.surahs.find((item) => item.number === start.surah);
  const fromHere = surah?.ayahs.filter((ayah) => ayah.ayahNumber >= start.ayah) ?? [];
  const [modelPath, setModelPath] = useState(() => listeningModelPath());
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const recording = useRef<Recording | null>(null);
  const download = useRef<AbortController | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // The time recorded so far, from the audio received.
  useEffect(() => {
    if (phase.kind !== 'recording') return;
    const timer = setInterval(() => setElapsed(recording.current?.seconds() ?? 0), 500);
    return () => clearInterval(timer);
  }, [phase.kind]);
  // Leaving stops the microphone and any download.
  useEffect(() => () => { void recording.current?.stop(); download.current?.abort(); }, []);

  const getModel = async () => {
    const controller = new AbortController();
    download.current = controller;
    setPhase({ kind: 'downloading', fraction: 0 });
    try {
      const path = await downloadListeningModel((fraction) => setPhase((now) => now.kind === 'downloading' ? { kind: 'downloading', fraction } : now), controller.signal);
      setModelPath(path);
      setPhase({ kind: 'idle' });
    } catch {
      setPhase(controller.signal.aborted ? { kind: 'idle' } : { kind: 'error', message: t('listening.model.failed') });
    } finally { download.current = null; }
  };
  const begin = async () => {
    if (!await allowMicrophone({ title: t('listening.microphone.title'), message: t('listening.microphone.message'), ok: t('listening.microphone.ok') })) {
      setPhase({ kind: 'error', message: t('listening.microphone.denied') });
      return;
    }
    try {
      recording.current = await startRecording();
      setElapsed(0);
      setPhase({ kind: 'recording' });
    } catch { setPhase({ kind: 'error', message: t('listening.failed') }); }
  };
  const finish = async () => {
    const current = recording.current;
    recording.current = null;
    if (!current || !modelPath) return;
    setPhase({ kind: 'checking', percent: 0 });
    try {
      const { audio, seconds } = await current.stop();
      const { text: heard, took } = await transcribe(modelPath, audio, (percent) => setPhase((now) => now.kind === 'checking' ? { kind: 'checking', percent } : now));
      const ayahs = ayahsToCompare(fromHere, heard.split(/\s+/).length);
      const check = checkRecitation(ayahs, heard);
      setPhase(check.reached < 0
        ? { kind: 'error', message: t('listening.nothing') }
        : { kind: 'result', check, ayahs, heard, recorded: Math.round(seconds), took: Math.round(took) });
    } catch { setPhase({ kind: 'error', message: t('listening.failed') }); }
  };

  const startAyah = fromHere[0];
  const quranStyle = { fontFamily: font.fontFamily, fontSize: QURAN_SIZE, lineHeight: readerTextLineHeight(QURAN_SIZE, false), color: p.foreground, writingDirection: 'rtl' as const, includeFontPadding: true };
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

        {!modelPath ? <View style={[s.card, { backgroundColor: p.card, borderColor: p.border }, readerElevation(1, p)]}>
          <Text style={{ color: p.foreground, fontSize: 16, fontWeight: '600' }}>{t('listening.model.title')}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14, lineHeight: 22 }}>
            {t('listening.model.detail', { size: t('listening.model.size', { value: Math.round(LISTENING_MODEL.bytes / 1_000_000) }) })}
          </Text>
          {phase.kind === 'downloading' ? <View style={{ gap: 10 }}>
            <Progress palette={p} value={phase.fraction} />
            <View style={s.row}>
              <Text accessibilityLiveRegion="polite" style={{ flex: 1, color: p.foreground, fontSize: 14 }}>{t('listening.model.downloading', { percent: Math.round(phase.fraction * 100) })}</Text>
              <Button size="sm" variant="ghost" palette={p} onPress={() => download.current?.abort()}>{t('listening.model.cancel')}</Button>
            </View>
          </View> : <Button palette={p} icon="download" block onPress={() => void getModel()}>{t('listening.model.download')}</Button>}
        </View>

        : phase.kind === 'recording' ? <View style={s.centre}>
          <Pressable accessibilityRole="button" accessibilityLabel={t('listening.stop')} onPress={() => void finish()}
            style={({ pressed }) => [s.mic, { backgroundColor: p.destructive, opacity: pressed ? 0.8 : 1 }]}>
            <ReaderIcon name="stop" color={p.background} size={30} />
          </Pressable>
          <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 17, fontWeight: '600' }}>{t('listening.listening', { time: clock(elapsed) })}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 14 }}>{t('listening.stop')}</Text>
        </View>

        : phase.kind === 'checking' ? <View style={[s.card, s.centre, { backgroundColor: p.card, borderColor: p.border }]}>
          <ActivityIndicator color={p.primary} />
          <Text accessibilityLiveRegion="polite" style={{ color: p.foreground, fontSize: 15, fontWeight: '600' }}>{t('listening.checking', { percent: Math.round(phase.percent) })}</Text>
          <Text style={{ color: p.mutedForeground, fontSize: 13 }}>{t('listening.checkingDetail')}</Text>
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

        <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 20 }}>{t('listening.limits')}</Text>
        {modelPath && phase.kind !== 'recording' && phase.kind !== 'checking' && <Button variant="ghost" size="sm" palette={p} tone={p.mutedForeground}
          onPress={() => { removeListeningModel(); setModelPath(null); setPhase({ kind: 'idle' }); }}>{t('listening.model.remove')}</Button>}
      </>}
    </ScrollView>
  </SafeAreaView>;
}

/** The recited ayahs with each word as recited, the counts, the places to look at, and what was heard. */
function Result({ phase, palette: p, quranStyle, display, onAgain, onNext }: {
  phase: Extract<Phase, { kind: 'result' }>; palette: ReaderPalette; quranStyle: object; display: (text: string) => string;
  onAgain: () => void; onNext: (ayah: number) => void;
}) {
  const { check, ayahs, heard, recorded, took } = phase;
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
      <Text style={{ color: p.mutedForeground, fontSize: 12 }}>{t('listening.result.timing', { recorded, took })}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  centre: { alignItems: 'center', gap: 12, paddingVertical: 12 },
  mic: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  counts: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, paddingVertical: 12 },
  count: { flex: 1, alignItems: 'center', gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
