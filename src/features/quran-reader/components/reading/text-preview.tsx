import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text as QuranText, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { JustifiedText } from '@/components/justified-text';
import { ArabicText as Text } from '@/components/arabic-text';
import type { Ayah } from '@/lib/quranpedia/types';
import { t } from '@/i18n';
import { READER_FONT_DEFAULT, type ReaderPalette } from '../../theme';
import type { ReaderContent, ReaderTextLayout } from '../../types/reader';
import { readerShape } from '../../design';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useTajweed } from '../../hooks/use-tajweed';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { readerTextLineHeight } from '../../utils/reader-typography';
import { ReaderButton } from './reader-button';
import { TajweedTextSection } from './tajweed-text-section';

/**
 * The passage shown: Al-Mulk 9–10 by their Hafs numbers (9–11 in Warsh's count). They open with
 * both ق and ف, so the letter style shows at any size, and are long enough to fill the window.
 */
const PREVIEW = { surah: 67, from: 9, to: 10 };
/**
 * The text window's height, the same at every size and spacing (four lines at the default), so
 * the choices below it never move while a size is tried. Larger text runs past it and fades out.
 */
const WINDOW = 4 * readerTextLineHeight(READER_FONT_DEFAULT, false);
const FADE = 36;

/** The Quran text as the reader would set it with the current choices (and a size being dragged). */
export function TextPreview({ palette, fontSize, spacious, textLayout }: { palette: ReaderPalette; fontSize: number; spacious: boolean; textLayout: ReaderTextLayout }) {
  const { preferences: { tajweed }, dark } = useReadingPreferences();
  const { content, loading, error, refresh } = useReaderContent();
  const { loaded, error: fontError, fontFamily, display } = useQuranFont();
  const surah = content?.data.quran.surahs.find((item) => item.number === PREVIEW.surah);
  const ayahs = useMemo(() => surah?.ayahs.filter((a) => a.hafsAyahNumbers.some((n) => n >= PREVIEW.from && n <= PREVIEW.to)), [surah]);
  const quranStyle = { color: palette.foreground, fontFamily, fontSize, lineHeight: readerTextLineHeight(fontSize, spacious), writingDirection: 'rtl' as const, includeFontPadding: true };
  const marker = (ayah: Ayah, space: string) => <QuranText style={{ color: palette.ornament }}>{'\u00A0'}{ayah.marker}{space}</QuranText>;
  return <View testID="reader-text-preview" style={[styles.preview, { backgroundColor: palette.card, borderColor: palette.border }]}>
    <View style={styles.heading}>
      <View style={styles.live}><View style={[styles.liveDot, { backgroundColor: palette.primary }]} /><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>{t('settings.textComfort.preview.live')}</Text></View>
      <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{surah?.name ?? t('settings.textComfort.preview.fallbackSurah')}</Text>
    </View>
    {loading || (!loaded && !fontError) ? <PreviewWindow palette={palette} centred><ActivityIndicator color={palette.primary} accessibilityLabel={t('settings.textComfort.preview.loading')} /></PreviewWindow>
      : error || fontError || !ayahs?.length ? <PreviewWindow palette={palette} centred>
        <View style={{ gap: 10 }}><Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.textComfort.preview.error')}</Text>{error && <ReaderButton palette={palette} onPress={refresh}>{t('settings.textComfort.preview.reload')}</ReaderButton>}</View>
      </PreviewWindow>
        : tajweed && content ? <TajweedPreview key={content.data.quran.id} content={content.data} ayahs={ayahs} palette={palette} dark={dark} fontSize={fontSize} spacious={spacious} textLayout={textLayout} />
          // Justified as in the reader, with the last line centred; each block shows once laid out.
          : <PreviewWindow palette={palette}>{textLayout === 'flowing'
            ? <JustifiedText testID="reader-preview-ayah" style={quranStyle} hiddenColor={palette.card} hideUntilLaidOut>
              {ayahs.map((ayah) => <QuranText key={ayah.ayahNumber}>{display(ayah.text)}{marker(ayah, ' ')}</QuranText>)}
            </JustifiedText>
            : ayahs.map((ayah) => <JustifiedText key={ayah.ayahNumber} testID="reader-preview-ayah" style={quranStyle} hiddenColor={palette.card} hideUntilLaidOut>
              {display(ayah.text)}{marker(ayah, '')}
            </JustifiedText>)}
          </PreviewWindow>}
  </View>;
}

/** The fixed window the text is set in; what runs past its foot fades into the card. */
function PreviewWindow({ palette, centred, children }: { palette: ReaderPalette; centred?: boolean; children: ReactNode }) {
  const [overflowing, setOverflowing] = useState(false);
  return <View style={[styles.window, centred && styles.centred]}>
    <View onLayout={(event) => setOverflowing(event.nativeEvent.layout.height > WINDOW + 1)}>{children}</View>
    {overflowing && <View pointerEvents="none" style={styles.fade}>
      <Svg width="100%" height={FADE}>
        <Defs><LinearGradient id="previewFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={palette.card} stopOpacity={0} /><Stop offset="1" stopColor={palette.card} stopOpacity={1} />
        </LinearGradient></Defs>
        <Rect x="0" y="0" width="100%" height={FADE} fill="url(#previewFade)" />
      </Svg>
    </View>}
  </View>;
}

function TajweedPreview({ content, ayahs, palette, dark, fontSize, spacious, textLayout }: {
  content: ReaderContent; ayahs: Ayah[]; palette: ReaderPalette; dark: boolean;
  fontSize: number; spacious: boolean; textLayout: ReaderTextLayout;
}) {
  const first = ayahs[0];
  const page = content.pages.find((p) => p.number === first.pageNumber) ?? content.pages[0];
  const coloring = useTajweed(page, content.quran, true);
  return <View style={{ gap: 12 }}>
    <PreviewWindow palette={palette}>
      <TajweedTextSection preview ayahs={ayahs} pageNumber={page.number} layout={textLayout} fontSize={fontSize} spacious={spacious}
        palette={palette} dark={dark} runs={coloring.data[first.surahNumber]} selectedAyah={null} />
    </PreviewWindow>
    {coloring.error && <View style={{ gap: 8 }}>
      <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.textComfort.preview.tajweedError')}</Text>
      <ReaderButton palette={palette} onPress={coloring.retry}>{t('settings.textComfort.preview.reloadTajweed')}</ReaderButton>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  preview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 14, gap: 14 },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 5, height: 5, borderRadius: 3 },
  window: { height: WINDOW, overflow: 'hidden' },
  centred: { justifyContent: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: FADE },
});
