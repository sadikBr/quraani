import { ArabicText as Text } from '@/components/arabic-text';
import { StyleSheet, View } from 'react-native';
import { READER_FONT_MAX, READER_FONT_MIN, type ReaderAppearance, type ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { SectionHeading, Segments } from '../ui/reader-chrome';
import { ReaderThemePicker } from './reader-theme-picker';
import { readerLayout } from '../../design';

interface Props {
  fixedPage: boolean; palette: ReaderPalette; appearance: ReaderAppearance;
  setAppearance: (value: ReaderAppearance) => void; fontSize: number; setFontSize: (value: number) => void;
  spacious: boolean; setSpacious: (value: boolean) => void;
}
export function ReaderSettings({ fixedPage, palette, appearance, setAppearance, fontSize, setFontSize, spacious, setSpacious }: Props) {
  return <View style={styles.sections}>
    <ReaderThemePicker appearance={appearance} onChange={setAppearance} palette={palette} />
    {!fixedPage && <View style={[styles.panel, { borderColor: palette.border }]}>
      <SectionHeading title="راحة النص" icon="lines" palette={palette} />
      <View style={styles.sizeRow}>
        <Text style={{ color: palette.muted, fontSize: 13 }}>حجم نص القرآن</Text>
        <View style={styles.sizeControls}>
          <ReaderButton label="تصغير نص القرآن" palette={palette} disabled={fontSize <= READER_FONT_MIN} onPress={() => setFontSize(Math.max(READER_FONT_MIN, fontSize - 4))}>−</ReaderButton>
          <Text accessibilityLiveRegion="polite" style={{ color: palette.text, fontSize: 22, minWidth: 38, textAlign: 'center' }}>{fontSize}</Text>
          <ReaderButton label="تكبير نص القرآن" palette={palette} disabled={fontSize >= READER_FONT_MAX} onPress={() => setFontSize(Math.min(READER_FONT_MAX, fontSize + 4))}>+</ReaderButton>
        </View>
      </View>
      <View style={[styles.sizeTrack, { backgroundColor: palette.accentSoft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
        <View style={{ width: `${(fontSize - READER_FONT_MIN) / (READER_FONT_MAX - READER_FONT_MIN) * 100}%`, height: 4, borderRadius: 2, backgroundColor: palette.accent }} />
      </View>
      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 6 }}>تباعد السطور</Text>
      <Segments palette={palette} options={[{ value: 'normal', label: 'معتدل' }, { value: 'spacious', label: 'واسع' }]} value={spacious ? 'spacious' : 'normal'} onChange={(value) => setSpacious(value === 'spacious')} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  sections: { gap: readerLayout.sectionGap }, panel: { paddingTop: 20, gap: 16, borderTopWidth: 1 },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sizeControls: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sizeTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
});
