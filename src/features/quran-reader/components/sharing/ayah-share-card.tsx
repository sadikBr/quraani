import { editionForMushaf } from '../../riwayat';
import type { Ref } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import type { Ayah } from '@/lib/quranpedia/types';
import { calligraphyStyle, openingTypography, surahNameGlyph } from '../../utils/reader-typography';
import { cardMinimumHeight, cardQuranFontSize, type AyahCardColors, type AyahCardFormat, type CardTranslation } from '../../utils/ayah-card';
import { parallelAyahs } from '../../utils/ayah-actions';
import { QuranniLogo } from '../ui/quranni-logo';

/**
 * A printed-mushaf feel: a double rule with accented corners frames the
 * paper and the surah name sits in a cartouche between two rules.
 */
export function AyahShareCard({ ayah, surahName, colors, format, translation, showBrand, width, cardRef, onLayout, onBrandReady, onBrandError, brandRevision }: {
  ayah: Ayah; surahName: string; colors: AyahCardColors; format: AyahCardFormat;
  translation: CardTranslation | null; showBrand: boolean; width: number;
  cardRef: Ref<View>; onLayout: (event: LayoutChangeEvent) => void;
  onBrandReady: () => void; onBrandError: () => void; brandRevision: number;
}) {
  const s = width / 360;
  const square = format === 'square';
  const fontSize = cardQuranFontSize(ayah.text, !!translation, format) * s;
  const titleSize = Math.min(openingTypography(fontSize).title, (width - (square ? 156 : 168) * s) / 3.5);
  const edition = editionForMushaf(ayah.mushafId);
  const corner = (position: { top?: number; bottom?: number; left?: number; right?: number }, rotate: string) =>
    <View pointerEvents="none" style={{ position: 'absolute', ...position, width: 18 * s, height: 18 * s, transform: [{ rotate }] }}>
      <View style={{ position: 'absolute', top: 0, left: 0, width: 18 * s, height: 1.5 * s, backgroundColor: colors.accent }} />
      <View style={{ position: 'absolute', top: 0, left: 0, width: 1.5 * s, height: 18 * s, backgroundColor: colors.accent }} />
    </View>;
  return <View ref={cardRef} collapsable={false} testID="ayah-share-card" onLayout={onLayout}
    style={{ width, minHeight: cardMinimumHeight(width, format), padding: 14 * s, backgroundColor: colors.background }}>
    {/* Double frame: a hairline outside, a finer one inside, accented corners. */}
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: 8 * s, borderWidth: s, borderColor: colors.border }]} />
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { margin: 12 * s, borderWidth: 0.5 * s, borderColor: colors.border, opacity: 0.7 }]} />
    {corner({ top: 8 * s, left: 8 * s }, '0deg')}{corner({ top: 8 * s, right: 8 * s }, '90deg')}
    {corner({ bottom: 8 * s, right: 8 * s }, '180deg')}{corner({ bottom: 8 * s, left: 8 * s }, '270deg')}
    <View style={{ flexGrow: 1, margin: 8 * s, backgroundColor: colors.surface, paddingHorizontal: (square ? 18 : 24) * s, paddingVertical: (square ? 16 : 40) * s }}>
      {/* Surah cartouche. */}
      <View style={{ alignItems: 'center', gap: 6 * s }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 * s }}>
          <View style={{ flex: 1, height: s, backgroundColor: colors.border }} />
          <View style={{ width: 5 * s, height: 5 * s, transform: [{ rotate: '45deg' }], backgroundColor: colors.accent }} />
          <Text allowFontScaling={false} accessibilityLabel={surahName} style={[calligraphyStyle(titleSize), { color: colors.accent }]}>
            {surahNameGlyph(ayah.surahNumber)}
          </Text>
          <View style={{ width: 5 * s, height: 5 * s, transform: [{ rotate: '45deg' }], backgroundColor: colors.accent }} />
          <View style={{ flex: 1, height: s, backgroundColor: colors.border }} />
        </View>
        <View style={{ paddingHorizontal: 12 * s, paddingVertical: 2 * s, borderWidth: s, borderColor: colors.accent, borderRadius: 4 * s, marginTop: 2 * s }}>
          <Text allowFontScaling={false} style={[styles.label, { fontSize: 13 * s, lineHeight: 22 * s, color: colors.accent, fontFamily: 'UiSansSemiBold' }]}>الآية {ayah.ayahNumber}</Text>
        </View>
      </View>
      <View style={{ flexGrow: 1, justifyContent: 'center', paddingVertical: (square ? 12 : 24) * s, gap: (square ? 14 : 22) * s }}>
        <Text allowFontScaling={false} testID="share-card-quran" style={{ fontFamily: edition.fontFamily, fontSize, lineHeight: fontSize * (square ? 1.7 : 1.95), color: colors.text, writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false }}>
          {ayah.text}<Text style={{ color: colors.accent }}> {ayah.marker}</Text>
        </Text>
        {translation && <View style={{ gap: 12 * s, alignItems: 'center' }}>
          <View style={{ width: 28 * s, height: s, backgroundColor: colors.accent }} />
          <Text allowFontScaling={false} style={{ fontSize: 13 * s, lineHeight: 21 * s, color: colors.text, textAlign: 'center', writingDirection: 'ltr' }}>{translation.text}</Text>
          <Text allowFontScaling={false} style={[styles.label, { fontSize: 10 * s, lineHeight: 17 * s, color: colors.muted }]}>{`ترجمة المعاني · ${translation.source}\nترقيم حفص: ${parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`).join('، ')}`}</Text>
        </View>}
      </View>
      {showBrand && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * s, paddingTop: 8 * s }}>
        <QuranniLogo key={brandRevision} size={(square ? 22 : 26) * s} onDisplay={onBrandReady} onError={onBrandError} />
        <Text allowFontScaling={false} style={[styles.label, { fontSize: 12 * s, lineHeight: 20 * s, color: colors.accent, fontFamily: 'UiSansSemiBold' }]}>قرآني</Text>
      </View>}
    </View>
  </View>;
}
const styles = StyleSheet.create({ label: { fontFamily: 'UiSans', writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false } });
