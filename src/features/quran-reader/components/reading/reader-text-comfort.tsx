import { editionForMushaf } from '../../riwayat';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text as QuranText, View } from 'react-native';
import { ArabicText as Text } from '@/components/arabic-text';
import type { ReaderPalette } from '../../theme';
import type { ReaderContent, ReaderTextLayout } from '../../types/reader';
import type { Ayah } from '@/lib/quranpedia/types';
import { useReaderContent } from '../../hooks/use-reader-content';
import { useQuranFont } from '../../hooks/use-quran-font';
import { useTajweed } from '../../hooks/use-tajweed';
import { useReadingPreferences } from '../../state/reading-preferences-provider';
import { readerFontLabel, readerFontStep, readerFontSteps, readerTextLineHeight, snapReaderFontSize } from '../../utils/reader-typography';
import { Segments } from '../ui/reader-chrome';
import { readerElevation, readerShape } from '../../design';
import { SettingsCardHeading, settingsStyles } from './settings-ui';
import { ReaderFontSlider } from './reader-font-slider';
import { ReaderButton } from './reader-button';
import { SurahOpening } from './surah-opening';
import { TajweedTextSection } from './tajweed-text-section';
import { t } from '@/i18n';

export function ReaderTextComfort({ palette, fontSize, setFontSize, spacious, setSpacious, textLayout }: {
  palette: ReaderPalette; fontSize: number; setFontSize: (value: number) => void;
  spacious: boolean; setSpacious: (value: boolean) => void; textLayout: ReaderTextLayout;
}) {
  const [draft, setDraft] = useState({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  // Keep a local drag preview; save once on release so the reader and storage
  // don't update on every gesture event. External preference changes still win.
  if (draft.saved !== fontSize) setDraft({ saved: fontSize, size: snapReaderFontSize(fontSize) });
  const selectedStep = readerFontStep(draft.size);
  const [wide, setWide] = useState(false);
  const preview = (step: number) => setDraft({ saved: fontSize, size: readerFontSteps[Math.max(0, Math.min(6, Math.round(step)))] });
  const commit = (step: number) => {
    const size = readerFontSteps[Math.max(0, Math.min(6, Math.round(step)))];
    if (size !== fontSize) setFontSize(size);
  };
  return <View style={[settingsStyles.card, styles.card, { backgroundColor: palette.card, borderColor: palette.border }, readerElevation(2, palette)]} onLayout={(event) => setWide(event.nativeEvent.layout.width >= 620)}>
    <SettingsCardHeading title={t('settings.textComfort.title')} detail={t('settings.textComfort.detail')} icon="lines" palette={palette} />
    <View style={[styles.body, wide && styles.wide]}>
      <View style={[styles.controls, wide && { flex: 1 }]}>
        <View style={styles.sizeHeading}>
          <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600' }}>{t('settings.fontSize.label')}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.sizeLabel, { color: palette.secondaryForeground, backgroundColor: palette.secondary }]}>{readerFontLabel(selectedStep)}</Text>
        </View>
        <View style={styles.slider}>
          <ReaderFontSlider value={readerFontStep(fontSize)} previewValue={selectedStep} onPreview={preview} onCommit={commit} palette={palette} />
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.ticks} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
            {readerFontSteps.map((size, index) => <View key={size} style={[styles.tick, { backgroundColor: index <= selectedStep ? palette.primary : palette.mutedForeground }]} />)}
          </View>
          <View style={styles.rangeLabels}>
            <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeSmall')}</Text><Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{t('settings.textComfort.rangeLarge')}</Text>
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={{ color: palette.foreground, fontSize: 15, fontWeight: '600' }}>{t('settings.textComfort.lineSpacing')}</Text>
          <Segments palette={palette} options={[{ value: 'normal', label: t('settings.textComfort.spacing.normal') }, { value: 'spacious', label: t('settings.textComfort.spacing.spacious') }]} value={spacious ? 'spacious' : 'normal'} onChange={(value) => setSpacious(value === 'spacious')} />
        </View>
      </View>
      <View style={wide ? { flex: 1.15, minWidth: 0 } : undefined}>
        <TextPreview palette={palette} fontSize={draft.size} spacious={spacious} textLayout={textLayout} />
      </View>
    </View>
  </View>;
}

function TextPreview({ palette, fontSize, spacious, textLayout }: { palette: ReaderPalette; fontSize: number; spacious: boolean; textLayout: ReaderTextLayout }) {
  const { preferences: { tajweed }, dark } = useReadingPreferences();
  const { content, loading, error, refresh } = useReaderContent();
  const { loaded, error: fontError, fontFamily } = useQuranFont();
  const surah = content?.data.quran.surahs.find((item) => item.number === 1);
  const ayahs = useMemo(() => surah?.ayahs.slice(0, 2), [surah]);
  const quranStyle = { color: palette.foreground, fontFamily, fontSize, lineHeight: readerTextLineHeight(fontSize, spacious), writingDirection: 'rtl' as const, textAlign: 'justify' as const, includeFontPadding: true };
  return <View testID="reader-text-preview" style={[styles.preview, { backgroundColor: palette.card, borderColor: palette.border }]}>
    <View style={styles.previewHeading}>
      <View style={styles.live}><View style={[styles.liveDot, { backgroundColor: palette.primary }]} /><Text style={{ color: palette.primary, fontSize: 12, fontWeight: '600' }}>{t('settings.textComfort.preview.live')}</Text></View>
      <Text style={{ color: palette.mutedForeground, fontSize: 12 }}>{surah?.name ?? t('settings.textComfort.preview.fallbackSurah')}</Text>
    </View>
    {loading || (!loaded && !fontError) ? <ActivityIndicator color={palette.primary} accessibilityLabel={t('settings.textComfort.preview.loading')} style={{ marginVertical: 28 }} />
      : error || fontError || !ayahs?.length ? <View style={{ gap: 10 }}><Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.textComfort.preview.error')}</Text>{error && <ReaderButton palette={palette} onPress={refresh}>{t('settings.textComfort.preview.reload')}</ReaderButton>}</View>
        : <View><SurahOpening number={1} name={surah!.name} fontSize={fontSize} palette={palette}
            bismillah={content?.data.quran.id === 4 ? content.data.quran.bismillah : undefined} />
          {tajweed && content ? <TajweedPreview key={content.data.quran.id} content={content.data} ayahs={ayahs} palette={palette} dark={dark} fontSize={fontSize} spacious={spacious} textLayout={textLayout} />
          : textLayout === 'flowing' ? <QuranText testID="reader-preview-ayah" style={quranStyle}>{ayahs.map((ayah) => <QuranText key={ayah.ayahNumber}>{ayah.text}<QuranText style={{ color: palette.ornament }}>{'\u00A0'}{ayah.marker} </QuranText></QuranText>)}</QuranText>
          : <View>{ayahs.map((ayah) => <QuranText key={ayah.ayahNumber} testID="reader-preview-ayah" style={quranStyle}>{ayah.text}<QuranText style={{ color: palette.ornament }}>{'\u00A0'}{ayah.marker}</QuranText></QuranText>)}</View>}</View>}
    <Text style={[styles.caption, { color: palette.mutedForeground, borderColor: palette.border }]}>{t('common.riwayahOf', { riwayah: content ? editionForMushaf(content.data.quran.id).label : '…' })} · {textLayout === 'flowing' ? t('settings.textLayout.flowing') : t('settings.textLayout.ayah')}</Text>
  </View>;
}

function TajweedPreview({ content, ayahs, palette, dark, fontSize, spacious, textLayout }: {
  content: ReaderContent; ayahs: Ayah[]; palette: ReaderPalette; dark: boolean;
  fontSize: number; spacious: boolean; textLayout: ReaderTextLayout;
}) {
  const coloring = useTajweed(content.pages[0], content.quran, true);
  return <View>
    <TajweedTextSection preview ayahs={ayahs} pageNumber={1} layout={textLayout} fontSize={fontSize} spacious={spacious}
      palette={palette} dark={dark} runs={coloring.data[1]} selectedAyah={null} />
    {coloring.error && <View style={{ gap: 8, marginTop: 12 }}>
      <Text style={{ color: palette.mutedForeground, fontSize: 13 }}>{t('settings.textComfort.preview.tajweedError')}</Text>
      <ReaderButton palette={palette} onPress={coloring.retry}>{t('settings.textComfort.preview.reloadTajweed')}</ReaderButton>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 20 }, wide: { flexDirection: 'row', alignItems: 'flex-start' },
  controls: { minWidth: 0, gap: 8 }, sizeHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { borderRadius: readerShape.card, borderWidth: StyleSheet.hairlineWidth },
  sizeLabel: { fontSize: 12, lineHeight: 20, paddingHorizontal: 8, paddingVertical: 1, borderRadius: readerShape.pill, overflow: 'hidden', textAlign: 'center' },
  slider: { paddingHorizontal: 2 }, ticks: { flexDirection: 'row-reverse', ...Platform.select({ native: { direction: 'ltr' as const } }), justifyContent: 'space-between', marginHorizontal: 12, marginTop: -2 },
  tick: { width: 4, height: 4, borderRadius: 2 }, rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  preview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 14, gap: 14 }, previewHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 5, height: 5, borderRadius: 3 },
  caption: { fontSize: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
