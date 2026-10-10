import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import type { ReaderPalette } from '../../theme';
import { calligraphyStyle, openingTypography, surahNameGlyph } from '../../utils/reader-typography';

/** Both riwayat use the same complete surah-name and basmala calligraphy. */
export function SurahOpening({ number, name, bismillah, fontSize, palette }: {
  number: number; name: string; bismillah?: string; fontSize: number; palette: ReaderPalette;
}) {
  const [width, setWidth] = useState(Infinity);
  const scale = openingTypography(fontSize, width);
  return <View style={{ width: '100%', paddingTop: 2, paddingBottom: scale.after, gap: bismillah ? scale.gap : 0 }}
    onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
    <Text accessibilityRole="header" accessibilityLabel={name} style={[calligraphyStyle(scale.title), styles.calligraphy, { color: palette.ornament }]}>
      {surahNameGlyph(number)}
    </Text>
    {bismillah && <Text accessibilityLabel={bismillah} style={[calligraphyStyle(scale.basmala), styles.calligraphy, { color: palette.foreground }]}>
      {surahNameGlyph(115)}
    </Text>}
  </View>;
}

const styles = StyleSheet.create({
  calligraphy: { textAlign: 'center', paddingVertical: 2 },
});
