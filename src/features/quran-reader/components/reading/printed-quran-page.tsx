import { svgPathBbox } from 'svg-path-bbox';
import { ArabicText as Text } from '@/components/arabic-text';
import { memo, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import type { Ayah, AyahReference } from '@/lib/quranpedia/types';
import { getCachedPrintedPage, loadPrintedPage } from '../../services/printed-page-service';
import type { ReaderPalette } from '../../theme';
import type { QuranPage } from '../../types/reader';
import type { PrintedPage } from '../../utils/printed-page';
import { getCachedPrintedImage, loadPrintedImage, type PrintedImage } from '../../services/printed-page-render';
import { ReaderButton } from './reader-button';
import { AyahPageRegions } from './ayah-page-regions';
import { SurahOpening } from './surah-opening';
import { calligraphyStyle, surahNameGlyph } from '../../utils/reader-typography';

interface Props {
  page: QuranPage;
  palette: ReaderPalette;
  selectedAyah: AyahReference | null;
  onTap: (ayah: Ayah) => void;
  onSelect: (ayah: Ayah) => void;
  onTargetOffset?: (y: number) => void;
}

export const PrintedQuranPage = memo(function PrintedQuranPage({ page, palette, selectedAyah, onTap, onSelect, onTargetOffset }: Props) {
  const [rendered, setRendered] = useState<{ artwork: PrintedPage; image: PrintedImage } | undefined>(() => {
    const artwork = getCachedPrintedPage(page);
    const image = artwork && getCachedPrintedImage(artwork, palette.foreground, palette.ornament);
    return artwork && image ? { artwork, image } : undefined;
  });
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [renderHeight, setRenderHeight] = useState(0);
  const [renderWidth, setRenderWidth] = useState(0);
  useEffect(() => {
    let active = true;
    loadPrintedPage(page).then(async (artwork) => ({ artwork, image: await loadPrintedImage(artwork, palette.foreground, palette.ornament) }))
      .then((value) => { if (active) setRendered(value); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [page, retry, palette.foreground, palette.ornament]);
  if (error) return <View accessibilityRole="alert" style={styles.status}>
    <Text style={{ color: palette.mutedForeground }}>تعذر تحميل هذه الصفحة من المصحف.</Text>
    <ReaderButton palette={palette} onPress={() => { setError(false); setRetry(retry + 1); }}>إعادة المحاولة</ReaderButton>
  </View>;
  if (!rendered) return <View style={styles.status}><ActivityIndicator color={palette.mutedForeground} accessibilityLabel="جارٍ تحميل صفحة المصحف" /></View>;
  const { artwork, image } = rendered;
  // Prioritize readable, full-width text. The surrounding scroll view handles
  // short screens without shrinking the page or changing its printed proportions.
  return <View style={{ width: '100%' }} onLayout={(event) => setRenderWidth(event.nativeEvent.layout.width)}>
    {page.number <= 2 && <SurahOpening number={page.number} name={page.number === 1 ? 'سورة الفاتحة' : 'سورة البقرة'}
      fontSize={renderWidth ? renderWidth / artwork.width * (36.5 / 1.9) : 32} palette={palette} />}
    <View style={{ width: '100%', aspectRatio: artwork.width / artwork.height }} onLayout={(event) => {
      setRenderHeight(event.nativeEvent.layout.height);
      const region = artwork.regions.find((value) => value.surah === selectedAyah?.surahNumber && value.ayah === selectedAyah?.ayahNumber);
      if (region && onTargetOffset) {
        const bounds = svgPathBbox(region.path);
        const viewBoxY = Number(artwork.viewBox.split(' ')[1]);
        onTargetOffset((bounds[1] - viewBoxY) / artwork.height * event.nativeEvent.layout.height + event.nativeEvent.layout.y);
      }
    }}>
    <Image source={image} style={StyleSheet.absoluteFill}
      contentFit="fill" cachePolicy="memory" transition={0} accessible={false} pointerEvents="none"
      onError={() => setError(true)} />
    {artwork.headings.map((heading) => {
      const height = heading.height / artwork.height * renderHeight;
      // Android rejects fontSize: 0 on the first render, before onLayout runs.
      // Leave the original SVG heading visible until the overlay has a valid size.
      if (!Number.isFinite(height) || height <= 0) return null;
      return <View key={heading.surah} pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0,
        top: `${heading.y / artwork.height * 100}%`, height, backgroundColor: palette.card, justifyContent: 'center' }}>
        <Text accessibilityRole="header" accessibilityLabel={`السورة ${heading.surah}`}
          style={{ ...calligraphyStyle(height * 1.05), lineHeight: height,
            textAlign: 'center', color: palette.ornament, includeFontPadding: false }}>
          {surahNameGlyph(heading.surah)}
        </Text>
      </View>;
    })}
    <AyahPageRegions artwork={artwork} page={page} selectedAyah={selectedAyah} selectionColor={palette.primary} onTap={onTap} onSelect={onSelect} />
    </View>
  </View>;
});

const styles = StyleSheet.create({ status: { paddingVertical: 60, alignItems: 'center', gap: 16 } });
