import { editionForMushaf } from '../../riwayat';
import type { Ref } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { Ayah } from '@/lib/quranpedia/types';
import { calligraphyStyle, openingTypography, surahNameGlyph } from '../../utils/reader-typography';
import { ayahCardThemes, cardMinimumHeight, cardQuranFontSize, type AyahCardFormat, type AyahCardTheme, type CardTranslation } from '../../utils/ayah-card';
import { parallelAyahs } from '../../utils/ayah-actions';
import { QuranniLogo } from '../ui/quranni-logo';

export function AyahShareCard({ ayah, surahName, theme, format, translation, showBrand, width, cardRef, onLayout, onBrandReady, onBrandError, brandRevision }: {
  ayah: Ayah; surahName: string; theme: AyahCardTheme; format: AyahCardFormat;
  translation: CardTranslation | null; showBrand: boolean; width: number;
  cardRef: Ref<View>; onLayout: (event: LayoutChangeEvent) => void;
  onBrandReady: () => void; onBrandError: () => void; brandRevision: number;
}) {
  const colors = ayahCardThemes[theme];
  const s = width / 360;
  const square = format === 'square';
  const fontSize = cardQuranFontSize(ayah.text, !!translation, format) * s;
  const titleSize = Math.min(openingTypography(fontSize).title, (width - (square ? 156 : 168) * s) / 3.5);
  return <View ref={cardRef} collapsable={false} testID="ayah-share-card" onLayout={onLayout}
    style={{ width, minHeight: cardMinimumHeight(width, format), padding: 16 * s, backgroundColor: colors.background }}>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: 10 * s, borderWidth: s, borderColor: colors.border }]} />
    <View style={{ flexGrow: 1, backgroundColor: colors.surface, paddingHorizontal: (square ? 16 : 22) * s, paddingVertical: (square ? 12 : 44) * s }}>
      <View style={{ alignItems: 'center', gap: 7 * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 * s }}>
          <View style={{ width: 30 * s, height: s, backgroundColor: colors.border }} />
          <Text allowFontScaling={false} accessibilityLabel={surahName} style={[calligraphyStyle(titleSize), { color: colors.accent }]}>
            {surahNameGlyph(ayah.surahNumber)}
          </Text>
          <View style={{ width: 30 * s, height: s, backgroundColor: colors.border }} />
        </View>
        <Text allowFontScaling={false} style={[styles.label, { fontSize: 12 * s, lineHeight: 21 * s, color: colors.muted }]}>الآية {ayah.ayahNumber} · رواية {editionForMushaf(ayah.mushafId).label}</Text>
      </View>
      <View style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: (square ? 12 : 26) * s, gap: (square ? 14 : 22) * s }}>
        <Text allowFontScaling={false} testID="share-card-quran" style={{ fontFamily: editionForMushaf(ayah.mushafId).fontFamily, fontSize, lineHeight: fontSize * (square ? 1.7 : 1.95), color: colors.text, writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false }}>
          {ayah.text}<Text style={{ color: colors.accent }}> {ayah.marker}</Text>
        </Text>
        {translation && <View style={{ gap: 12 * s, alignItems: 'center' }}>
          <View style={{ width: 28 * s, height: s, backgroundColor: colors.accent }} />
          <Text allowFontScaling={false} style={{ fontSize: 13 * s, lineHeight: 21 * s, color: colors.text, textAlign: 'center', writingDirection: 'ltr' }}>{translation.text}</Text>
          <Text allowFontScaling={false} style={[styles.label, { fontSize: 10 * s, lineHeight: 17 * s, color: colors.muted }]}>{`ترجمة المعاني · ${translation.source}\nترقيم حفص: ${parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`).join('، ')}`}</Text>
        </View>}
      </View>
      {showBrand && <View style={{ alignItems: 'center' }}>
        <QuranniLogo key={brandRevision} size={(square ? 30 : 36) * s} onDisplay={onBrandReady} onError={onBrandError} />
      </View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({ label: { fontFamily: 'ReaderNaskh', writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false } });
