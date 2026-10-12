import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { QiraaRawi, QiraaReading } from '@/lib/quranpedia/ayah-services';
import { t } from '@/i18n';
import { readerShape, withAlpha } from '../../../design';
import { RIWAYAT } from '../../../riwayat';
import { quranpedia } from '../../../services/reader-service';
import { useReadingPreferences } from '../../../state/reading-preferences-provider';
import type { ReaderPalette } from '../../../theme';
import { ayahKey } from '../../../utils/references';
import { ReaderIcon } from '../../ui/reader-icon';
import { playClip, resetClip, stopClip, useClip } from './qiraat-audio';
import { StaleNote, Star, Status, useAyahService, type ScienceProps } from './shared';

const load = (surah: number, ayah: number) => quranpedia.getQiraat(surah, ayah);

/**
 * The words of the ayah the readers differ on, each as a branching: the word, then down a gold
 * stem each way it is read, and under each, the rawis who read it so; a rawi's recitation of
 * the ayah plays at a touch. The reader's own rawi is ringed in gold, and his reading comes first.
 */
export function QiraatView({ ayah, palette: p }: ScienceProps) {
  const { preferences } = useReadingPreferences();
  const own = RIWAYAT[preferences.riwayah].rawiId;
  const qiraat = useAyahService(ayah, 'qiraat', load);
  const clip = useClip();
  // Leaving the view stops what it plays.
  useEffect(() => () => resetClip(), []);
  const words = qiraat.data ?? [];
  if (qiraat.status !== 'ready' || !words.length) return <Status loaded={qiraat} empty={!words.length} palette={p} />;
  const ownFirst = (readings: QiraaReading[]) => [...readings].sort((a, b) => Number(b.rawis.some((rawi) => rawi.id === own)) - Number(a.rawis.some((rawi) => rawi.id === own)));
  return <View style={{ gap: 26 }}>
    <View style={{ gap: 4 }}>
      <Text style={{ color: p.mutedForeground, fontSize: 13, lineHeight: 21 }}>{t('reader.sciences.qiraat.intro', { count: words.length })}</Text>
      {!!clip.failed && <Text accessibilityRole="alert" style={{ color: p.destructive, fontSize: 13, lineHeight: 21 }}>{t('reader.sciences.qiraat.failed')}</Text>}
    </View>
    {words.map((word, w) => <View key={`${word.word}:${w}`} style={{ gap: 4 }}>
      <View style={s.word}>
        <Star size={16} palette={p} filled />
        <Text accessibilityRole="header" style={{ color: p.foreground, fontSize: 25, lineHeight: 44, fontFamily: 'ReaderNaskhBold' }}>{word.word}</Text>
      </View>
      <View style={[s.stem, { borderColor: withAlpha(p.ornament, 0.45) }]}>
        {ownFirst(word.readings).map((reading, r) => <View key={r} style={s.branch}>
          <View style={[s.twig, { backgroundColor: withAlpha(p.ornament, 0.45) }]} />
          <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
            <Text style={{ color: p.foreground, fontSize: 17, lineHeight: 30, fontFamily: 'ReaderNaskhSemibold' }}>{reading.text}</Text>
            <View style={s.rawis}>
              {reading.rawis.map((rawi) => <Rawi key={rawi.id} rawi={rawi} own={rawi.id === own} clipKey={`${ayahKey(ayah)}:${w}:${r}:${rawi.id}`} palette={p}
                playing={clip.playing} loading={clip.loading} failed={clip.failed} />)}
            </View>
          </View>
        </View>)}
      </View>
    </View>)}
    {qiraat.stale && <StaleNote palette={p} />}
  </View>;
}

/** A rawi, by his name and his imam's: pressed, his recitation of the ayah plays (or stops). */
function Rawi({ rawi, own, clipKey, playing, loading, failed, palette: p }: {
  rawi: QiraaRawi; own: boolean; clipKey: string; playing: string | null; loading: boolean; failed: string | null; palette: ReaderPalette;
}) {
  const name = rawi.qiraa ? t('reader.sciences.qiraat.rawi', { rawi: rawi.name, qiraa: rawi.qiraa }) : rawi.name;
  const label = own ? t('reader.sciences.qiraat.own', { name }) : name;
  const on = playing === clipKey, broken = failed === clipKey;
  const look = {
    borderColor: on ? p.primary : own ? withAlpha(p.ornament, 0.85) : p.border,
    backgroundColor: on ? p.primary : own ? withAlpha(p.ornament, 0.12) : p.background,
  };
  const body = <>
    {rawi.audio && (on && loading ? <ActivityIndicator size="small" color={p.primaryForeground} />
      : <ReaderIcon name={on ? 'stop' : broken ? 'alert' : 'play'} color={on ? p.primaryForeground : broken ? p.destructive : own ? p.ornament : p.mutedForeground} size={13} />)}
    <Text numberOfLines={1} style={{ flexShrink: 1, color: on ? p.primaryForeground : p.foreground, fontSize: 13, lineHeight: 20, fontWeight: own || on ? '600' : '500' }}>{name}</Text>
    {own && !on && <Star size={10} palette={p} filled />}
  </>;
  if (!rawi.audio) return <View accessible accessibilityLabel={label} style={[s.rawi, look]}>{body}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={on ? t('reader.sciences.qiraat.stop', { name }) : t('reader.sciences.qiraat.listen', { name: label })}
    accessibilityHint={broken ? t('reader.sciences.qiraat.failed') : undefined} hitSlop={3}
    onPress={() => { if (on) stopClip(); else void playClip(clipKey, rawi.audio!); }}
    style={({ pressed }) => [s.rawi, look, pressed && !on && { backgroundColor: p.accent }]}>{body}</Pressable>;
}

const s = StyleSheet.create({
  word: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stem: { marginStart: 7, borderStartWidth: 1.5, paddingTop: 4, gap: 16 },
  branch: { flexDirection: 'row', alignItems: 'flex-start' },
  twig: { width: 14, height: 1.5, marginTop: 15, marginEnd: 8 },
  rawis: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rawi: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32, maxWidth: '100%', paddingHorizontal: 11, borderRadius: readerShape.pill, borderWidth: 1 },
});
