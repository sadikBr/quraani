import { useId, useState, type Ref } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { ClipPath, Defs, G, Path, Rect } from 'react-native-svg';
import type { Ayah } from '@/lib/quranpedia/types';
import { archPath, cartoucheFrame, khatam, Pattern } from '@/components/craft/art';
import { withAlpha } from '@/features/quran-reader/colors';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';
import { cardMinimumHeight, cardQuranFontSize, type AyahCardColors, type AyahCardFormat, type CardTranslation } from '../../utils/ayah-card';
import { parallelAyahs } from '../../utils/ayah-actions';
import { QuranniLogo } from '../ui/quranni-logo';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { quranScriptForMushaf } from '../../utils/quran-script';
import { formatList, t } from '@/i18n';

/** The arch's height over the card's width: a tall door for a story, a lower one for a square. */
const RISE = { status: 0.36, square: 0.2 } as const;

/**
 * The card is a page of the mushaf shaped as a mihrab: a ruled frame, and inside it a pointed arch
 * that holds the ayah, the zellige of the Maghrib in the spandrels above it. At the arch's head the
 * surah's name in its title frame, as the mushaf heads a surah; the ayah closes with its own mark.
 * Everything is drawn to the card's width (`s`), so the exported image is the preview, larger.
 */
export function AyahShareCard({ ayah, surahName, colors, format, translation, showBrand, width, cardRef, onLayout, onBrandReady, onBrandError, brandRevision }: {
  ayah: Ayah; surahName: string; colors: AyahCardColors; format: AyahCardFormat;
  translation: CardTranslation | null; showBrand: boolean; width: number;
  cardRef: Ref<View>; onLayout: (event: LayoutChangeEvent) => void;
  onBrandReady: () => void; onBrandError: () => void; brandRevision: number;
}) {
  const id = useId().replace(/[^\w-]/g, '');
  const [height, setHeight] = useState(0);
  const s = width / 360;
  const square = format === 'square';
  const fontSize = cardQuranFontSize(ayah.text, !!translation, format) * s;
  // The letters as chosen for reading (the Warsh text can be drawn with the Madinah font).
  const { preferences: { warshScript } } = useReadingPreferences();
  const script = quranScriptForMushaf(ayah.mushafId, warshScript);
  const frame = 8 * s, inset = 15 * s, rise = Math.round(width * RISE[format]);
  const arch = { x: inset, y: inset, w: width - inset * 2, h: height - inset * 2 };
  const title = { width: Math.round(width * (square ? 0.58 : 0.7)), height: Math.round(54 * s) };
  return <View ref={cardRef} collapsable={false} testID="ayah-share-card"
    onLayout={(event) => { onLayout(event); setHeight(event.nativeEvent.layout.height); }}
    style={{ width, minHeight: cardMinimumHeight(width, format), backgroundColor: colors.background }}>
    {height > 0 && <Svg width={width} height={height} style={StyleSheet.absoluteFill} aria-hidden>
      <Defs>
        <ClipPath id={`spandrel${id}`}><Rect x={frame} y={frame} width={width - frame * 2} height={arch.y + rise + 2 * s - frame} /></ClipPath>
      </Defs>
      <Rect x={frame} y={frame} width={width - frame * 2} height={height - frame * 2} fill="none" stroke={colors.border} strokeWidth={1.2 * s} />
      {/* The zellige above the arch, drawn at the card's scale. */}
      <G clipPath={`url(#spandrel${id})`}>
        <G transform={`scale(${s})`}>
          <Pattern motif="khatam" w={width / s} h={(arch.y + rise) / s + 4} rise={rise / s} color={withAlpha(colors.accent, 0.3)} />
        </G>
      </G>
      <Path d={archPath(arch.w, arch.h, rise, arch.x, arch.y, 6 * s)} fill={colors.surface} stroke={colors.accent} strokeWidth={1.3 * s} />
      <Path d={archPath(arch.w - 10 * s, arch.h - 10 * s, rise - 4 * s, arch.x + 5 * s, arch.y + 5 * s, 3 * s)} fill="none" stroke={withAlpha(colors.accent, 0.45)} strokeWidth={0.7 * s} />
    </Svg>}
    <View style={{ flexGrow: 1, alignItems: 'center', paddingTop: inset + rise * (square ? 0.42 : 0.5), paddingHorizontal: (square ? 30 : 32) * s, paddingBottom: (square ? 24 : 30) * s }}>
      {/* The surah's name in the frame of its title, and the ayah's number under it. */}
      <View style={{ width: title.width, height: title.height, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={title.width} height={title.height} style={StyleSheet.absoluteFill} aria-hidden>
          <Path d={cartoucheFrame(title.width - 2 * s, title.height - 2 * s)} transform={`translate(${s} ${s})`} fill={withAlpha(colors.accent, 0.08)} stroke={colors.accent} strokeWidth={1.1 * s} />
          <Path d={cartoucheFrame(title.width - 9 * s, title.height - 9 * s)} transform={`translate(${4.5 * s} ${4.5 * s})`} fill="none" stroke={withAlpha(colors.accent, 0.4)} strokeWidth={0.6 * s} />
        </Svg>
        <Text allowFontScaling={false} accessibilityLabel={surahName} style={[calligraphyStyle(Math.round(title.height * 0.74)), { color: colors.accent }]}>{surahNameGlyph(ayah.surahNumber)}</Text>
      </View>
      <Text allowFontScaling={false} style={[styles.label, { marginTop: 6 * s, fontSize: 12 * s, lineHeight: 20 * s, color: colors.accent, fontFamily: 'UiSansSemiBold' }]}>{t('share.card.ayah', { ayah: ayah.ayahNumber })}</Text>
      <View style={{ flexGrow: 1, alignSelf: 'stretch', justifyContent: 'center', paddingVertical: (square ? 12 : 22) * s, gap: (square ? 12 : 20) * s }}>
        <Text allowFontScaling={false} testID="share-card-quran" style={{ fontFamily: script.fontFamily, fontSize, lineHeight: fontSize * (square ? 1.7 : 1.95), color: colors.text, writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false }}>
          {script.display(ayah.text)}<Text style={{ color: colors.accent }}> {ayah.marker}</Text>
        </Text>
        {translation && <View style={{ gap: 10 * s, alignItems: 'center' }}>
          <Star size={12 * s} colors={colors} />
          <Text allowFontScaling={false} style={{ fontSize: 13 * s, lineHeight: 21 * s, color: colors.text, textAlign: 'center', writingDirection: 'ltr' }}>{translation.text}</Text>
          <Text allowFontScaling={false} style={[styles.label, { fontSize: 10 * s, lineHeight: 17 * s, color: colors.muted }]}>{`${t('share.card.translation', { source: translation.source })}\n${t('share.card.numbering', { refs: formatList(parallelAyahs(ayah).map((n) => `${ayah.surahNumber}:${n}`)) })}`}</Text>
        </View>}
      </View>
      {showBrand && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * s }}>
        <QuranniLogo key={brandRevision} size={(square ? 20 : 24) * s} onDisplay={onBrandReady} onError={onBrandError} />
        <Text allowFontScaling={false} style={[styles.label, { fontSize: 12 * s, lineHeight: 20 * s, color: colors.accent, fontFamily: 'UiSansSemiBold' }]}>{t('common.appName')}</Text>
      </View>}
    </View>
  </View>;
}

/** The eight-pointed star between the ayah and its translation, between two short rules. */
function Star({ size, colors }: { size: number; colors: AyahCardColors }) {
  const w = size * 6, c = size / 2;
  return <Svg width={w} height={size} aria-hidden>
    <Path d={`M 0 ${c} H ${w / 2 - size} M ${w / 2 + size} ${c} H ${w}`} stroke={withAlpha(colors.accent, 0.6)} strokeWidth={size / 12} />
    <Path d={khatam(w / 2, c, size * 0.32)} fill={withAlpha(colors.accent, 0.2)} stroke={colors.accent} strokeWidth={size / 14} />
  </Svg>;
}

const styles = StyleSheet.create({ label: { fontFamily: 'UiSans', writingDirection: 'rtl', textAlign: 'center', includeFontPadding: false } });
