import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { JustifiedText } from '@/components/justified-text';
import { Cartouche } from '@/components/craft/marks';
import type { Quran } from '@/lib/quranpedia/types';
import type { ReaderPalette } from '@/features/quran-reader/theme';
import { calligraphyStyle, openingTypography, readerTextLineHeight, surahNameGlyph } from '@/features/quran-reader/utils/reader-typography';
import { DhikrText } from './dhikr-text';
import type { QuranReading, ResolvedPassage } from './quran';

/**
 * A Quran dhikr as in the mushaf: its script and font (the chosen riwayah's), justified with the
 * last line centred, each ayah
 * with its number, and a whole surah opened with its name in the frame of a surah's title and the
 * basmala, set like the reader's openings but smaller, since one card can hold three surahs. What
 * is said before it is set as a dhikr.
 */
export function QuranDhikr({ reading, passages, quran, fontFamily, display, size, palette: p }: {
  reading: QuranReading; passages: ResolvedPassage[]; quran: Quran; fontFamily: string; size: number; palette: ReaderPalette;
  /** The text as the font draws it (see `quranScript`). */
  display: (text: string) => string;
}) {
  const [width, setWidth] = useState(Infinity);
  const opening = openingTypography(size * 0.62, width);
  return <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ gap: Math.round(size * 0.55) }}>
    {!!reading.before && <DhikrText text={reading.before} size={Math.round(size * 0.78)} color={p.mutedForeground} ornament={p.ornament} style={styles.center} />}
    {passages.map(({ surah, ayahs, whole }) => <View key={surah.number} style={{ gap: 2 }}>
      {whole && <Cartouche palette={p} filled width={Math.min(width, Math.round(opening.title * 5.4))} height={Math.round(opening.title * 1.5)} style={styles.frame}>
        <Text accessibilityRole="header" accessibilityLabel={surah.name} style={[calligraphyStyle(opening.title), styles.center, { color: p.ornament }]}>
          {surahNameGlyph(surah.number)}
        </Text>
      </Cartouche>}
      {whole && surah.number !== 9 && <Text accessibilityLabel={quran.bismillah} style={[calligraphyStyle(opening.basmala), styles.center, { color: p.foreground }]}>
        {surahNameGlyph(115)}
      </Text>}
      <JustifiedText accessibilityLabel={ayahs.map((a) => a.text).join(' ')} hiddenColor={p.card}
        style={{ fontFamily, fontSize: size, lineHeight: readerTextLineHeight(size, false), color: p.foreground, fontWeight: '400', writingDirection: 'rtl', includeFontPadding: true }}>
        {ayahs.map((ayah) => <Text key={ayah.ayahNumber}>
          {display(ayah.text)}{'\u00A0'}<Text style={{ color: p.ornament }}>{ayah.marker}</Text>{' '}
        </Text>)}
      </JustifiedText>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  frame: { alignSelf: 'center', marginBottom: 4 },
});
