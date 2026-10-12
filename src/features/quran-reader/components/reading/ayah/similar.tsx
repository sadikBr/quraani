import { Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import { Medallion } from '@/components/craft/marks';
import type { SimilarAyah } from '@/lib/quranpedia/ayah-services';
import { formatList, t } from '@/i18n';
import { readerShape, withAlpha } from '../../../design';
import { useQuranFont } from '../../../hooks/use-quran-font';
import { quranpedia } from '../../../services/reader-service';
import { calligraphyStyle, surahNameGlyph } from '../../../utils/reader-typography';
import { ayahKey } from '../../../utils/references';
import { ReaderIcon } from '../../ui/reader-icon';
import { editionAyah } from './sciences';
import { openLink, Pill, RIGHT, StaleNote, Status, useAyahService, type ScienceProps } from './shared';

const load = (surah: number, ayah: number) => quranpedia.getSimilar(surah, ayah);
const MEDALLION = 36;

/**
 * The ayahs that resemble this one, as the memorizer keeps them apart: the note that tells them
 * apart, then the ayahs strung on a gold thread, each by its number on the star and its surah's
 * name, its opening in the mushaf's script. This ayah is lit; the others open in the mushaf.
 */
export function SimilarView({ ayah, quran, palette: p, onOpenAyah }: ScienceProps) {
  const similar = useAyahService(ayah, 'similar', load);
  const groups = similar.data ?? [];
  if (similar.status !== 'ready' || !groups.length) return <Status loaded={similar} empty={!groups.length} palette={p} />;
  return <View style={{ gap: 26 }}>
    {groups.map((group, g) => <View key={g} style={{ gap: 16 }}>
      {!!group.note && <View style={[s.note, { backgroundColor: withAlpha(p.ornament, 0.09), borderColor: withAlpha(p.ornament, 0.35) }]}>
        <ReaderIcon name="hint" color={p.ornament} size={18} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: p.mutedForeground, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t('reader.sciences.similar.note')}</Text>
          <Text style={{ color: p.foreground, fontSize: 16, lineHeight: 28, fontFamily: 'ReaderNaskhSemibold' }}>{group.note}</Text>
        </View>
      </View>}
      <View>
        {group.ayahs.map((reference, i) => <Resembling key={`${reference.surah}:${reference.ayah}`} reference={reference} ayah={ayah} quran={quran} palette={p} onOpenAyah={onOpenAyah}
          first={i === 0} last={i === group.ayahs.length - 1} />)}
      </View>
      {group.videos.map((url) => <Pill key={url} icon="play" label={t('reader.sciences.similar.video')} palette={p} style={{ alignSelf: 'flex-start' }} onPress={() => openLink(url)} />)}
    </View>)}
    {similar.stale && <StaleNote palette={p} />}
  </View>;
}

/** An ayah on the thread: the thread runs into its star from the one above and on to the next. */
function Resembling({ reference, ayah, quran, palette: p, onOpenAyah, first, last }: { reference: SimilarAyah; first: boolean; last: boolean } & ScienceProps) {
  const font = useQuranFont();
  const target = editionAyah(quran, reference);
  const here = !!target && ayahKey(target) === ayahKey(ayah);
  const name = quran.surahs.find((surah) => surah.number === reference.surah)?.name ?? reference.surahName;
  const number = target?.ayahNumber ?? reference.ayah;
  const where = t('reader.ayah.reference', { surah: name, ayah: number });
  const thread = withAlpha(p.ornament, 0.4);
  const body = <>
    <View aria-hidden style={s.knot}>
      <View style={[s.thread, { backgroundColor: first ? 'transparent' : thread }]} />
      <Medallion value={number} size={MEDALLION} palette={p} current={here} />
      <View style={[s.thread, { backgroundColor: last ? 'transparent' : thread }]} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 2, paddingVertical: 10 }}>
      <View style={s.where}>
        {font.loaded
          ? <Text accessibilityLabel={name} numberOfLines={1} style={[calligraphyStyle(24), { color: p.ornament, lineHeight: 34 }]}>{surahNameGlyph(reference.surah)}</Text>
          : <Text numberOfLines={1} style={{ color: p.foreground, fontSize: 15, lineHeight: 26, fontFamily: 'ReaderNaskhBold' }}>{name}</Text>}
        {here && <Text style={{ color: p.ornament, fontSize: 12, lineHeight: 18, fontWeight: '600' }}>{t('reader.sciences.similar.here')}</Text>}
      </View>
      {target && font.loaded
        ? <NativeText numberOfLines={2} style={{ color: p.foreground, fontFamily: font.fontFamily, fontSize: 20, lineHeight: 40, writingDirection: 'rtl', textAlign: RIGHT }}>{font.display(target.text)}</NativeText>
        : <Text numberOfLines={2} style={{ color: p.foreground, fontSize: 17, lineHeight: 32, fontFamily: 'ReaderNaskh' }}>{reference.text}</Text>}
    </View>
    {!here && target && onOpenAyah && <View style={{ alignSelf: 'center' }}><ReaderIcon name="chevron" color={p.mutedForeground} size={16} /></View>}
  </>;
  if (here || !target || !onOpenAyah) return <View accessible accessibilityLabel={here ? formatList([where, t('reader.sciences.similar.here')]) : where}
    style={[s.ayah, here && { backgroundColor: withAlpha(p.ornament, 0.08) }]}>{body}</View>;
  return <Pressable accessibilityRole="link" accessibilityLabel={where} accessibilityHint={t('reader.sciences.open')} onPress={() => onOpenAyah(target)}
    style={({ pressed }) => [s.ayah, pressed && { backgroundColor: p.accent }]}>{body}</Pressable>;
}

const s = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth },
  knot: { width: MEDALLION, alignItems: 'center' },
  thread: { flex: 1, width: 1.5, minHeight: 6 },
  ayah: { flexDirection: 'row', alignItems: 'stretch', gap: 12, paddingHorizontal: 6, borderRadius: readerShape.lg },
  where: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
