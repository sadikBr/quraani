import { ArabicText as Text } from '@/components/arabic-text';
import { StyleSheet, View } from 'react-native';
import { READER_FONT_MAX, READER_FONT_MIN, type ReaderAppearance, type ReaderPalette } from '../../theme';
import { ReaderButton } from './reader-button';
import { ReaderIcon, Segments } from '../ui/reader-chrome';
import { ReaderThemePicker } from './reader-theme-picker';

interface Props {
  fixedPage: boolean; palette: ReaderPalette; appearance: ReaderAppearance;
  setAppearance: (value: ReaderAppearance) => void; fontSize: number; setFontSize: (value: number) => void;
  spacious: boolean; setSpacious: (value: boolean) => void;
}
export function ReaderSettings({ fixedPage, palette, appearance, setAppearance, fontSize, setFontSize, spacious, setSpacious }: Props) {
  return <View style={styles.sections}>
    <ReaderThemePicker appearance={appearance} onChange={setAppearance} palette={palette} />
    {!fixedPage && <View style={[styles.panel, { backgroundColor: palette.paper, borderColor: palette.border }]}>
      <View style={styles.titleRow}><View style={[styles.sectionIcon, { backgroundColor: palette.goldSoft }]}><ReaderIcon name="lines" color={palette.ornament} size={20} /></View><Text accessibilityRole="header" style={[styles.label, { color: palette.text }]}>راحة النص</Text></View>
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
      <Text style={{ color: palette.muted, fontSize: 13, marginTop: 6 }}>التباعد بين الآيات</Text>
      <Segments palette={palette} options={[{ value: 'normal', label: 'معتدل' }, { value: 'spacious', label: 'واسع' }]} value={spacious ? 'spacious' : 'normal'} onChange={(value) => setSpacious(value === 'spacious')} />
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  sections: { gap: 20 }, panel: { borderRadius: 22, padding: 18, gap: 14, borderWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 17, fontWeight: '600' },
  sizeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  sizeControls: { flexDirection: 'row', alignItems: 'center', gap: 8 }, sizeTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
});
