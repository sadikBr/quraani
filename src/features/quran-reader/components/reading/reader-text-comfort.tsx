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
import { readerFontLabels, readerFontStep, readerFontSteps, readerTextLineHeight, snapReaderFontSize } from '../../utils/reader-typography';
import { Segments } from '../ui/reader-chrome';
import { readerShape } from '../../design';
import { SettingsCardHeading, settingsStyles } from './settings-ui';
import { ReaderFontSlider } from './reader-font-slider';
import { ReaderButton } from './reader-button';
import { SurahOpening } from './surah-opening';
import { TajweedTextSection } from './tajweed-text-section';

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
  return <View style={[settingsStyles.card, { backgroundColor: palette.paper, borderColor: palette.border }]} onLayout={(event) => setWide(event.nativeEvent.layout.width >= 620)}>
    <SettingsCardHeading title="راحة النص" detail="اضبط الحجم والتباعد، وشاهد الفرق مباشرةً." icon="lines" palette={palette} />
    <View style={[styles.body, wide && styles.wide]}>
      <View style={[styles.controls, wide && { flex: 1 }]}>
        <View style={styles.sizeHeading}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>حجم نص القرآن</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.sizeLabel, { color: palette.accent, backgroundColor: palette.accentSoft }]}>{readerFontLabels[selectedStep]}</Text>
        </View>
        <View style={styles.slider}>
          <ReaderFontSlider value={readerFontStep(fontSize)} previewValue={selectedStep} onPreview={preview} onCommit={commit} palette={palette} />
          <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden style={styles.ticks} {...(Platform.OS === 'web' ? { dir: 'ltr' } : {})}>
            {readerFontSteps.map((size, index) => <View key={size} style={[styles.tick, { backgroundColor: index <= selectedStep ? palette.accent : palette.muted }]} />)}
          </View>
          <View style={styles.rangeLabels}>
            <Text style={{ color: palette.muted, fontSize: 12 }}>صغير</Text><Text style={{ color: palette.muted, fontSize: 12 }}>كبير</Text>
          </View>
        </View>
        <View style={{ gap: 10, marginTop: 8 }}>
          <Text style={{ color: palette.text, fontSize: 15, fontWeight: '600' }}>تباعد السطور</Text>
          <Segments palette={palette} options={[{ value: 'normal', label: 'معتدل' }, { value: 'spacious', label: 'واسع' }]} value={spacious ? 'spacious' : 'normal'} onChange={(value) => setSpacious(value === 'spacious')} />
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
  const quranStyle = { color: palette.text, fontFamily, fontSize, lineHeight: readerTextLineHeight(fontSize, spacious), writingDirection: 'rtl' as const, textAlign: 'justify' as const, includeFontPadding: true };
  return <View testID="reader-text-preview" style={[styles.preview, { backgroundColor: palette.paper, borderColor: palette.border }]}>
    <View style={styles.previewHeading}>
      <View style={styles.live}><View style={[styles.liveDot, { backgroundColor: palette.accent }]} /><Text style={{ color: palette.accent, fontSize: 12, fontWeight: '600' }}>معاينة مباشرة</Text></View>
      <Text style={{ color: palette.muted, fontSize: 12 }}>{surah?.name ?? 'سورة الفاتحة'}</Text>
    </View>
    {loading || (!loaded && !fontError) ? <ActivityIndicator color={palette.accent} accessibilityLabel="جارٍ تحميل معاينة النص" style={{ marginVertical: 28 }} />
      : error || fontError || !ayahs?.length ? <View style={{ gap: 10 }}><Text style={{ color: palette.muted, fontSize: 13 }}>تعذر عرض المعاينة. يمكنك متابعة ضبط النص.</Text>{error && <ReaderButton palette={palette} onPress={refresh}>إعادة تحميل المعاينة</ReaderButton>}</View>
        : <View><SurahOpening number={1} name={surah!.name} fontSize={fontSize} palette={palette}
            bismillah={content?.data.quran.id === 4 ? content.data.quran.bismillah : undefined} />
          {tajweed && content ? <TajweedPreview key={content.data.quran.id} content={content.data} ayahs={ayahs} palette={palette} dark={dark} fontSize={fontSize} spacious={spacious} textLayout={textLayout} />
          : textLayout === 'flowing' ? <QuranText testID="reader-preview-ayah" style={quranStyle}>{ayahs.map((ayah) => <QuranText key={ayah.ayahNumber}>{ayah.text}<QuranText style={{ color: palette.ornament }}>{'\u00A0'}{ayah.marker} </QuranText></QuranText>)}</QuranText>
          : <View>{ayahs.map((ayah) => <QuranText key={ayah.ayahNumber} testID="reader-preview-ayah" style={quranStyle}>{ayah.text}<QuranText style={{ color: palette.ornament }}>{'\u00A0'}{ayah.marker}</QuranText></QuranText>)}</View>}</View>}
    <Text style={[styles.caption, { color: palette.muted, borderColor: palette.border }]}>رواية {content ? editionForMushaf(content.data.quran.id).label : '…'} · {textLayout === 'flowing' ? 'نص متصل' : 'آيات منفصلة'}</Text>
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
      <Text style={{ color: palette.muted, fontSize: 13 }}>تعذر تحميل ألوان التجويد. النص ظاهر دون ألوان.</Text>
      <ReaderButton palette={palette} onPress={coloring.retry}>إعادة تحميل الألوان</ReaderButton>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  body: { gap: 20 }, wide: { flexDirection: 'row', alignItems: 'flex-start' },
  controls: { minWidth: 0, gap: 8 }, sizeHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  sizeLabel: { fontSize: 13, lineHeight: 22, paddingHorizontal: 10, paddingVertical: 2, borderRadius: readerShape.detail, overflow: 'hidden', textAlign: 'center' },
  slider: { paddingHorizontal: 2 }, ticks: { flexDirection: 'row-reverse', ...Platform.select({ native: { direction: 'ltr' as const } }), justifyContent: 'space-between', marginHorizontal: 12, marginTop: -2 },
  tick: { width: 4, height: 4, borderRadius: 2 }, rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  preview: { borderWidth: StyleSheet.hairlineWidth, borderRadius: readerShape.card, padding: 14, gap: 14 }, previewHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 }, liveDot: { width: 5, height: 5, borderRadius: 3 },
  caption: { fontSize: 12, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
});
